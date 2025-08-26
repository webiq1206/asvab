# ASVAB Prep Deployment Guide

## Overview
Production deployment setup for the ASVAB Test Prep ecosystem including backend API, mobile app, and admin console.

## Infrastructure Requirements

### Backend (NestJS API)
- **Platform**: AWS/Google Cloud/DigitalOcean
- **Database**: PostgreSQL 14+ with connection pooling
- **Cache**: Redis for session storage
- **Storage**: S3-compatible storage for media files
- **CDN**: CloudFlare or AWS CloudFront
- **Monitoring**: DataDog, New Relic, or equivalent

### Mobile App (React Native/Expo)
- **Platform**: Expo Application Services (EAS)
- **App Stores**: Apple App Store & Google Play Store
- **Push Notifications**: Expo Push Notification Service
- **Analytics**: Expo Analytics + custom tracking
- **Crash Reporting**: Sentry integration

## Environment Setup

### Backend Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/asvab_prep
REDIS_URL=redis://username:password@host:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-512-bits-minimum
JWT_REFRESH_SECRET=your-refresh-secret-key
BCRYPT_ROUNDS=12

# OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
APPLE_CLIENT_ID=your-apple-oauth-client-id
APPLE_PRIVATE_KEY=your-apple-private-key

# App Store Integration
APPLE_APP_STORE_SHARED_SECRET=your-apple-shared-secret
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=path/to/service-account.json

# External Services
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
SENDGRID_API_KEY=your-sendgrid-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-api-key

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
```

### Mobile Environment Variables
```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.asvabprep.com
EXPO_PUBLIC_API_VERSION=v1

# App Configuration
EXPO_PUBLIC_APP_NAME=ASVAB Prep
EXPO_PUBLIC_APP_VERSION=1.0.0

# Analytics & Monitoring
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Feature Flags
EXPO_PUBLIC_ENABLE_DEV_TOOLS=false
EXPO_PUBLIC_ENABLE_SOCIAL_FEATURES=true
```

## Database Migration

### Initial Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database with initial data
npx prisma db seed
```

### Production Migration Process
1. **Backup**: Create database backup before migration
2. **Staging**: Test migration on staging environment
3. **Maintenance**: Schedule maintenance window for production
4. **Migration**: Run migration with zero-downtime strategy
5. **Verification**: Verify data integrity post-migration
6. **Rollback Plan**: Have rollback procedure ready

## Backend Deployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asvab-prep-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: asvab-prep-api
  template:
    metadata:
      labels:
        app: asvab-prep-api
    spec:
      containers:
      - name: api
        image: asvab-prep/api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
```

### Load Balancer Configuration
- **Health Check**: `GET /health`
- **SSL Termination**: Force HTTPS redirect
- **Rate Limiting**: 100 req/min per IP
- **Geographic Distribution**: Multi-region deployment

## Mobile App Deployment

### EAS Build Configuration
```json
{
  "build": {
    "production": {
      "node": "18.17.0",
      "ios": {
        "distribution": "store",
        "autoIncrement": true
      },
      "android": {
        "distribution": "store",
        "autoIncrement": "versionCode"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id",
        "ascAppId": "your-app-store-connect-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### App Store Submission Process

#### iOS (Apple App Store)
1. **Build**: `eas build --platform ios --profile production`
2. **TestFlight**: Upload to TestFlight for internal testing
3. **Review**: Submit for App Store review
4. **Release**: Release to production after approval

#### Android (Google Play)
1. **Build**: `eas build --platform android --profile production`
2. **Internal Testing**: Upload to internal testing track
3. **Review**: Submit for Google Play review
4. **Release**: Release to production after approval

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy Production
on:
  push:
    tags:
      - 'v*'
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - name: Deploy to production
        run: kubectl apply -f k8s/
  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: eas build --platform all --profile production
      - run: eas submit --platform all --profile production
```

## Monitoring & Alerting

### Health Checks
- **API Health**: `/health` endpoint monitoring
- **Database**: Connection pool and query performance
- **Cache**: Redis connection and hit rates
- **External APIs**: Response times and error rates

### Key Metrics
- **API Response Time**: < 200ms average
- **Error Rate**: < 1% of requests
- **Database Connections**: < 80% of pool
- **Memory Usage**: < 80% of available
- **CPU Usage**: < 70% sustained

### Alert Thresholds
- **High Error Rate**: > 5% in 5 minutes
- **Slow Response**: > 1s average in 5 minutes  
- **Database Issues**: Connection failures or slow queries
- **Memory/CPU**: > 90% for 10 minutes

## Security Configuration

### SSL/TLS
- **Certificate**: Let's Encrypt or commercial certificate
- **TLS Version**: 1.2 minimum, 1.3 preferred
- **Cipher Suites**: Strong ciphers only
- **HSTS**: Strict-Transport-Security header

### Security Headers
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### Database Security
- **Connection**: SSL/TLS encrypted connections only
- **Access**: Whitelist IP addresses for database access
- **Credentials**: Strong passwords and regular rotation
- **Auditing**: Enable query logging and auditing

## Backup & Recovery

### Database Backups
- **Frequency**: Daily full backups, hourly incrementals
- **Retention**: 30 days online, 1 year archive
- **Testing**: Monthly backup restore testing
- **Encryption**: Encrypted backups with key management

### Disaster Recovery
- **RTO**: Recovery Time Objective < 4 hours
- **RPO**: Recovery Point Objective < 1 hour
- **Multi-Region**: Primary and secondary regions
- **Failover**: Automated failover procedures

## Performance Optimization

### Database Optimization
- **Indexing**: Proper indexes on query columns
- **Connection Pooling**: pgBouncer or similar
- **Query Optimization**: Regular query performance review
- **Caching**: Redis for frequently accessed data

### API Optimization
- **Response Caching**: Cache headers and CDN
- **Compression**: Gzip/Brotli compression
- **API Versioning**: Proper API versioning strategy
- **Rate Limiting**: Protect against abuse

### Mobile App Optimization
- **Bundle Size**: Code splitting and lazy loading
- **Image Optimization**: WebP format and compression
- **Caching**: Aggressive caching of static content
- **Performance Monitoring**: Real-time performance tracking