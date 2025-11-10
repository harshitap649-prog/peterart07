# GitHub Setup Guide

## ✅ Step 1: Create Repository on GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository name: `art-shop` (or any name you like)
4. Description: "Art Shop - E-commerce application"
5. Choose **Public** or **Private**
6. **DO NOT** check "Initialize with README" (we already have files)
7. Click **"Create repository"**

## ✅ Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

### Option A: If you haven't created the repo yet
```bash
git remote add origin https://github.com/YOUR_USERNAME/art-shop.git
git branch -M main
git push -u origin main
```

### Option B: If you already created the repo
GitHub will show you the exact commands. They'll look like:
```bash
git remote add origin https://github.com/YOUR_USERNAME/art-shop.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username!**

## ✅ Step 3: Push Your Code

Run these commands in your terminal:

```bash
# Add the remote (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/art-shop.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## 🔐 Authentication

If GitHub asks for authentication:
- **Option 1**: Use a Personal Access Token (recommended)
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token with `repo` permissions
  - Use token as password when pushing

- **Option 2**: Use GitHub CLI
  ```bash
  gh auth login
  ```

## ✅ Step 4: Verify Upload

1. Go to your GitHub repository page
2. You should see all your files there
3. Files like `node_modules`, `.env`, `*.db` should NOT be visible (they're in .gitignore)

## 🚀 Next: Deploy to Vercel

After your code is on GitHub:

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click **"Add New Project"**
4. Import your `art-shop` repository
5. Vercel will auto-detect it's a Node.js app
6. Add environment variables:
   - `ADMIN_EMAIL`
   - `ADMIN_PASS`
   - `SESSION_SECRET`
7. Click **"Deploy"**

## ⚠️ Important Notes

- **No build step needed** - This is a Node.js app, not a frontend app
- **Database issue**: SQLite won't work on Vercel. You'll need to migrate to a cloud database
- **File uploads**: Local uploads won't work. Need cloud storage (Cloudinary, etc.)

See `DEPLOYMENT.md` for more details on deployment options.

