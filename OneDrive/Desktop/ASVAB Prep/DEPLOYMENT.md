# 🚀 ASVAB Prep App - Complete Production Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the ASVAB Prep application to production. The app consists of:

- **Backend**: NestJS API with PostgreSQL database
- **Mobile**: React Native/Expo application
- **Shared**: TypeScript types and utilities

## 🛠️ Prerequisites

### Development Environment
- Node.js 18+ and npm
- PostgreSQL 14+ database
- Expo CLI (`npm install -g @expo/cli`)
- Docker (optional, for containerized deployment)

### Production Services Required
- **Database**: Supabase, Railway, or AWS RDS (PostgreSQL)
- **API Hosting**: Railway, Render, or AWS/DigitalOcean
- **File Storage**: AWS S3 or Supabase Storage
- **Email Service**: SendGrid or AWS SES
- **Push Notifications**: Expo Push Notification Service
- **App Stores**: Apple App Store Connect, Google Play Console

### External API Keys
- **Stripe**: Payment processing (Live keys)
- **OpenAI**: AI coaching features (GPT-4 access)
- **Apple**: App Store Connect API
- **Google**: Play Console API

---

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com/dashboard
   # Create new project with PostgreSQL 14+
   ```

2. **Get Database Credentials**
   ```bash
   # From Supabase Dashboard > Settings > Database
   DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   ```

3. **Configure Database**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

### Option 2: Railway Database

1. **Deploy Railway PostgreSQL**
   ```bash
   # Visit https://railway.app
   # Create new project > Add PostgreSQL service
   ```

2. **Get Connection String**
   ```bash
   # From Railway Dashboard > Database > Connect
   DATABASE_URL="postgresql://postgres:[password]@[host]:5432/railway"
   ```

---

## 🚀 Backend API Deployment

### Option 1: Railway (Recommended)

1. **Prepare for Deployment**
   ```bash
   cd backend
   
   # Create railway.json
   cat > railway.json << 'EOF'
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "numReplicas": 1,
       "sleepApplication": false,
       "restartPolicyType": "ON_FAILURE"
     }
   }
   EOF
   
   # Update package.json scripts
   npm pkg set scripts.build="nest build"
   npm pkg set scripts.start:prod="node dist/main"
   ```

2. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

3. **Configure Environment Variables**
   ```bash
   # In Railway Dashboard, set these variables:
   railway variables set DATABASE_URL="your-db-url"
   railway variables set JWT_SECRET="your-super-secret-jwt-key"
   railway variables set JWT_EXPIRES_IN="7d"
   railway variables set JWT_REFRESH_SECRET="your-refresh-secret"
   railway variables set JWT_REFRESH_EXPIRES_IN="30d"
   railway variables set OPENAI_API_KEY="your-openai-key"
   railway variables set STRIPE_SECRET_KEY="sk_live_your-stripe-key"
   railway variables set STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
   railway variables set SENDGRID_API_KEY="your-sendgrid-key"
   railway variables set FRONTEND_URL="https://your-app.vercel.app"
   railway variables set GOOGLE_CLIENT_ID="your-google-oauth-id"
   railway variables set GOOGLE_CLIENT_SECRET="your-google-oauth-secret"
   ```

4. **Run Database Migrations**
   ```bash
   # Connect to Railway and run migrations
   railway connect
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

### Option 2: Render.com

1. **Create render.yaml**
   ```yaml
   services:
     - type: web
       name: asvab-prep-api
       env: node
       plan: starter
       buildCommand: npm install && npm run build
       startCommand: npm run start:prod
       envVars:
         - key: DATABASE_URL
           sync: false
         - key: JWT_SECRET
           generateValue: true
         - key: NODE_ENV
           value: production
   ```

2. **Deploy via GitHub**
   ```bash
   # Push to GitHub, connect to Render
   # Set environment variables in Render Dashboard
   ```

---

## 📱 Mobile App Deployment

### Prerequisites Setup

1. **Configure App Stores**
   
   **Apple App Store:**
   ```bash
   # Create Apple Developer Account ($99/year)
   # Create App ID: com.yourcompany.asvabprep
   # Create App Store Connect app
   ```
   
   **Google Play Store:**
   ```bash
   # Create Google Play Console account ($25 one-time)
   # Create new application
   # Generate upload key and keystore
   ```

2. **Configure Expo Project**
   ```bash
   cd mobile
   
   # Update app.json
   cat > app.json << 'EOF'
   {
     "expo": {
       "name": "ASVAB Prep",
       "slug": "asvab-prep",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "userInterfaceStyle": "automatic",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#3C3D37"
       },
       "assetBundlePatterns": ["**/*"],
       "ios": {
         "supportsTablet": true,
         "bundleIdentifier": "com.yourcompany.asvabprep",
         "buildNumber": "1"
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#3C3D37"
         },
         "package": "com.yourcompany.asvabprep",
         "versionCode": 1
       },
       "web": {
         "favicon": "./assets/favicon.png"
       },
       "plugins": [
         "expo-notifications",
         "expo-secure-store",
         "expo-in-app-purchases"
       ],
       "extra": {
         "eas": {
           "projectId": "your-expo-project-id"
         }
       }
     }
   }
   EOF
   ```

3. **Configure Build Profiles**
   ```bash
   # Create eas.json
   cat > eas.json << 'EOF'
   {
     "cli": {
       "version": ">= 5.2.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "ios": {
           "simulator": true
         }
       },
       "production": {
         "env": {
           "API_BASE_URL": "https://your-api.railway.app",
           "EXPO_PROJECT_ID": "your-expo-project-id"
         }
       }
     },
     "submit": {
       "production": {
         "ios": {
           "appleId": "your-apple-id@email.com",
           "ascAppId": "your-app-store-connect-id",
           "appleTeamId": "your-apple-team-id"
         },
         "android": {
           "serviceAccountKeyPath": "./google-play-key.json",
           "track": "internal"
         }
       }
     }
   }
   EOF
   ```

### Build and Deploy Mobile App

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Build for Production**
   ```bash
   # iOS Build
   eas build --platform ios --profile production
   
   # Android Build  
   eas build --platform android --profile production
   
   # Build for both platforms
   eas build --platform all --profile production
   ```

3. **Submit to App Stores**
   ```bash
   # Submit to Apple App Store (after iOS build completes)
   eas submit --platform ios --profile production
   
   # Submit to Google Play Store (after Android build completes)
   eas submit --platform android --profile production
   ```

4. **Configure In-App Purchases**
   
   **Apple App Store:**
   ```bash
   # In App Store Connect:
   # 1. Create In-App Purchase: "Premium Monthly" ($9.97)
   # 2. Product ID: "premium_monthly"
   # 3. Enable auto-renewable subscription
   # 4. Create subscription group
   # 5. Add localized descriptions
   ```
   
   **Google Play Store:**
   ```bash
   # In Google Play Console:
   # 1. Create subscription: "Premium Monthly" ($9.97)
   # 2. Product ID: "premium_monthly"  
   # 3. Configure subscription benefits
   # 4. Set up subscription offers (7-day free trial)
   ```

---

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Railway automatically provides HTTPS
# Render automatically provides HTTPS
# For custom domain, configure DNS CNAME records
```

### Environment Variables Security
```bash
# Never commit these to version control:
# - Database connection strings
# - API keys
# - JWT secrets
# - Stripe keys
# - OAuth client secrets

# Use secure secret generation:
openssl rand -base64 32  # For JWT secrets
```

### API Security Headers
```typescript
// In main.ts (NestJS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

## 📊 Monitoring & Analytics

### Application Monitoring
```bash
# Add to backend package.json
npm install @sentry/node @sentry/integrations

# Configure in main.ts
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: 'your-sentry-dsn' });
```

### Database Monitoring
```bash
# Supabase provides built-in monitoring
# Railway provides CPU/Memory metrics
# Set up alerts for:
# - High database connections
# - Slow query performance
# - API response times > 1000ms
```

### Mobile App Analytics
```typescript
// Install expo-analytics
npx expo install expo-application expo-constants

// Track key events:
// - User registration
// - Quiz completion
// - Subscription purchase
// - App crashes
```

---

## 🚨 Disaster Recovery

### Database Backups
```bash
# Automated backups (configured in hosting provider):
# - Daily backups for 7 days
# - Weekly backups for 4 weeks  
# - Monthly backups for 12 months

# Manual backup command:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Application Rollback
```bash
# Railway rollback
railway rollback

# Render rollback
# Use Render dashboard to redeploy previous version

# Mobile app rollback
# Use App Store/Play Store phased rollout controls
```

---

## 📈 Performance Optimization

### Database Performance
```sql
-- Add database indexes for common queries
CREATE INDEX idx_users_branch ON users(selected_branch);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_flashcard_reviews_due ON flashcard_reviews(next_review_date);
```

### API Optimization
```typescript
// Enable Redis caching for frequently accessed data
import { CacheModule } from '@nestjs/cache-manager';

// Cache quiz questions for 1 hour
@CacheTTL(3600)
async getQuestions() { ... }
```

### Mobile App Performance
```bash
# Enable Hermes JavaScript engine (Android)
# Configure in android/app/build.gradle
project.ext.react = [
  enableHermes: true
]

# Use Flipper for performance profiling in development
```

---

## ✅ Pre-Launch Checklist

### Backend API
- [ ] Database migrations completed
- [ ] All environment variables configured
- [ ] API health check endpoint responding
- [ ] Stripe webhooks configured and tested
- [ ] OpenAI API integration working
- [ ] Email service configured
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Authentication flows tested
- [ ] Payment processing tested

### Mobile Application
- [ ] Production builds generated successfully
- [ ] In-app purchases configured
- [ ] Push notifications working
- [ ] Deep linking configured
- [ ] App store metadata complete
- [ ] Screenshots and descriptions added
- [ ] Privacy policy and terms of service linked
- [ ] All required app store assets uploaded
- [ ] Beta testing completed
- [ ] Performance testing on various devices

### Content & Data
- [ ] Question database seeded
- [ ] Military jobs database populated
- [ ] Fitness standards data loaded
- [ ] Branch-specific content validated
- [ ] AI coaching prompts tested
- [ ] Flashcard decks created

### Legal & Compliance
- [ ] Privacy policy updated and accessible
- [ ] Terms of service current
- [ ] COPPA compliance for users under 13
- [ ] GDPR compliance for EU users
- [ ] App store review guidelines compliance
- [ ] Military trademark usage approved

---

## 🎯 Launch Day Procedure

### 1. Final Verification (T-24 hours)
```bash
# Verify all systems
curl https://your-api.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}

# Verify database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM questions;"
# Should return: significant number of questions

# Test mobile app builds
# Download from internal distribution and test key flows
```

### 2. Go Live (T-0)
```bash
# Release mobile apps
eas submit --platform all --profile production

# Monitor for the first 24 hours:
# - API response times
# - Database performance
# - Error rates
# - User registration flow
# - Payment processing
# - Push notifications
```

### 3. Post-Launch Monitoring (T+24 hours)
- Monitor app store reviews and ratings
- Track key metrics: DAU, retention, conversion
- Monitor support channels for user issues
- Verify all premium features working
- Check subscription processing

---

## 📞 Support & Maintenance

### Support Channels
- **In-app support**: Contact form with branch selection
- **Email support**: support@asvabprep.com
- **Knowledge base**: Help articles for common issues
- **Social media**: Twitter/Facebook for announcements

### Regular Maintenance
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and update military job database
- **Bi-annually**: Update ASVAB question content

### Emergency Procedures
- **Critical bug**: Rollback deployment within 30 minutes
- **Security issue**: Rotate secrets and notify users
- **Payment issue**: Contact Stripe support immediately
- **App store rejection**: Address issues and resubmit within 48 hours

---

## 🎖️ Deployment Complete!

Your ASVAB Prep application is now ready to serve military personnel preparing for their ASVAB exams. The production deployment includes:

- ✅ **Full-featured API** with authentication and premium features
- ✅ **Cross-platform mobile app** for iOS and Android  
- ✅ **Military branch-specific content** and theming
- ✅ **Premium subscription system** with 7-day free trial
- ✅ **AI-powered coaching** and personalized recommendations
- ✅ **Comprehensive fitness tracking** and PT test calculator
- ✅ **Social features** for study groups and collaboration
- ✅ **Push notification system** with military communication
- ✅ **Production-grade security** and monitoring

**Mission accomplished! 🇺🇸**

---

*For additional support or custom deployment assistance, contact the development team or refer to the technical documentation in the `/docs` directory.*