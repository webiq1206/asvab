-- Remove branch relevance from questions since ASVAB is standardized across all branches
-- Only military jobs and physical standards should be branch-specific

-- Remove the branchRelevance column from questions table
ALTER TABLE "questions" DROP COLUMN IF EXISTS "branchRelevance";

-- Clean up any existing questions with branch-specific content
-- We'll reimport standardized ASVAB questions