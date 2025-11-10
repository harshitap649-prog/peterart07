# Login Credentials for Live Site

## Admin Login (Works on Vercel)

**Email:** `harshitap649@gmail.com`  
**Password:** `adminpass` (default) OR the value you set in Vercel environment variable `ADMIN_PASS`

### How to Set Admin Password in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project: `peterart07`
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   - `ADMIN_PASS` = `your-secure-password`
5. **Redeploy** your project

## Regular User Login

❌ **Not available yet** - Database is not configured on Vercel

Regular users cannot register or login because:
- SQLite database doesn't work on Vercel (read-only filesystem)
- Need to migrate to a cloud database (Supabase, Vercel Postgres, etc.)

## Google Sign-In

⚠️ **May not work** - Firebase initialization might fail

If Google Sign-In doesn't work:
1. Check browser console for errors
2. Use email/password login instead
3. The fallback will show an alert if Google Sign-In fails

## Troubleshooting

### Can't login with admin credentials?

1. **Check Vercel Logs:**
   - Vercel Dashboard → Your Project → Logs
   - Look for "Login attempt:" messages
   - Check if email/password match

2. **Verify Environment Variables:**
   - Make sure `ADMIN_EMAIL` and `ADMIN_PASS` are set
   - Default values are used if not set

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear cookies for the site

4. **Check Session:**
   - Make sure cookies are enabled
   - Try in incognito/private mode

### Still having issues?

The login should work with:
- Email: `harshitap649@gmail.com`
- Password: `adminpass` (if `ADMIN_PASS` env var not set)

If it still doesn't work, check the Vercel logs for the exact error message.

