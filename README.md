# Retirement Portal

A comprehensive web platform for retirement planning, combining multiple retirement-focused applications with single sign-on authentication and a powerful analytics engine.

## 🎯 Project Vision

Create a scalable portal that hosts multiple retirement planning applications:
- **Monthly Retirement Income Estimator**: https://retire.appell.me
- **Retire Abroad AI Recommendation**: https://retire-abroad-ai.vercel.app/
- **Future Applications**: Easily add new retirement planning tools

## 🏗️ Architecture

- **Frontend**: Next.js 14 (React 18, TypeScript) on Namecheap Linux server
- **Authentication**: Firebase Auth (Email, Google, Anonymous)
- **Database**: Firestore (real-time sync, analytics)
- **Backend**: Firebase Cloud Functions (TypeScript)
- **Analytics**: Custom Firestore-based event tracking
- **Monetization**: Freemium model (Free/Paid tiers)
- **Payments**: Stripe integration
- **Ads**: Google AdSense (free tier only)
- **Integration**: iFrame + Shared Auth Token

## 💰 Business Model

### Free Tier 🆓
- Limited AI queries (5 per day)
- Google AdSense ads
- Read-only access
- Session-based results

### Paid Tier 💳
- Unlimited queries
- No ads
- Save calculations & recommendations
- Historical data access
- Premium features

## 🚀 Project Status

### ✅ Completed
- Firebase project setup (`retirement-portal-prod`)
- Firestore database & security rules
- Cloud Functions boilerplate
- Initial project structure
- Git repository with init branch

### 🔄 In Progress
- Next.js portal frontend
- Firebase authentication integration

### 📝 Todo
- iFrame app integration
- Payment processing (Stripe)
- Google AdSense setup
- Namecheap hosting configuration
- Analytics dashboard

## 📋 Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Detailed implementation roadmap
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration guide

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Authentication | Firebase Auth |
| Database | Firestore |
| Backend | Firebase Cloud Functions |
| Hosting | Namecheap Linux Server |
| Analytics | Custom Firestore-based |
| Payments | Stripe |
| Deployment | Git + Firebase CLI |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Development Setup

```bash
# Clone repository
git clone https://github.com/eappell/Retirement-Portal.git
cd Retirement-Portal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with Firebase credentials

# Start Firebase emulator (optional)
firebase emulators:start

# Start portal (in apps/portal)
cd apps/portal
npm run dev
```

Portal will be available at `http://localhost:3000`

## 📂 Project Structure

```
retirement-portal/
├── apps/
│   └── portal/              # Next.js 14 application
├── functions/               # Firebase Cloud Functions (TypeScript)
├── packages/                # Shared utilities & types
├── firebase.json            # Firebase configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
└── docs/
    ├── PROJECT_PLAN.md      # Implementation roadmap
    └── FIREBASE_SETUP.md    # Firebase guide
```

## 🔐 Security

- Firestore security rules enforce user privacy
- Freemium tier logic at the database level
- Admin authentication for sensitive operations
- CORS & rate limiting on APIs
- Environment variables for secrets

## 📊 Analytics

The platform tracks:
- User logins/logouts
- Application usage
- AI query counts
- Saved calculations
- Feature adoption
- User engagement metrics

## 🤝 Contributing

This is a primary project. Please follow the branch structure:
- `main` - Production-ready code
- `init` - Development branch for this phase
- Feature branches for specific features

## 📞 Support & Questions

For Firebase configuration issues, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

For implementation details, see [PROJECT_PLAN.md](./PROJECT_PLAN.md)

## 📄 License

All rights reserved © 2025

## 🎯 Current Branch

You are on the **`init`** branch. This is the initial setup phase where we're configuring Firebase, setting up the project structure, and preparing for frontend development.

---

**Last Updated**: December 3, 2025  
**Firebase Project**: `retirement-portal-prod`  
**Firebase Region**: `us-west2`
