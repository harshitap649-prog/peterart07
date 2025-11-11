# Deploy to Railway - Step by Step Guide 🚀

Railway is **MUCH BETTER** for your app because:
- ✅ Works with SQLite (persistent database)
- ✅ Supports file uploads
- ✅ Sessions work reliably
- ✅ Traditional Node.js app (no serverless issues)
- ✅ Free tier available
- ✅ Easy deployment from GitHub

## Quick Deploy Steps:

### 1. Push Your Code to GitHub (if not already done)
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin master
```

### 2. Sign Up for Railway
1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (easiest way)

### 3. Deploy Your App
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `peterart07`
4. Railway will automatically detect it's a Node.js app

### 4. Add Environment Variables
In Railway dashboard, go to your project → **Variables** tab, add:

```
ADMIN_EMAIL=harshitap649@gmail.com
ADMIN_PASS=your-secure-password
SESSION_SECRET=your-random-secret-key-here
PORT=3000
NODE_ENV=production
```

### 5. Deploy!
- Railway will automatically:
  - Install dependencies (`npm install`)
  - Start your app (`node art-shop-app.js`)
  - Give you a URL like: `https://peterart07-production.up.railway.app`

### 6. (Optional) Add Custom Domain
- Railway Dashboard → Settings → Domains
- Add your custom domain

## That's It! 🎉

Your app will work **exactly like localhost** because:
- ✅ SQLite database persists (not in-memory)
- ✅ File uploads work (`/uploads` folder)
- ✅ Sessions work properly
- ✅ All routes work correctly
- ✅ No serverless limitations

## Troubleshooting

**App not starting?**
- Check Railway logs: Dashboard → Deployments → View Logs
- Make sure all environment variables are set

**Database issues?**
- Railway supports SQLite perfectly - no changes needed!

**Still having issues?**
- Check the logs in Railway dashboard
- All your localhost features will work on Railway

---

**Railway is FREE** for small projects and much more reliable for traditional Node.js apps like yours!

