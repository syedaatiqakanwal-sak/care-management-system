# Quick Fix: APP_BASE_URL Error

## ✅ Code Fixed

The backend now automatically detects the frontend URL from the request headers as a fallback. However, you should still set `APP_BASE_URL` for production reliability.

## 🔧 Two Solutions

### Solution 1: Set Environment Variable (Recommended)

Add this to your `backend/.env` file:

```env
APP_BASE_URL=http://72.62.199.119:81
```

Then **restart your backend server**.

**How to restart:**
- If using PM2: `pm2 restart backend` or `pm2 restart all`
- If using systemd: `sudo systemctl restart your-backend-service`
- If running directly: Stop and start the process

### Solution 2: Automatic Detection (Already Implemented)

The code now automatically detects the frontend URL from the request headers. When you click "Send" from `http://72.62.199.119:81`, it will use that URL automatically.

**However**, this only works if:
- The request includes an `Origin` or `Referer` header
- You're accessing the site from the public URL (not localhost)

## 🎯 Why This Happened

The error occurred because `APP_BASE_URL` was not set in the backend environment. The system was trying to use localhost as a fallback, which doesn't work for external referees.

## ✅ What's Fixed

1. **Automatic URL Detection**: The backend now extracts the frontend URL from request headers
2. **Better Error Messages**: Clear instructions on what to set
3. **Fallback Chain**: APP_BASE_URL → FRONTEND_URL → Request Headers → localhost (dev only)

## 🚀 Test It

1. Make sure you're accessing the site from `http://72.62.199.119:81` (not localhost)
2. Try adding a reference again
3. The email should now contain: `http://72.62.199.119:81/reference/submit/{token}`

## 📝 For Production

**Best Practice**: Set `APP_BASE_URL` in your backend `.env` file for reliability:

```env
APP_BASE_URL=http://72.62.199.119:81
```

This ensures the correct URL is always used, even if request headers are missing.
