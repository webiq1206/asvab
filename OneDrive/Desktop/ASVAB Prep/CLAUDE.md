# ASVAB Test Prep - Claude Configuration

## Project Overview
Military-focused ASVAB test preparation ecosystem with branch-specific content filtering, premium subscription model, and authentic military communication.

## Development Commands
```bash
# Backend Development (NestJS/Node.js)
npm run start:dev          # Start development server
npm run build             # Build for production
npm run test              # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run lint              # Run ESLint
npm run format            # Run Prettier

# Mobile Development (React Native/Expo)
npx expo start            # Start Expo development server
npx expo run:ios          # Run on iOS simulator
npx expo run:android      # Run on Android emulator
npm run type-check        # TypeScript type checking

# Database Operations (Prisma)
npx prisma generate       # Generate Prisma client
npx prisma db push        # Push schema changes to database
npx prisma migrate dev    # Create and apply migration
npx prisma studio         # Open Prisma Studio
npx prisma db seed        # Seed database with initial data
```

## Project Structure
```
ASVAB Prep/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   ├── questions/         # Question management
│   │   ├── quizzes/           # Quiz system
│   │   ├── subscriptions/     # Payment & subscriptions
│   │   ├── military/          # Military jobs & standards
│   │   ├── social/            # Social features
│   │   └── notifications/     # Push notifications
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seeds/             # Database seed files
│   └── package.json
├── mobile/                     # React Native app
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── screens/           # Screen components
│   │   ├── navigation/        # Navigation setup
│   │   ├── services/          # API services
│   │   ├── store/             # State management (Zustand)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── constants/         # App constants
│   ├── assets/                # Images, fonts, etc.
│   ├── app.json               # Expo configuration
│   └── package.json
├── shared/                     # Shared types & utilities
│   ├── types/                 # TypeScript type definitions
│   └── constants/             # Shared constants
├── admin/                      # Admin console (web)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── docs/                       # Documentation
    ├── api/                   # API documentation
    ├── deployment/            # Deployment guides
    └── design/                # Design specifications
```

## Key Technologies
- **Backend**: Node.js, NestJS, PostgreSQL, Prisma ORM
- **Mobile**: React Native, Expo, TypeScript, React Navigation
- **State**: React Query (server), Zustand (client)
- **Auth**: JWT, OAuth (Apple, Google), magic links
- **Payments**: Apple App Store, Google Play in-app purchases
- **Push**: Expo Notifications
- **Database**: PostgreSQL with 40+ tables
- **Admin**: React.js web dashboard

## Military Branches & Filtering
All content must be filtered by user's selected branch:
- Army (Soldier, Hooah!, Army Strong)
- Navy (Sailor, Hooyah!, Anchors Aweigh)
- Air Force (Airman, Hoorah!, Aim High)
- Marines (Marine, Oorah!, Semper Fi)
- Coast Guard (Coastie, Hooyah!, Semper Paratus)
- Space Force (Guardian, Hoorah!, Semper Supra)

## Premium Features & Subscription Model
### Free Tier Limits:
- 50 total questions
- 1 quiz per day (max 10 questions)
- 3 categories only
- Basic explanations only
- Weekly notifications only
- 5 quiz history entries

### Premium Features ($9.97/month, 7-day trial):
- Unlimited questions & quizzes
- Full ASVAB replica exam
- Whiteboard/scratch paper
- Flashcards with spaced repetition
- AI coaching & daily missions
- Military jobs database
- Physical fitness tracking
- Social features & study groups
- Advanced analytics
- Daily intelligent notifications
- Export capabilities

## Development Phases
**Current Status**: Phase 1 - Foundation & Infrastructure

### Critical Implementation Rules:
1. **Branch Filtering**: Every piece of content must respect user's selected branch
2. **Premium Gates**: Strategic limitations to drive subscription conversions
3. **Military Authenticity**: Use genuine military terminology and communication
4. **Sequential Development**: Complete each phase before moving to next
5. **Testing Required**: Each phase must be tested and validated

## Database Schema Highlights
```sql
-- Core user table with branch selection
users (
  id, email, password_hash, selected_branch,
  subscription_tier, trial_ends_at, created_at
)

-- Questions with branch tagging
questions (
  id, content, category, difficulty,
  branch_relevance[], explanation_basic, explanation_premium
)

-- Branch-specific military jobs
military_jobs (
  id, branch, title, mos_code, description,
  min_afqt_score, required_line_scores, clearance_required
)

-- Physical fitness standards
fitness_standards (
  id, branch, gender, age_min, age_max,
  run_time_max, pushups_min, situps_min
)
```

## Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://username:password@localhost:5432/asvab_prep
JWT_SECRET=your-super-secret-jwt-key
APPLE_APP_STORE_SECRET=your-apple-secret
GOOGLE_PLAY_SERVICE_ACCOUNT=path/to/service-account.json

# Mobile
EXPO_PROJECT_ID=your-expo-project-id
API_BASE_URL=http://localhost:3001/api
```

## Color Palette & Theme
- **Dark Olive**: #3C3D37 (primary backgrounds)
- **Military Green**: #4B5320 (accents, buttons)
- **Desert Sand**: #C2B280 (secondary backgrounds)
- **Khaki**: #BDB76B (text, highlights)
- **Tactical Orange**: #FF8C00 (warnings, CTAs)

## Military Communication Examples
- **Army**: "Listen up, Soldier! Outstanding performance! Hooah!"
- **Navy**: "Attention on deck, Sailor! Ship-shape work! Hooyah!"
- **Air Force**: "Airman, mission accomplished! Aim high! Hoorah!"
- **Marines**: "Oorah, Marine! Semper Fi dedication!"
- **Coast Guard**: "Guardian, semper paratus! Hooyah!"
- **Space Force**: "Guardian, semper supra excellence! Hoorah!"

## Testing Strategy
- **Unit Tests**: Jest for backend, React Native Testing Library for mobile
- **Integration Tests**: API endpoint testing with Supertest
- **E2E Tests**: Detox for mobile app flows
- **Performance Tests**: Load testing for API endpoints
- **Manual Testing**: Device testing across iOS/Android

## Deployment Pipeline
1. **Development**: Local development with hot reload
2. **Staging**: Automated deployment on feature branch merge
3. **Production**: Manual deployment approval after QA
4. **Mobile**: Expo EAS Build for app store submissions

## Security Requirements
- Argon2 password hashing
- JWT token rotation
- Device binding for auth
- Rate limiting on all endpoints
- SQL injection protection (Prisma)
- Input validation and sanitization
- HTTPS/TLS encryption
- Regular security audits

## AI Integration Notes
- OpenAI GPT-4 for coaching and explanations
- Military-style persona with branch-specific terminology
- Personalized study recommendations
- Adaptive difficulty adjustment
- Daily mission generation
- Performance analysis and insights

## Subscription Implementation
- Apple App Store Connect integration
- Google Play Console setup
- Receipt validation
- Trial period management
- Feature gating throughout app
- Upgrade prompt optimization
- Churn prevention strategies

Remember: This is a military-focused educational platform. Every feature should reinforce the connection between ASVAB preparation and military career success, with authentic military communication throughout.