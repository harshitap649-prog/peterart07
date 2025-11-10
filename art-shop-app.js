/*
Art Shop — single-file Node.js app
Features:
- Admin login restricted to a specific email (set via .env)
- Admin can add artworks (image upload) via admin panel
- Public gallery shows artworks with "Buy" button
- Cash on Delivery (COD) checkout collects name, phone, address
- Orders and artworks stored in a SQLite DB and visible in admin panel

How to use:
1. Create a folder, put this file `art-shop-app.js` inside.
2. Create a `.env` file with:
   ADMIN_EMAIL=youremail@example.com
   ADMIN_PASS=yourpassword
   SESSION_SECRET=some_secret
   PORT=3000
3. Install dependencies:
   npm init -y
   npm install express ejs sqlite3 multer express-session dotenv body-parser
4. Run:
   node art-shop-app.js
5. Open http://localhost:3000

Notes:
- This is a minimal single-file implementation intended to be a starting point.
- For production, move to a multi-file project, add CSRF protection, input sanitization, HTTPS, and real authentication.
- Uploaded images are stored in /uploads directory.
*/

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');

// Try to load firebase-admin, but make it optional
let admin;
try {
  admin = require('firebase-admin');
} catch (error) {
  console.warn('⚠️  firebase-admin module not available:', error.message);
  admin = null;
}

// Try to load sqlite3, but make it optional for Vercel
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (error) {
  console.warn('⚠️  sqlite3 module not available:', error.message);
  console.warn('⚠️  This is expected on Vercel. Consider using a cloud database.');
  sqlite3 = null;
}

// Check if running on Vercel (must be early)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL;

const ADMIN_EMAIL = 'harshitap649@gmail.com'; // Admin email
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';
const SESSION_SECRET = process.env.SESSION_SECRET || 'keyboard cat';
const PORT = process.env.PORT || 3000;

// Firebase Admin initialization
let firebaseStorage = null;
try {
  // Initialize Firebase Admin if credentials are provided
  if (process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use service account JSON from environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'peterart07-e9c21.firebasestorage.app'
      });
    } else {
      // Use default credentials (for local development with gcloud)
      admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'peterart07-e9c21.firebasestorage.app'
      });
    }
    firebaseStorage = admin.storage();
    console.log('Firebase Storage initialized successfully');
  } else {
    console.log('Firebase Storage not configured - using local storage');
  }
} catch (error) {
  console.warn('Firebase Admin initialization failed:', error.message);
  console.log('Falling back to local file storage');
}

// Ensure uploads dir (for fallback/local development)
// Skip on Vercel (read-only filesystem)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!isVercel) {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
  } catch (error) {
    console.warn('Could not create uploads directory:', error.message);
  }
}

// Multer setup - use memory storage for Firebase uploads
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Function to upload file to Firebase Storage
async function uploadToFirebaseStorage(file, folder = 'artworks') {
  if (!firebaseStorage) {
    throw new Error('Firebase Storage not initialized');
  }
  
  const bucket = firebaseStorage.bucket();
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname);
  const fileName = `${folder}/${unique}${ext}`;
  const fileRef = bucket.file(fileName);
  
  // Upload file buffer
  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      cacheControl: 'public, max-age=31536000'
    }
  });
  
  // Make file publicly accessible
  await fileRef.makePublic();
  
  // Get public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  return publicUrl;
}

// Function to delete file from Firebase Storage
async function deleteFromFirebaseStorage(imageUrl) {
  if (!firebaseStorage || !imageUrl) return;
  
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts.slice(-2).join('/'); // Get 'artworks/filename.jpg'
    const bucket = firebaseStorage.bucket();
    const fileRef = bucket.file(fileName);
    await fileRef.delete();
  } catch (error) {
    console.warn('Error deleting from Firebase Storage:', error.message);
  }
}

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ 
  secret: SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: false // Set to true if using HTTPS
  }
}));

// Initialize SQLite DB
// Use in-memory database on Vercel (read-only filesystem)
// For production, consider using Supabase, Vercel Postgres, or another cloud database
let db;
if (!sqlite3) {
  // sqlite3 not available (common on Vercel)
  console.warn('⚠️  sqlite3 not available - using mock database');
  console.warn('💡 For production, migrate to Supabase, Vercel Postgres, or another cloud database.');
  db = {
    serialize: (cb) => { try { if (cb) cb(); } catch(e) { console.error('DB serialize error:', e); } },
    run: (sql, params, cb) => { 
      if (cb) cb(new Error('Database not available - please use a cloud database'));
    },
    prepare: (sql) => ({ 
      run: (params, cb) => { 
        if (cb) cb(new Error('Database not available - please use a cloud database'));
      } 
    }),
    all: (sql, params, cb) => { 
      if (cb) cb(null, []); 
    },
    get: (sql, params, cb) => { 
      if (cb) cb(null, null); 
    }
  };
} else {
  const DB_FILE = isVercel ? ':memory:' : path.join(__dirname, 'artshop.db');
  try {
    db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('Database initialization error:', err);
        throw err;
      }
    });
    
    if (isVercel) {
      console.log('⚠️  Using in-memory database on Vercel. Data will not persist between deployments.');
      console.log('💡 For production, migrate to Supabase, Vercel Postgres, or another cloud database.');
    } else {
      console.log('✅ Database initialized:', DB_FILE);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Create a dummy database object to prevent crashes
    db = {
      serialize: (cb) => { try { if (cb) cb(); } catch(e) {} },
      run: () => {},
      prepare: () => ({ run: () => {} }),
      all: (query, cb) => { if (cb) cb(null, []); },
      get: (query, cb) => { if (cb) cb(null, null); }
    };
    console.warn('⚠️  Using dummy database - app will run but data operations will fail');
  }
}

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artwork_id) REFERENCES artworks(id)
  )`);
  
  // Add quantity column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1`, (err) => {
    // Ignore error if column already exists
  });

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    artwork_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(artwork_id) REFERENCES artworks(id),
    UNIQUE(user_id, artwork_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS artwork_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    artwork_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(artwork_id) REFERENCES artworks(id),
    UNIQUE(user_id, artwork_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS artwork_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    artwork_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(artwork_id) REFERENCES artworks(id)
  )`);

  // Create default admin user if not exists
  db.get('SELECT * FROM users WHERE email = ?', [ADMIN_EMAIL], (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
        [ADMIN_EMAIL, ADMIN_PASS, 'Admin']);
    }
  });
});

// Middleware to expose user and admin flags
app.use((req, res, next) => {
  res.locals.isAdmin = !!(req.session.user && req.session.user.email === ADMIN_EMAIL);
  res.locals.isLoggedIn = !!req.session.user;
  res.locals.user = req.session.user || null;
  next();
});

// --- Routes ---

// Home - redirect to login if not logged in, otherwise to dashboard/gallery
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  // If logged in, redirect to appropriate page
  if (req.session.user.email === ADMIN_EMAIL) {
    return res.redirect('/admin');
  }
  // Regular users go to gallery
  return res.redirect('/gallery');
});

// Gallery route for logged-in users
app.get('/gallery', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const userId = req.session.user.id;
  const section = req.query.section || 'all'; // all, wishlist, orders
  
  if (section === 'wishlist') {
    // Get wishlist artworks
    db.all(`SELECT a.*, w.created_at as wishlist_date 
            FROM artworks a 
            INNER JOIN wishlist w ON a.id = w.artwork_id 
            WHERE w.user_id = ? 
            ORDER BY w.created_at DESC`, 
      [userId], (err, rows) => {
        if (err) return res.status(500).send('DB error');
        // Get all wishlist IDs for this user
        db.all('SELECT artwork_id FROM wishlist WHERE user_id = ?', [userId], (err, wishlistIds) => {
          if (err) return res.status(500).send('DB error');
          const wishlistSet = new Set(wishlistIds.map(w => w.artwork_id));
          const artworks = rows.map(a => ({ ...a, isLiked: true }));
          res.render('gallery', { artworks, section, wishlistSet, user: req.session.user });
        });
      });
  } else if (section === 'orders') {
    // Get user's orders
    db.all(`SELECT o.*, a.title, a.image_path, a.price, a.id as artwork_id 
            FROM orders o 
            JOIN artworks a ON o.artwork_id = a.id 
            WHERE o.buyer_email = ? 
            ORDER BY o.created_at DESC`, 
      [req.session.user.email], (err, orders) => {
        if (err) return res.status(500).send('DB error');
        // Get all wishlist IDs for this user
        db.all('SELECT artwork_id FROM wishlist WHERE user_id = ?', [userId], (err, wishlistIds) => {
          if (err) return res.status(500).send('DB error');
          const wishlistSet = new Set(wishlistIds.map(w => w.artwork_id));
          res.render('gallery', { orders, artworks: [], section, wishlistSet, user: req.session.user });
        });
      });
  } else {
    // Get all artworks
    db.all('SELECT * FROM artworks ORDER BY created_at DESC', (err, rows) => {
      if (err) return res.status(500).send('DB error');
      // Get all wishlist IDs for this user
      db.all('SELECT artwork_id FROM wishlist WHERE user_id = ?', [userId], (err, wishlistIds) => {
        if (err) return res.status(500).send('DB error');
        const wishlistSet = new Set(wishlistIds.map(w => w.artwork_id));
        const artworks = rows.map(a => ({ ...a, isLiked: wishlistSet.has(a.id) }));
        res.render('gallery', { artworks, section, wishlistSet, user: req.session.user });
      });
    });
  }
});

// Wishlist routes - Like/Unlike artwork
app.post('/wishlist/toggle', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not logged in' });
  }
  const userId = req.session.user.id;
  const artworkId = parseInt(req.body.artwork_id);
  
  if (!artworkId) {
    return res.json({ success: false, error: 'Artwork ID required' });
  }
  
  // Check if already in wishlist
  db.get('SELECT * FROM wishlist WHERE user_id = ? AND artwork_id = ?', 
    [userId, artworkId], (err, existing) => {
    if (err) {
      return res.json({ success: false, error: 'Database error' });
    }
    
    if (existing) {
      // Remove from wishlist
      db.run('DELETE FROM wishlist WHERE user_id = ? AND artwork_id = ?', 
        [userId, artworkId], (err) => {
        if (err) {
          return res.json({ success: false, error: 'Failed to remove from wishlist' });
        }
        return res.json({ success: true, liked: false });
      });
    } else {
      // Add to wishlist
      db.run('INSERT INTO wishlist (user_id, artwork_id) VALUES (?, ?)', 
        [userId, artworkId], (err) => {
        if (err) {
          return res.json({ success: false, error: 'Failed to add to wishlist' });
        }
        return res.json({ success: true, liked: true });
      });
    }
  });
});

// Handle COD order
app.post('/buy/:id', (req, res) => {
  const id = req.params.id;
  const { buyer_name, buyer_email, phone, address1, address2, pincode, payment_method, quantity } = req.body;
  
  // Basic validation
  const errors = [];
  if (!buyer_name || buyer_name.trim().length < 2) errors.push('Full name is required');
  if (!phone || phone.trim().length < 10) errors.push('Valid phone number is required (minimum 10 digits)');
  if (!address1 || address1.trim().length < 5) errors.push('Address line 1 is required');
  if (!pincode || pincode.trim().length < 6) errors.push('Valid pin code is required (6 digits)');
  if (!['cod', 'online'].includes(payment_method)) errors.push('Invalid payment method');
  
  // Validate quantity
  const qty = parseInt(quantity) || 1;
  if (qty < 1 || qty > 5) errors.push('Quantity must be between 1 and 5');

  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, art) => {
    if (err) return res.status(500).send('DB error');
    if (!art) return res.status(404).send('Artwork not found');

    if (errors.length) {
      const totalPrice = art.price * qty;
      return res.render('checkout', { art, errors, values: req.body, payment_method, quantity: qty, totalPrice });
    }

    // Combine address1 and address2
    const fullAddress = address2 ? `${address1.trim()}, ${address2.trim()}` : address1.trim();
    const addressWithPincode = `${fullAddress}, Pin: ${pincode.trim()}`;

    const stmt = db.prepare(`INSERT INTO orders (artwork_id, buyer_name, buyer_email, phone, address, payment_method, quantity) VALUES (?,?,?,?,?,?,?)`);
    stmt.run([id, buyer_name.trim(), buyer_email ? buyer_email.trim() : null, phone.trim(), addressWithPincode, payment_method, qty], function (err) {
      if (err) return res.status(500).send('DB error inserting order');
      // Order created, show confirmation
      res.render('order-success', { orderId: this.lastID, art, quantity: qty });
    });
  });
});

// --- Authentication routes ---
app.get('/login', (req, res) => {
  if (req.session.user) {
    // Redirect to appropriate page based on user type
    if (req.session.user.email === ADMIN_EMAIL) {
      return res.redirect('/admin');
    }
    return res.redirect('/gallery');
  }
  res.render('login', { error: null, isRegister: false });
});

app.get('/register', (req, res) => {
  if (req.session.user) {
    // Redirect to appropriate page based on user type
    if (req.session.user.email === ADMIN_EMAIL) {
      return res.redirect('/admin');
    }
    return res.redirect('/gallery');
  }
  res.render('login', { error: null, isRegister: true });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Email and password are required', isRegister: false });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email.trim()], (err, user) => {
    if (err) return res.status(500).render('login', { error: 'Database error', isRegister: false });
    if (!user || user.password !== password) {
      return res.render('login', { error: 'Invalid email or password', isRegister: false });
    }
    
    req.session.user = { id: user.id, email: user.email, name: user.name };
    if (user.email === ADMIN_EMAIL) {
      return res.redirect('/admin');
    }
    res.redirect('/gallery');
  });
});

app.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Email and password are required', isRegister: true });
  }
  if (password.length < 6) {
    return res.render('login', { error: 'Password must be at least 6 characters', isRegister: true });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email.trim()], (err, existing) => {
    if (err) return res.status(500).render('login', { error: 'Database error', isRegister: true });
    if (existing) {
      return res.render('login', { error: 'Email already registered', isRegister: true });
    }
    
    db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
      [email.trim(), password, name ? name.trim() : null], function(err) {
      if (err) return res.status(500).render('login', { error: 'Error creating account', isRegister: true });
      
      req.session.user = { id: this.lastID, email: email.trim(), name: name ? name.trim() : null };
      res.redirect('/gallery');
    });
  });
});

// Google OAuth callback
app.post('/auth/google', (req, res) => {
  const { email, name, photoURL, uid } = req.body;
  
  if (!email) {
    return res.json({ success: false, error: 'Email is required' });
  }
  
  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.json({ success: false, error: 'Database error' });
    }
    
    if (user) {
      // User exists, log them in
      req.session.user = { id: user.id, email: user.email, name: user.name };
      const redirect = user.email === ADMIN_EMAIL ? '/admin' : '/gallery';
      return res.json({ success: true, redirect });
    } else {
      // New user, create account
      db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
        [email, 'google_oauth_' + uid, name || email.split('@')[0]], function(err) {
        if (err) {
          return res.json({ success: false, error: 'Error creating account' });
        }
        
        req.session.user = { id: this.lastID, email: email, name: name || email.split('@')[0] };
        const redirect = email === ADMIN_EMAIL ? '/admin' : '/gallery';
        return res.json({ success: true, redirect });
      });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Help & Support page
app.get('/help', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('help', { user: req.session.user, success: null, error: null });
});

// Handle support message submission
app.post('/help', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  const { subject, message } = req.body;
  const errors = [];
  
  if (!subject || subject.trim().length < 3) {
    errors.push('Subject must be at least 3 characters long');
  }
  if (!message || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  
  if (errors.length > 0) {
    return res.render('help', { 
      user: req.session.user, 
      error: errors.join(', '), 
      success: null,
      values: req.body 
    });
  }
  
  const userId = req.session.user.id || null;
  const userName = req.session.user.name || req.session.user.email;
  const userEmail = req.session.user.email;
  
  db.run(
    'INSERT INTO support_messages (user_id, user_name, user_email, subject, message) VALUES (?, ?, ?, ?, ?)',
    [userId, userName, userEmail, subject.trim(), message.trim()],
    function(err) {
      if (err) {
        return res.render('help', { 
          user: req.session.user, 
          error: 'Failed to send message. Please try again.', 
          success: null 
        });
      }
      res.render('help', { 
        user: req.session.user, 
        success: 'Your message has been sent successfully! We will get back to you soon.', 
        error: null 
      });
    }
  );
});

// User dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  // Get user's orders
  db.all('SELECT o.*, a.title, a.image_path, a.price FROM orders o JOIN artworks a ON o.artwork_id = a.id WHERE o.buyer_email = ? ORDER BY o.created_at DESC', 
    [req.session.user.email], (err, orders) => {
    if (err) return res.status(500).send('DB error');
    res.render('dashboard', { orders, user: req.session.user });
  });
});

// View single artwork (requires login)
app.get('/art/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const id = req.params.id;
  const userId = req.session.user.id;
  
  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, art) => {
    if (err) return res.status(500).send('DB error');
    if (!art) return res.status(404).send('Artwork not found');
    
    // Get like count and check if current user has liked
    db.get('SELECT COUNT(*) as count FROM artwork_likes WHERE artwork_id = ?', [id], (err, likeData) => {
      if (err) return res.status(500).send('DB error');
      const likeCount = likeData ? likeData.count : 0;
      
      db.get('SELECT * FROM artwork_likes WHERE artwork_id = ? AND user_id = ?', [id, userId], (err, userLike) => {
        if (err) return res.status(500).send('DB error');
        const isLiked = !!userLike;
        
        // Get comments
        db.all(`SELECT c.*, u.name as user_name 
                FROM artwork_comments c 
                JOIN users u ON c.user_id = u.id 
                WHERE c.artwork_id = ? 
                ORDER BY c.created_at DESC`, [id], (err, comments) => {
          if (err) return res.status(500).send('DB error');
          
          res.render('art', { 
            art, 
            likeCount, 
            isLiked, 
            comments: comments || [],
            user: req.session.user
          });
        });
      });
    });
  });
});

// Like/Unlike artwork
app.post('/art/:id/like', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not logged in' });
  }
  const artworkId = parseInt(req.params.id);
  const userId = req.session.user.id;
  
  if (!artworkId) {
    return res.json({ success: false, error: 'Invalid artwork ID' });
  }
  
  // Check if already liked
  db.get('SELECT * FROM artwork_likes WHERE user_id = ? AND artwork_id = ?', 
    [userId, artworkId], (err, existing) => {
    if (err) {
      return res.json({ success: false, error: 'Database error' });
    }
    
    if (existing) {
      // Remove like
      db.run('DELETE FROM artwork_likes WHERE user_id = ? AND artwork_id = ?', 
        [userId, artworkId], (err) => {
        if (err) {
          return res.json({ success: false, error: 'Failed to unlike' });
        }
        
        // Get updated like count
        db.get('SELECT COUNT(*) as count FROM artwork_likes WHERE artwork_id = ?', 
          [artworkId], (err, likeData) => {
          if (err) {
            return res.json({ success: false, error: 'Failed to get like count' });
          }
          res.json({ success: true, liked: false, likeCount: likeData ? likeData.count : 0 });
        });
      });
    } else {
      // Add like
      db.run('INSERT INTO artwork_likes (user_id, artwork_id) VALUES (?, ?)', 
        [userId, artworkId], (err) => {
        if (err) {
          return res.json({ success: false, error: 'Failed to like' });
        }
        
        // Get updated like count
        db.get('SELECT COUNT(*) as count FROM artwork_likes WHERE artwork_id = ?', 
          [artworkId], (err, likeData) => {
          if (err) {
            return res.json({ success: false, error: 'Failed to get like count' });
          }
          res.json({ success: true, liked: true, likeCount: likeData ? likeData.count : 0 });
        });
      });
    }
  });
});

// Add comment
app.post('/art/:id/comment', bodyParser.json(), (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, error: 'Not logged in' });
  }
  const artworkId = parseInt(req.params.id);
  const userId = req.session.user.id;
  const { comment } = req.body;
  
  if (!artworkId) {
    return res.json({ success: false, error: 'Invalid artwork ID' });
  }
  
  if (!comment || comment.trim().length < 1) {
    return res.json({ success: false, error: 'Comment cannot be empty' });
  }
  
  if (comment.trim().length > 500) {
    return res.json({ success: false, error: 'Comment is too long (max 500 characters)' });
  }
  
  const userName = req.session.user.name || req.session.user.email.split('@')[0];
  
  db.run('INSERT INTO artwork_comments (user_id, artwork_id, user_name, comment) VALUES (?, ?, ?, ?)', 
    [userId, artworkId, userName, comment.trim()], function(err) {
    if (err) {
      return res.json({ success: false, error: 'Failed to add comment' });
    }
    
    // Get the new comment with user info
    db.get(`SELECT c.*, u.name as user_name 
            FROM artwork_comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?`, [this.lastID], (err, newComment) => {
      if (err) {
        return res.json({ success: false, error: 'Failed to fetch comment' });
      }
      res.json({ success: true, comment: newComment });
    });
  });
});

// Buy page (requires login)
app.get('/buy/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const id = req.params.id;
  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, art) => {
    if (err) return res.status(500).send('DB error');
    if (!art) return res.status(404).send('Artwork not found');
    res.render('buy', { art, errors: null, values: {}, step: 'product' });
  });
});

// Payment options page
app.get('/buy/:id/payment', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const id = req.params.id;
  const quantity = parseInt(req.query.quantity) || 1;
  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, art) => {
    if (err) return res.status(500).send('DB error');
    if (!art) return res.status(404).send('Artwork not found');
    const totalPrice = art.price * quantity;
    res.render('payment-options', { art, quantity, totalPrice });
  });
});

// Checkout form page (for Cash on Delivery)
app.get('/buy/:id/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const id = req.params.id;
  const quantity = parseInt(req.query.quantity) || 1;
  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, art) => {
    if (err) return res.status(500).send('DB error');
    if (!art) return res.status(404).send('Artwork not found');
    const totalPrice = art.price * quantity;
    res.render('checkout', { art, errors: null, values: {}, payment_method: 'cod', quantity, totalPrice });
  });
});

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.email === ADMIN_EMAIL) return next();
  return res.redirect('/login');
}

// Admin dashboard - list artworks and orders
app.get('/admin', requireAdmin, (req, res) => {
  db.all('SELECT * FROM artworks ORDER BY created_at DESC', (err, arts) => {
    if (err) return res.status(500).send('DB error');
    db.all('SELECT o.*, a.title, a.image_path FROM orders o JOIN artworks a ON o.artwork_id = a.id ORDER BY o.created_at DESC', (err2, orders) => {
      if (err2) return res.status(500).send('DB error');
      db.all('SELECT * FROM support_messages ORDER BY created_at DESC', (err3, supportMessages) => {
        if (err3) return res.status(500).send('DB error');
        res.render('admin-dashboard', { artworks: arts, orders, supportMessages: supportMessages || [] });
      });
    });
  });
});

// New artwork form
app.get('/admin/new-art', requireAdmin, (req, res) => {
  res.render('admin-new-art', { error: null });
});

// All artworks page
app.get('/admin/artworks', requireAdmin, (req, res) => {
  db.all('SELECT * FROM artworks ORDER BY created_at DESC', (err, artworks) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin-artworks', { artworks });
  });
});

// All orders page
app.get('/admin/orders', requireAdmin, (req, res) => {
  db.all('SELECT o.*, a.title, a.image_path FROM orders o JOIN artworks a ON o.artwork_id = a.id ORDER BY o.created_at DESC', (err, orders) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin-orders', { orders });
  });
});

// All users page
app.get('/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin-users', { users: users || [] });
  });
});

app.post('/admin/new-art', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, description, price } = req.body;
  if (!req.file) return res.render('admin-new-art', { error: 'Image is required' });
  if (!title || !price) return res.render('admin-new-art', { error: 'Title and price are required' });

  try {
    let image_path;
    
    // Upload to Firebase Storage if available, otherwise use local storage
    if (firebaseStorage) {
      image_path = await uploadToFirebaseStorage(req.file, 'artworks');
    } else if (isVercel) {
      // On Vercel, Firebase Storage is required (read-only filesystem)
      return res.render('admin-new-art', { error: 'Firebase Storage must be configured for file uploads on Vercel' });
    } else {
      // Fallback to local storage (local development only)
      try {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(req.file.originalname);
        const fileName = unique + ext;
        const filePath = path.join(UPLOAD_DIR, fileName);
        fs.writeFileSync(filePath, req.file.buffer);
        image_path = '/uploads/' + fileName;
      } catch (error) {
        return res.render('admin-new-art', { error: 'Failed to save file: ' + error.message });
      }
    }
    
    const stmt = db.prepare('INSERT INTO artworks (title, description, price, image_path) VALUES (?,?,?,?)');
    stmt.run([title.trim(), description ? description.trim() : '', parseFloat(price), image_path], function (err) {
      if (err) return res.status(500).send('DB error inserting artwork');
      res.redirect('/admin');
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.render('admin-new-art', { error: 'Failed to upload image: ' + error.message });
  }
});

// Update order status
app.post('/admin/order/:id/status', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).send('DB error');
    res.redirect('/admin');
  });
});

// Edit artwork - GET
app.get('/admin/art/:id/edit', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, artwork) => {
    if (err) return res.status(500).send('DB error');
    if (!artwork) return res.status(404).send('Artwork not found');
    res.render('admin-edit-art', { artwork, error: null });
  });
});

// Edit artwork - POST
app.post('/admin/art/:id/edit', requireAdmin, upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const { title, description, price } = req.body;
  
  if (!title || !price) {
    db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, artwork) => {
      if (err) return res.status(500).send('DB error');
      return res.render('admin-edit-art', { artwork, error: 'Title and price are required' });
    });
    return;
  }

  // If new image uploaded, update image_path and delete old image
  if (req.file) {
    try {
      db.get('SELECT image_path FROM artworks WHERE id = ?', [id], async (err, row) => {
        if (err) return res.status(500).send('DB error');
        
        // Delete old image
        if (row && row.image_path) {
          if (row.image_path.startsWith('https://')) {
            // Firebase Storage URL - delete from Firebase
            await deleteFromFirebaseStorage(row.image_path);
          } else {
            // Local file - delete from local storage
            const oldImgPath = path.join(__dirname, row.image_path);
            fs.unlink(oldImgPath, () => {}); // ignore unlink errors
          }
        }
        
        // Upload new image
        let image_path;
        if (firebaseStorage) {
          image_path = await uploadToFirebaseStorage(req.file, 'artworks');
        } else if (isVercel) {
          // On Vercel, Firebase Storage is required (read-only filesystem)
          return res.render('admin-edit-art', { art: art, error: 'Firebase Storage must be configured for file uploads on Vercel' });
        } else {
          // Fallback to local storage (local development only)
          try {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(req.file.originalname);
            const fileName = unique + ext;
            const filePath = path.join(UPLOAD_DIR, fileName);
            fs.writeFileSync(filePath, req.file.buffer);
            image_path = '/uploads/' + fileName;
          } catch (error) {
            return res.render('admin-edit-art', { art: art, error: 'Failed to save file: ' + error.message });
          }
        }
        
        db.run('UPDATE artworks SET title = ?, description = ?, price = ?, image_path = ? WHERE id = ?',
          [title.trim(), description ? description.trim() : '', parseFloat(price), image_path, id],
          function (err2) {
            if (err2) return res.status(500).send('DB error updating artwork');
            res.redirect('/admin/artworks');
          });
      });
    } catch (error) {
      console.error('Upload error:', error);
      db.get('SELECT * FROM artworks WHERE id = ?', [id], (err, artwork) => {
        if (err) return res.status(500).send('DB error');
        return res.render('admin-edit-art', { artwork, error: 'Failed to upload image: ' + error.message });
      });
    }
  } else {
    // No new image, just update other fields
    db.run('UPDATE artworks SET title = ?, description = ?, price = ? WHERE id = ?',
      [title.trim(), description ? description.trim() : '', parseFloat(price), id],
      function (err) {
        if (err) return res.status(500).send('DB error updating artwork');
        res.redirect('/admin/artworks');
      });
  }
});

// Remove artwork
app.post('/admin/art/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get('SELECT image_path FROM artworks WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).send('DB error');
    if (row && row.image_path) {
      const imgPath = path.join(__dirname, row.image_path);
      fs.unlink(imgPath, () => {}); // ignore unlink errors
    }
    db.run('DELETE FROM artworks WHERE id = ?', [id], function (err2) {
      if (err2) return res.status(500).send('DB error deleting');
      res.redirect('/admin');
    });
  });
});

// Start server and create minimal views if missing
function ensureViews() {
  // Skip file operations on Vercel (read-only filesystem)
  // Views should already be in the repository
  if (isVercel) {
    console.log('Skipping ensureViews on Vercel - using repository files');
    return;
  }
  
  const viewsDir = path.join(__dirname, 'views');
  try {
    if (!fs.existsSync(viewsDir)) fs.mkdirSync(viewsDir);
  } catch (error) {
    console.warn('Could not create views directory:', error.message);
    return;
  }
  
  // Remove old layout.ejs if it exists (we use header.ejs and footer.ejs now)
  const oldLayout = path.join(viewsDir, 'layout.ejs');
  if (fs.existsSync(oldLayout)) {
    try { fs.unlinkSync(oldLayout); } catch (e) {}
  }

  const templates = {
    'header.ejs': `<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title><%= typeof title !== 'undefined' ? title : 'Art Shop' %></title>\n<link rel=\"stylesheet\" href=\"/styles.css\">\n<script type=\"module\" src=\"/firebase-init.js\"></script>\n</head>\n<body>\n<% if (typeof isAdmin === 'undefined' || !isAdmin) { %>\n<header>\n  <nav>\n    <a href=\"/help\" class=\"help-support-btn\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Help & Support</span>\n    </a>\n    <% if (typeof isLoggedIn !== 'undefined' && isLoggedIn) { %>\n    <button onclick=\"showUserLogoutModal()\" class=\"user-logout-btn\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Logout</span>\n    </button>\n    <% } %>\n  </nav>\n</header>\n<% if (typeof isLoggedIn !== 'undefined' && isLoggedIn) { %>\n<div id=\"userLogoutModal\" class=\"logout-modal-overlay\" onclick=\"closeUserLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeUserLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmUserLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showUserLogoutModal() {\n  document.getElementById('userLogoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeUserLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('userLogoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmUserLogout() {\n  window.location.href = '/logout';\n}\n</script>\n<% } %>\n<% } %>\n<main>`,

    'footer.ejs': `</main>\n</body>\n</html>`,

    'gallery.ejs': `<%- include('header') %>\n<%- include('partials/alerts') %>\n<div class=\"gallery-container\">\n  <div class=\"gallery-header\">\n    <h1 class=\"gallery-title\">Fall in love with art</h1>\n    <p class=\"gallery-subtitle\">Turn Empty Walls into Expressions</p>\n  </div>\n  <% if (typeof section === 'undefined') { section = 'all'; } %>\n  <div class=\"gallery-filters\">\n    <a href=\"/gallery?section=all\" class=\"gallery-filter-btn <%= section === 'all' ? 'active' : '' %>\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M4 6H20M4 12H20M4 18H20\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n      </svg>\n      <span>All Artworks</span>\n    </a>\n    <a href=\"/gallery?section=wishlist\" class=\"gallery-filter-btn <%= section === 'wishlist' ? 'active' : '' %>\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>My Wishlist</span>\n    </a>\n    <a href=\"/gallery?section=orders\" class=\"gallery-filter-btn <%= section === 'orders' ? 'active' : '' %>\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>My Orders</span>\n    </a>\n  </div>\n  <% if (section === 'orders') { %>\n    <% if (typeof orders !== 'undefined' && orders.length > 0) { %>\n      <div class=\"orders-section\">\n        <% orders.forEach(order => { %>\n          <div class=\"order-card-gallery\">\n            <div class=\"order-card-image\">\n              <img src=\"<%= order.image_path %>\" alt=\"<%= order.title %>\">\n            </div>\n            <div class=\"order-card-info\">\n              <h3><%= order.title %></h3>\n              <p class=\"order-price\">₹<%= order.price %></p>\n              <p class=\"order-id\">Order #<%= order.id %></p>\n              <p class=\"order-status\">Status: <span class=\"status-<%= order.status %>\"><%= order.status %></span></p>\n              <p class=\"order-date\">Date: <%= new Date(order.created_at).toLocaleDateString() %></p>\n            </div>\n          </div>\n        <% }) %>\n      </div>\n    <% } else { %>\n      <div class=\"empty-gallery\">\n        <svg width=\"80\" height=\"80\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <h3>No orders yet</h3>\n        <p>Start shopping to see your orders here</p>\n      </div>\n    <% } %>\n  <% } else { %>\n    <% if (typeof artworks !== 'undefined' && artworks.length > 0) { %>\n      <div class=\"gallery-search-wrapper\">\n      <div class=\"gallery-search-container\">\n        <svg class=\"search-icon\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <circle cx=\"11\" cy=\"11\" r=\"8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"m21 21-4.35-4.35\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <input type=\"text\" id=\"artwork-search\" class=\"gallery-search-input\" placeholder=\"Search artworks by name...\" autocomplete=\"off\">\n        <button class=\"search-clear-btn\" id=\"search-clear\" style=\"display:none;\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\"/>\n            <path d=\"M15 9L9 15M9 9L15 15\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n          </svg>\n        </button>\n      </div>\n      <div class=\"search-results-count\" id=\"search-results-count\"></div>\n    </div>\n      <div class=\"artworks-grid\" id=\"artworks-grid\">\n        <% artworks.forEach(a => { %>\n          <div class=\"artwork-card\" data-artwork-title=\"<%= a.title.toLowerCase() %>\" data-artwork-id=\"<%= a.id %>\">\n            <div class=\"artwork-image-wrapper\">\n              <a href=\"/art/<%= a.id %>\" class=\"artwork-image-link\">\n                <img src=\"<%= a.image_path %>\" alt=\"<%= a.title %>\" class=\"artwork-image\" loading=\"lazy\">\n              </a>\n              <div class=\"artwork-overlay\">\n                <a href=\"/art/<%= a.id %>\" class=\"view-btn\">View Details</a>\n              </div>\n              <button class=\"like-btn <%= (typeof wishlistSet !== 'undefined' && wishlistSet.has(a.id)) || a.isLiked ? 'liked' : '' %>\" data-artwork-id=\"<%= a.id %>\" onclick=\"toggleLike(<%= a.id %>, this)\">\n                <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                  <path d=\"M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"<%= (typeof wishlistSet !== 'undefined' && wishlistSet.has(a.id)) || a.isLiked ? 'currentColor' : 'none' %>\"/>\n                </svg>\n              </button>\n            </div>\n            <div class=\"artwork-info\">\n              <h3 class=\"artwork-title\"><a href=\"/art/<%= a.id %>\"><%= a.title %></a></h3>\n              <div class=\"artwork-price\">\n                <span class=\"price-current\">₹<%= a.price %></span>\n              </div>\n              <a href=\"/buy/<%= a.id %>\" class=\"buy-now-btn\">Buy Now</a>\n            </div>\n          </div>\n        <% }) %>\n      </div>\n    <div class=\"no-search-results\" id=\"no-search-results\" style=\"display:none;\">\n      <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <circle cx=\"11\" cy=\"11\" r=\"8\" stroke=\"#6b7280\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"m21 21-4.35-4.35\" stroke=\"#6b7280\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <h3>No artworks found</h3>\n      <p>Try searching with a different name</p>\n    </div>\n    <% } else { %>\n      <div class=\"empty-gallery\">\n        <svg width=\"80\" height=\"80\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M12 2L2 7L12 12L22 7L12 2Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M2 17L12 22L22 17\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M2 12L12 17L22 12\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <h3><%= section === 'wishlist' ? 'Your wishlist is empty' : 'No artworks available yet' %></h3>\n        <p><%= section === 'wishlist' ? 'Start liking artworks to add them to your wishlist' : 'Start building your collection' %></p>\n      </div>\n    <% } %>\n  <% } %>\n</div>\n<script>\n(function() {\n  const searchInput = document.getElementById('artwork-search');\n  const searchClear = document.getElementById('search-clear');\n  const artworksGrid = document.getElementById('artworks-grid');\n  const noResults = document.getElementById('no-search-results');\n  const resultsCount = document.getElementById('search-results-count');\n  \n  if (searchInput) {\n    const artworkCards = Array.from(document.querySelectorAll('.artwork-card'));\n    \n    function filterArtworks() {\n      const searchTerm = searchInput.value.toLowerCase().trim();\n      \n      if (searchTerm === '') {\n        searchClear.style.display = 'none';\n        resultsCount.textContent = '';\n        artworkCards.forEach(card => {\n          card.style.display = '';\n        });\n        if (artworksGrid) artworksGrid.style.display = '';\n        if (noResults) noResults.style.display = 'none';\n        return;\n      }\n      \n      searchClear.style.display = 'flex';\n      \n      let visibleCount = 0;\n      \n      artworkCards.forEach(card => {\n        const title = card.getAttribute('data-artwork-title') || '';\n        if (title.includes(searchTerm)) {\n          card.style.display = '';\n          visibleCount++;\n        } else {\n          card.style.display = 'none';\n        }\n      });\n      \n      if (visibleCount === 0) {\n        if (artworksGrid) artworksGrid.style.display = 'none';\n        if (noResults) noResults.style.display = 'block';\n        resultsCount.textContent = 'No results found';\n      } else {\n        if (artworksGrid) artworksGrid.style.display = '';\n        if (noResults) noResults.style.display = 'none';\n        resultsCount.textContent = visibleCount + ' result' + (visibleCount !== 1 ? 's' : '') + ' found';\n      }\n    }\n    \n    searchInput.addEventListener('input', filterArtworks);\n    searchInput.addEventListener('keyup', function(e) {\n      if (e.key === 'Escape') {\n        searchInput.value = '';\n        filterArtworks();\n        searchInput.blur();\n      }\n    });\n    \n    if (searchClear) {\n      searchClear.addEventListener('click', function() {\n        searchInput.value = '';\n        filterArtworks();\n        searchInput.focus();\n      });\n    }\n  }\n})();\n\nfunction toggleLike(artworkId, button) {\n  fetch('/wishlist/toggle', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/x-www-form-urlencoded',\n    },\n    body: 'artwork_id=' + artworkId\n  })\n  .then(response => response.json())\n  .then(data => {\n    if (data.success) {\n      if (data.liked) {\n        button.classList.add('liked');\n        button.querySelector('svg path').setAttribute('fill', 'currentColor');\n      } else {\n        button.classList.remove('liked');\n        button.querySelector('svg path').setAttribute('fill', 'none');\n        if (window.location.search.includes('section=wishlist')) {\n          const card = button.closest('.artwork-card');\n          if (card) {\n            card.style.transition = 'opacity 0.3s, transform 0.3s';\n            card.style.opacity = '0';\n            card.style.transform = 'scale(0.9)';\n            setTimeout(() => {\n              card.remove();\n              const remainingCards = document.querySelectorAll('.artwork-card');\n              if (remainingCards.length === 0) {\n                window.location.reload();\n              }\n            }, 300);\n          }\n        }\n      }\n    } else {\n      alert('Error: ' + (data.error || 'Failed to update wishlist'));\n    }\n  })\n  .catch(error => {\n    console.error('Error:', error);\n    alert('An error occurred. Please try again.');\n  });\n}\n</script>\n<%- include('footer') %>`,

    'art.ejs': `<%- include('header') %>\n<div class=\"art-detail-container\">\n  <div class=\"art-detail-grid\">\n    <div class=\"art-detail-image\">\n      <img src=\"<%= art.image_path %>\" alt=\"<%= art.title %>\" class=\"detail-image\">\n    </div>\n    <div class=\"art-detail-info\">\n      <h1 class=\"detail-title\"><%= art.title %></h1>\n      <% if (art.description) { %>\n        <div class=\"detail-description\">\n          <p><%= art.description %></p>\n        </div>\n      <% } %>\n      <div class=\"detail-price-section\">\n        <span class=\"detail-price\">₹<%= art.price %></span>\n      </div>\n      <div class=\"art-social-actions\">\n        <button class=\"art-like-btn <%= typeof isLiked !== 'undefined' && isLiked ? 'liked' : '' %>\" onclick=\"toggleLike(<%= art.id %>)\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"<%= typeof isLiked !== 'undefined' && isLiked ? 'currentColor' : 'none' %>\"/>\n          </svg>\n          <span class=\"like-count\" id=\"like-count\"><%= typeof likeCount !== 'undefined' ? likeCount : 0 %></span>\n        </button>\n        <button class=\"art-share-btn\" onclick=\"shareArtwork(<%= art.id %>)\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.35064 15.0602 5.68722 15.1707 6M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 12.3506 3.06015 12.6872 3.17071 13M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 19.3506 15.0602 19.6872 15.1707 20M8.82929 6L15.1707 13M8.82929 13L15.1707 6\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <span>Share</span>\n        </button>\n      </div>\n      <a href=\"/buy/<%= art.id %>\" class=\"detail-buy-btn\">Buy Now</a>\n      <a href=\"/gallery\" class=\"back-to-gallery\">← Back to Gallery</a>\n    </div>\n  </div>\n  <div class=\"art-comments-section\">\n    <h2 class=\"comments-title\">Comments (<span id=\"comments-count\"><%= typeof comments !== 'undefined' ? comments.length : 0 %></span>)</h2>\n    <div class=\"comment-form-wrapper\">\n      <form id=\"comment-form\" class=\"comment-form\" onsubmit=\"submitComment(event, <%= art.id %>)\">\n        <div class=\"comment-input-group\">\n          <textarea id=\"comment-input\" class=\"comment-input\" placeholder=\"Write a comment...\" rows=\"3\" maxlength=\"500\" required></textarea>\n          <div class=\"comment-char-count\"><span id=\"char-count\">0</span>/500</div>\n        </div>\n        <button type=\"submit\" class=\"comment-submit-btn\">Post Comment</button>\n      </form>\n    </div>\n    <div class=\"comments-list\" id=\"comments-list\">\n      <% if (typeof comments !== 'undefined' && comments.length > 0) { %>\n        <% comments.forEach(comment => { %>\n          <div class=\"comment-item\">\n            <div class=\"comment-avatar\">\n              <%= (comment.user_name || 'User').charAt(0).toUpperCase() %>\n            </div>\n            <div class=\"comment-content\">\n              <div class=\"comment-header\">\n                <span class=\"comment-author\"><%= comment.user_name || 'Anonymous' %></span>\n                <span class=\"comment-date\"><%= new Date(comment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) %></span>\n              </div>\n              <p class=\"comment-text\"><%= comment.comment %></p>\n            </div>\n          </div>\n        <% }) %>\n      <% } else { %>\n        <div class=\"no-comments\">\n          <p>No comments yet. Be the first to comment!</p>\n        </div>\n      <% } %>\n    </div>\n  </div>\n</div>\n<script>\nconst artworkId = <%= art.id %>;\n\nfunction toggleLike(artworkId) {\n  fetch('/art/' + artworkId + '/like', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/x-www-form-urlencoded',\n    }\n  })\n  .then(response => response.json())\n  .then(data => {\n    if (data.success) {\n      const likeBtn = document.querySelector('.art-like-btn');\n      const likeCountEl = document.getElementById('like-count');\n      \n      if (data.liked) {\n        likeBtn.classList.add('liked');\n        likeBtn.querySelector('svg path').setAttribute('fill', 'currentColor');\n      } else {\n        likeBtn.classList.remove('liked');\n        likeBtn.querySelector('svg path').setAttribute('fill', 'none');\n      }\n      \n      likeCountEl.textContent = data.likeCount;\n    } else {\n      alert('Error: ' + (data.error || 'Failed to update like'));\n    }\n  })\n  .catch(error => {\n    console.error('Error:', error);\n    alert('An error occurred. Please try again.');\n  });\n}\n\nfunction shareArtwork(artworkId) {\n  const url = window.location.origin + '/art/' + artworkId;\n  const title = '<%= art.title.replace(/'/g, "\\\\'") %>';\n  \n  if (navigator.share) {\n    navigator.share({\n      title: title,\n      text: 'Check out this artwork!',\n      url: url\n    }).catch(err => {\n      console.log('Error sharing:', err);\n      copyToClipboard(url);\n    });\n  } else {\n    copyToClipboard(url);\n  }\n}\n\nfunction copyToClipboard(text) {\n  navigator.clipboard.writeText(text).then(() => {\n    alert('Link copied to clipboard!');\n  }).catch(err => {\n    console.error('Failed to copy:', err);\n    // Fallback for older browsers\n    const textarea = document.createElement('textarea');\n    textarea.value = text;\n    document.body.appendChild(textarea);\n    textarea.select();\n    document.execCommand('copy');\n    document.body.removeChild(textarea);\n    alert('Link copied to clipboard!');\n  });\n}\n\nfunction submitComment(event, artworkId) {\n  event.preventDefault();\n  const commentInput = document.getElementById('comment-input');\n  const comment = commentInput.value.trim();\n  \n  if (!comment) {\n    alert('Please enter a comment');\n    return;\n  }\n  \n  fetch('/art/' + artworkId + '/comment', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify({ comment: comment })\n  })\n  .then(response => response.json())\n  .then(data => {\n    if (data.success) {\n      // Add comment to the list\n      addCommentToDOM(data.comment);\n      commentInput.value = '';\n      document.getElementById('char-count').textContent = '0';\n      updateCommentsCount();\n    } else {\n      alert('Error: ' + (data.error || 'Failed to post comment'));\n    }\n  })\n  .catch(error => {\n    console.error('Error:', error);\n    alert('An error occurred. Please try again.');\n  });\n}\n\nfunction addCommentToDOM(comment) {\n  const commentsList = document.getElementById('comments-list');\n  const noComments = commentsList.querySelector('.no-comments');\n  if (noComments) {\n    noComments.remove();\n  }\n  \n  const commentItem = document.createElement('div');\n  commentItem.className = 'comment-item';\n  const userName = (comment.user_name || 'User').charAt(0).toUpperCase();\n  const displayName = comment.user_name || 'Anonymous';\n  const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });\n  const commentText = comment.comment.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');\n  commentItem.innerHTML = '<div class=\"comment-avatar\">' + userName + '</div><div class=\"comment-content\"><div class=\"comment-header\"><span class=\"comment-author\">' + displayName + '</span><span class=\"comment-date\">' + commentDate + '</span></div><p class=\"comment-text\">' + commentText + '</p></div>';\n  \n  commentsList.insertBefore(commentItem, commentsList.firstChild);\n}\n\nfunction updateCommentsCount() {\n  const commentsList = document.getElementById('comments-list');\n  const comments = commentsList.querySelectorAll('.comment-item');\n  document.getElementById('comments-count').textContent = comments.length;\n}\n\n// Character count for comment input\nconst commentInput = document.getElementById('comment-input');\nconst charCount = document.getElementById('char-count');\nif (commentInput && charCount) {\n  commentInput.addEventListener('input', function() {\n    charCount.textContent = this.value.length;\n  });\n}\n</script>\n<%- include('footer') %>`,

    'buy.ejs': `<%- include('header') %>\n<div class=\"buy-container\">\n  <div class=\"buy-product-details\">\n    <div class=\"buy-product-image-wrapper\">\n      <img src=\"<%= art.image_path %>\" alt=\"<%= art.title %>\" class=\"buy-product-image\">\n    </div>\n    <div class=\"buy-product-info\">\n      <h1 class=\"buy-product-title\"><%= art.title %></h1>\n      <% if (art.description) { %>\n        <p class=\"buy-product-description\"><%= art.description %></p>\n      <% } %>\n      <div class=\"buy-product-price-section\">\n        <span class=\"buy-product-price-label\">Price per unit:</span>\n        <span class=\"buy-product-price\">₹<%= art.price %></span>\n      </div>\n      <div class=\"quantity-selector-section\">\n        <label class=\"quantity-label\">Quantity:</label>\n        <div class=\"quantity-controls\">\n          <button type=\"button\" class=\"quantity-btn quantity-decrease\" onclick=\"decreaseQuantity()\">\n            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M5 12H19\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n          </button>\n          <input type=\"number\" id=\"quantity-input\" class=\"quantity-input\" value=\"1\" min=\"1\" max=\"5\" onchange=\"updatePrice()\" oninput=\"updatePrice()\">\n          <button type=\"button\" class=\"quantity-btn quantity-increase\" onclick=\"increaseQuantity()\">\n            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M12 5V19M5 12H19\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n          </button>\n        </div>\n      </div>\n      <div class=\"buy-product-total-section\">\n        <span class=\"buy-product-total-label\">Total:</span>\n        <span class=\"buy-product-total\" id=\"total-price\">₹<%= art.price %></span>\n      </div>\n      <a href=\"#\" onclick=\"goToPayment(event)\" class=\"buy-now-main-btn\">Buy Now</a>\n      <a href=\"/gallery\" class=\"back-to-gallery-link\">← Back to Gallery</a>\n    </div>\n  </div>\n</div>\n<script>\nconst basePrice = <%= art.price %>;\nconst artworkId = <%= art.id %>;\n\nfunction updatePrice() {\n  const quantityInput = document.getElementById('quantity-input');\n  let quantity = parseInt(quantityInput.value) || 1;\n  \n  if (quantity < 1) quantity = 1;\n  if (quantity > 5) quantity = 5;\n  \n  quantityInput.value = quantity;\n  \n  const total = basePrice * quantity;\n  document.getElementById('total-price').textContent = '₹' + total.toFixed(0);\n  \n  // Update button states\n  document.querySelector('.quantity-decrease').disabled = quantity <= 1;\n  document.querySelector('.quantity-increase').disabled = quantity >= 5;\n}\n\nfunction decreaseQuantity() {\n  const quantityInput = document.getElementById('quantity-input');\n  let quantity = parseInt(quantityInput.value) || 1;\n  if (quantity > 1) {\n    quantityInput.value = quantity - 1;\n    updatePrice();\n  }\n}\n\nfunction increaseQuantity() {\n  const quantityInput = document.getElementById('quantity-input');\n  let quantity = parseInt(quantityInput.value) || 1;\n  if (quantity < 5) {\n    quantityInput.value = quantity + 1;\n    updatePrice();\n  }\n}\n\nfunction goToPayment(event) {\n  event.preventDefault();\n  const quantity = document.getElementById('quantity-input').value;\n  window.location.href = '/buy/' + artworkId + '/payment?quantity=' + quantity;\n}\n\n// Initialize on page load\nupdatePrice();\n</script>\n<%- include('footer') %>`,

    'payment-options.ejs': `<%- include('header') %>\n<div class=\"payment-options-container\">\n  <div class=\"payment-options-content\">\n    <div class=\"payment-artwork-preview\">\n      <img src=\"<%= art.image_path %>\" alt=\"<%= art.title %>\" class=\"payment-preview-image\">\n      <div class=\"payment-preview-info\">\n        <h3><%= art.title %></h3>\n        <p class=\"payment-preview-quantity\">Quantity: <%= typeof quantity !== 'undefined' ? quantity : 1 %></p>\n        <p class=\"payment-preview-price\">Price per unit: ₹<%= art.price %></p>\n        <p class=\"payment-preview-total\">Total: ₹<%= typeof totalPrice !== 'undefined' ? totalPrice.toFixed(0) : art.price %></p>\n      </div>\n    </div>\n    <div class=\"payment-options-wrapper\">\n      <h2 class=\"payment-options-title\">Choose Payment Method</h2>\n      <div class=\"payment-methods\">\n        <a href=\"/buy/<%= art.id %>/checkout?quantity=<%= typeof quantity !== 'undefined' ? quantity : 1 %>\" class=\"payment-method-card\">\n          <div class=\"payment-method-icon\">\n            <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n              <path d=\"M1 10H23\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n          </div>\n          <h3>Cash on Delivery</h3>\n          <p>Pay when you receive your order</p>\n        </a>\n        <div class=\"payment-method-card disabled\">\n          <div class=\"payment-method-icon\">\n            <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n              <path d=\"M7 15H17\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n          </div>\n          <h3>Pay Online</h3>\n          <p>Coming Soon</p>\n          <span class=\"coming-soon-badge\">Soon</span>\n        </div>\n      </div>\n      <a href=\"/buy/<%= art.id %>\" class=\"back-link\">← Back</a>\n    </div>\n  </div>\n</div>\n<%- include('footer') %>`,

    'checkout.ejs': `<%- include('header') %>\n<div class=\"checkout-container\">\n  <div class=\"checkout-content\">\n    <div class=\"checkout-artwork-preview\">\n      <img src=\"<%= art.image_path %>\" alt=\"<%= art.title %>\" class=\"checkout-preview-image\">\n      <div class=\"checkout-preview-info\">\n        <h3><%= art.title %></h3>\n        <p class=\"checkout-preview-quantity\">Quantity: <%= typeof quantity !== 'undefined' ? quantity : 1 %></p>\n        <p class=\"checkout-preview-price\">Price per unit: ₹<%= art.price %></p>\n        <p class=\"checkout-preview-total\">Total: ₹<%= typeof totalPrice !== 'undefined' ? totalPrice.toFixed(0) : art.price %></p>\n        <p class=\"checkout-payment-method\">Payment: Cash on Delivery</p>\n      </div>\n    </div>\n    <div class=\"checkout-form-wrapper\">\n      <h2 class=\"checkout-form-title\">Delivery Information</h2>\n      <% if (errors && errors.length) { %>\n        <ul class=\"errors\">\n          <% errors.forEach(e=>{ %>\n            <li><%= e %></li>\n          <% }) %>\n        </ul>\n      <% } %>\n      <form method=\"post\" action=\"/buy/<%= art.id %>\" class=\"checkout-form\">\n        <input type=\"hidden\" name=\"payment_method\" value=\"cod\">\n        <input type=\"hidden\" name=\"quantity\" value=\"<%= typeof quantity !== 'undefined' ? quantity : 1 %>\">\n        <div class=\"form-group\">\n          <label>Full Name</label>\n          <input type=\"text\" name=\"buyer_name\" value=\"<%= values.buyer_name || '' %>\" placeholder=\"Enter your full name\" required>\n        </div>\n        <div class=\"form-group\">\n          <label>Email (Optional)</label>\n          <input type=\"email\" name=\"buyer_email\" value=\"<%= values.buyer_email || '' %>\" placeholder=\"your.email@example.com\">\n        </div>\n        <div class=\"form-group\">\n          <label>Phone Number</label>\n          <input type=\"tel\" name=\"phone\" value=\"<%= values.phone || '' %>\" placeholder=\"Enter your 10-digit phone number\" required minlength=\"10\" maxlength=\"10\">\n        </div>\n        <div class=\"form-group\">\n          <label>Address Line 1</label>\n          <input type=\"text\" name=\"address1\" value=\"<%= values.address1 || '' %>\" placeholder=\"House/Flat No., Building Name\" required>\n        </div>\n        <div class=\"form-group\">\n          <label>Address Line 2 (Optional)</label>\n          <input type=\"text\" name=\"address2\" value=\"<%= values.address2 || '' %>\" placeholder=\"Street, Area, Landmark\">\n        </div>\n        <div class=\"form-group\">\n          <label>Pin Code</label>\n          <input type=\"text\" name=\"pincode\" value=\"<%= values.pincode || '' %>\" placeholder=\"Enter 6-digit pin code\" required minlength=\"6\" maxlength=\"6\" pattern=\"[0-9]{6}\">\n        </div>\n        <button type=\"submit\" class=\"submit-order-btn\">Place Order</button>\n      </form>\n      <a href=\"/buy/<%= art.id %>/payment?quantity=<%= typeof quantity !== 'undefined' ? quantity : 1 %>\" class=\"back-link\">← Back to Payment Options</a>\n    </div>\n  </div>\n</div>\n<%- include('footer') %>`,

    'order-success.ejs': `<%- include('header') %>\n<div class=\"order-success-container\">\n  <div class=\"order-success-card\">\n    <div class=\"success-icon-wrapper\">\n      <div class=\"success-icon-circle\">\n        <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M20 6L9 17L4 12\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n    </div>\n    <h1 class=\"success-title\">Order Placed Successfully!</h1>\n    <p class=\"success-message\">Thank you for your purchase. Your order has been confirmed and recorded.</p>\n    <div class=\"order-details-box\">\n      <div class=\"order-detail-row\">\n        <span class=\"order-detail-label\">Order ID:</span>\n        <span class=\"order-detail-value\">#<%= orderId %></span>\n      </div>\n      <div class=\"order-detail-row\">\n        <span class=\"order-detail-label\">Artwork:</span>\n        <span class=\"order-detail-value\"><%= art.title %></span>\n      </div>\n    </div>\n    <p class=\"success-note\">The admin will contact you shortly regarding your order. You will receive updates via email.</p>\n    <a href=\"/gallery\" class=\"back-to-gallery-success-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Back to Gallery</span>\n    </a>\n  </div>\n</div>\n<%- include('footer') %>`,

    'login.ejs': `<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title><%= isRegister ? 'Register' : 'Login' %> - Art Shop</title>\n<link rel=\"stylesheet\" href=\"/styles.css\">\n<link rel=\"stylesheet\" href=\"/login.css\">\n<script type=\"module\" src=\"/firebase-init.js\"></script>\n<script>\n// Prevent Firebase errors from blocking page interaction\nwindow.addEventListener('error', function(e) {\n  if (e.message && e.message.includes('firebase')) {\n    console.warn('Firebase error (non-blocking):', e.message);\n    e.preventDefault();\n  }\n}, true);\n</script>\n</head>\n<body class=\"login-page\">\n<div class=\"login-container\">\n  <div class=\"login-card\">\n    <div class=\"login-header\">\n      <h1><%= isRegister ? 'Create Account' : 'Sign in' %></h1>\n      <p class=\"login-subtitle\"><%= isRegister ? 'Join us to start shopping amazing artworks' : 'Welcome back! Sign in to your account' %></p>\n    </div>\n    <% if (error) { %>\n    <div class=\"error-message\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M10 6V10\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M10 14H10.01\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span><%= error %></span>\n    </div>\n    <% } %>\n    <form method=\"post\" action=\"<%= isRegister ? '/register' : '/login' %>\" class=\"login-form\">\n      <% if (isRegister) { %>\n      <div class=\"input-group\">\n        <div class=\"input-icon input-icon-user\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M0 20C0 15.5817 4.47715 12 10 12C15.5228 12 20 15.5817 20 20\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </div>\n        <input type=\"text\" name=\"name\" placeholder=\"Full name (optional)\" autofocus>\n      </div>\n      <% } %>\n      <div class=\"input-group\">\n        <div class=\"input-icon input-icon-email\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M2.5 6.66667L9.0755 11.0504C9.63533 11.4236 10.3647 11.4236 10.9245 11.0504L17.5 6.66667M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </div>\n        <input type=\"email\" name=\"email\" placeholder=\"Email address\" required <%= !isRegister ? 'autofocus' : '' %>>\n      </div>\n      <div class=\"input-group\">\n        <div class=\"input-icon input-icon-password\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M5.83333 9.16667V5.83333C5.83333 4.72876 6.27281 3.66894 7.05301 2.88874C7.8332 2.10854 8.89303 1.66907 9.99767 1.66907C11.1023 1.66907 12.1621 2.10854 12.9423 2.88874C13.7225 3.66894 14.162 4.72876 14.162 5.83333V9.16667\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </div>\n        <input type=\"password\" name=\"password\" placeholder=\"Password\" required>\n      </div>\n      <button type=\"submit\" class=\"login-button\">\n        <span><%= isRegister ? 'Create Account' : 'Get Started' %></span>\n        <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M7.5 15L12.5 10L7.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </button>\n    </form>\n    <div class=\"divider\">\n      <span>Or</span>\n    </div>\n    <button type=\"button\" onclick=\"signInWithGoogle()\" class=\"google-button\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z\" fill=\"#4285F4\"/>\n        <path d=\"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z\" fill=\"#34A853\"/>\n        <path d=\"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z\" fill=\"#FBBC05\"/>\n        <path d=\"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z\" fill=\"#EA4335\"/>\n      </svg>\n      <span>Continue with Google</span>\n    </button>\n    <div class=\"login-footer\">\n      <% if (isRegister) { %>\n        <p>Already have an account? <a href=\"/login\" class=\"link\">Sign in</a></p>\n      <% } else { %>\n        <p>Don't have an account? <a href=\"/register\" class=\"link\">Create one</a></p>\n      <% } %>\n\n    </div>\n  </div>\n  <div class=\"background-shapes\">\n    <div class=\"shape shape-1\"></div>\n    <div class=\"shape shape-2\"></div>\n    <div class=\"shape shape-3\"></div>\n  </div>\n</div>\n</body>\n</html>`,

    'dashboard.ejs': `<%- include('header') %>\n<h2>My Dashboard</h2>\n<p>Welcome, <%= user.name || user.email %>!</p>\n<h3>My Orders</h3>\n<% if (orders.length === 0) { %>\n  <p>You haven't placed any orders yet. <a href=\"/gallery\">Browse our gallery</a> to get started!</p>\n<% } else { %>\n  <table class=\"table\">\n    <tr><th>Order ID</th><th>Artwork</th><th>Title</th><th>Price</th><th>Status</th><th>Date</th></tr>\n    <% orders.forEach(o=>{ %>\n      <tr>\n        <td>#<%= o.id %></td>\n        <td><img src=\"<%= o.image_path %>\" style=\"height:60px\"></td>\n        <td><%= o.title %></td>\n        <td>₹<%= o.price %></td>\n        <td><span class=\"status status-<%= o.status %>\"><%= o.status %></span></td>\n        <td><%= new Date(o.created_at).toLocaleDateString() %></td>\n      </tr>\n    <% }) %>\n  </table>\n<% } %>\n<%- include('footer') %>`,

    'help.ejs': `<%- include('header') %>\n<%- include('partials/alerts') %>\n<div class=\"help-container\">\n  <div class=\"help-header\">\n    <h1 class=\"help-title\">Help & Support</h1>\n    <p class=\"help-subtitle\">We're here to help! Contact us with any questions or issues you may have.</p>\n  </div>\n  \n  <% if (success) { %>\n    <div class=\"help-success-message\">\n      <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\"/>\n        <path d=\"M8 12L11 15L16 9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span><%= success %></span>\n    </div>\n  <% } %>\n  \n  <% if (error) { %>\n    <div class=\"help-error-message\">\n      <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\"/>\n        <path d=\"M12 8V12M12 16H12.01\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n      </svg>\n      <span><%= error %></span>\n    </div>\n  <% } %>\n  \n  <div class=\"help-content\">\n    <div class=\"help-info-section\">\n      <div class=\"help-info-card\">\n        <div class=\"help-info-icon\">\n          <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </div>\n        <h3>Get Help</h3>\n        <p>Have a question about an order, artwork, or need assistance? Fill out the form and we'll get back to you as soon as possible.</p>\n      </div>\n      \n      <div class=\"help-info-card\">\n        <div class=\"help-info-icon\">\n          <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n        </div>\n        <h3>Quick Response</h3>\n        <p>We typically respond within 24-48 hours. For urgent matters, please include "URGENT" in your subject line.</p>\n      </div>\n      \n      <div class=\"help-info-card\">\n        <div class=\"help-info-icon\">\n          <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M9 12l2 2 4-4\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M3 12h18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n          </svg>\n        </div>\n        <h3>Common Issues</h3>\n        <p>Order tracking, payment issues, artwork inquiries, shipping questions, or account problems - we're here to help with everything.</p>\n      </div>\n    </div>\n    \n    <div class=\"help-form-section\">\n      <div class=\"help-form-card\">\n        <h2 class=\"help-form-title\">Contact Us</h2>\n        <p class=\"help-form-subtitle\">Fill out the form below and we'll respond as soon as possible.</p>\n        \n        <form method=\"POST\" action=\"/help\" class=\"help-form\">\n          <div class=\"form-group\">\n            <label for=\"user-email\">Your Email</label>\n            <input type=\"email\" id=\"user-email\" value=\"<%= user.email %>\" disabled class=\"form-input-disabled\">\n            <small class=\"form-hint\">This is your registered email address</small>\n          </div>\n          \n          <div class=\"form-group\">\n            <label for=\"subject\">Subject <span class=\"required\">*</span></label>\n            <input type=\"text\" id=\"subject\" name=\"subject\" placeholder=\"e.g., Order Issue, Artwork Question, Payment Problem\" required class=\"form-input\" value=\"<%= typeof values !== 'undefined' && values.subject ? values.subject : '' %>\">\n          </div>\n          \n          <div class=\"form-group\">\n            <label for=\"message\">Message <span class=\"required\">*</span></label>\n            <textarea id=\"message\" name=\"message\" rows=\"8\" placeholder=\"Please describe your issue or question in detail...\" required class=\"form-textarea\"><%= typeof values !== 'undefined' && values.message ? values.message : '' %></textarea>\n            <small class=\"form-hint\">Minimum 10 characters. Be as detailed as possible to help us assist you better.</small>\n          </div>\n          \n          <button type=\"submit\" class=\"help-submit-btn\">\n            <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M22 2L11 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n              <path d=\"M22 2l-7 20-4-9-9-4 20-7z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n            <span>Send Message</span>\n          </button>\n        </form>\n      </div>\n    </div>\n  </div>\n  \n  <div class=\"help-back-section\">\n    <a href=\"/gallery\" class=\"help-back-link\">\n      <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Back to Gallery</span>\n    </a>\n  </div>\n</div>\n<%- include('footer') %>`,

    'admin-dashboard.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">Dashboard</h1>\n        <p class=\"admin-subtitle\">Manage your artworks and orders</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <div class=\"admin-stats\">\n    <div class=\"stat-card\">\n      <div class=\"stat-icon stat-icon-artworks\">\n        <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n      <div class=\"stat-content\">\n        <p class=\"stat-label\">Total Artworks</p>\n        <p class=\"stat-value\"><%= artworks.length %></p>\n      </div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-icon stat-icon-orders\">\n        <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M9 11L12 14L22 4\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n      <div class=\"stat-content\">\n        <p class=\"stat-label\">Total Orders</p>\n        <p class=\"stat-value\"><%= orders.length %></p>\n      </div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-icon stat-icon-pending\">\n        <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M12 6V12L16 14\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n      <div class=\"stat-content\">\n        <p class=\"stat-label\">Pending Orders</p>\n        <p class=\"stat-value\"><%= orders.filter(o => o.status === 'pending').length %></p>\n      </div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-icon stat-icon-delivered\">\n        <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M20 6L9 17L4 12\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n      <div class=\"stat-content\">\n        <p class=\"stat-label\">Delivered</p>\n        <p class=\"stat-value\"><%= orders.filter(o => o.status === 'delivered').length %></p>\n      </div>\n    </div>\n    <div class=\"stat-card\">\n      <div class=\"stat-icon stat-icon-support\">\n        <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n      </div>\n      <div class=\"stat-content\">\n        <p class=\"stat-label\">Support Messages</p>\n        <p class=\"stat-value\"><%= typeof supportMessages !== 'undefined' ? supportMessages.length : 0 %></p>\n      </div>\n    </div>\n  </div>\n  <div class=\"admin-actions\">\n    <a href=\"/admin/new-art\" class=\"admin-action-btn admin-add-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M12 5V19M5 12H19\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Add New Artwork</span>\n    </a>\n    <a href=\"/admin/artworks\" class=\"admin-action-btn admin-artworks-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>My All Artworks</span>\n    </a>\n    <a href=\"/admin/orders\" class=\"admin-action-btn admin-orders-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 11L12 14L22 4\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>All Orders</span>\n    </a>\n    <a href=\"/admin/users\" class=\"admin-action-btn admin-users-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Users</span>\n    </a>\n  </div>\n  <div class=\"admin-sections\">\n    <div class=\"admin-section\">\n      <div class=\"section-header\">\n        <h2 class=\"section-title\">Artworks</h2>\n        <span class=\"section-count\"><%= artworks.length %> items</span>\n      </div>\n      <% if (artworks.length === 0) { %>\n        <div class=\"empty-state\">\n          <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <h3>No artworks yet</h3>\n          <p>Start by adding your first artwork</p>\n          <a href=\"/admin/new-art\" class=\"empty-state-btn\">Add Artwork</a>\n        </div>\n      <% } else { %>\n        <div class=\"artworks-grid-admin\">\n          <% artworks.forEach(a=>{ %>\n            <div class=\"artwork-card-admin\">\n              <div class=\"artwork-image-admin\">\n                <img src=\"<%= a.image_path %>\" alt=\"<%= a.title %>\">\n              </div>\n              <div class=\"artwork-details-admin\">\n                <h3 class=\"artwork-title-admin\"><%= a.title %></h3>\n                <p class=\"artwork-price-admin\">₹<%= a.price %></p>\n                <p class=\"artwork-id-admin\">ID: #<%= a.id %></p>\n              </div>\n              <div class=\"artwork-actions-admin\">\n                <div class=\"artwork-buttons-wrapper\">\n                  <a href=\"/admin/art/<%= a.id %>/edit\" class=\"edit-btn\">\n                    <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                      <path d=\"M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                      <path d=\"M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                    </svg>\n                    Edit\n                  </a>\n                  <button type=\"button\" onclick=\"showDeleteModal(<%= a.id %>, '<%= a.title.replace(/'/g, "\\'") %>')\" class=\"delete-btn\">\n                      <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                        <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                      </svg>\n                      Delete\n                    </button>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"admin-section\">\n      <div class=\"section-header\">\n        <h2 class=\"section-title\">Orders</h2>\n        <span class=\"section-count\"><%= orders.length %> orders</span>\n      </div>\n      <% if (orders.length === 0) { %>\n        <div class=\"empty-state\">\n          <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M9 11L12 14L22 4\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <h3>No orders yet</h3>\n          <p>Orders will appear here when customers place them</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% orders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"admin-section\">\n      <div class=\"section-header\">\n        <h2 class=\"section-title\">Support Messages</h2>\n        <span class=\"section-count\"><%= typeof supportMessages !== 'undefined' ? supportMessages.length : 0 %> messages</span>\n      </div>\n      <% if (typeof supportMessages === 'undefined' || supportMessages.length === 0) { %>\n        <div class=\"empty-state\">\n          <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <h3>No support messages yet</h3>\n          <p>Support messages from users will appear here</p>\n        </div>\n      <% } else { %>\n        <div class=\"support-messages-list\">\n          <% supportMessages.forEach(msg => { %>\n            <div class=\"support-message-card\">\n              <div class=\"support-message-header\">\n                <div class=\"support-message-id-badge\">Message #<%= msg.id %></div>\n                <span class=\"support-message-status-badge support-message-status-<%= msg.status %>\"><%= msg.status %></span>\n              </div>\n              <div class=\"support-message-content\">\n                <div class=\"support-message-info\">\n                  <div class=\"support-message-detail-item\">\n                    <span class=\"support-message-detail-label\">From:</span>\n                    <span class=\"support-message-detail-value\"><%= msg.user_name %></span>\n                  </div>\n                  <div class=\"support-message-detail-item\">\n                    <span class=\"support-message-detail-label\">Email:</span>\n                    <span class=\"support-message-detail-value\"><%= msg.user_email %></span>\n                  </div>\n                  <div class=\"support-message-detail-item\">\n                    <span class=\"support-message-detail-label\">Date & Time:</span>\n                    <span class=\"support-message-detail-value\"><%= new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"support-message-subject\">\n                  <h4 class=\"support-message-subject-title\"><%= msg.subject %></h4>\n                </div>\n                <div class=\"support-message-text\">\n                  <p><%= msg.message %></p>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<div id=\"deleteModal\" class=\"logout-modal-overlay\" onclick=\"closeDeleteModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\" style=\"background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 4px 12px rgba(239,68,68,0.4)\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\" id=\"deleteModalMessage\">You are about to delete this artwork. This action cannot be undone.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeDeleteModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmDelete()\" class=\"logout-modal-confirm\" style=\"background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 4px 8px rgba(239,68,68,0.4)\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Delete</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\nlet deleteArtworkId = null;\nfunction showDeleteModal(id, title) {\n  deleteArtworkId = id;\n  document.getElementById('deleteModalMessage').textContent = 'You are about to delete \"' + title + '\". This action cannot be undone.';\n  document.getElementById('deleteModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeDeleteModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('deleteModal').style.display = 'none';\n  document.body.style.overflow = '';\n  deleteArtworkId = null;\n}\nfunction confirmDelete() {\n  if (deleteArtworkId) {\n    const form = document.createElement('form');\n    form.method = 'POST';\n    form.action = '/admin/art/' + deleteArtworkId + '/delete';\n    document.body.appendChild(form);\n    form.submit();\n  }\n}\nfunction filterOrders(status) {\n  // Hide all sections\n  document.querySelectorAll('.order-status-section').forEach(section => {\n    section.style.display = 'none';\n  });\n  \n  // Remove active class from all buttons\n  document.querySelectorAll('.order-filter-btn').forEach(btn => {\n    btn.classList.remove('active');\n  });\n  \n  // Show selected section\n  const section = document.getElementById('section-' + status);\n  if (section) {\n    section.style.display = 'block';\n  }\n  \n  // Add active class to clicked button\n  const btn = document.querySelector('[data-filter=\"' + status + '\"]');\n  if (btn) {\n    btn.classList.add('active');\n  }\n  \n  // Scroll to top of section\n  if (section) {\n    section.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  }\n}\n</script>\n<%- include('footer') %>`,

    'admin-new-art.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">Add New Artwork</h1>\n        <p class=\"admin-subtitle\">Create and add a new artwork to your gallery</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <a href=\"/admin\" class=\"admin-back-btn\">\n    <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </svg>\n    <span>Back to Dashboard</span>\n  </a>\n  <div class=\"admin-form-container\">\n    <% if (error) { %>\n      <div class=\"form-error\">\n        <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M12 8V12M12 16H12.01\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span><%= error %></span>\n      </div>\n    <% } %>\n    <form method=\"post\" enctype=\"multipart/form-data\" class=\"admin-artwork-form\">\n      <div class=\"form-group-admin\">\n        <label for=\"title\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Artwork Title\n        </label>\n        <input type=\"text\" id=\"title\" name=\"title\" class=\"form-input-admin\" placeholder=\"Enter artwork title\" required>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"description\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M14 2V8H20\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M16 13H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M16 17H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M10 9H9H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Description\n        </label>\n        <textarea id=\"description\" name=\"description\" class=\"form-textarea-admin\" placeholder=\"Enter artwork description\" rows=\"6\" required></textarea>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"price\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Price (₹)\n        </label>\n        <input type=\"number\" id=\"price\" name=\"price\" class=\"form-input-admin\" placeholder=\"0.00\" step=\"0.01\" min=\"0\" required>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"image\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M18 8L15 5H12L9 8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M12 5V13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M15 8H18V11\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Artwork Image\n        </label>\n        <div class=\"file-upload-wrapper\">\n          <input type=\"file\" id=\"image\" name=\"image\" class=\"form-file-input\" accept=\"image/*\" required>\n          <label for=\"image\" class=\"file-upload-label\">\n            <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n              <path d=\"M12 11V17M9 14H15\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n            <span class=\"file-upload-text\">Choose Image File</span>\n            <span class=\"file-upload-hint\">PNG, JPG, WEBP up to 10MB</span>\n          </label>\n        </div>\n      </div>\n      <div class=\"form-actions\">\n        <button type=\"submit\" class=\"submit-artwork-btn\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <span>Add Artwork</span>\n        </button>\n        <a href=\"/admin\" class=\"cancel-btn\">Cancel</a>\n      </div>\n    </form>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\n</script>\n<%- include('footer') %>`,

    'admin-artworks.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">All Artworks</h1>\n        <p class=\"admin-subtitle\">Manage and view all your artworks</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <a href=\"/admin\" class=\"admin-back-btn\">\n    <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </svg>\n    <span>Back to Dashboard</span>\n  </a>\n  <div class=\"admin-actions\">\n    <a href=\"/admin/new-art\" class=\"admin-action-btn admin-add-btn\">\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M12 5V19M5 12H19\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n      <span>Add New Artwork</span>\n    </a>\n  </div>\n  <div class=\"admin-section\">\n    <div class=\"section-header\">\n      <h2 class=\"section-title\">All Artworks</h2>\n      <span class=\"section-count\"><%= artworks.length %> items</span>\n    </div>\n    <% if (artworks.length === 0) { %>\n      <div class=\"empty-state\">\n        <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <h3>No artworks yet</h3>\n        <p>Start by adding your first artwork</p>\n        <a href=\"/admin/new-art\" class=\"empty-state-btn\">Add Artwork</a>\n      </div>\n    <% } else { %>\n      <div class=\"artworks-grid-admin\">\n        <% artworks.forEach(a=>{ %>\n          <div class=\"artwork-card-admin\">\n            <div class=\"artwork-image-admin\">\n              <img src=\"<%= a.image_path %>\" alt=\"<%= a.title %>\">\n            </div>\n            <div class=\"artwork-details-admin\">\n              <h3 class=\"artwork-title-admin\"><%= a.title %></h3>\n              <p class=\"artwork-price-admin\">₹<%= a.price %></p>\n              <p class=\"artwork-id-admin\">ID: #<%= a.id %></p>\n            </div>\n            <div class=\"artwork-actions-admin\">\n              <div class=\"artwork-buttons-wrapper\">\n                <a href=\"/admin/art/<%= a.id %>/edit\" class=\"edit-btn\">\n                  <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path d=\"M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                    <path d=\"M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                  </svg>\n                  Edit\n                </a>\n                <button type=\"button\" onclick=\"showDeleteModal(<%= a.id %>, '<%= a.title.replace(/'/g, "\\'") %>')\" class=\"delete-btn\">\n                    <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                      <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                    </svg>\n                    Delete\n                  </button>\n              </div>\n            </div>\n          </div>\n        <% }) %>\n      </div>\n    <% } %>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<div id=\"deleteModal\" class=\"logout-modal-overlay\" onclick=\"closeDeleteModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\" style=\"background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 4px 12px rgba(239,68,68,0.4)\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\" id=\"deleteModalMessage\">You are about to delete this artwork. This action cannot be undone.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeDeleteModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmDelete()\" class=\"logout-modal-confirm\" style=\"background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 4px 8px rgba(239,68,68,0.4)\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Delete</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\nlet deleteArtworkId = null;\nfunction showDeleteModal(id, title) {\n  deleteArtworkId = id;\n  document.getElementById('deleteModalMessage').textContent = 'You are about to delete \"' + title + '\". This action cannot be undone.';\n  document.getElementById('deleteModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeDeleteModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('deleteModal').style.display = 'none';\n  document.body.style.overflow = '';\n  deleteArtworkId = null;\n}\nfunction confirmDelete() {\n  if (deleteArtworkId) {\n    const form = document.createElement('form');\n    form.method = 'POST';\n    form.action = '/admin/art/' + deleteArtworkId + '/delete';\n    document.body.appendChild(form);\n    form.submit();\n  }\n}\n</script>\n<%- include('footer') %>`,

    'admin-edit-art.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">Edit Artwork</h1>\n        <p class=\"admin-subtitle\">Update artwork details and information</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <a href=\"/admin/artworks\" class=\"admin-back-btn\">\n    <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </svg>\n    <span>Back to Artworks</span>\n  </a>\n  <div class=\"admin-form-container\">\n    <% if (error) { %>\n      <div class=\"form-error\">\n        <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <circle cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M12 8V12M12 16H12.01\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span><%= error %></span>\n      </div>\n    <% } %>\n    <form method=\"post\" enctype=\"multipart/form-data\" class=\"admin-artwork-form\">\n      <div class=\"form-group-admin\">\n        <label for=\"title\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M4 19.5C4 18.3954 4.89543 17.5 6 17.5H18C19.1046 17.5 20 18.3954 20 19.5C20 20.6046 19.1046 21.5 18 21.5H6C4.89543 21.5 4 20.6046 4 19.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M4 4.5C4 3.39543 4.89543 2.5 6 2.5H18C19.1046 2.5 20 3.39543 20 4.5C20 5.60457 19.1046 6.5 18 6.5H6C4.89543 6.5 4 5.60457 4 4.5Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Artwork Title\n        </label>\n        <input type=\"text\" id=\"title\" name=\"title\" class=\"form-input-admin\" placeholder=\"Enter artwork title\" value=\"<%= artwork.title %>\" required>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"description\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M14 2V8H20\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M16 13H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M16 17H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M10 9H9H8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Description\n        </label>\n        <textarea id=\"description\" name=\"description\" class=\"form-textarea-admin\" placeholder=\"Enter artwork description\" rows=\"6\" required><%= artwork.description || '' %></textarea>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"price\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Price (₹)\n        </label>\n        <input type=\"number\" id=\"price\" name=\"price\" class=\"form-input-admin\" placeholder=\"0.00\" step=\"0.01\" min=\"0\" value=\"<%= artwork.price %>\" required>\n      </div>\n      <div class=\"form-group-admin\">\n        <label for=\"image\" class=\"form-label-admin\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M18 8L15 5H12L9 8\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M12 5V13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M15 8H18V11\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          Artwork Image (Optional - leave empty to keep current image)\n        </label>\n        <div class=\"file-upload-wrapper\">\n          <input type=\"file\" id=\"image\" name=\"image\" class=\"form-file-input\" accept=\"image/*\">\n          <label for=\"image\" class=\"file-upload-label\">\n            <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n              <path d=\"M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n              <path d=\"M12 11V17M9 14H15\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            </svg>\n            <span class=\"file-upload-text\">Choose New Image (Optional)</span>\n            <span class=\"file-upload-hint\">Leave empty to keep current image: <%= artwork.image_path %></span>\n          </label>\n        </div>\n        <div style=\"margin-top:12px;padding:12px;background:#0a0a0a;border-radius:8px;border:1px solid #2a2a2a\">\n          <p style=\"margin:0 0 8px;font-size:13px;color:#9ca3af;font-weight:600\">Current Image:</p>\n          <img src=\"<%= artwork.image_path %>\" alt=\"Current artwork\" style=\"max-width:200px;height:auto;border-radius:8px;border:1px solid #2a2a2a\">\n        </div>\n      </div>\n      <div class=\"form-actions\">\n        <button type=\"submit\" class=\"submit-artwork-btn\">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <span>Update Artwork</span>\n        </button>\n        <a href=\"/admin/artworks\" class=\"cancel-btn\">Cancel</a>\n      </div>\n    </form>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\n</script>\n<%- include('footer') %>`,

    'admin-orders.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">All Orders</h1>\n        <p class=\"admin-subtitle\">View and manage all customer orders</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <a href=\"/admin\" class=\"admin-back-btn\">\n    <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </svg>\n    <span>Back to Dashboard</span>\n  </a>\n  <% \n    const allOrders = orders || [];\n    const pendingOrders = allOrders.filter(o => o.status === 'pending');\n    const acceptedOrders = allOrders.filter(o => o.status === 'accepted');\n    const shippedOrders = allOrders.filter(o => o.status === 'shipped');\n    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');\n  %>\n  <div class=\"order-filters\">\n    <button class=\"order-filter-btn active\" data-filter=\"all\" onclick=\"filterOrders('all')\">\n      <span>All Orders</span>\n      <span class=\"filter-count\">(<%= allOrders.length %>)</span>\n    </button>\n    <button class=\"order-filter-btn\" data-filter=\"pending\" onclick=\"filterOrders('pending')\">\n      <span>Pending</span>\n      <span class=\"filter-count\">(<%= pendingOrders.length %>)</span>\n    </button>\n    <button class=\"order-filter-btn\" data-filter=\"accepted\" onclick=\"filterOrders('accepted')\">\n      <span>Accepted</span>\n      <span class=\"filter-count\">(<%= acceptedOrders.length %>)</span>\n    </button>\n    <button class=\"order-filter-btn\" data-filter=\"shipped\" onclick=\"filterOrders('shipped')\">\n      <span>Shipped</span>\n      <span class=\"filter-count\">(<%= shippedOrders.length %>)</span>\n    </button>\n    <button class=\"order-filter-btn\" data-filter=\"delivered\" onclick=\"filterOrders('delivered')\">\n      <span>Delivered</span>\n      <span class=\"filter-count\">(<%= deliveredOrders.length %>)</span>\n    </button>\n  </div>\n  <div class=\"orders-sections\">\n    <div class=\"order-status-section\" id=\"section-all\" data-section=\"all\">\n      <div class=\"order-section-header\">\n        <h2 class=\"order-section-title\">All Orders</h2>\n        <span class=\"order-section-count\"><%= allOrders.length %> orders</span>\n      </div>\n      <% if (allOrders.length === 0) { %>\n        <div class=\"empty-state\">\n          <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M9 11L12 14L22 4\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n            <path d=\"M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          </svg>\n          <h3>No orders yet</h3>\n          <p>Orders will appear here when customers place them</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% allOrders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"order-status-section\" id=\"section-pending\" data-section=\"pending\" style=\"display:none;\">\n      <div class=\"order-section-header\">\n        <h2 class=\"order-section-title\">Pending Orders</h2>\n        <span class=\"order-section-count\"><%= pendingOrders.length %> orders</span>\n      </div>\n      <% if (pendingOrders.length === 0) { %>\n        <div class=\"empty-state-small\">\n          <p>No pending orders</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% pendingOrders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"order-status-section\" id=\"section-accepted\" data-section=\"accepted\" style=\"display:none;\">\n      <div class=\"order-section-header\">\n        <h2 class=\"order-section-title\">Accepted Orders</h2>\n        <span class=\"order-section-count\"><%= acceptedOrders.length %> orders</span>\n      </div>\n      <% if (acceptedOrders.length === 0) { %>\n        <div class=\"empty-state-small\">\n          <p>No accepted orders</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% acceptedOrders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"order-status-section\" id=\"section-shipped\" data-section=\"shipped\" style=\"display:none;\">\n      <div class=\"order-section-header\">\n        <h2 class=\"order-section-title\">Shipped Orders</h2>\n        <span class=\"order-section-count\"><%= shippedOrders.length %> orders</span>\n      </div>\n      <% if (shippedOrders.length === 0) { %>\n        <div class=\"empty-state-small\">\n          <p>No shipped orders</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% shippedOrders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n    <div class=\"order-status-section\" id=\"section-delivered\" data-section=\"delivered\" style=\"display:none;\">\n      <div class=\"order-section-header\">\n        <h2 class=\"order-section-title\">Delivered Orders</h2>\n        <span class=\"order-section-count\"><%= deliveredOrders.length %> orders</span>\n      </div>\n      <% if (deliveredOrders.length === 0) { %>\n        <div class=\"empty-state-small\">\n          <p>No delivered orders</p>\n        </div>\n      <% } else { %>\n        <div class=\"orders-list\">\n          <% deliveredOrders.forEach(o=>{ %>\n            <div class=\"order-card\">\n              <div class=\"order-header\">\n                <div class=\"order-id-badge\">Order #<%= o.id %></div>\n                <span class=\"order-status-badge order-status-<%= o.status %>\"><%= o.status %></span>\n              </div>\n              <div class=\"order-content\">\n                <div class=\"order-artwork\">\n                  <img src=\"<%= o.image_path %>\" alt=\"<%= o.title %>\" class=\"order-artwork-image\">\n                  <div class=\"order-artwork-info\">\n                    <h4><%= o.title %></h4>\n                  </div>\n                </div>\n                <div class=\"order-details\">\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Buyer:</span>\n                    <span class=\"order-detail-value\"><%= o.buyer_name %></span>\n                    <% if (o.buyer_email) { %>\n                      <span class=\"order-detail-email\"><%= o.buyer_email %></span>\n                    <% } %>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Phone:</span>\n                    <span class=\"order-detail-value\"><%= o.phone %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Address:</span>\n                    <span class=\"order-detail-value\"><%= o.address %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Payment:</span>\n                    <span class=\"order-detail-value order-payment-badge\"><%= o.payment_method.toUpperCase() %></span>\n                  </div>\n                  <div class=\"order-detail-item\">\n                    <span class=\"order-detail-label\">Date & Time:</span>\n                    <span class=\"order-detail-value\"><%= new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) %></span>\n                  </div>\n                </div>\n                <div class=\"order-actions\">\n                  <form method=\"post\" action=\"/admin/order/<%= o.id %>/status\" class=\"order-status-form\">\n                    <select name=\"status\" class=\"order-status-select\">\n                      <option value=\"pending\" <%= o.status==='pending'?'selected':'' %>>Pending</option>\n                      <option value=\"accepted\" <%= o.status==='accepted'?'selected':'' %>>Accepted</option>\n                      <option value=\"shipped\" <%= o.status==='shipped'?'selected':'' %>>Shipped</option>\n                      <option value=\"delivered\" <%= o.status==='delivered'?'selected':'' %>>Delivered</option>\n                    </select>\n                    <button type=\"submit\" class=\"update-status-btn\">Update Status</button>\n                  </form>\n                </div>\n              </div>\n            </div>\n          <% }) %>\n        </div>\n      <% } %>\n    </div>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\nfunction filterOrders(status) {\n  // Hide all sections\n  document.querySelectorAll('.order-status-section').forEach(section => {\n    section.style.display = 'none';\n  });\n  \n  // Remove active class from all buttons\n  document.querySelectorAll('.order-filter-btn').forEach(btn => {\n    btn.classList.remove('active');\n  });\n  \n  // Show selected section\n  const section = document.getElementById('section-' + status);\n  if (section) {\n    section.style.display = 'block';\n  }\n  \n  // Add active class to clicked button\n  const btn = document.querySelector('[data-filter=\"' + status + '\"]');\n  if (btn) {\n    btn.classList.add('active');\n  }\n  \n  // Scroll to top of section\n  if (section) {\n    section.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  }\n}\n</script>\n<%- include('footer') %>`,

    'admin-users.ejs': `<%- include('header') %>\n<div class=\"admin-container\">\n  <div class=\"admin-header\">\n    <div class=\"admin-header-content\">\n      <div>\n        <h1 class=\"admin-title\">All Users</h1>\n        <p class=\"admin-subtitle\">View all registered users and their Gmail addresses</p>\n      </div>\n      <button onclick=\"showLogoutModal()\" class=\"admin-logout-btn\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M17 10H7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M14 7L17 10L14 13\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Logout</span>\n      </button>\n    </div>\n  </div>\n  <a href=\"/admin\" class=\"admin-back-btn\">\n    <svg width=\"18\" height=\"18\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M12.5 15L7.5 10L12.5 5\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </svg>\n    <span>Back to Dashboard</span>\n  </a>\n  <div class=\"admin-section\">\n    <div class=\"section-header\">\n      <h2 class=\"section-title\">Registered Users</h2>\n      <span class=\"section-count\"><%= users.length %> users</span>\n    </div>\n    <% if (users.length === 0) { %>\n      <div class=\"empty-state\">\n        <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n          <path d=\"M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88\" stroke=\"#9ca3af\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <h3>No users yet</h3>\n        <p>Users will appear here when they register or log in</p>\n      </div>\n    <% } else { %>\n      <div class=\"users-list\">\n        <% users.forEach(user => { %>\n          <div class=\"user-card\">\n            <div class=\"user-avatar\">\n              <%= (user.email || 'U').charAt(0).toUpperCase() %>\n            </div>\n            <div class=\"user-info\">\n              <div class=\"user-email\"><%= user.email %></div>\n              <% if (user.name) { %>\n                <div class=\"user-name\"><%= user.name %></div>\n              <% } %>\n              <div class=\"user-date\">Joined: <%= new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) %></div>\n            </div>\n            <div class=\"user-id-badge\">ID: #<%= user.id %></div>\n          </div>\n        <% }) %>\n      </div>\n    <% } %>\n  </div>\n</div>\n<div id=\"logoutModal\" class=\"logout-modal-overlay\" onclick=\"closeLogoutModal(event)\">\n  <div class=\"logout-modal-content\" onclick=\"event.stopPropagation()\">\n    <div class=\"logout-modal-icon\">\n      <svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M16 17L21 12L16 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <path d=\"M21 12H9\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </svg>\n    </div>\n    <h2 class=\"logout-modal-title\">Are you sure?</h2>\n    <p class=\"logout-modal-message\">You are about to logout from your admin account. This action will end your current session.</p>\n    <div class=\"logout-modal-actions\">\n      <button onclick=\"closeLogoutModal()\" class=\"logout-modal-cancel\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M18 6L6 18M6 6L18 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Cancel</span>\n      </button>\n      <button onclick=\"confirmLogout()\" class=\"logout-modal-confirm\">\n        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n          <path d=\"M5 13L9 17L19 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        </svg>\n        <span>Yes, Logout</span>\n      </button>\n    </div>\n  </div>\n</div>\n<script>\nfunction showLogoutModal() {\n  document.getElementById('logoutModal').style.display = 'flex';\n  document.body.style.overflow = 'hidden';\n}\nfunction closeLogoutModal(event) {\n  if (event && event.target !== event.currentTarget) return;\n  document.getElementById('logoutModal').style.display = 'none';\n  document.body.style.overflow = '';\n}\nfunction confirmLogout() {\n  window.location.href = '/logout';\n}\n</script>\n<%- include('footer') %>`,

    'partials/alerts.ejs': ``
  };

  Object.entries(templates).forEach(([name, content]) => {
    const p = path.join(viewsDir, name);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Always overwrite to ensure correct syntax
    fs.writeFileSync(p, content);
  });

  // basic public css
  const pubDir = path.join(__dirname, 'public');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir);
  // Always overwrite styles.css to ensure logout button styles are included
  const cssPath = path.join(pubDir, 'styles.css');
  const stylesCss = `*{box-sizing:border-box}html,body{width:100%;overflow-x:hidden}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;background:#0a0a0a;color:#fff;line-height:1.6;min-height:100vh}header{background:#1a1a1a;color:#fff;padding:16px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.1);position:sticky;top:0;z-index:100}header h1{margin:0;font-size:24px;font-weight:700}header h1 a{color:#fff;text-decoration:none;transition:opacity 0.2s}header h1 a:hover{opacity:0.8}nav{float:right;display:flex;gap:20px;align-items:center}nav a{color:#fff;text-decoration:none;font-size:15px;font-weight:500;transition:opacity 0.2s;padding:6px 0}nav a:hover{opacity:0.8}.help-support-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;transition:all 0.3s ease;box-shadow:0 4px 14px rgba(102,126,234,0.4);border:1px solid rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.help-support-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5);opacity:1}.help-support-btn svg{width:18px;height:18px;flex-shrink:0}.user-logout-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;border:2px solid rgba(239,68,68,0.3);border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(239,68,68,0.3)}.user-logout-btn:hover{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);border-color:rgba(239,68,68,0.5);transform:translateY(-2px);box-shadow:0 6px 16px rgba(239,68,68,0.5)}.user-logout-btn svg{width:18px;height:18px;flex-shrink:0}main{padding:0;min-height:calc(100vh - 200px)}footer{display:none}.errors{color:#dc2626;list-style:none;padding:0;margin:12px 0}.errors li{padding:8px 0}.table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.table td,.table th{border:1px solid #e5e7eb;padding:12px;text-align:left}.table th{background:#f9fafb;font-weight:600;color:#374151}.table tr:hover{background:#f9fafb}.logout-btn:hover{background:#b91c1c!important;transform:translateY(-1px);box-shadow:0 4px 8px rgba(220,38,38,0.3)}.logout-btn:active{transform:translateY(0)}.gallery-container{max-width:1400px;margin:0 auto;padding:40px 24px}.gallery-header{text-align:center;margin-bottom:48px}.gallery-title{font-size:42px;font-weight:700;color:#fff;margin:0 0 12px;letter-spacing:-0.5px}.gallery-subtitle{font-size:18px;color:#9ca3af;margin:0}.gallery-search-wrapper{margin-bottom:40px;max-width:600px;margin-left:auto;margin-right:auto}.gallery-search-container{position:relative;display:flex;align-items:center;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:12px 20px;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.3)}.gallery-search-container:focus-within{border-color:#3a3a3a;box-shadow:0 6px 20px rgba(0,0,0,0.5);background:#1f1f1f}.search-icon{position:absolute;left:20px;color:#9ca3af;flex-shrink:0;pointer-events:none;transition:color 0.3s ease}.gallery-search-container:focus-within .search-icon{color:#fff}.gallery-search-input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:16px;padding:0 40px 0 36px;width:100%;font-family:inherit}.gallery-search-input::placeholder{color:#6b7280}.search-clear-btn{position:absolute;right:12px;background:transparent;border:none;color:#9ca3af;cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.2s ease;flex-shrink:0}.search-clear-btn:hover{background:#2a2a2a;color:#fff;transform:scale(1.1)}.search-results-count{text-align:center;margin-top:12px;font-size:14px;color:#9ca3af;min-height:20px}.gallery-filters{display:flex;gap:12px;justify-content:center;margin:32px auto;max-width:600px;flex-wrap:wrap}.gallery-filter-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#1a1a1a;color:#9ca3af;border:1px solid #2a2a2a;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;transition:all 0.3s ease;box-shadow:0 2px 4px rgba(0,0,0,0.3)}.gallery-filter-btn:hover{background:#2a2a2a;border-color:#3a3a3a;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.5);color:#fff}.gallery-filter-btn.active{background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;border-color:rgba(102,126,234,0.5);box-shadow:0 4px 12px rgba(102,126,234,0.5);animation:gradientShift 3s ease infinite}.gallery-filter-btn.active:hover{background-position:100% 50%;box-shadow:0 6px 16px rgba(102,126,234,0.7)}.gallery-filter-btn svg{width:18px;height:18px;flex-shrink:0}.like-btn{position:absolute;top:12px;right:12px;width:40px;height:40px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.3s ease;z-index:10;color:#fff}.like-btn:hover{background:rgba(0,0,0,0.8);transform:scale(1.1)}.like-btn.liked{color:#ef4444;background:rgba(239,68,68,0.2)}.like-btn.liked:hover{background:rgba(239,68,68,0.3)}.like-btn svg{width:20px;height:20px}.like-btn svg path{transition:fill 0.3s ease}.orders-section{display:flex;flex-direction:column;gap:20px;margin-top:32px}.order-card-gallery{display:flex;gap:24px;background:#1a1a1a;border-radius:16px;padding:24px;border:1px solid #2a2a2a;transition:all 0.3s ease}.order-card-gallery:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5)}.order-card-image{width:120px;height:120px;flex-shrink:0;border-radius:12px;overflow:hidden;background:#0a0a0a}.order-card-image img{width:100%;height:100%;object-fit:cover}.order-card-info{flex:1;display:flex;flex-direction:column;gap:8px}.order-card-info h3{font-size:20px;font-weight:700;color:#fff;margin:0}.order-price{font-size:18px;font-weight:600;color:#9ca3af;margin:0}.order-id{font-size:14px;color:#6b7280;margin:0}.order-status{font-size:14px;color:#9ca3af;margin:0}.order-status .status-pending{color:#fbbf24}.order-status .status-accepted{color:#60a5fa}.order-status .status-shipped{color:#a78bfa}.order-status .status-delivered{color:#34d399}.order-date{font-size:14px;color:#6b7280;margin:0}.no-search-results{text-align:center;padding:80px 20px}.no-search-results svg{margin:0 auto 24px;display:block;opacity:0.6}.no-search-results h3{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px}.no-search-results p{font-size:16px;color:#9ca3af;margin:0}.artworks-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:32px;margin-top:40px}@media(max-width:768px){.artworks-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:20px}}.artwork-card{background:#1a1a1a;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5);transition:all 0.3s ease;position:relative;border:1px solid #2a2a2a}.artwork-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,0.7);border-color:#3a3a3a}.artwork-image-wrapper{position:relative;width:100%;padding-top:100%;background:#0a0a0a;overflow:hidden}.artwork-image-link{position:absolute;top:0;left:0;width:100%;height:100%;display:block}.artwork-image{width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease}.artwork-card:hover .artwork-image{transform:scale(1.05)}.artwork-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease}.artwork-card:hover .artwork-overlay{opacity:1}.view-btn{background:#fff;color:#1a1a1a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;transition:all 0.2s}.view-btn:hover{background:#f5f5f5;transform:scale(1.05)}.artwork-info{padding:20px}.artwork-title{margin:0 0 12px;font-size:16px;font-weight:600;line-height:1.4;min-height:44px}.artwork-title a{color:#fff;text-decoration:none;transition:color 0.2s;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.artwork-title a:hover{color:#f093fb}.artwork-price{margin-bottom:16px}.price-current{font-size:20px;font-weight:700;color:#9ca3af}.buy-now-btn{display:block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-align:center;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;transition:all 0.3s ease;border:1px solid rgba(102,126,234,0.3);box-shadow:0 4px 14px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.buy-now-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}.empty-gallery{text-align:center;padding:80px 20px}.empty-gallery svg{margin:0 auto 24px;display:block}.empty-gallery h3{font-size:24px;font-weight:600;color:#fff;margin:0 0 12px}.empty-gallery p{font-size:16px;color:#9ca3af;margin:0}.add-link{color:#667eea;text-decoration:none;font-weight:600}.add-link:hover{text-decoration:underline}.art-detail-container{max-width:1200px;margin:0 auto;padding:40px 24px}.art-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #2a2a2a}.art-detail-image{width:100%}.detail-image{width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.5);border:1px solid #2a2a2a}.art-detail-info{display:flex;flex-direction:column;justify-content:center}.detail-title{font-size:36px;font-weight:700;color:#fff;margin:0 0 24px;line-height:1.2;letter-spacing:-0.5px}.detail-description{margin-bottom:24px;color:#9ca3af;font-size:16px;line-height:1.7}.detail-price-section{margin-bottom:24px}.detail-price{font-size:32px;font-weight:700;color:#9ca3af}.art-social-actions{display:flex;gap:12px;margin-bottom:24px}.art-like-btn,.art-share-btn{display:flex;align-items:center;gap:8px;padding:12px 20px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.3s ease;box-shadow:0 2px 4px rgba(0,0,0,0.3)}.art-like-btn:hover,.art-share-btn:hover{background:#2a2a2a;border-color:#3a3a3a;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.5)}.art-like-btn.liked{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);border-color:rgba(239,68,68,0.5);color:#fff;box-shadow:0 4px 12px rgba(239,68,68,0.4)}.art-like-btn.liked:hover{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);box-shadow:0 6px 16px rgba(239,68,68,0.6)}.art-like-btn svg,.art-share-btn svg{width:20px;height:20px;flex-shrink:0}.like-count{font-weight:600}.art-share-btn{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);border-color:rgba(59,130,246,0.5);box-shadow:0 4px 12px rgba(59,130,246,0.4)}.art-share-btn:hover{background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%);box-shadow:0 6px 16px rgba(59,130,246,0.6)}.detail-buy-btn{display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;text-align:center;transition:all 0.3s ease;border:1px solid rgba(102,126,234,0.3);margin-bottom:16px;box-shadow:0 4px 14px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.detail-buy-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.back-to-gallery{color:#9ca3af;text-decoration:none;font-size:14px;transition:color 0.2s}.back-to-gallery:hover{color:#fff}.art-comments-section{margin-top:48px;padding-top:48px;border-top:1px solid #2a2a2a}.comments-title{font-size:28px;font-weight:700;color:#fff;margin:0 0 24px}.comment-form-wrapper{background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:32px;border:1px solid #2a2a2a}.comment-form{display:flex;flex-direction:column;gap:16px}.comment-input-group{position:relative}.comment-input{width:100%;padding:14px 16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;color:#fff;font-size:15px;font-family:inherit;resize:vertical;min-height:100px;transition:all 0.3s ease}.comment-input:focus{outline:none;border-color:#3a3a3a;box-shadow:0 0 0 3px rgba(255,255,255,0.05)}.comment-input::placeholder{color:#6b7280}.comment-char-count{position:absolute;bottom:12px;right:12px;font-size:12px;color:#6b7280;background:#0a0a0a;padding:4px 8px;border-radius:6px}.comment-submit-btn{padding:12px 24px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;border:1px solid rgba(102,126,234,0.3);border-radius:10px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite;align-self:flex-start}.comment-submit-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 16px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.comments-list{display:flex;flex-direction:column;gap:20px}.comment-item{display:flex;gap:16px;background:#1a1a1a;border-radius:12px;padding:20px;border:1px solid #2a2a2a;transition:all 0.3s ease}.comment-item:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5)}.comment-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0;box-shadow:0 4px 12px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.comment-content{flex:1;display:flex;flex-direction:column;gap:8px}.comment-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}.comment-author{font-weight:600;color:#fff;font-size:15px}.comment-date{font-size:13px;color:#6b7280}.comment-text{color:#9ca3af;font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap;word-wrap:break-word}.no-comments{text-align:center;padding:40px 20px;color:#6b7280;font-size:15px}.buy-container{max-width:900px;margin:0 auto;padding:40px 24px}.buy-product-details{display:grid;grid-template-columns:1fr 1fr;gap:48px;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #2a2a2a}.buy-product-image-wrapper{width:100%}.buy-product-image{width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.5);border:1px solid #2a2a2a}.buy-product-info{display:flex;flex-direction:column;justify-content:center}.buy-product-title{font-size:36px;font-weight:700;color:#fff;margin:0 0 16px;line-height:1.2;letter-spacing:-0.5px}.buy-product-description{color:#9ca3af;font-size:16px;line-height:1.7;margin:0 0 24px}.buy-product-price-section{margin-bottom:24px;display:flex;flex-direction:column;gap:4px}.buy-product-price-label{font-size:14px;color:#6b7280;font-weight:500}.buy-product-price{font-size:32px;font-weight:700;color:#9ca3af}.quantity-selector-section{margin-bottom:24px;display:flex;flex-direction:column;gap:12px}.quantity-label{font-size:14px;color:#9ca3af;font-weight:600}.quantity-controls{display:flex;align-items:center;gap:12px}.quantity-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;cursor:pointer;transition:all 0.3s ease;flex-shrink:0}.quantity-btn:hover{background:#1a1a1a;border-color:#3a3a3a;transform:scale(1.05)}.quantity-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}.quantity-btn:disabled:hover{background:#0a0a0a;border-color:#2a2a2a}.quantity-btn svg{width:20px;height:20px;flex-shrink:0}.quantity-input{width:80px;height:44px;text-align:center;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;font-size:18px;font-weight:600;font-family:inherit;transition:all 0.3s ease;padding:0}.quantity-input:focus{outline:none;border-color:#3a3a3a;box-shadow:0 0 0 3px rgba(255,255,255,0.05)}.quantity-input::-webkit-inner-spin-button,.quantity-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.buy-product-total-section{margin-bottom:32px;padding:20px;background:#0a0a0a;border-radius:12px;border:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center}.buy-product-total-label{font-size:18px;color:#9ca3af;font-weight:600}.buy-product-total{font-size:36px;font-weight:700;color:#fff}.buy-now-main-btn{display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;text-align:center;transition:all 0.3s ease;border:1px solid rgba(102,126,234,0.3);margin-bottom:16px;width:100%;text-align:center;box-shadow:0 4px 14px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.buy-now-main-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.back-to-gallery-link{color:#9ca3af;text-decoration:none;font-size:14px;transition:color 0.2s;text-align:center;display:block}.back-to-gallery-link:hover{color:#fff}.payment-options-container{max-width:1000px;margin:0 auto;padding:40px 24px}.payment-options-content{display:grid;grid-template-columns:1fr 1.5fr;gap:40px;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #2a2a2a}.payment-artwork-preview{display:flex;flex-direction:column;gap:20px}.payment-preview-image{width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.5);border:1px solid #2a2a2a}.payment-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#fff}.payment-preview-quantity{font-size:14px;color:#6b7280;margin:0 0 8px}.payment-preview-price{font-size:16px;font-weight:500;color:#9ca3af;margin:0 0 8px}.payment-preview-total{font-size:28px;font-weight:700;color:#fff;margin:0}.payment-options-wrapper{}.payment-options-title{font-size:28px;font-weight:700;color:#fff;margin:0 0 24px;letter-spacing:-0.5px}.payment-methods{display:flex;flex-direction:column;gap:16px;margin-bottom:24px}.payment-method-card{display:flex;align-items:center;gap:20px;padding:24px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;text-decoration:none;transition:all 0.3s ease;cursor:pointer}.payment-method-card:hover{background:#1a1a1a;border-color:#3a3a3a;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.5)}.payment-method-card.disabled{opacity:0.6;cursor:not-allowed;position:relative}.payment-method-card.disabled:hover{transform:none;border-color:#2a2a2a;box-shadow:none}.payment-method-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;border-radius:8px;color:#fff;flex-shrink:0;border:1px solid #2a2a2a}.payment-method-card h3{margin:0 0 4px;font-size:18px;font-weight:600;color:#fff}.payment-method-card p{margin:0;font-size:14px;color:#9ca3af}.coming-soon-badge{position:absolute;top:12px;right:12px;background:#fbbf24;color:#1a1a1a;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600}.back-link{color:#6b7280;text-decoration:none;font-size:14px;transition:color 0.2s;display:inline-block}.back-link:hover{color:#1a1a1a}.checkout-container{max-width:1000px;margin:0 auto;padding:40px 24px}.checkout-content{display:grid;grid-template-columns:1fr 1.5fr;gap:40px;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #2a2a2a}.checkout-artwork-preview{display:flex;flex-direction:column;gap:20px}.checkout-preview-image{width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.5);border:1px solid #2a2a2a}.checkout-preview-info h3{font-size:20px;font-weight:700;margin:0 0 8px;color:#fff}.checkout-preview-quantity{font-size:14px;color:#6b7280;margin:0 0 8px}.checkout-preview-price{font-size:16px;font-weight:500;color:#9ca3af;margin:0 0 8px}.checkout-preview-total{font-size:28px;font-weight:700;color:#fff;margin:0 0 8px}.checkout-payment-method{font-size:14px;color:#6b7280;margin:0}.checkout-form-wrapper{}.checkout-form-title{font-size:28px;font-weight:700;color:#fff;margin:0 0 24px;letter-spacing:-0.5px}.checkout-form{display:flex;flex-direction:column;gap:20px}.form-group{display:flex;flex-direction:column;gap:8px}.form-group label{font-weight:600;color:#9ca3af;font-size:14px}.form-group input,.form-group textarea,.form-group select{padding:12px 16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;font-size:15px;font-family:inherit;transition:all 0.3s ease;width:100%;color:#fff}.form-group input:focus,.form-group textarea:focus,.form-group select:focus{outline:none;border-color:#3a3a3a;box-shadow:0 0 0 3px rgba(255,255,255,0.05)}.form-group input::placeholder,.form-group textarea::placeholder,.form-group select::placeholder{color:#4a4a4a}.form-group textarea{resize:vertical;min-height:100px}.submit-order-btn{padding:16px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;border:1px solid rgba(102,126,234,0.3);border-radius:8px;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.3s ease;margin-top:8px;box-shadow:0 4px 14px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.submit-order-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.submit-order-btn:active{transform:translateY(0)}.order-success-container{min-height:calc(100vh - 200px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:#0a0a0a}.order-success-card{background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:24px;padding:48px 40px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.8);border:1px solid #2a2a2a;text-align:center;animation:slideUp 0.5s ease}.success-icon-wrapper{margin-bottom:32px}.success-icon-circle{width:120px;height:120px;margin:0 auto;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(102,126,234,0.4);animation:scaleIn 0.5s ease 0.2s both,gradientShift 3s ease infinite}.success-icon-circle svg{color:#fff;stroke-width:3}.success-title{font-size:32px;font-weight:700;color:#fff;margin:0 0 16px;letter-spacing:-0.5px}.success-message{font-size:16px;color:#9ca3af;line-height:1.6;margin:0 0 32px}.order-details-box{background:#0a0a0a;border-radius:16px;padding:24px;margin:0 0 32px;border:1px solid #2a2a2a}.order-detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #2a2a2a}.order-detail-row:last-child{border-bottom:none;padding-bottom:0}.order-detail-row:first-child{padding-top:0}.order-detail-label{font-size:14px;color:#9ca3af;font-weight:500}.order-detail-value{font-size:16px;color:#fff;font-weight:600}.success-note{font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 32px}.back-to-gallery-success-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;transition:all 0.3s ease;box-shadow:0 4px 14px rgba(102,126,234,0.4);border:1px solid rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.back-to-gallery-success-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.back-to-gallery-success-btn svg{flex-shrink:0}@keyframes scaleIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}@media(max-width:768px){.order-success-container{padding:24px 16px}.order-success-card{padding:32px 24px;border-radius:20px}.success-icon-circle{width:100px;height:100px}.success-icon-circle svg{width:48px;height:48px}.success-title{font-size:24px}.success-message{font-size:14px;margin-bottom:24px}.order-details-box{padding:20px;margin-bottom:24px}.order-detail-row{flex-direction:column;align-items:flex-start;gap:8px;padding:16px 0}.order-detail-label{font-size:13px}.order-detail-value{font-size:15px}.success-note{font-size:13px;margin-bottom:24px}.back-to-gallery-success-btn{width:100%;justify-content:center;padding:14px 24px;font-size:15px}}.help-container{max-width:1200px;margin:0 auto;padding:40px 24px;min-height:calc(100vh - 200px)}.help-header{text-align:center;margin-bottom:48px}.help-title{font-size:42px;font-weight:700;color:#fff;margin:0 0 12px;letter-spacing:-0.5px}.help-subtitle{font-size:18px;color:#9ca3af;margin:0;line-height:1.6}.help-success-message,.help-error-message{max-width:600px;margin:0 auto 32px;padding:16px 20px;border-radius:12px;display:flex;align-items:center;gap:12px;font-size:15px;animation:slideUp 0.3s ease}.help-success-message{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.3)}.help-error-message{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;box-shadow:0 4px 12px rgba(239,68,68,0.3)}.help-success-message svg,.help-error-message svg{flex-shrink:0;width:24px;height:24px}.help-content{display:grid;grid-template-columns:1fr 1.2fr;gap:40px;margin-bottom:40px}@media(max-width:968px){.help-content{grid-template-columns:1fr}}.help-info-section{display:flex;flex-direction:column;gap:24px}.help-info-card{background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:32px;border:1px solid #2a2a2a;transition:all 0.3s ease}.help-info-card:hover{border-color:#3a3a3a;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.5)}.help-info-icon{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 4px 12px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.help-info-card h3{font-size:20px;font-weight:700;color:#fff;margin:0 0 12px}.help-info-card p{font-size:15px;color:#9ca3af;margin:0;line-height:1.6}.help-form-section{}.help-form-card{background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:16px;padding:40px;border:1px solid #2a2a2a;box-shadow:0 8px 24px rgba(0,0,0,0.5)}.help-form-title{font-size:28px;font-weight:700;color:#fff;margin:0 0 8px}.help-form-subtitle{font-size:15px;color:#9ca3af;margin:0 0 32px}.help-form{display:flex;flex-direction:column;gap:24px}.form-group{display:flex;flex-direction:column;gap:8px}.form-group label{font-weight:600;color:#fff;font-size:14px;display:flex;align-items:center;gap:4px}.required{color:#ef4444}.form-input,.form-textarea,.form-input-disabled{width:100%;padding:14px 16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;color:#fff;font-size:15px;font-family:inherit;transition:all 0.3s ease}.form-input:focus,.form-textarea:focus{outline:none;border-color:#3a3a3a;background:#111;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}.form-input-disabled{opacity:0.6;cursor:not-allowed;background:#0f0f0f}.form-textarea{resize:vertical;min-height:120px}.form-hint{font-size:13px;color:#6b7280;margin-top:4px}.help-submit-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;border:none;border-radius:12px;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 14px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.help-submit-btn:hover{background-position:100% 50%;transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,0.6)}.help-submit-btn:active{transform:translateY(0)}.help-submit-btn svg{width:20px;height:20px;flex-shrink:0}.help-back-section{margin-top:40px;text-align:center}.help-back-link{display:inline-flex;align-items:center;gap:8px;color:#9ca3af;text-decoration:none;font-size:15px;font-weight:500;transition:all 0.2s;padding:10px 20px;border-radius:8px}.help-back-link:hover{color:#fff;background:#1a1a1a}.help-back-link svg{width:18px;height:18px;flex-shrink:0}@media(max-width:768px){.help-container{padding:24px 16px}.help-title{font-size:32px}.help-subtitle{font-size:16px}.help-info-card{padding:24px}.help-form-card{padding:24px}.help-form{gap:20px}.form-input,.form-textarea{padding:12px 14px;font-size:14px}}.admin-container{max-width:1400px;margin:0 auto;padding:24px;background:#0a0a0a;min-height:100vh;width:100%}.admin-header{background:linear-gradient(135deg,#1a1a1a 0%,#000000 100%);border-radius:16px;padding:32px;margin-bottom:32px;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:1px solid #2a2a2a}.admin-header-content{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.admin-title{font-size:36px;font-weight:700;color:#fff;margin:0 0 8px;letter-spacing:-0.5px}.admin-subtitle{font-size:16px;color:rgba(255,255,255,0.7);margin:0}.admin-logout-btn{display:flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;border:2px solid rgba(239,68,68,0.3);border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(239,68,68,0.3)}.admin-logout-btn:hover{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);border-color:rgba(239,68,68,0.5);transform:translateY(-2px);box-shadow:0 6px 16px rgba(239,68,68,0.5)}.logout-modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);z-index:10000;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease}.logout-modal-content{background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);border-radius:20px;padding:40px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.8);border:1px solid #2a2a2a;animation:slideUp 0.3s ease;text-align:center}.logout-modal-icon{width:80px;height:80px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);border-radius:50%;box-shadow:0 8px 24px rgba(239,68,68,0.4);color:#fff}.logout-modal-title{font-size:28px;font-weight:700;color:#fff;margin:0 0 16px;letter-spacing:-0.5px}.logout-modal-message{font-size:16px;color:#9ca3af;line-height:1.6;margin:0 0 32px}.logout-modal-actions{display:flex;gap:12px;justify-content:center}.logout-modal-cancel,.logout-modal-confirm{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.3s ease;border:none;min-width:140px}.logout-modal-cancel{background:#2a2a2a;color:#fff;border:1px solid #3a3a3a;box-shadow:0 4px 8px rgba(0,0,0,0.3)}.logout-modal-cancel:hover{background:#3a3a3a;border-color:#4a4a4a;transform:translateY(-2px);box-shadow:0 6px 12px rgba(0,0,0,0.5)}.logout-modal-confirm{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;border:1px solid rgba(239,68,68,0.3);box-shadow:0 4px 12px rgba(239,68,68,0.4)}.logout-modal-confirm:hover{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);border-color:rgba(239,68,68,0.5);transform:translateY(-2px);box-shadow:0 6px 16px rgba(239,68,68,0.6)}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.admin-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;margin-bottom:32px}.stat-card{background:#1a1a1a;border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:20px;transition:all 0.3s ease;border:1px solid #2a2a2a}.stat-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,0.5);border-color:#3a3a3a}.stat-icon{width:56px;height:56px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:all 0.3s ease}.stat-card:hover .stat-icon{transform:scale(1.1);box-shadow:0 6px 16px rgba(0,0,0,0.5)}.stat-icon-artworks{background:linear-gradient(135deg,#a855f7 0%,#7c3aed 100%);color:#fff;box-shadow:0 4px 12px rgba(168,85,247,0.4)}.stat-card:hover .stat-icon-artworks{box-shadow:0 6px 16px rgba(168,85,247,0.6)}.stat-icon-orders{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;box-shadow:0 4px 12px rgba(59,130,246,0.4)}.stat-card:hover .stat-icon-orders{box-shadow:0 6px 16px rgba(59,130,246,0.6)}.stat-icon-pending{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;box-shadow:0 4px 12px rgba(245,158,11,0.4)}.stat-card:hover .stat-icon-pending{box-shadow:0 6px 16px rgba(245,158,11,0.6)}.stat-icon-delivered{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.4)}.stat-card:hover .stat-icon-delivered{box-shadow:0 6px 16px rgba(16,185,129,0.6)}.stat-icon-support{background:linear-gradient(135deg,#ec4899 0%,#be185d 100%);color:#fff;box-shadow:0 4px 12px rgba(236,72,153,0.4)}.stat-card:hover .stat-icon-support{box-shadow:0 6px 16px rgba(236,72,153,0.6)}.stat-content{flex:1}.stat-label{font-size:14px;color:#9ca3af;margin:0 0 4px;font-weight:500}.stat-value{font-size:32px;font-weight:700;color:#fff;margin:0;line-height:1}.admin-actions{margin-bottom:32px;display:flex;gap:16px;flex-wrap:wrap}.admin-action-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px;transition:all 0.3s ease;box-shadow:0 4px 14px rgba(0,0,0,0.3);border:1px solid #2a2a2a}.admin-action-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.5);border-color:#3a3a3a}.admin-add-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;box-shadow:0 4px 14px rgba(102,126,234,0.4);border-color:rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.admin-add-btn:hover{background-position:100% 50%;box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.admin-artworks-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;box-shadow:0 4px 14px rgba(102,126,234,0.4);border-color:rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.admin-artworks-btn:hover{background-position:100% 50%;box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.admin-orders-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;box-shadow:0 4px 14px rgba(102,126,234,0.4);border-color:rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.admin-orders-btn:hover{background-position:100% 50%;box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.admin-users-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;box-shadow:0 4px 14px rgba(102,126,234,0.4);border-color:rgba(102,126,234,0.3);animation:gradientShift 3s ease infinite}.admin-users-btn:hover{background-position:100% 50%;box-shadow:0 6px 20px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.users-list{display:flex;flex-direction:column;gap:16px}.user-card{display:flex;align-items:center;gap:20px;background:#1a1a1a;border-radius:12px;padding:24px;border:1px solid #2a2a2a;transition:all 0.3s ease}.user-card:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5);transform:translateY(-2px)}.user-avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;flex-shrink:0;box-shadow:0 4px 12px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.user-info{flex:1;display:flex;flex-direction:column;gap:6px}.user-email{font-size:18px;font-weight:600;color:#fff;margin:0}.user-name{font-size:15px;color:#9ca3af;margin:0}.user-date{font-size:13px;color:#6b7280;margin:0}.user-id-badge{background:#2a2a2a;color:#fff;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #3a3a3a;flex-shrink:0}.admin-back-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:transparent;color:#9ca3af;text-decoration:none;border:none;border-radius:8px;font-size:15px;font-weight:500;transition:all 0.3s ease;width:auto}.admin-back-btn:hover{background:transparent;color:#fff;transform:none;box-shadow:none}.admin-sections{display:flex;flex-direction:column;gap:32px}.admin-section{background:#1a1a1a;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid #2a2a2a}.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2a2a2a}.section-title{font-size:24px;font-weight:700;color:#fff;margin:0}.section-count{font-size:14px;color:#9ca3af;background:#2a2a2a;padding:6px 12px;border-radius:8px;font-weight:600}.empty-state{text-align:center;padding:60px 20px}.empty-state svg{margin:0 auto 24px;display:block;opacity:0.5}.empty-state h3{font-size:20px;font-weight:600;color:#fff;margin:0 0 8px}.empty-state p{font-size:14px;color:#9ca3af;margin:0 0 24px}.empty-state-btn{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;transition:all 0.3s ease;border:1px solid rgba(6,182,212,0.3);box-shadow:0 4px 12px rgba(6,182,212,0.3)}.empty-state-btn:hover{background:linear-gradient(135deg,#22d3ee 0%,#06b6d4 100%);transform:translateY(-2px);box-shadow:0 6px 16px rgba(6,182,212,0.5);border-color:rgba(6,182,212,0.5)}.artworks-grid-admin{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}.artwork-card-admin{background:#1a1a1a;border-radius:12px;overflow:hidden;transition:all 0.3s ease;border:1px solid #2a2a2a}.artwork-card-admin:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5);transform:translateY(-2px)}.artwork-image-admin{width:100%;height:200px;overflow:hidden;background:#0a0a0a}.artwork-image-admin img{width:100%;height:100%;object-fit:cover}.artwork-details-admin{padding:16px}.artwork-title-admin{font-size:18px;font-weight:600;color:#fff;margin:0 0 8px}.artwork-price-admin{font-size:20px;font-weight:700;color:#9ca3af;margin:0 0 4px}.artwork-id-admin{font-size:12px;color:#6b7280;margin:0}.artwork-actions-admin{padding:0 16px 16px}.artwork-buttons-wrapper{display:flex;gap:10px;width:100%}.edit-btn{flex:1;padding:10px 16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.3s ease;box-shadow:0 4px 8px rgba(102,126,234,0.4);border:none;cursor:pointer;animation:gradientShift 3s ease infinite}.edit-btn:hover{background-position:100% 50%;transform:translateY(-1px);box-shadow:0 6px 12px rgba(102,126,234,0.6)}.delete-form{flex:1}.delete-btn{width:100%;padding:10px 16px;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.3s ease;box-shadow:0 4px 8px rgba(239,68,68,0.4)}.delete-btn:hover{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);transform:translateY(-1px);box-shadow:0 6px 12px rgba(239,68,68,0.6)}.orders-list{display:flex;flex-direction:column;gap:20px}.order-card{background:#1a1a1a;border-radius:12px;padding:24px;border:1px solid #2a2a2a;transition:all 0.3s ease}.order-card:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5)}.order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #2a2a2a}.order-id-badge{background:#2a2a2a;color:#fff;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #3a3a3a}.order-status-badge{padding:6px 14px;border-radius:8px;font-weight:600;font-size:12px;text-transform:capitalize}.order-status-pending{background:#3a2a1a;color:#fbbf24;border:1px solid #4a3a2a}.order-status-accepted{background:#1a2a3a;color:#60a5fa;border:1px solid #2a3a4a}.order-status-shipped{background:#2a1a3a;color:#a78bfa;border:1px solid #3a2a4a}.order-status-delivered{background:#1a3a2a;color:#34d399;border:1px solid #2a4a3a}.order-content{display:grid;grid-template-columns:auto 1fr;gap:24px}.order-artwork{display:flex;flex-direction:column;gap:12px;min-width:120px}.order-artwork-image{width:100%;height:120px;object-fit:cover;border-radius:8px;background:#0a0a0a}.order-artwork-info h4{font-size:16px;font-weight:600;color:#fff;margin:0}.order-details{display:flex;flex-direction:column;gap:12px}.order-detail-item{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}.order-detail-label{font-weight:600;color:#9ca3af;font-size:14px;min-width:80px}.order-detail-value{color:#fff;font-size:14px;flex:1}.order-detail-email{color:#6b7280;font-size:13px;display:block;width:100%;margin-top:2px}.order-payment-badge{background:#2a2a2a;color:#9ca3af;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #3a3a3a}.order-actions{margin-top:16px;padding-top:16px;border-top:1px solid #2a2a2a}.order-status-form{display:flex;gap:12px;align-items:center}.order-status-select{padding:10px 16px;border:1px solid #2a2a2a;border-radius:8px;font-size:14px;font-weight:600;background:#0a0a0a;color:#fff;cursor:pointer;transition:border-color 0.2s;flex:1}.order-status-select:focus{outline:none;border-color:#3a3a3a}.update-status-btn{padding:10px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#00f2fe 100%);background-size:200% 200%;color:#fff;border:1px solid rgba(102,126,234,0.3);border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;transition:all 0.3s ease;white-space:nowrap;box-shadow:0 4px 8px rgba(102,126,234,0.4);animation:gradientShift 3s ease infinite}.update-status-btn:hover{background-position:100% 50%;transform:translateY(-1px);box-shadow:0 6px 12px rgba(102,126,234,0.6);border-color:rgba(102,126,234,0.5)}.order-filters{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}.order-filter-btn{display:flex;align-items:center;gap:8px;padding:12px 24px;background:#1a1a1a;color:#9ca3af;border:1px solid #2a2a2a;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.3s ease;box-shadow:0 2px 4px rgba(0,0,0,0.3)}.order-filter-btn:hover{background:#2a2a2a;border-color:#3a3a3a;transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.5)}.order-filter-btn.active{background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;border-color:rgba(99,102,241,0.5);box-shadow:0 4px 12px rgba(99,102,241,0.5)}.order-filter-btn.active:hover{background:linear-gradient(135deg,#818cf8 0%,#6366f1 100%);transform:translateY(-2px);box-shadow:0 6px 16px rgba(99,102,241,0.7)}.order-filter-btn[data-filter="pending"]{border-color:rgba(251,191,36,0.3)}.order-filter-btn[data-filter="pending"]:hover{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);color:#1a1a1a;border-color:rgba(251,191,36,0.5);box-shadow:0 4px 8px rgba(251,191,36,0.4)}.order-filter-btn[data-filter="pending"].active{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);color:#1a1a1a;border-color:rgba(251,191,36,0.5);box-shadow:0 4px 12px rgba(251,191,36,0.5)}.order-filter-btn[data-filter="accepted"]{border-color:rgba(96,165,250,0.3)}.order-filter-btn[data-filter="accepted"]:hover{background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%);color:#fff;border-color:rgba(96,165,250,0.5);box-shadow:0 4px 8px rgba(96,165,250,0.4)}.order-filter-btn[data-filter="accepted"].active{background:linear-gradient(135deg,#60a5fa 0%,#3b82f6 100%);color:#fff;border-color:rgba(96,165,250,0.5);box-shadow:0 4px 12px rgba(96,165,250,0.5)}.order-filter-btn[data-filter="shipped"]{border-color:rgba(167,139,250,0.3)}.order-filter-btn[data-filter="shipped"]:hover{background:linear-gradient(135deg,#a78bfa 0%,#8b5cf6 100%);color:#fff;border-color:rgba(167,139,250,0.5);box-shadow:0 4px 8px rgba(167,139,250,0.4)}.order-filter-btn[data-filter="shipped"].active{background:linear-gradient(135deg,#a78bfa 0%,#8b5cf6 100%);color:#fff;border-color:rgba(167,139,250,0.5);box-shadow:0 4px 12px rgba(167,139,250,0.5)}.order-filter-btn[data-filter="delivered"]{border-color:rgba(52,211,153,0.3)}.order-filter-btn[data-filter="delivered"]:hover{background:linear-gradient(135deg,#34d399 0%,#10b981 100%);color:#fff;border-color:rgba(52,211,153,0.5);box-shadow:0 4px 8px rgba(52,211,153,0.4)}.order-filter-btn[data-filter="delivered"].active{background:linear-gradient(135deg,#34d399 0%,#10b981 100%);color:#fff;border-color:rgba(52,211,153,0.5);box-shadow:0 4px 12px rgba(52,211,153,0.5)}.filter-count{font-size:13px;opacity:0.8;font-weight:500}.orders-sections{display:flex;flex-direction:column;gap:32px}.order-status-section{background:#1a1a1a;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid #2a2a2a}.order-section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #2a2a2a}.order-section-title{font-size:22px;font-weight:700;color:#fff;margin:0}.order-section-count{font-size:14px;color:#9ca3af;background:#2a2a2a;padding:6px 12px;border-radius:8px;font-weight:600}.empty-state-small{text-align:center;padding:40px 20px;color:#6b7280;font-size:14px}.support-messages-list{display:flex;flex-direction:column;gap:20px}.support-message-card{background:#1a1a1a;border-radius:12px;padding:24px;border:1px solid #2a2a2a;transition:all 0.3s ease}.support-message-card:hover{border-color:#3a3a3a;box-shadow:0 4px 12px rgba(0,0,0,0.5)}.support-message-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #2a2a2a}.support-message-id-badge{background:#2a2a2a;color:#fff;padding:6px 14px;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #3a3a3a}.support-message-status-badge{padding:6px 14px;border-radius:8px;font-weight:600;font-size:12px;text-transform:capitalize}.support-message-status-pending{background:#3a2a1a;color:#fbbf24;border:1px solid #4a3a2a}.support-message-content{}.support-message-info{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}.support-message-detail-item{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}.support-message-detail-label{font-weight:600;color:#9ca3af;font-size:14px;min-width:80px}.support-message-detail-value{color:#fff;font-size:14px;flex:1}.support-message-subject{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #2a2a2a}.support-message-subject-title{font-size:20px;font-weight:700;color:#fff;margin:0;line-height:1.4}.support-message-text{margin-top:16px}.support-message-text p{color:#9ca3af;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;word-wrap:break-word}.admin-form-container{background:#1a1a1a;border-radius:16px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:1px solid #2a2a2a;max-width:800px;margin:0 auto}.form-error{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#2a1a1a;border:1px solid #4a2a2a;border-radius:12px;color:#fca5a5;margin-bottom:24px;font-size:14px;font-weight:500}.admin-artwork-form{display:flex;flex-direction:column;gap:28px}.form-group-admin{display:flex;flex-direction:column;gap:12px}.form-label-admin{display:flex;align-items:center;gap:10px;font-weight:600;color:#fff;font-size:15px}.form-label-admin svg{color:#9ca3af;flex-shrink:0}.form-input-admin,.form-textarea-admin{padding:14px 18px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;font-size:15px;font-family:inherit;color:#fff;transition:all 0.3s ease;width:100%}.form-input-admin:focus,.form-textarea-admin:focus{outline:none;border-color:#3a3a3a;box-shadow:0 0 0 3px rgba(255,255,255,0.05)}.form-input-admin::placeholder,.form-textarea-admin::placeholder{color:#4a4a4a}.form-textarea-admin{resize:vertical;min-height:140px;line-height:1.6}.file-upload-wrapper{position:relative}.form-file-input{position:absolute;width:0;height:0;opacity:0;pointer-events:none}.file-upload-label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;background:#0a0a0a;border:2px dashed #2a2a2a;border-radius:12px;cursor:pointer;transition:all 0.3s ease;text-align:center}.file-upload-label:hover{border-color:#3a3a3a;background:#0f0f0f}.file-upload-label svg{color:#9ca3af;transition:color 0.3s ease}.file-upload-label:hover svg{color:#fff}.file-upload-text{font-weight:600;color:#fff;font-size:15px}.file-upload-hint{font-size:13px;color:#6b7280}.form-file-input:focus+.file-upload-label{outline:2px solid #3a3a3a;outline-offset:2px}.form-actions{display:flex;gap:16px;margin-top:8px;padding-top:24px;border-top:1px solid #2a2a2a}.submit-artwork-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 32px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;border:1px solid rgba(16,185,129,0.3);border-radius:12px;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.3s ease;flex:1;box-shadow:0 4px 12px rgba(16,185,129,0.4)}.submit-artwork-btn:hover{background:linear-gradient(135deg,#34d399 0%,#10b981 100%);transform:translateY(-2px);box-shadow:0 6px 16px rgba(16,185,129,0.6);border-color:rgba(16,185,129,0.5)}.submit-artwork-btn:active{transform:translateY(0)}.cancel-btn{display:flex;align-items:center;justify-content:center;padding:16px 32px;background:transparent;color:#9ca3af;border:1px solid #2a2a2a;border-radius:12px;font-weight:600;font-size:16px;text-decoration:none;transition:all 0.3s ease}.cancel-btn:hover{background:#1a1a1a;border-color:#3a3a3a;color:#fff}@media(max-width:768px){body{background:#0a0a0a}header{padding:12px 16px}nav{float:none;justify-content:flex-end;gap:12px}.help-support-btn{padding:8px 16px;font-size:14px}.help-support-btn svg{width:16px;height:16px}.user-logout-btn{padding:8px 16px;font-size:14px}.user-logout-btn svg{width:16px;height:16px}.admin-container{padding:12px;width:100%;max-width:100%}.admin-header{padding:20px 16px;border-radius:12px}.admin-header-content{flex-direction:column;gap:16px;align-items:stretch}.admin-title{font-size:24px;line-height:1.2}.admin-subtitle{font-size:14px}.admin-logout-btn{width:100%;justify-content:center;padding:14px 20px}.admin-back-btn{width:auto;justify-content:flex-start;padding:8px 16px}.admin-stats{grid-template-columns:1fr;gap:12px}.stat-card{padding:16px;border-radius:12px}.stat-icon{width:48px;height:48px;border-radius:10px}.stat-value{font-size:24px}.stat-label{font-size:13px}.admin-actions{flex-direction:column;gap:12px}.admin-action-btn{width:100%;justify-content:center;padding:16px 24px;font-size:15px}.admin-section{padding:16px;border-radius:12px}.section-header{flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:12px}.section-title{font-size:20px}.section-count{font-size:12px;padding:4px 10px}.artworks-grid-admin{grid-template-columns:1fr;gap:16px}.artwork-card-admin{border-radius:10px}.artwork-image-admin{height:180px}.artwork-details-admin{padding:12px}.artwork-actions-admin{padding:12px}.artwork-buttons-wrapper{flex-direction:column;gap:8px}.edit-btn{width:100%;padding:12px 14px;font-size:13px}.delete-btn{width:100%;padding:12px 14px;font-size:13px}.artwork-title-admin{font-size:16px}.artwork-price-admin{font-size:18px}.order-content{grid-template-columns:1fr;gap:16px}.order-artwork{min-width:auto}.order-artwork-image{height:100px}.order-details{gap:10px}.order-detail-item{flex-direction:column;align-items:flex-start;gap:4px}.order-detail-label{min-width:auto;font-size:13px}.order-detail-value{font-size:13px}.order-status-form{flex-direction:column;gap:10px}.order-status-select{width:100%;padding:12px 14px}.update-status-btn{width:100%;padding:12px 16px}.order-filters{flex-direction:column;gap:8px}.order-filter-btn{width:100%;justify-content:center;padding:14px 20px;font-size:14px}.order-status-section{padding:16px;border-radius:12px}.order-section-header{flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:12px}.order-section-title{font-size:18px}.order-section-count{font-size:12px;padding:4px 10px}.order-card{padding:16px;border-radius:10px}.order-header{flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:12px}.order-id-badge{font-size:12px;padding:4px 10px}.order-status-badge{font-size:11px;padding:4px 10px}.support-message-card{padding:16px;border-radius:10px}.support-message-header{flex-direction:column;align-items:flex-start;gap:12px;padding-bottom:12px}.support-message-id-badge{font-size:12px;padding:4px 10px}.support-message-status-badge{font-size:11px;padding:4px 10px}.support-message-info{gap:10px;margin-bottom:16px}.support-message-detail-item{flex-direction:column;align-items:flex-start;gap:4px}.support-message-detail-label{min-width:auto;font-size:13px}.support-message-detail-value{font-size:13px}.support-message-subject{margin-bottom:12px;padding-bottom:12px}.support-message-subject-title{font-size:18px}.support-message-text{margin-top:12px}.support-message-text p{font-size:14px}.admin-form-container{padding:20px;border-radius:12px;margin:12px}.form-group-admin{gap:10px}.form-label-admin{font-size:14px}.form-input-admin,.form-textarea-admin{padding:12px 16px;font-size:14px}.form-textarea-admin{min-height:120px}.file-upload-label{padding:32px 16px}.file-upload-text{font-size:14px}.file-upload-hint{font-size:12px}.form-actions{flex-direction:column;gap:12px;padding-top:20px}.submit-artwork-btn{width:100%;padding:14px 24px;font-size:15px}.cancel-btn{width:100%;padding:14px 24px;font-size:15px}.gallery-container{padding:20px 16px}.gallery-title{font-size:28px}.gallery-subtitle{font-size:16px}.gallery-filters{flex-direction:column;gap:8px;margin:24px auto}.gallery-filter-btn{width:100%;justify-content:center;padding:14px 20px;font-size:14px}.gallery-search-wrapper{margin-bottom:32px}.like-btn{width:36px;height:36px;top:8px;right:8px}.like-btn svg{width:18px;height:18px}.orders-section{gap:16px;margin-top:24px}.order-card-gallery{flex-direction:column;gap:16px;padding:16px}.order-card-image{width:100%;height:200px}.order-card-info h3{font-size:18px}.order-price{font-size:16px}.order-id,.order-status,.order-date{font-size:13px}.gallery-search-container{padding:10px 16px}.gallery-search-input{font-size:14px;padding:0 36px 0 32px}.search-icon{left:16px;width:18px;height:18px}.search-clear-btn{right:8px;padding:4px}.art-detail-container{padding:20px 16px}.art-detail-grid{grid-template-columns:1fr;gap:24px;padding:24px}.detail-title{font-size:24px}.detail-price{font-size:28px}.art-social-actions{flex-direction:column;gap:10px}.art-like-btn,.art-share-btn{width:100%;justify-content:center;padding:14px 20px;font-size:14px}.art-comments-section{margin-top:32px;padding-top:32px}.comments-title{font-size:22px;margin-bottom:20px}.comment-form-wrapper{padding:20px}.comment-form{gap:12px}.comment-input{min-height:80px;font-size:14px;padding:12px 14px}.comment-submit-btn{padding:10px 20px;font-size:14px;width:100%}.comments-list{gap:16px}.comment-item{padding:16px;gap:12px}.comment-avatar{width:40px;height:40px;font-size:16px}.comment-author{font-size:14px}.comment-date{font-size:12px}.comment-text{font-size:14px}.buy-container{padding:20px 16px}.buy-product-details{grid-template-columns:1fr;gap:24px;padding:24px}.buy-product-title{font-size:24px}.buy-product-price{font-size:28px}.payment-options-container{padding:20px 16px}.payment-options-content{grid-template-columns:1fr;gap:24px;padding:24px}.payment-options-title{font-size:22px}.checkout-container{padding:20px 16px}.checkout-content{grid-template-columns:1fr;gap:24px;padding:24px}.checkout-form-title{font-size:22px}.logout-modal-content{padding:24px;max-width:90%;border-radius:16px}.logout-modal-icon{width:64px;height:64px;margin-bottom:20px}.logout-modal-title{font-size:22px;margin-bottom:12px}.logout-modal-message{font-size:14px;margin-bottom:24px}.logout-modal-actions{flex-direction:column;gap:10px}.logout-modal-cancel,.logout-modal-confirm{width:100%;min-width:auto;padding:12px 20px;font-size:14px}.users-list{gap:12px}.user-card{flex-direction:column;align-items:flex-start;gap:16px;padding:16px}.user-avatar{width:48px;height:48px;font-size:18px}.user-info{gap:4px}.user-email{font-size:16px}.user-name{font-size:14px}.user-date{font-size:12px}.user-id-badge{font-size:12px;padding:4px 10px}}`;
  fs.writeFileSync(cssPath, stylesCss);
  
  // Firebase initialization file (always overwrite to ensure latest config)
  // Using CDN imports for browser compatibility
  const firebaseJsPath = path.join(pubDir, 'firebase-init.js');
  const firebaseJs = `// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4WOB2O6tKWlg_JV-d4x_g7e71ZBUAyKM",
  authDomain: "peterart07-e9c21.firebaseapp.com",
  projectId: "peterart07-e9c21",
  storageBucket: "peterart07-e9c21.firebasestorage.app",
  messagingSenderId: "432565217491",
  appId: "1:432565217491:web:6ac9b428d6859e4a8b0c26",
  measurementId: "G-QTDV8ZWM8W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only if in browser environment
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

// Google Sign In function
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Send user data to server
    const response = await fetch('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      })
    });
    
    const data = await response.json();
    if (data.success) {
      window.location.href = data.redirect || '/gallery';
    } else {
      alert('Login failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    alert('Google sign-in failed. Please try again.');
  }
}

// Make function available globally
window.signInWithGoogle = signInWithGoogle;

// Export for use in other modules
export { app, analytics, auth, googleProvider };`;
  fs.writeFileSync(firebaseJsPath, firebaseJs);

  // Login page CSS (always overwrite to ensure latest design)
  const loginCssPath = path.join(pubDir, 'login.css');
  const loginCss = `* { margin: 0; padding: 0; box-sizing: border-box; }
.link { color: #3b82f6; text-decoration: none; font-weight: 500; position: relative; z-index: 10; pointer-events: auto; cursor: pointer; }
.link:hover { text-decoration: underline; color: #60a5fa; }
.status { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.status-pending { background: #3a2a1a; color: #fbbf24; border: 1px solid #4a3a2a; }
.status-accepted { background: #1a2a3a; color: #60a5fa; border: 1px solid #2a3a4a; }
.status-shipped { background: #2a1a3a; color: #a78bfa; border: 1px solid #3a2a4a; }
.status-delivered { background: #1a3a2a; color: #34d399; border: 1px solid #2a4a3a; }
.login-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #0a0a0a; width: 100%; }
.login-container { position: relative; z-index: 1; width: 100%; max-width: 440px; padding: 20px; pointer-events: auto; }
.login-card { background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 24px; padding: 48px 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); border: 1px solid #2a2a2a; position: relative; z-index: 10; }
.login-header { text-align: center; margin-bottom: 32px; }
.login-header h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -0.5px; }
.login-subtitle { font-size: 15px; color: #9ca3af; line-height: 1.5; }
.error-message { display: flex; align-items: center; gap: 10px; background: #2a1a1a; border: 1px solid #4a2a2a; color: #fca5a5; padding: 12px 16px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; }
.error-message svg { flex-shrink: 0; }
.login-form { display: flex; flex-direction: column; gap: 20px; }
.input-group { position: relative; }
.input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 1; pointer-events: none; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; color: #6b7280; }
.input-icon svg { width: 100%; height: 100%; transition: all 0.3s ease; }
.input-icon-email { color: #6b7280; }
.input-group:has(input[type="email"]:focus) .input-icon-email { color: #9ca3af; }
.input-icon-password { color: #6b7280; }
.input-group:has(input[type="password"]:focus) .input-icon-password { color: #9ca3af; }
.input-icon-user { color: #6b7280; }
.input-group:has(input[type="text"]:focus) .input-icon-user { color: #9ca3af; }
.input-group input { width: 100%; padding: 14px 16px 14px 48px; font-size: 15px; border: 1px solid #2a2a2a; border-radius: 12px; background: #0a0a0a; color: #fff; transition: all 0.3s ease; outline: none; }
.input-group input:focus { border-color: #3a3a3a; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05); }
.input-group input::placeholder { color: #4a4a4a; }
.login-button { width: 100%; padding: 14px 24px; font-size: 16px; font-weight: 600; color: #ffffff; background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%); background-size: 200% 200%; border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); position: relative; z-index: 10; pointer-events: auto; animation: gradientShift 3s ease infinite; }
.login-button:hover { background-position: 100% 50%; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); border-color: rgba(102, 126, 234, 0.5); }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.login-button:active { transform: translateY(0); }
.login-button svg { transition: transform 0.3s ease; }
.login-button:hover svg { transform: translateX(4px); }
.divider { display: flex; align-items: center; text-align: center; margin: 24px 0; position: relative; z-index: 10; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #2a2a2a; }
.divider span { padding: 0 16px; color: #6b7280; font-size: 14px; background: #1a1a1a; }
.google-button { width: 100%; padding: 14px 24px; font-size: 16px; font-weight: 500; color: #fff; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); position: relative; z-index: 10; pointer-events: auto; }
.google-button:hover { background: #2a2a2a; border-color: #3a3a3a; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); transform: translateY(-1px); }
.google-button:active { transform: translateY(0); }
.google-button svg { flex-shrink: 0; }
.login-footer { margin-top: 24px; text-align: center; position: relative; z-index: 10; }
.login-footer p { margin-bottom: 12px; color: #9ca3af; font-size: 14px; }
.login-footer a { position: relative; z-index: 10; pointer-events: auto; color: #3b82f6; }
.login-footer a:hover { color: #60a5fa; }
.back-link { color: #9ca3af; text-decoration: none; font-size: 14px; transition: color 0.2s ease; display: block; margin-top: 8px; }
.back-link:hover { color: #3b82f6; }
@media (max-width: 480px) { .login-card { padding: 32px 24px; } .login-header h1 { font-size: 24px; } }`;
  fs.writeFileSync(loginCssPath, loginCss);
}

ensureViews();

// Export app for Vercel serverless functions
module.exports = app;

// Only listen if not in serverless environment
if (process.env.VERCEL !== '1' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Art Shop running on http://localhost:${PORT}`);
  });
}

