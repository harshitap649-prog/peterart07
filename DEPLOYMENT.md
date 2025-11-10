# Deployment Guide for Art Shop

## ⚠️ Important Limitations for Vercel Deployment

Your app currently uses:
1. **SQLite database** (local file) - ❌ Won't work on Vercel
2. **Local file uploads** (`/uploads` folder) - ❌ Won't persist on Vercel

## What I've Set Up

✅ Created `vercel.json` configuration
✅ Created `api/index.js` serverless handler
✅ Modified app to export for serverless
✅ Added `.vercelignore` and `.gitignore`

## What You Need to Change Before Deploying

### Option 1: Use External Services (Recommended for Vercel)

#### 1. Replace SQLite with a Cloud Database
- **Vercel Postgres** (easiest, built-in)
- **Supabase** (free tier available)
- **PlanetScale** (MySQL, free tier)
- **MongoDB Atlas** (free tier)

#### 2. Replace Local File Storage with Cloud Storage
- **Cloudinary** (free tier, easy image uploads)
- **AWS S3** (requires AWS account)
- **Vercel Blob Storage** (new, built-in)

### Option 2: Use a Different Platform (Easier)

These platforms support traditional Node.js apps better:

#### **Railway** (Recommended)
- ✅ Supports SQLite
- ✅ Supports file uploads
- ✅ Free tier available
- ✅ Easy deployment from GitHub

#### **Render**
- ✅ Supports SQLite
- ✅ Supports file uploads
- ✅ Free tier available

#### **Heroku**
- ✅ Supports SQLite (with limitations)
- ⚠️ Paid plans only (no free tier)

## Quick Deploy to Vercel (After Changes)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `ADMIN_EMAIL=your-email@example.com`
     - `ADMIN_PASS=your-password`
     - `SESSION_SECRET=your-secret-key`
     - `NODE_ENV=production`

5. **Redeploy** after adding environment variables

## Quick Deploy to Railway (Easier Option)

1. **Sign up at** [railway.app](https://railway.app)

2. **Create New Project** → Deploy from GitHub

3. **Add Environment Variables:**
   - `ADMIN_EMAIL`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
   - `PORT` (Railway sets this automatically)

4. **That's it!** Railway handles the rest.

## Current Status

✅ App is configured for Vercel serverless functions
❌ Database needs to be migrated to cloud service
❌ File uploads need to be migrated to cloud storage

## Next Steps

1. **If deploying to Vercel:**
   - Migrate database to Vercel Postgres or Supabase
   - Migrate file uploads to Cloudinary or Vercel Blob
   - Update code to use new services

2. **If deploying to Railway/Render:**
   - Just push to GitHub and connect
   - Add environment variables
   - Deploy!

Would you like me to help you migrate to a cloud database and storage service?

