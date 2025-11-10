# Art Shop

A single-file Node.js application for managing an art shop with admin panel, gallery, and order management.

## Features

- Admin login restricted to a specific email (set via .env)
- Admin can add artworks (image upload) via admin panel
- Public gallery shows artworks with "Buy" button
- Cash on Delivery (COD) checkout collects name, phone, address
- Orders and artworks stored in a SQLite DB and visible in admin panel

## Setup Instructions

1. **Create a `.env` file** in the project root with the following content:
   ```
   ADMIN_EMAIL=youremail@example.com
   ADMIN_PASS=yourpassword
   SESSION_SECRET=some_random_secret_key_here
   PORT=3000
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```
   Or:
   ```bash
   node art-shop-app.js
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

- **Public Gallery**: Visit the home page to see all artworks
- **Admin Login**: Go to `/admin/login` and use the credentials from your `.env` file
- **Admin Dashboard**: After logging in, you can:
  - Add new artworks with images
  - View all orders
  - Update order status
  - Delete artworks

## Notes

- This is a minimal single-file implementation intended to be a starting point.
- For production, move to a multi-file project, add CSRF protection, input sanitization, HTTPS, and real authentication.
- Uploaded images are stored in the `/uploads` directory.
- The SQLite database file is created automatically as `artshop.db`.

## Project Structure

```
peterart07/
├── art-shop-app.js    # Main application file
├── package.json       # NPM dependencies
├── .env              # Environment variables (create this)
├── uploads/          # Uploaded images (created automatically)
├── views/            # EJS templates (created automatically)
├── public/           # Static files (created automatically)
└── artshop.db        # SQLite database (created automatically)
```

