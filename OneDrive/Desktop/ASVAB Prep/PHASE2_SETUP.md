# Phase 2 Setup Instructions - Question Management System

## Prerequisites

Ensure Phase 1 is completed and running:
- Backend server running on `http://localhost:3001`
- Mobile app accessible through Expo
- Database seeded with initial data

## Backend Setup

### 1. Update Database Schema (if needed)

Add the question sessions table for resume capability:

```sql
-- Run this SQL if question_sessions table doesn't exist
CREATE TABLE "question_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "category" "QuestionCategory",
    "difficulty" "QuestionDifficulty",
    "sessionType" TEXT NOT NULL DEFAULT 'practice',
    CONSTRAINT "question_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "question_sessions" ADD CONSTRAINT "question_sessions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "question_sessions_userId_completedAt_idx" 
ON "question_sessions"("userId", "completedAt");
```

### 2. Import ASVAB Questions

The question import service includes 100+ sample questions across all categories. To import the full question bank:

```bash
cd backend

# Start the server if not running
npm run start:dev

# Import questions via API (requires Premium user)
curl -X POST http://localhost:3001/api/v1/questions/import \
  -H "Authorization: Bearer <premium-user-jwt-token>"
```

Or use the test Premium user:
1. Login as `army.soldier@example.com` / `TestPassword123!`
2. Use the returned JWT token in the Authorization header

## Phase 2 Features to Test

### 1. Branch-Filtered Question Display ✅

Test that questions are properly filtered by user's selected branch:

**Army User Test:**
```bash
# Login as Army user
POST /api/v1/auth/login
{
  "email": "army.soldier@example.com",
  "password": "TestPassword123!"
}

# Get questions (should only show Army-relevant questions)
GET /api/v1/questions
Authorization: Bearer <army-user-token>

# Get categories (should only show Army-relevant categories)
GET /api/v1/questions/categories
Authorization: Bearer <army-user-token>
```

**Navy User Test:**
```bash
# Login as Navy user  
POST /api/v1/auth/login
{
  "email": "navy.sailor@example.com",
  "password": "TestPassword123!"
}

# Get questions (should show different set than Army)
GET /api/v1/questions
Authorization: Bearer <navy-user-token>
```

### 2. Subscription-Based Question Limits ✅

Test free tier limitations:

**Free User (50 question limit):**
```bash
# Use Navy user (free tier)
GET /api/v1/questions?limit=10
Authorization: Bearer <navy-user-token>

# Response should include remainingQuestions count
{
  "questions": [...],
  "remainingQuestions": 50  // or less if questions attempted
}

# After 50 question attempts, should get 403 error
```

**Premium User (unlimited):**
```bash
# Use Army user (Premium)
GET /api/v1/questions?limit=50
Authorization: Bearer <army-user-token>

# Response should show unlimited access
{
  "questions": [...],
  "remainingQuestions": -1  // -1 means unlimited
}
```

### 3. Question Categories Limited to Branch ✅

Test category filtering:

```bash
# Army user should see different categories than Navy
GET /api/v1/questions/categories
Authorization: Bearer <army-user-token>

# Try to access non-relevant category (should get 403)
GET /api/v1/questions?category=ASSEMBLING_OBJECTS
Authorization: Bearer <army-user-token>
# Should get 403 if ASSEMBLING_OBJECTS not relevant to Army
```

### 4. Question Explanation System ✅

Test basic vs premium explanations:

```bash
# Get specific question
GET /api/v1/questions/{question-id}
Authorization: Bearer <user-token>

# Premium user response:
{
  "explanation": "Detailed explanation with military context...",
  "isPremiumExplanation": true
}

# Free user response:
{
  "explanation": "Basic explanation...",
  "isPremiumExplanation": false
}
```

### 5. Submit Answer and Get Feedback ✅

```bash
# Submit answer to question
POST /api/v1/questions/{question-id}/answer
Authorization: Bearer <user-token>
{
  "userAnswer": 1
}

# Response:
{
  "isCorrect": true,
  "correctAnswer": 1,
  "explanation": "Basic explanation for immediate feedback",
  "attemptId": "attempt-id"
}
```

### 6. Resume Session Capability ✅

Test interrupted session handling:

```bash
# Check for active session
GET /api/v1/questions/session
Authorization: Bearer <user-token>

# Response if session exists:
{
  "id": "session-id",
  "questionIds": ["q1", "q2", "q3"],
  "currentQuestionIndex": 2,
  "startedAt": "2024-01-01T10:00:00.000Z",
  "category": "ARITHMETIC_REASONING"
}

# Resume session
GET /api/v1/questions/session/{session-id}/resume
Authorization: Bearer <user-token>

# Response:
{
  "session": {...},
  "remainingQuestions": ["q3"],
  "answeredCount": 2,
  "totalCount": 3
}
```

## Mobile App Testing

### 1. Question Card Component

Test the `QuestionCard` component:
- Multiple choice question display
- Military styling with branch colors
- Answer selection and submission
- Explanation display (basic/premium)
- Correct/incorrect answer highlighting

### 2. Category Selector

Test the `CategorySelector` component:
- Grid layout of available categories
- Branch-specific category filtering
- Progress indicators for each category
- Category selection and navigation

### 3. Question Limit Notice

Test the `QuestionLimitNotice` modal:
- Displays when free user hits limits
- Shows premium upgrade benefits
- Branch-specific theming
- Call-to-action buttons

### 4. Resume Session Prompt

Test the `ResumeSessionPrompt` modal:
- Detects interrupted sessions
- Shows session progress
- Resume vs start new options
- Session duration display

## API Endpoints Testing

Use these curl commands or Postman to test all endpoints:

```bash
# Base URL
BASE_URL="http://localhost:3001/api/v1"

# 1. Get questions with filtering
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions?category=ARITHMETIC_REASONING&limit=5"

# 2. Get categories for user's branch
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions/categories"

# 3. Get random questions
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions/random?count=10&difficulty=MEDIUM"

# 4. Search questions
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions/search?searchTerm=algebra&limit=5"

# 5. Get user progress
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions/progress"

# 6. Get specific question
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/questions/{question-id}"

# 7. Submit answer
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userAnswer": 1}' \
  "$BASE_URL/questions/{question-id}/answer"

# 8. Import questions (Premium only)
curl -X POST -H "Authorization: Bearer $PREMIUM_TOKEN" \
  "$BASE_URL/questions/import"
```

## Database Validation

Check the database to ensure proper data:

```sql
-- Check question count by category
SELECT category, COUNT(*) as question_count 
FROM questions 
WHERE "isActive" = true 
GROUP BY category;

-- Check branch relevance distribution
SELECT unnest("branchRelevance") as branch, COUNT(*) as question_count
FROM questions 
WHERE "isActive" = true 
GROUP BY branch;

-- Check user progress tracking
SELECT u.email, up.category, up."totalQuestions", up."correctAnswers", up."averageScore"
FROM user_progress up
JOIN users u ON u.id = up."userId"
ORDER BY u.email, up.category;

-- Check question attempts
SELECT u.email, COUNT(*) as attempts, 
       SUM(CASE WHEN qa."isCorrect" THEN 1 ELSE 0 END) as correct
FROM question_attempts qa
JOIN users u ON u.id = qa."userId"
GROUP BY u.email;
```

## Expected Behavior

### ✅ Free Tier Limitations:
- Maximum 50 total questions accessible
- Basic explanations only
- Limited categories based on branch
- Question limit notice after 50 attempts

### ✅ Premium Tier Features:
- Unlimited questions access
- Premium explanations with military context
- Full category access for branch
- Advanced question search and filtering

### ✅ Branch Filtering:
- Army users only see Army-relevant questions/categories
- Navy users only see Navy-relevant questions/categories
- Cross-branch content properly filtered

### ✅ Session Management:
- Interrupted sessions automatically saved
- Resume prompts on return
- Session progress tracking
- Ability to start fresh or continue

## Troubleshooting

### Common Issues:

1. **Questions not loading:**
   - Check if questions are imported: `SELECT COUNT(*) FROM questions;`
   - Verify user JWT token is valid
   - Check branch filtering in API response

2. **Wrong categories showing:**
   - Verify `BRANCH_RELEVANT_CATEGORIES` configuration
   - Check user's `selectedBranch` in database
   - Ensure API properly filters by branch

3. **Subscription limits not working:**
   - Check user's `subscriptionTier` in database
   - Verify question attempt counting
   - Test with different user tiers

4. **Resume sessions not working:**
   - Check if `question_sessions` table exists
   - Verify session creation and retrieval
   - Test session expiration logic

### Debug Commands:

```bash
# Check user subscription status
SELECT email, "subscriptionTier", "trialEndsAt" FROM users;

# Check question attempts count
SELECT "userId", COUNT(*) FROM question_attempts GROUP BY "userId";

# Check active sessions
SELECT * FROM question_sessions WHERE "completedAt" IS NULL;

# Check question branch relevance
SELECT category, "branchRelevance", COUNT(*) 
FROM questions 
GROUP BY category, "branchRelevance";
```

## Performance Testing

Test with multiple concurrent users:

```bash
# Load testing script example
for i in {1..10}; do
  curl -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/questions?limit=10" &
done
wait
```

Expected performance:
- API responses < 500ms
- Database queries optimized with indexes
- Branch filtering efficient
- Session handling scalable

## Success Criteria

Phase 2 is complete when:

✅ **Question Bank**: 100+ questions imported with proper branch tagging  
✅ **Branch Filtering**: All content filtered by user's selected branch  
✅ **Subscription Limits**: Free users limited to 50 questions, Premium unlimited  
✅ **Category Selection**: Only branch-relevant categories displayed  
✅ **Explanations**: Basic for free, premium for subscribers  
✅ **Resume Capability**: Interrupted sessions properly handled  
✅ **Mobile Components**: Question cards, selectors, and modals functional  
✅ **API Endpoints**: All endpoints working with proper authentication  

After validating all features, you can proceed to **Phase 3: Basic Quiz System** which will implement:
- Quiz creation with branch-filtered questions
- Integrated whiteboard (Premium feature)
- Military-style results and feedback
- Quiz history with subscription limits