-- ASVAB Prep Database Initialization
-- Military-focused ASVAB preparation platform

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for military branches
DO $$ BEGIN
    CREATE TYPE military_branch AS ENUM (
        'ARMY',
        'NAVY', 
        'AIR_FORCE',
        'MARINES',
        'COAST_GUARD',
        'SPACE_FORCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create custom types for subscription tiers
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'FREE',
        'PREMIUM',
        'TRIAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create custom types for ASVAB categories
DO $$ BEGIN
    CREATE TYPE question_category AS ENUM (
        'GENERAL_SCIENCE',
        'ARITHMETIC_REASONING',
        'WORD_KNOWLEDGE', 
        'PARAGRAPH_COMPREHENSION',
        'MATHEMATICS_KNOWLEDGE',
        'ELECTRONICS_INFORMATION',
        'AUTO_INFORMATION',
        'SHOP_INFORMATION',
        'MECHANICAL_COMPREHENSION',
        'ASSEMBLING_OBJECTS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_branch ON "User"("selectedBranch");
CREATE INDEX IF NOT EXISTS idx_user_subscription ON "User"("subscriptionTier");

CREATE INDEX IF NOT EXISTS idx_question_category ON "Question"(category);
CREATE INDEX IF NOT EXISTS idx_question_difficulty ON "Question"(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_branch ON "Question" USING gin("branchRelevance");
CREATE INDEX IF NOT EXISTS idx_question_active ON "Question"("isActive") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_quiz_user ON "Quiz"("userId");
CREATE INDEX IF NOT EXISTS idx_quiz_completed ON "Quiz"("completedAt");
CREATE INDEX IF NOT EXISTS idx_quiz_category ON "Quiz"(category);

CREATE INDEX IF NOT EXISTS idx_military_job_branch ON "MilitaryJob"(branch);
CREATE INDEX IF NOT EXISTS idx_military_job_score ON "MilitaryJob"("minAfqtScore");

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create database user for application (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'asvab_user') THEN
        CREATE ROLE asvab_user WITH LOGIN PASSWORD 'secure_password_change_in_production';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE asvab_prep TO asvab_user;
GRANT USAGE ON SCHEMA public TO asvab_user;
GRANT CREATE ON SCHEMA public TO asvab_user;

-- Grant permissions on existing tables (will be created by Prisma)
-- These will take effect after Prisma creates the tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO asvab_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO asvab_user;

-- Military motivational comments for database admins
COMMENT ON DATABASE asvab_prep IS 'ASVAB Test Preparation Database - Supporting Military Excellence and Career Success';

-- Create stored procedure for cleaning up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "UserSession" 
    WHERE "lastActive" < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure for military branch statistics
CREATE OR REPLACE FUNCTION get_branch_statistics()
RETURNS TABLE (
    branch TEXT,
    user_count BIGINT,
    avg_score NUMERIC,
    total_quizzes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."selectedBranch"::TEXT,
        COUNT(DISTINCT u.id),
        ROUND(AVG(q.score), 2),
        COUNT(q.id)
    FROM "User" u
    LEFT JOIN "Quiz" q ON u.id = q."userId"
    WHERE u."selectedBranch" IS NOT NULL
    GROUP BY u."selectedBranch"
    ORDER BY user_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create view for user progress summary
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u."selectedBranch" as branch,
    u."subscriptionTier" as subscription,
    COUNT(q.id) as total_quizzes,
    ROUND(AVG(q.score), 2) as average_score,
    MAX(q."completedAt") as last_quiz_date,
    COUNT(CASE WHEN q.score >= 70 THEN 1 END) as passing_quizzes
FROM "User" u
LEFT JOIN "Quiz" q ON u.id = q."userId"
GROUP BY u.id, u.email, u."selectedBranch", u."subscriptionTier";

COMMENT ON VIEW user_progress_summary IS 'Summary view of user progress for military ASVAB preparation';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE '🎖️  ASVAB Prep Database initialized successfully!';
    RAISE NOTICE '⚡ Ready to support military excellence and career advancement!';
    RAISE NOTICE '🇺🇸 Semper Fi! Database is mission-ready!';
END $$;