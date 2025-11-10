# Simple Deployment Guide 🚀

## 🎯 Easiest Option: Railway (Recommended)

Railway is the **simplest** way to deploy your app because:
- ✅ Works with SQLite (no database changes needed)
- ✅ Supports file uploads (no storage changes needed)
- ✅ Free tier available
- ✅ Deploys directly from GitHub
- ✅ Automatic HTTPS

### Step-by-Step:

#### 1. Push Your Code to GitHub
```bash
# If you haven't already
git add .
git commit -m "Ready for deployment"
git push origin master
```

#### 2. Sign Up & Deploy
1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository (`peterart07`)
5. Railway will automatically detect your Node.js app

#### 3. Add Environment Variables
In Railway dashboard, go to your project → **Variables** tab, add:
```
ADMIN_EMAIL=harshitap649@gmail.com
ADMIN_PASS=your-secure-password
SESSION_SECRET=your-random-secret-key-here
PORT=3000
```

#### 4. Deploy!
- Railway will automatically build and deploy
- You'll get a URL like: `https://your-app-name.railway.app`
- Your site is live! 🎉

---

## 🎯 Alternative: Render (Also Easy)

Similar to Railway, also supports SQLite and file uploads.

### Steps:
1. Go to [render.com](https://render.com)
2. Sign up
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node art-shop-app.js`
   - **Environment:** Node
6. Add environment variables (same as Railway)
7. Click **"Create Web Service"**

---

## 🎯 Option 3: Vercel (Requires Changes)

Vercel is great but requires code changes:
- ❌ SQLite won't work (need cloud database)
- ❌ File uploads won't persist (need cloud storage)

**If you want to use Vercel**, you'll need to:
1. Replace SQLite with Supabase or Vercel Postgres
2. Replace file uploads with Cloudinary or Vercel Blob Storage

---

## 📝 Quick Checklist Before Deploying

- [ ] Code is pushed to GitHub
- [ ] `.env` file is NOT in git (should be in `.gitignore`)
- [ ] Environment variables are set in deployment platform
- [ ] Test locally: `npm start` works

---

## 🔧 Troubleshooting

**App won't start?**
- Check environment variables are set correctly
- Check logs in Railway/Render dashboard
- Make sure `PORT` is set (Railway sets this automatically)

**Database errors?**
- Make sure SQLite file is in your repo (or initialize it on first run)
- Check file permissions

**File uploads not working?**
- Make sure `/uploads` folder exists
- Check write permissions

---

## 🎉 After Deployment

Your site will be live at a URL like:
- Railway: `https://your-app-name.railway.app`
- Render: `https://your-app-name.onrender.com`

You can:
- Share the URL with others
- Set up a custom domain (optional)
- Monitor logs in the dashboard

---

**Need help?** Check the detailed `DEPLOYMENT.md` file for more options and migration guides.

