# Railway Deployment - Data Persistence Guide

## Overview
This guide ensures your artworks, database, and uploaded images persist across Railway deployments.

## Option 1: Firebase Storage (Recommended) ✅

**Best for:** Production deployments with reliable image storage

### Setup:
1. **Configure Firebase Storage** in Railway environment variables:
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket (e.g., `peterart07-e9c21.firebasestorage.app`)
   - `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON (as a string)

2. **Benefits:**
   - Images stored in Firebase (persistent, fast CDN)
   - No volume configuration needed
   - Works across all deployments
   - Database still needs Railway volume (see Option 2)

## Option 2: Railway Persistent Volume

**Best for:** Complete data persistence including database and local file storage

### Setup Steps:

1. **Add a Volume in Railway Dashboard:**
   - Go to your Railway project
   - Click "New" → "Volume"
   - Name it: `persistent-data`
   - Size: At least 1GB (adjust based on your needs)

2. **Mount the Volume to Your Service:**
   - Go to your service settings
   - Click "Volumes" tab
   - Click "Mount Volume"
   - Select `persistent-data`
   - Mount path: `/data`
   - Click "Deploy"

3. **Verify:**
   - After deployment, check logs for:
     - `✅ Using /data directory for database on Railway`
     - `✅ Using /data directory for uploads on Railway`

### What Gets Stored:
- **Database:** `/data/artshop.db` - All artworks, orders, users, etc.
- **Uploads:** `/data/uploads/` - All uploaded artwork images (if not using Firebase)

## Option 3: Hybrid Approach (Recommended for Production)

**Best Setup:**
- ✅ **Firebase Storage** for images (fast, reliable, CDN)
- ✅ **Railway Volume** for database (persistent SQLite)

This gives you:
- Fast image delivery via Firebase CDN
- Persistent database on Railway
- No risk of losing data on redeployments

## Verification

After deployment, check your Railway logs to confirm:
```
✅ Using /data directory for database on Railway
✅ Database initialized: /data/artshop.db
✅ Using /data directory for uploads on Railway
```

If you see warnings like:
```
⚠️  /data directory not found. Database will not persist across deployments.
```

Then the volume is not mounted correctly. Follow Option 2 steps above.

## Important Notes

1. **Database Backup:** Consider backing up your database regularly:
   ```bash
   # Download database from Railway
   railway run cat /data/artshop.db > backup.db
   ```

2. **Firebase Storage:** Once configured, all new uploads go to Firebase automatically. Existing local files won't be migrated automatically.

3. **Volume Size:** Monitor your volume usage. Railway volumes are persistent but have size limits based on your plan.

4. **Deployments:** With proper setup, all data persists across:
   - Code updates
   - Service restarts
   - Railway platform updates
   - Manual redeployments

## Troubleshooting

**Problem:** Data lost after deployment
- **Solution:** Ensure volume is mounted at `/data` path

**Problem:** Images not loading
- **Solution:** Check Firebase Storage configuration or verify volume mount for uploads directory

**Problem:** Database errors
- **Solution:** Verify volume is mounted and check file permissions

