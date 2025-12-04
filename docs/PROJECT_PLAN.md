# Retirement Portal - Project Implementation Plan

## 📋 Project Status: Firebase Backend Complete ✅

### Completed ✅
1. Firebase Project Created (`retirement-portal-prod`)
2. Firestore Database Initialized (us-west2)
3. Firestore Security Rules Deployed
4. Firestore Indexes Created & Deployed
5. Cloud Functions Boilerplate (TypeScript) - Ready to Deploy
6. Git Repository Initialized with Initial Commit

### In Progress 🔄
- Next.js Portal Frontend
- Firebase Authentication Integration
- iFrame App Wrapper System

### Todo 📝
- Stripe Payment Integration
- Google AdSense Setup
- Namecheap Hosting Configuration
- CI/CD Pipeline Setup

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Retirement Portal (Next.js)                    │
│            Namecheap Linux Server Hosting                   │
└────────────┬──────────────────────────────────────┬─────────┘
             │                                      │
             ▼                                      ▼
    ┌─────────────────┐              ┌──────────────────────┐
    │ Firebase Auth   │              │  Firestore Database  │
    │                 │              │                      │
    │ • Email/Pass    │              │ • Users              │
    │ • Google        │              │ • Applications Data  │
    │ • Anonymous     │              │ • Analytics          │
    └─────────────────┘              │ • Usage Tracking     │
                                      └──────────────────────┘
                                              ▲
                                              │
                                      ┌───────┴────────┐
                                      │                │
                                   ┌──▼──┐      ┌─────▼──┐
                                   │ Apps│      │Functions│
                                   └─────┘      └────────┘
                                   
                     ┌─────────────────┬──────────────────┐
                     ▼                 ▼                  ▼
            ┌──────────────────┐ ┌──────────────┐ ┌────────────┐
            │ Income Estimator │ │ Retire Abroad│ │Future Apps │
            │ (via iFrame)     │ │ (via iFrame) │ │(via iFrame)│
            └──────────────────┘ └──────────────┘ └────────────┘
```

---

## 📦 Project Structure (Target)

```
retirement-portal/
│
├── apps/
│   └── portal/ (Next.js 14)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx (home)
│       │   │   ├── (auth)/
│       │   │   │   ├── signup/page.tsx
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── logout/route.ts
│       │   │   ├── (authenticated)/
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── apps/[appId]/page.tsx (iFrame wrapper)
│       │   │   │   ├── profile/page.tsx
│       │   │   │   └── admin/
│       │   │   │       ├── dashboard/page.tsx
│       │   │   │       ├── users/page.tsx
│       │   │   │       └── analytics/page.tsx
│       │   │   └── api/
│       │   │       ├── auth/
│       │   │       ├── users/
│       │   │       └── analytics/
│       │   │
│       │   ├── components/
│       │   │   ├── Navigation.tsx
│       │   │   ├── AppLauncher.tsx
│       │   │   ├── IFrameWrapper.tsx
│       │   │   ├── AuthProvider.tsx
│       │   │   ├── PaymentModal.tsx
│       │   │   └── Ads/
│       │   │       └── AdSenseContainer.tsx
│       │   │
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useUserTier.ts
│       │   │   ├── useAnalytics.ts
│       │   │   └── useFreemiumGate.ts
│       │   │
│       │   ├── lib/
│       │   │   ├── firebase.ts
│       │   │   ├── analytics.ts
│       │   │   ├── auth-helpers.ts
│       │   │   └── app-registry.ts
│       │   │
│       │   └── types/
│       │       ├── user.ts
│       │       ├── app.ts
│       │       └── analytics.ts
│       │
│       ├── public/
│       ├── .env.local
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── functions/
│   ├── src/
│   │   └── index.ts (✅ Deployed)
│   └── package.json
│
├── packages/
│   ├── firebase-config/
│   │   └── index.ts
│   ├── shared-types/
│   │   ├── user.ts
│   │   ├── analytics.ts
│   │   └── app.ts
│   └── shared-utils/
│       ├── tier-helpers.ts
│       └── analytics-helpers.ts
│
├── firebase.json (✅ Configured)
├── firestore.rules (✅ Deployed)
├── firestore.indexes.json (✅ Deployed)
├── .firebaserc (✅ Configured)
│
└── docs/
    ├── FIREBASE_SETUP.md (✅ Complete)
    ├── DEPLOYMENT.md (Todo)
    ├── API_REFERENCE.md (Todo)
    └── USER_GUIDE.md (Todo)
```

---

## 🛠️ Technology Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **Frontend** | Next.js 14 + React 18 + TypeScript | Todo |
| **Styling** | Tailwind CSS + shadcn/ui | Todo |
| **Authentication** | Firebase Auth | Todo |
| **Database** | Firestore | ✅ Ready |
| **Backend Functions** | Firebase Cloud Functions (TypeScript) | ✅ Ready (needs deployment) |
| **Hosting** | Namecheap Linux Server | Todo |
| **Analytics** | Custom Firestore-based | ✅ Ready |
| **Payment** | Stripe | Todo |
| **Ads** | Google AdSense | Todo |
| **iFrame Integration** | Custom wrapper + PostMessage | Todo |

---

## 🎯 Implementation Phases

### Phase 1: Core Portal (Current)
**Goal**: Basic authenticated portal with user tier system

**Tasks**:
- [ ] Create Next.js 14 app with TypeScript
- [ ] Set up Firebase authentication
- [ ] Create auth pages (signup, login, logout)
- [ ] Implement auth context & hooks
- [ ] Create user dashboard
- [ ] Implement tier system (free/paid toggle)
- [ ] Deploy to Namecheap

**Estimated Time**: 2-3 weeks

### Phase 2: iFrame Integration
**Goal**: Embed external applications with auth token passing

**Tasks**:
- [ ] Create iFrame wrapper component
- [ ] Implement token passing mechanism
- [ ] Integrate Income Estimator app
- [ ] Integrate Retire Abroad app
- [ ] Handle cross-app communication
- [ ] Test on Namecheap

**Estimated Time**: 1-2 weeks

### Phase 3: Payment & Monetization
**Goal**: Freemium tier system with payment

**Tasks**:
- [ ] Set up Stripe account
- [ ] Create payment page
- [ ] Implement upgrade flow
- [ ] Set up Google AdSense
- [ ] Implement ad serving logic
- [ ] Query limiting for free tier

**Estimated Time**: 1-2 weeks

### Phase 4: Analytics & Reporting
**Goal**: Admin dashboard for business metrics

**Tasks**:
- [ ] Build analytics collection system (🔄 In Progress)
- [ ] Create admin dashboard
- [ ] Implement report generation
- [ ] Add user insights
- [ ] Add revenue tracking
- [ ] Set up monitoring

**Estimated Time**: 1-2 weeks

### Phase 5: Advanced Features
**Goal**: Enhanced user experience

**Tasks**:
- [ ] User preferences & customization
- [ ] Saved calculations/recommendations
- [ ] User profile management
- [ ] Email notifications
- [ ] API rate limiting
- [ ] Performance optimization

**Estimated Time**: 2-3 weeks

---

## 🔑 Key Features by Tier

### Free Tier 🆓
- ✅ Read-only access to applications
- ✅ 5 AI queries per day (configurable)
- ✅ Google AdSense ads displayed
- ✅ Session-based results (no persistence)
- ✅ Anonymous login option

### Paid Tier 💰
- ✅ Unlimited AI queries
- ✅ No ads
- ✅ Save calculations & recommendations
- ✅ Historical data access
- ✅ Export results
- ✅ Premium features
- ✅ Priority support

---

## 📊 Analytics Tracked

**User Behavior Events**:
- Login/Logout
- App Access
- AI Query (count + content)
- Calculation Saved
- Recommendation Viewed
- Button Clicks
- Time Spent in App
- Feature Usage
- Error Events

**Business Metrics**:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Tier Distribution (Free vs Paid)
- Conversion Rate (Free → Paid)
- Revenue per User
- Query Volume
- Most Used Applications
- Feature Adoption

---

## 🔐 Security Checklist

- [x] Firestore Security Rules (freemium-aware)
- [ ] CORS Configuration
- [ ] API Rate Limiting
- [ ] DDoS Protection
- [ ] SSL/TLS Certificates
- [ ] Environment Variables (secrets)
- [ ] Admin Authentication
- [ ] Data Encryption
- [ ] Regular Security Audits
- [ ] GDPR Compliance
- [ ] Data Backup Strategy

---

## 💻 Local Development Setup

### Prerequisites
```bash
# Install Node.js 18+
# Install Firebase CLI: npm install -g firebase-tools
# Install git
```

### Setup Steps
```bash
# 1. Clone repository
git clone https://github.com/eappell/Retirement-Portal.git
cd Retirement-Portal

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# 4. Start Firebase emulator (optional)
firebase emulators:start

# 5. Create Next.js app (in apps/portal)
cd apps/portal
npm install
npm run dev

# Portal runs on: http://localhost:3000
```

---

## 🚀 Deployment Strategy

### Development
- Local Firebase emulator
- Namecheap staging server

### Production
1. **Next.js Portal**: Namecheap Linux Server
   - Process manager: PM2
   - Reverse proxy: Nginx
   - SSL: Let's Encrypt

2. **Firebase Backend**: Google Cloud (managed)
   - Firestore: Automatic scaling
   - Cloud Functions: Pay-as-you-go (Blaze plan)

3. **Domain**: appell.com or retire.appell.me
   - DNS: Namecheap
   - Nameservers: Namecheap defaults

### CI/CD Pipeline
- Git push to main → Build & deploy
- Pre-deployment tests
- Automated backups

---

## 📞 Next Steps

1. **Review** this implementation plan
2. **Create** Next.js app boilerplate
3. **Set up** Firebase authentication
4. **Build** authentication pages
5. **Test** locally with Firebase emulator
6. **Deploy** to Namecheap

---

## 📚 Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Stripe Documentation](https://stripe.com/docs)
- [Namecheap Web Hosting](https://www.namecheap.com)

---

**Last Updated**: December 3, 2025  
**Next Review**: Upon Phase 1 Completion
