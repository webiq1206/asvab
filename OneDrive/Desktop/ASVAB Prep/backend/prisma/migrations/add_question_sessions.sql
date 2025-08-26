-- Add QuestionSession table for resume capability
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

-- Add foreign key constraint
ALTER TABLE "question_sessions" ADD CONSTRAINT "question_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for user session queries
CREATE INDEX "question_sessions_userId_completedAt_idx" ON "question_sessions"("userId", "completedAt");