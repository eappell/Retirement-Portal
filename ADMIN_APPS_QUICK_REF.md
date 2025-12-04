# 🎯 Admin Apps Manager - Quick Reference

## 📍 Access Points

| Page | URL | Purpose |
|------|-----|---------|
| Admin Dashboard | `/admin/dashboard` | View system analytics |
| App Manager | `/admin/apps` | Add/Edit/Delete apps |
| User Dashboard | `/dashboard` | See available apps |
| App Loader | `/apps/[appId]` | Load embedded app |

## 🔐 Permissions

- **Admin Users**: Full access to app management
- **All Users**: Can view available apps
- **Free Tier**: Can access apps marked as `freeAllowed: true`
- **Paid Tier**: Can access all apps

## 📚 Database Collection

**Collection**: `apps`

**Document Fields**:
```
- id: string (unique app identifier)
- name: string (display name)
- description: string (app description)
- url: string (deployment URL)
- icon: string (emoji icon: 🧮 💼 📊 🌍 ⚡ 📈 etc)
- freeAllowed: boolean (free tier access)
- createdAt: timestamp (auto-populated)
```

## 🚀 Common Tasks

### Add New App
1. Go to `/admin/apps`
2. Click "Add Application"
3. Fill form and select icon
4. Click "Create App"
5. App appears on `/dashboard`

### Update App
1. Go to `/admin/apps`
2. Click "Edit" on app
3. Modify fields
4. Click "Save Changes"

### Remove App
1. Go to `/admin/apps`
2. Click "Delete" on app
3. Confirm deletion

### Set Up Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## 🎨 Available Icons

📦 📊 💼 ✨ ⚡ 🎯 🚀 📈 🌍 🏢 📊 🧮 💳 💵

## ⚙️ Configuration

**Default Apps** (fallback if Firestore empty):
- `income-estimator` → http://localhost:5173/
- `retire-abroad` → https://retire-abroad-ai.vercel.app/

**Firestore Fallback**: If Firestore read fails, uses DEFAULT_APPS

## 🔍 Debugging

**Apps not showing?**
- Check user is logged in
- Verify admin permission for editing
- Check Firestore collection has data
- Look for console errors

**Can't edit apps?**
- Verify user has `tier: "admin"`
- Check Firestore security rules deployed
- Verify GOOGLE_APPLICATION_CREDENTIALS set

**Fallback showing?**
- Firestore collection is empty
- Firestore read failed (check rules)
- CORS issue (check browser console)

## 📱 Responsive Design

✅ Mobile-friendly interface
✅ Tablet optimized
✅ Desktop full-featured
