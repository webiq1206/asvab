# ASVAB Prep API Documentation

## Overview
RESTful API built with NestJS providing all backend functionality for the ASVAB Test Prep mobile application.

## Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.asvabprep.com/api`

## Authentication
All authenticated endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Core Endpoints

### Authentication
- `POST /auth/register` - User registration with mandatory branch selection
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `POST /auth/magic-link` - Request magic link login
- `GET /auth/oauth/google` - Google OAuth login
- `GET /auth/oauth/apple` - Apple OAuth login

### Users
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `POST /users/branch` - Change military branch (re-filters all content)
- `GET /users/progress` - Get user's overall progress
- `DELETE /users/account` - Delete user account

### Questions
- `GET /questions` - Get questions filtered by user's branch
- `GET /questions/categories` - Get categories available for user's branch
- `GET /questions/:id` - Get specific question with explanation
- `POST /questions/:id/answer` - Submit answer to question

### Quizzes
- `POST /quizzes` - Create new quiz session
- `GET /quizzes/:id` - Get quiz details
- `POST /quizzes/:id/submit` - Submit quiz answers
- `GET /quizzes/history` - Get user's quiz history (subscription limited)
- `POST /quizzes/asvab-replica` - Start full ASVAB replica exam (Premium)

### Subscriptions
- `GET /subscriptions/plans` - Get available subscription plans
- `POST /subscriptions/purchase` - Process subscription purchase
- `GET /subscriptions/status` - Get current subscription status
- `POST /subscriptions/cancel` - Cancel subscription
- `POST /subscriptions/restore` - Restore purchase

### Military Jobs (Premium)
- `GET /military/jobs` - Get jobs for user's selected branch
- `GET /military/jobs/:id` - Get specific job details
- `GET /military/jobs/search` - Search jobs within user's branch
- `GET /military/physical-standards` - Get fitness standards for user's branch

### Social Features (Premium)
- `POST /social/groups` - Create study group
- `GET /social/groups` - Get groups for user's branch
- `POST /social/groups/:id/join` - Join study group
- `GET /social/friends` - Get friends list
- `POST /social/friends/add` - Send friend request

### Notifications
- `POST /notifications/register` - Register device for push notifications
- `PUT /notifications/preferences` - Update notification preferences
- `GET /notifications/history` - Get notification history

## Branch Filtering
All content endpoints automatically filter results based on the user's selected military branch:
- Army
- Navy  
- Air Force
- Marines
- Coast Guard
- Space Force

## Subscription Tiers

### Free Tier Limits:
- 50 total questions
- 1 quiz per day (max 10 questions)
- 3 categories only
- Basic explanations
- 5 quiz history entries
- Weekly notifications only

### Premium Features:
- Unlimited questions and quizzes
- Full ASVAB replica exam
- Detailed explanations
- Military jobs database
- Social features
- Daily AI coaching
- Advanced analytics

## Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limiting
- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute  
- Premium features: 500 requests per minute

## Webhooks
- `POST /webhooks/apple` - Apple App Store webhook
- `POST /webhooks/google` - Google Play webhook