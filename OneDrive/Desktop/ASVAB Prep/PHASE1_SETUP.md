# Phase 1 Setup Instructions

## Prerequisites

Before setting up Phase 1, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher) 
- **PostgreSQL** (v14 or higher)
- **Redis** (for session storage - optional for development)
- **Expo CLI** for mobile development
- **Git** for version control

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE asvab_prep;
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your database connection:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/asvab_prep"
JWT_SECRET="your-super-secret-jwt-key-512-bits-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-key"
```

### 3. Database Migration & Seeding

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with test data
npx prisma db seed
```

### 4. Start Backend Server

```bash
npm run start:dev
```

Backend will be available at: `http://localhost:3001`
API Documentation: `http://localhost:3001/api/docs`

## Mobile App Setup

### 1. Install Dependencies

```bash
cd ../mobile
npm install
```

### 2. Install Expo CLI (if not already installed)

```bash
npm install -g @expo/cli
```

### 3. Start Mobile App

```bash
npm start
```

This will start the Expo development server. You can:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator  
- Scan QR code with Expo Go app on your device

## Shared Module Setup

```bash
cd ../shared
npm install
npm run build
```

## Testing Phase 1

### Test User Accounts

The database seed creates test users for each military branch:

- **Army (Premium)**: `army.soldier@example.com` / `TestPassword123!`
- **Navy (Free)**: `navy.sailor@example.com` / `TestPassword123!`  
- **Air Force (Free)**: `airforce.airman@example.com` / `TestPassword123!`

### Key Features to Test

1. **Authentication System**
   - ✅ User registration with mandatory branch selection
   - ✅ Login with email/password
   - ✅ JWT token authentication
   - ✅ Branch-specific user experience

2. **Military Theme Implementation**
   - ✅ Branch-specific color schemes
   - ✅ Military typography (Oswald/Inter fonts)
   - ✅ Military communication style
   - ✅ Branch-specific greetings and terminology

3. **Database Schema**
   - ✅ 40+ tables created and migrated
   - ✅ All relationships properly configured
   - ✅ Test data seeded successfully

4. **Mobile App Foundation**
   - ✅ React Native with Expo setup
   - ✅ Navigation structure (bottom tabs)
   - ✅ Military-themed UI components
   - ✅ Branch selector component

5. **State Management**
   - ✅ Zustand for UI state
   - ✅ React Query for server state
   - ✅ Authentication store
   - ✅ Theme provider with branch support

6. **Subscription Infrastructure**
   - ✅ Stripe integration ready
   - ✅ Apple App Store service
   - ✅ Google Play service
   - ✅ Subscription management backend

## API Testing

Test the authentication endpoints:

```bash
# Register new user
POST http://localhost:3001/api/v1/auth/register
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "firstName": "Test",
  "lastName": "User",
  "selectedBranch": "ARMY"
}

# Login
POST http://localhost:3001/api/v1/auth/login
{
  "email": "test@example.com", 
  "password": "TestPassword123!"
}

# Get current user (requires Bearer token)
GET http://localhost:3001/api/v1/auth/me
Authorization: Bearer <your-jwt-token>
```

## Database Inspection

Use Prisma Studio to inspect the database:

```bash
cd backend
npx prisma studio
```

This opens a web interface at `http://localhost:5555` to view and edit your data.

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists

2. **Prisma Generation Errors**
   - Run `npx prisma generate` after schema changes
   - Clear node_modules and reinstall if needed

3. **Mobile App Not Starting**
   - Ensure Expo CLI is installed globally
   - Clear Expo cache: `expo start -c`
   - Check Node.js version compatibility

4. **Font Loading Issues**
   - Fonts are loaded in App.tsx
   - Ensure font files exist in assets/fonts/
   - Clear app cache and restart

5. **API Connection Issues**
   - Verify backend server is running on port 3001
   - Check API_BASE_URL configuration in mobile app
   - Ensure CORS is properly configured

## Development Tools

### Useful Commands

```bash
# Backend
npm run start:dev      # Start development server
npm run lint          # Run ESLint
npm run test          # Run tests
npx prisma studio     # Database GUI

# Mobile
npm start             # Start Expo dev server
npm run ios          # Start iOS simulator
npm run android      # Start Android emulator
npm run lint         # Run ESLint

# Shared
npm run build        # Build shared module
npm run type-check   # TypeScript checking
```

### VS Code Extensions

Recommended extensions for development:
- Prisma
- React Native Tools
- TypeScript Importer
- ESLint
- Prettier

## Next Steps

After validating Phase 1, you can proceed to **Phase 2: Question Management System** which will implement:
- Question bank with 1,000+ categorized ASVAB questions
- Branch-filtered question display
- Subscription-based question limits
- Resume capability for interrupted sessions

## Support

If you encounter any issues during setup:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure environment variables are properly configured
4. Check logs for specific error messages