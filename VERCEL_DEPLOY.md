# Deploy to Vercel - Quick Guide 🚀

Your app is now configured for Vercel deployment!

## ⚠️ Important Notes

1. **Database**: Currently using in-memory SQLite (data resets on each deployment)
   - For production, migrate to **Supabase** (free) or **Vercel Postgres**
   
2. **File Uploads**: Uses Firebase Storage (already configured)
   - Make sure Firebase credentials are set in Vercel environment variables

## 🚀 Deploy Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to [vercel.com](https://vercel.com)** and sign up/login

2. **Click "Add New Project"**

3. **Import your GitHub repository:**
   - Select `harshitap649-prog/peterart07`
   - Click "Import"

4. **Configure Project:**
   - Framework Preset: **Other**
   - Root Directory: `./` (leave as is)
   - Build Command: Leave empty (or `npm install`)
   - Output Directory: Leave empty
   - Install Command: `npm install`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   ADMIN_EMAIL=harshitap649@gmail.com
   ADMIN_PASS=your-secure-password
   SESSION_SECRET=your-random-secret-key-here
   NODE_ENV=production
   ```
   
   **If using Firebase Storage, also add:**
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   FIREBASE_STORAGE_BUCKET=your-bucket-name
   ```

6. **Click "Deploy"**
   - Vercel will automatically build and deploy
   - You'll get a URL like: `https://peterart07.vercel.app`

### Option 2: Deploy via CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: `peterart07`
   - Directory: `./`
   - Override settings? **No**

4. **Set Environment Variables:**
   ```bash
   vercel env add ADMIN_EMAIL
   vercel env add ADMIN_PASS
   vercel env add SESSION_SECRET
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## 📁 What Gets Deployed

Vercel automatically:
- ✅ Reads `vercel.json` configuration
- ✅ Uses `api/index.js` as serverless function
- ✅ Serves static files from `public/`
- ✅ Installs dependencies from `package.json`
- ✅ Ignores files in `.gitignore` and `.vercelignore`

**No `dist` folder needed!** Vercel builds from source.

## 🔧 Troubleshooting

**Build fails?**
- Check that all dependencies are in `package.json`
- Verify `api/index.js` exists and exports correctly

**App crashes?**
- Check Vercel logs: Dashboard → Your Project → Logs
- Verify environment variables are set
- Make sure Firebase credentials are correct (if using)

**Database not working?**
- In-memory database resets on each deployment
- For persistent data, migrate to Supabase (free tier available)

## 🎯 Next Steps (Optional)

1. **Set up Supabase** (free database):
   - Go to [supabase.com](https://supabase.com)
   - Create project
   - Get connection string
   - Update code to use Supabase instead of SQLite

2. **Configure Custom Domain:**
   - Vercel Dashboard → Settings → Domains
   - Add your domain

3. **Enable Analytics:**
   - Vercel Dashboard → Analytics
   - Track your app's performance

## ✅ Your app is ready!

After deployment, your site will be live at:
`https://peterart07.vercel.app` (or your custom domain)

---

**Note**: The in-memory database is fine for testing, but for production with real users, you should migrate to a cloud database like Supabase.

