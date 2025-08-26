# ASVAB Prep - Complete Vercel Deployment Guide
## Production-Ready Deployment for Military Education Platform

**🎖️ MISSION:** Deploy a fully functional, scalable ASVAB Prep application to production using Vercel with comprehensive backend infrastructure, mobile app distribution, and monitoring systems.

---

## 📋 Pre-Deployment Checklist

### **Required Accounts & Services**
- [ ] **Vercel Account** (Pro plan recommended for production)
- [ ] **GitHub/GitLab Account** with repository access
- [ ] **PostgreSQL Database** (Supabase, Railway, or AWS RDS)
- [ ] **Redis Instance** (Upstash, Railway, or AWS ElastiCache)
- [ ] **Stripe Account** for payments (production-ready)
- [ ] **OpenAI API Key** for AI coaching features
- [ ] **Apple Developer Account** ($99/year) for iOS deployment
- [ ] **Google Play Console Account** ($25 one-time) for Android
- [ ] **Cloudflare Account** for CDN (optional but recommended)
- [ ] **Sentry Account** for error monitoring
- [ ] **Domain Registration** (recommended: asvabprep.com)

### **Development Prerequisites**
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git version control
- [ ] Docker (for local testing)
- [ ] Expo CLI (`npm install -g @expo/cli`)
- [ ] EAS CLI (`npm install -g eas-cli`)

---

## 🛠️ Step 1: Database Setup (PostgreSQL + Redis)

### **Option A: Supabase (Recommended for simplicity)**

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com
   # Create new project
   # Note down the connection string
   ```

2. **Configure Database**
   ```sql
   -- Run the schema from backend/prisma/schema.prisma
   -- Supabase will handle most configuration automatically
   ```

3. **Environment Variables**
   ```env
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres
   ```

### **Option B: Railway (Full-stack deployment)**

1. **Create Railway Account**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Deploy Database**
   ```bash
   # Add PostgreSQL service
   railway add postgresql
   
   # Add Redis service  
   railway add redis
   
   # Get connection strings
   railway env
   ```

### **Option C: AWS RDS + ElastiCache (Enterprise)**

1. **Create RDS PostgreSQL Instance**
   ```bash
   # Use AWS Console or CLI
   aws rds create-db-instance \
     --db-instance-identifier asvab-prep-prod \
     --db-instance-class db.t3.medium \
     --engine postgres \
     --master-username asvabuser \
     --master-user-password [secure-password] \
     --allocated-storage 100 \
     --vpc-security-group-ids [security-group-id]
   ```

2. **Create ElastiCache Redis Cluster**
   ```bash
   aws elasticache create-replication-group \
     --replication-group-id asvab-prep-redis \
     --description "ASVAB Prep Redis Cluster" \
     --node-type cache.t3.micro \
     --engine redis \
     --security-group-ids [security-group-id]
   ```

---

## 🚀 Step 2: Backend Deployment

### **Deploy to Railway (Recommended)**

1. **Prepare Backend**
   ```bash
   cd backend
   
   # Install dependencies
   npm install
   
   # Generate Prisma client
   npx prisma generate
   
   # Create production build
   npm run build
   ```

2. **Configure Railway**
   ```bash
   # Initialize Railway in backend directory
   railway init
   
   # Set environment variables
   railway env set NODE_ENV=production
   railway env set DATABASE_URL=$DATABASE_URL
   railway env set REDIS_URL=$REDIS_URL
   railway env set JWT_SECRET=[secure-random-string]
   railway env set OPENAI_API_KEY=$OPENAI_API_KEY
   railway env set STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
   ```

3. **Deploy**
   ```bash
   # Deploy backend
   railway deploy
   
   # Run database migrations
   railway run npx prisma migrate deploy
   
   # Seed database (if needed)
   railway run npx prisma db seed
   ```

### **Alternative: Deploy Backend to Vercel**

1. **Create vercel.json in backend directory**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/main.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "src/main.ts"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

2. **Deploy to Vercel**
   ```bash
   cd backend
   npx vercel --prod
   ```

---

## 🌐 Step 3: Frontend Web Admin Console Deployment

### **Deploy Admin Console to Vercel**

1. **Prepare Admin Console**
   ```bash
   cd admin
   
   # Install dependencies
   npm install
   
   # Set environment variables
   echo "REACT_APP_API_URL=https://your-backend-url.com/api" > .env.production
   echo "REACT_APP_ENVIRONMENT=production" >> .env.production
   
   # Build production version
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   # In admin directory
   npx vercel --prod
   
   # Or connect via Vercel Dashboard
   # 1. Visit vercel.com/dashboard
   # 2. Click "New Project"
   # 3. Import from Git (admin folder)
   # 4. Configure environment variables
   # 5. Deploy
   ```

3. **Configure Custom Domain**
   ```bash
   # Add custom domain in Vercel Dashboard
   # Example: admin.asvabprep.com
   # Configure DNS records as instructed
   ```

---

## 📱 Step 4: Mobile App Deployment (React Native/Expo)

### **Setup Expo Application Services (EAS)**

1. **Configure EAS**
   ```bash
   cd mobile
   
   # Login to Expo
   npx expo login
   
   # Initialize EAS
   eas init
   
   # Configure build profiles
   eas build:configure
   ```

2. **Update app.json**
   ```json
   {
     "expo": {
       "name": "ASVAB Prep",
       "slug": "asvab-prep",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "userInterfaceStyle": "light",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#3C3D37"
       },
       "updates": {
         "fallbackToCacheTimeout": 0
       },
       "assetBundlePatterns": [
         "**/*"
       ],
       "ios": {
         "supportsTablet": true,
         "bundleIdentifier": "com.asvabprep.app",
         "buildNumber": "1"
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#FFFFFF"
         },
         "package": "com.asvabprep.app",
         "versionCode": 1
       },
       "web": {
         "favicon": "./assets/favicon.png"
       },
       "extra": {
         "eas": {
           "projectId": "your-project-id"
         }
       }
     }
   }
   ```

3. **Configure eas.json**
   ```json
   {
     "cli": {
       "version": ">= 2.0.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "ios": {
           "resourceClass": "m1-medium"
         }
       },
       "production": {
         "ios": {
           "resourceClass": "m1-medium"
         },
         "env": {
           "API_BASE_URL": "https://your-backend-url.com/api",
           "ENVIRONMENT": "production"
         }
       }
     },
     "submit": {
       "production": {}
     }
   }
   ```

### **iOS App Store Deployment**

1. **Apple Developer Setup**
   ```bash
   # Ensure you have Apple Developer account
   # Create App Store Connect app record
   # Configure app identifiers and certificates
   ```

2. **Build iOS App**
   ```bash
   # Build for iOS production
   eas build --platform ios --profile production
   
   # Download the .ipa file when build completes
   ```

3. **Submit to App Store**
   ```bash
   # Submit to App Store Connect
   eas submit --platform ios --profile production
   
   # Or upload manually using Xcode or Application Loader
   ```

4. **App Store Configuration**
   - **App Name**: ASVAB Prep - Military Career Test
   - **Description**: Military-focused ASVAB test preparation with branch-specific content
   - **Keywords**: ASVAB, military, test prep, Army, Navy, Air Force, Marines
   - **Category**: Education
   - **Age Rating**: 4+ (suitable for all ages)
   - **Screenshots**: Create military-themed screenshots for all device sizes

### **Google Play Store Deployment**

1. **Android Build**
   ```bash
   # Build for Android production
   eas build --platform android --profile production
   
   # Download the .aab file when build completes
   ```

2. **Google Play Console Setup**
   ```bash
   # Create Google Play Console account
   # Create new app in console
   # Upload .aab file to internal testing first
   ```

3. **Submit to Google Play**
   ```bash
   # Submit via EAS
   eas submit --platform android --profile production
   
   # Or upload manually via Google Play Console
   ```

4. **Play Store Configuration**
   - **App Title**: ASVAB Prep - Military Test Prep
   - **Short Description**: Military-focused ASVAB preparation app
   - **Full Description**: Comprehensive ASVAB test preparation for military careers
   - **Category**: Education
   - **Content Rating**: Everyone
   - **Screenshots**: Military-themed screenshots for phones and tablets

### **In-App Purchase Configuration**

1. **Apple App Store**
   ```javascript
   // Configure in App Store Connect
   const iapProducts = [
     {
       productId: 'asvab_premium_monthly',
       price: '$9.99',
       type: 'Auto-Renewable Subscription',
       duration: '1 Month'
     }
   ];
   ```

2. **Google Play Store**
   ```javascript
   // Configure in Google Play Console
   const androidProducts = [
     {
       productId: 'asvab_premium_monthly',
       price: '$9.99',
       billingPeriod: 'P1M', // 1 month
       trialPeriod: 'P7D'    // 7 day trial
     }
   ];
   ```

---

## 🔧 Step 5: Environment Configuration

### **Production Environment Variables**

Create comprehensive `.env.production` files for each service:

**Backend (.env.production)**
```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database
REDIS_URL=redis://default:password@host:6379

# Authentication
JWT_SECRET=super-secure-random-string-min-32-characters
JWT_REFRESH_SECRET=another-super-secure-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# External APIs
OPENAI_API_KEY=sk-your-openai-api-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Apple App Store
APPLE_APP_STORE_SECRET=your-app-store-shared-secret

# Google Play
GOOGLE_PLAY_SERVICE_ACCOUNT=/path/to/service-account.json

# Email (for notifications)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# CDN
CDN_BASE_URL=https://cdn.asvabprep.com

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://asvabprep.com,https://admin.asvabprep.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Mobile (.env.production)**
```env
API_BASE_URL=https://api.asvabprep.com
ENVIRONMENT=production
SENTRY_DSN=https://your-mobile-sentry-dsn@sentry.io/project-id
```

**Admin Console (.env.production)**
```env
REACT_APP_API_URL=https://api.asvabprep.com
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=https://your-admin-sentry-dsn@sentry.io/project-id
```

---

## 🌐 Step 6: Custom Domain & CDN Setup

### **Domain Configuration**

1. **Purchase Domain**
   ```bash
   # Register domain (e.g., asvabprep.com)
   # Configure DNS records:
   # A record: @ -> Vercel IP
   # CNAME: www -> asvabprep.com
   # CNAME: api -> your-backend-domain
   # CNAME: admin -> your-admin-domain
   # CNAME: cdn -> your-cdn-domain
   ```

2. **Vercel Domain Setup**
   ```bash
   # Add domain in Vercel dashboard for each project
   # Configure automatic SSL certificates
   # Set up redirects (www to non-www or vice versa)
   ```

### **CDN Configuration (Cloudflare)**

1. **Setup Cloudflare**
   ```bash
   # Change nameservers to Cloudflare
   # Configure page rules for static assets
   # Enable caching for CSS, JS, images
   # Set security rules and firewall
   ```

2. **CDN Optimization**
   ```javascript
   // Configure cache headers in backend
   app.use('/static', express.static('public', {
     maxAge: '1y',
     etag: false,
     lastModified: false
   }));
   ```

---

## 📊 Step 7: Monitoring & Analytics

### **Error Monitoring (Sentry)**

1. **Backend Setup**
   ```javascript
   // Install and configure Sentry
   npm install @sentry/node @sentry/tracing
   
   // In main.ts
   import * as Sentry from '@sentry/node';
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1
   });
   ```

2. **Mobile Setup**
   ```bash
   # Install Sentry for React Native
   npx @sentry/wizard -i reactNative -p ios android
   
   # Configure in app
   expo install @sentry/react-native
   ```

### **Performance Monitoring**

1. **Application Performance**
   ```javascript
   // Add performance monitoring
   const performanceMiddleware = (req, res, next) => {
     const start = Date.now();
     res.on('finish', () => {
       const duration = Date.now() - start;
       console.log(`${req.method} ${req.path} - ${duration}ms`);
     });
     next();
   };
   ```

2. **Database Performance**
   ```javascript
   // Monitor database queries
   const prisma = new PrismaClient({
     log: [
       { emit: 'event', level: 'query' },
       { emit: 'event', level: 'error' }
     ],
   });
   
   prisma.$on('query', (e) => {
     console.log('Query: ' + e.query);
     console.log('Duration: ' + e.duration + 'ms');
   });
   ```

---

## 🔒 Step 8: Security Configuration

### **SSL/TLS Certificates**
- Vercel handles SSL automatically for domains
- Ensure all traffic redirected to HTTPS
- Configure HSTS headers

### **Security Headers**
```javascript
// Configure security headers in backend
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### **Rate Limiting**
```javascript
// Configure rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## 🧪 Step 9: Testing & Quality Assurance

### **Production Testing Checklist**

1. **Functional Testing**
   - [ ] User registration and authentication
   - [ ] Branch selection and filtering
   - [ ] Quiz creation and taking
   - [ ] Subscription purchase flow
   - [ ] Payment processing
   - [ ] Mobile app functionality
   - [ ] Admin console access

2. **Performance Testing**
   ```bash
   # Load testing with Artillery
   npm install -g artillery
   
   # Create load test configuration
   artillery quick --duration 60 --rate 10 https://api.asvabprep.com/health
   
   # Database connection pool testing
   artillery run load-test-config.yml
   ```

3. **Security Testing**
   - [ ] SQL injection protection
   - [ ] XSS prevention
   - [ ] CSRF protection
   - [ ] Authentication bypass testing
   - [ ] Authorization testing

### **Automated Testing Pipeline**

```yaml
# .github/workflows/production-tests.yml
name: Production Tests
on:
  push:
    branches: [main]
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          API_URL: https://api.asvabprep.com
```

---

## 🚀 Step 10: Launch Preparation

### **Soft Launch Checklist**

1. **Pre-Launch Tasks**
   - [ ] All services deployed and tested
   - [ ] Domain and SSL configured
   - [ ] Monitoring systems active
   - [ ] Error tracking configured
   - [ ] Database populated with content
   - [ ] Payment processing tested
   - [ ] Mobile apps submitted to stores

2. **Launch Day Tasks**
   - [ ] Monitor system performance
   - [ ] Watch error rates and logs
   - [ ] Verify payment processing
   - [ ] Test user registration flow
   - [ ] Monitor app store reviews
   - [ ] Customer support ready

### **Post-Launch Monitoring**

1. **Key Metrics to Track**
   ```javascript
   const metrics = {
     userRegistrations: 'Daily new user signups',
     subscriptionConversions: 'Trial to paid conversion rate',
     systemUptime: '99.9% uptime target',
     responseTime: '<200ms API response time',
     errorRate: '<0.1% error rate',
     mobileAppRatings: '>4.5 stars average'
   };
   ```

2. **Alert Configuration**
   - High error rates (>1%)
   - Slow response times (>500ms)
   - System downtime
   - Payment processing failures
   - High CPU/memory usage (>80%)
   - Low disk space (<20%)

---

## 📞 Support & Maintenance

### **Ongoing Maintenance Tasks**

1. **Daily**
   - Monitor system health
   - Check error logs
   - Verify backup completion
   - Review user feedback

2. **Weekly**
   - Security update reviews
   - Performance optimization
   - Database maintenance
   - Content updates

3. **Monthly**
   - Security audits
   - Performance analysis
   - User analytics review
   - Cost optimization

### **Emergency Contacts**

- **System Administrator**: admin@asvabprep.com
- **Database Issues**: db-admin@asvabprep.com
- **Payment Issues**: payments@asvabprep.com
- **Security Issues**: security@asvabprep.com

---

## 🎯 Success Metrics

### **Technical Metrics**
- 99.9% uptime
- <200ms average API response time
- <0.1% error rate
- 100% SSL/HTTPS coverage

### **Business Metrics**
- User registration rate
- Trial-to-paid conversion
- Monthly recurring revenue
- User retention rates
- App store ratings

### **Security Metrics**
- Zero security breaches
- 100% GDPR/COPPA compliance
- Regular security audits passed
- All vulnerabilities patched within 48 hours

---

## 🎖️ MISSION COMPLETE

**Congratulations, Soldier!** You have successfully deployed a production-ready, military-grade ASVAB Prep application. Your deployment includes:

✅ **Scalable backend infrastructure**  
✅ **High-performance database systems**  
✅ **Global CDN for optimal performance**  
✅ **Secure payment processing**  
✅ **Mobile apps ready for App Store/Play Store**  
✅ **Comprehensive monitoring and alerts**  
✅ **Full compliance with privacy regulations**  
✅ **Military-grade security implementations**

**The mission to provide world-class military education tools is now operational!**

**Hooah! 🇺🇸**

---

**Document Version:** 1.0  
**Last Updated:** December 26, 2025  
**Next Review:** January 26, 2026