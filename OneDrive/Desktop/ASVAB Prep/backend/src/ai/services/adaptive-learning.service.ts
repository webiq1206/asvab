import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

export interface QuestionSequenceConfig {
  userId: string;
  category: QuestionCategory;
  targetAccuracy: number;
  maxQuestions: number;
  timeLimit?: number; // minutes
  adaptiveDifficulty: boolean;
}

export interface AdaptiveQuestion {
  id: string;
  content: string;
  options: string[];
  category: QuestionCategory;
  difficulty: string;
  expectedDifficulty: number; // 1-10 scale
  confidenceLevel: number; // 0-1
  reasoning: string;
  militaryContext?: string;
}

export interface LearningPathRecommendation {
  sequence: QuestionCategory[];
  estimatedDuration: number; // minutes
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  reasoning: string;
  milestones: Array<{
    category: QuestionCategory;
    targetAccuracy: number;
    estimatedQuestions: number;
  }>;
}

@Injectable()
export class AdaptiveLearningService {
  private readonly logger = new Logger(AdaptiveLearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateIntelligentQuestionSequence(config: QuestionSequenceConfig): Promise<AdaptiveQuestion[]> {
    try {
      // Get user's performance history
      const userPerformance = await this.getUserPerformanceProfile(config.userId, config.category);
      
      // Determine current proficiency level
      const proficiencyLevel = this.calculateProficiencyLevel(userPerformance);
      
      // Get available questions pool
      const questionPool = await this.getAdaptiveQuestionPool(
        config.category,
        proficiencyLevel,
        config.maxQuestions * 2 // Get extra for selection
      );

      // Generate adaptive sequence
      const adaptiveSequence = await this.selectOptimalQuestions(
        questionPool,
        userPerformance,
        config
      );

      // Add AI-generated context and reasoning
      const enhancedSequence = adaptiveSequence.map((question, index) => ({
        ...question,
        expectedDifficulty: this.calculateExpectedDifficulty(question, userPerformance),
        confidenceLevel: this.calculateSelectionConfidence(question, userPerformance, index),
        reasoning: this.generateSelectionReasoning(question, userPerformance, index),
        militaryContext: this.generateMilitaryContext(question, config.userId),
      }));

      this.logger.log(`Generated adaptive sequence of ${enhancedSequence.length} questions for user ${config.userId}`);
      
      return enhancedSequence.slice(0, config.maxQuestions);
    } catch (error) {
      this.logger.error(`Failed to generate intelligent question sequence:`, error);
      throw new Error('Failed to generate adaptive question sequence');
    }
  }

  async generatePersonalizedLearningPath(userId: string): Promise<LearningPathRecommendation> {
    try {
      // Get user's comprehensive performance data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          quizzes: {
            include: {
              questions: {
                select: {
                  category: true,
                  difficulty: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Analyze performance across all categories
      const categoryAnalysis = this.analyzeAllCategoryPerformance(user.quizzes);
      
      // Determine overall skill level
      const overallLevel = this.determineOverallSkillLevel(categoryAnalysis);
      
      // Generate optimal learning sequence
      const optimalSequence = this.generateOptimalCategorySequence(categoryAnalysis, overallLevel);
      
      // Calculate time estimates
      const estimatedDuration = this.calculateLearningPathDuration(optimalSequence, overallLevel);

      // Create milestones
      const milestones = this.generateLearningMilestones(optimalSequence, categoryAnalysis);

      return {
        sequence: optimalSequence,
        estimatedDuration,
        difficulty: overallLevel,
        reasoning: this.generateLearningPathReasoning(categoryAnalysis, overallLevel),
        milestones,
      };
    } catch (error) {
      this.logger.error(`Failed to generate learning path:`, error);
      throw new Error('Failed to generate personalized learning path');
    }
  }

  async updateLearningModel(userId: string, questionId: string, wasCorrect: boolean, timeSpent: number): Promise<void> {
    try {
      // Record the learning interaction for model improvement
      await this.prisma.learningInteraction.create({
        data: {
          userId,
          questionId,
          wasCorrect,
          timeSpent,
          timestamp: new Date(),
          // Additional metadata for ML model training would go here
        },
      });

      // Update user's dynamic difficulty rating for the category
      await this.updateDynamicDifficultyRating(userId, questionId, wasCorrect, timeSpent);
      
      this.logger.debug(`Updated learning model for user ${userId}, question ${questionId}`);
    } catch (error) {
      this.logger.error(`Failed to update learning model:`, error);
      // Don't throw error as this is a background operation
    }
  }

  private async getUserPerformanceProfile(userId: string, category: QuestionCategory) {
    const recentQuizzes = await this.prisma.quiz.findMany({
      where: {
        userId,
        category,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: {
        questions: {
          select: {
            questionId: true,
            difficulty: true,
            isCorrect: true,
            timeSpent: true,
          },
        },
      },
    });

    // Calculate performance metrics
    const totalQuestions = recentQuizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const correctAnswers = recentQuizzes.reduce(
      (sum, quiz) => sum + quiz.questions.filter(q => q.isCorrect).length,
      0
    );
    
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const averageTime = recentQuizzes.reduce(
      (sum, quiz) => sum + quiz.questions.reduce((qSum, q) => qSum + (q.timeSpent || 0), 0),
      0
    ) / totalQuestions;

    // Analyze difficulty pattern
    const difficultyPerformance = this.analyzeDifficultyPerformance(recentQuizzes);
    
    // Calculate learning velocity (improvement over time)
    const learningVelocity = this.calculateLearningVelocity(recentQuizzes);

    return {
      accuracy,
      averageTime,
      totalQuestions,
      difficultyPerformance,
      learningVelocity,
      recentQuizzes,
    };
  }

  private calculateProficiencyLevel(performance: any): number {
    // Combine multiple factors to determine proficiency (1-10 scale)
    const accuracyScore = performance.accuracy * 4; // Max 4 points
    const speedScore = Math.max(0, 3 - (performance.averageTime / 60)); // Max 3 points, penalize slow answers
    const consistencyScore = this.calculateConsistencyScore(performance.recentQuizzes); // Max 2 points
    const difficultyScore = performance.difficultyPerformance.averageHandled; // Max 1 point

    return Math.min(10, Math.max(1, accuracyScore + speedScore + consistencyScore + difficultyScore));
  }

  private async getAdaptiveQuestionPool(
    category: QuestionCategory,
    proficiencyLevel: number,
    poolSize: number
  ): Promise<any[]> {
    // Define difficulty range based on proficiency
    const difficultyRange = this.getDifficultyRange(proficiencyLevel);
    
    // Get questions from database
    const questions = await this.prisma.question.findMany({
      where: {
        category,
        isActive: true,
        difficulty: {
          in: difficultyRange,
        },
      },
      take: poolSize,
      orderBy: {
        createdAt: 'desc', // Prefer newer questions
      },
    });

    return questions;
  }

  private async selectOptimalQuestions(
    questionPool: any[],
    userPerformance: any,
    config: QuestionSequenceConfig
  ): Promise<any[]> {
    const selectedQuestions = [];
    const usedQuestions = new Set();

    // Start with current proficiency level
    let currentDifficulty = this.calculateProficiencyLevel(userPerformance);
    let correctStreak = 0;
    let incorrectStreak = 0;

    for (let i = 0; i < config.maxQuestions && questionPool.length > 0; i++) {
      // Filter available questions by current difficulty preference
      const candidateQuestions = questionPool.filter(q => 
        !usedQuestions.has(q.id) && 
        this.isAppropriatedifficulty(q, currentDifficulty)
      );

      if (candidateQuestions.length === 0) {
        // If no candidates, expand search
        const fallbackQuestions = questionPool.filter(q => !usedQuestions.has(q.id));
        if (fallbackQuestions.length === 0) break;
        
        candidateQuestions.push(fallbackQuestions[0]);
      }

      // Select best question using multiple criteria
      const selectedQuestion = this.selectBestQuestion(candidateQuestions, userPerformance, i);
      selectedQuestions.push(selectedQuestion);
      usedQuestions.add(selectedQuestion.id);

      // Simulate adaptive difficulty adjustment (would be based on actual answers in real implementation)
      if (config.adaptiveDifficulty) {
        const predictedCorrect = this.predictAnswerCorrectness(selectedQuestion, userPerformance);
        
        if (predictedCorrect) {
          correctStreak++;
          incorrectStreak = 0;
          if (correctStreak >= 3) {
            currentDifficulty = Math.min(10, currentDifficulty + 1);
            correctStreak = 0;
          }
        } else {
          incorrectStreak++;
          correctStreak = 0;
          if (incorrectStreak >= 2) {
            currentDifficulty = Math.max(1, currentDifficulty - 1);
            incorrectStreak = 0;
          }
        }
      }
    }

    return selectedQuestions;
  }

  private analyzeAllCategoryPerformance(quizzes: any[]) {
    const categoryStats: Record<string, any> = {};
    
    Object.values(QuestionCategory).forEach(category => {
      const categoryQuizzes = quizzes.filter(q => q.category === category);
      if (categoryQuizzes.length === 0) {
        categoryStats[category] = {
          accuracy: 0,
          questionsAnswered: 0,
          confidence: 0,
          needsWork: true,
        };
        return;
      }

      const totalQuestions = categoryQuizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
      const correctAnswers = categoryQuizzes.reduce(
        (sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
        0
      );

      categoryStats[category] = {
        accuracy: correctAnswers / totalQuestions,
        questionsAnswered: totalQuestions,
        confidence: this.calculateCategoryConfidence(categoryQuizzes),
        needsWork: (correctAnswers / totalQuestions) < 0.7,
      };
    });

    return categoryStats;
  }

  private determineOverallSkillLevel(categoryAnalysis: any): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
    const categories = Object.values(categoryAnalysis);
    const averageAccuracy = categories.reduce((sum: number, cat: any) => sum + cat.accuracy, 0) / categories.length;
    const totalQuestions = categories.reduce((sum: number, cat: any) => sum + cat.questionsAnswered, 0);

    if (averageAccuracy >= 0.85 && totalQuestions >= 100) {
      return 'ADVANCED';
    } else if (averageAccuracy >= 0.65 && totalQuestions >= 50) {
      return 'INTERMEDIATE';
    } else {
      return 'BEGINNER';
    }
  }

  private generateOptimalCategorySequence(categoryAnalysis: any, skillLevel: string): QuestionCategory[] {
    const categories = Object.keys(categoryAnalysis) as QuestionCategory[];
    
    // Sort by need (lowest accuracy first) but consider dependencies
    const sortedByNeed = categories.sort((a, b) => {
      const aNeedsWork = categoryAnalysis[a].needsWork ? 1 : 0;
      const bNeedsWork = categoryAnalysis[b].needsWork ? 1 : 0;
      
      if (aNeedsWork !== bNeedsWork) {
        return bNeedsWork - aNeedsWork; // Needs work categories first
      }
      
      return categoryAnalysis[a].accuracy - categoryAnalysis[b].accuracy;
    });

    // Apply skill-level specific ordering
    if (skillLevel === 'BEGINNER') {
      // Start with fundamental math concepts
      return this.reorderForBeginners(sortedByNeed);
    } else if (skillLevel === 'ADVANCED') {
      // Focus on complex reasoning and technical subjects
      return this.reorderForAdvanced(sortedByNeed);
    }
    
    return sortedByNeed;
  }

  private reorderForBeginners(categories: QuestionCategory[]): QuestionCategory[] {
    const priorityOrder = [
      QuestionCategory.ARITHMETIC_REASONING,
      QuestionCategory.MATHEMATICS_KNOWLEDGE,
      QuestionCategory.WORD_KNOWLEDGE,
      QuestionCategory.PARAGRAPH_COMPREHENSION,
    ];

    const reordered = [];
    
    // Add priority categories first (if they exist in the list)
    priorityOrder.forEach(priority => {
      if (categories.includes(priority)) {
        reordered.push(priority);
      }
    });

    // Add remaining categories
    categories.forEach(cat => {
      if (!reordered.includes(cat)) {
        reordered.push(cat);
      }
    });

    return reordered;
  }

  private reorderForAdvanced(categories: QuestionCategory[]): QuestionCategory[] {
    // For advanced users, maintain the need-based order but group technical subjects
    return categories; // Could implement more sophisticated reordering
  }

  private calculateLearningPathDuration(sequence: QuestionCategory[], skillLevel: string): number {
    const baseTimePerCategory = {
      'BEGINNER': 45, // minutes
      'INTERMEDIATE': 35,
      'ADVANCED': 25,
    };

    return sequence.length * baseTimePerCategory[skillLevel];
  }

  private generateLearningMilestones(sequence: QuestionCategory[], categoryAnalysis: any) {
    return sequence.map(category => ({
      category,
      targetAccuracy: Math.max(0.8, categoryAnalysis[category].accuracy + 0.15),
      estimatedQuestions: this.estimateQuestionsNeeded(categoryAnalysis[category]),
    }));
  }

  private estimateQuestionsNeeded(categoryData: any): number {
    const currentAccuracy = categoryData.accuracy;
    if (currentAccuracy >= 0.8) return 15; // Maintenance
    if (currentAccuracy >= 0.6) return 25; // Improvement
    return 40; // Foundational work needed
  }

  private generateLearningPathReasoning(categoryAnalysis: any, skillLevel: string): string {
    const weakCategories = Object.entries(categoryAnalysis)
      .filter(([, data]: [string, any]) => data.needsWork)
      .map(([category]) => category);

    if (weakCategories.length === 0) {
      return `As an ${skillLevel.toLowerCase()} learner, focus on maintaining your strong performance across all areas.`;
    }

    return `Based on your ${skillLevel.toLowerCase()} skill level, prioritizing ${weakCategories.length} areas that need improvement: ${weakCategories.join(', ')}.`;
  }

  // Helper methods for calculations
  private analyzeDifficultyPerformance(quizzes: any[]) {
    const difficultyStats = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };

    quizzes.forEach(quiz => {
      quiz.questions.forEach((q: any) => {
        const diff = q.difficulty as keyof typeof difficultyStats;
        if (diff in difficultyStats) {
          if (q.isCorrect) difficultyStats[diff]++;
          difficultyCounts[diff]++;
        }
      });
    });

    const averageHandled = Object.entries(difficultyStats).reduce((sum, [diff, correct]) => {
      const total = difficultyCounts[diff as keyof typeof difficultyCounts];
      return sum + (total > 0 ? (correct / total) : 0);
    }, 0) / 3;

    return { difficultyStats, difficultyCounts, averageHandled };
  }

  private calculateLearningVelocity(quizzes: any[]): number {
    if (quizzes.length < 2) return 0;

    const recentAccuracy = this.calculateQuizAccuracy(quizzes.slice(0, 5));
    const olderAccuracy = this.calculateQuizAccuracy(quizzes.slice(-5));

    return recentAccuracy - olderAccuracy; // Positive = improving, negative = declining
  }

  private calculateQuizAccuracy(quizzes: any[]): number {
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const correctAnswers = quizzes.reduce(
      (sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );
    return totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  }

  private calculateConsistencyScore(quizzes: any[]): number {
    if (quizzes.length < 3) return 1;

    const accuracies = quizzes.map(quiz => this.calculateQuizAccuracy([quiz]));
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    
    // Lower variance = higher consistency score (max 2 points)
    return Math.max(0, 2 - (variance * 10));
  }

  private getDifficultyRange(proficiencyLevel: number): string[] {
    if (proficiencyLevel <= 3) return ['EASY'];
    if (proficiencyLevel <= 6) return ['EASY', 'MEDIUM'];
    return ['MEDIUM', 'HARD'];
  }

  private isAppropriatedifficulty(question: any, targetDifficulty: number): boolean {
    const questionDifficulty = this.mapDifficultyToNumber(question.difficulty);
    return Math.abs(questionDifficulty - targetDifficulty) <= 2;
  }

  private mapDifficultyToNumber(difficulty: string): number {
    switch (difficulty) {
      case 'EASY': return 3;
      case 'MEDIUM': return 6;
      case 'HARD': return 9;
      default: return 5;
    }
  }

  private selectBestQuestion(candidates: any[], userPerformance: any, position: number): any {
    // Score each candidate based on multiple factors
    return candidates.reduce((best, current) => {
      const currentScore = this.calculateQuestionScore(current, userPerformance, position);
      const bestScore = this.calculateQuestionScore(best, userPerformance, position);
      
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateQuestionScore(question: any, userPerformance: any, position: number): number {
    let score = 0;
    
    // Difficulty appropriateness (0-3 points)
    const appropriateness = this.calculateDifficultyAppropriateness(question, userPerformance);
    score += appropriateness * 3;
    
    // Novelty factor (0-2 points) - prefer less recently seen questions
    score += this.calculateNoveltyScore(question, userPerformance) * 2;
    
    // Position appropriateness (0-1 point) - easier questions at start
    score += this.calculatePositionScore(question, position);
    
    return score;
  }

  private calculateDifficultyAppropriateness(question: any, userPerformance: any): number {
    const questionDiff = this.mapDifficultyToNumber(question.difficulty);
    const userLevel = this.calculateProficiencyLevel(userPerformance);
    const difference = Math.abs(questionDiff - userLevel);
    
    return Math.max(0, 1 - (difference / 5)); // Closer = better score
  }

  private calculateNoveltyScore(question: any, userPerformance: any): number {
    // Check if user has seen similar questions recently
    const recentQuestionIds = userPerformance.recentQuizzes
      .flatMap((quiz: any) => quiz.questions.map((q: any) => q.questionId));
    
    return recentQuestionIds.includes(question.id) ? 0 : 1;
  }

  private calculatePositionScore(question: any, position: number): number {
    const questionDiff = this.mapDifficultyToNumber(question.difficulty);
    
    // Prefer easier questions at the beginning
    if (position < 3 && questionDiff <= 4) return 1;
    if (position >= 3 && questionDiff > 4) return 1;
    
    return 0.5;
  }

  private predictAnswerCorrectness(question: any, userPerformance: any): boolean {
    const userLevel = this.calculateProficiencyLevel(userPerformance);
    const questionDiff = this.mapDifficultyToNumber(question.difficulty);
    
    // Simple prediction based on difficulty gap
    const successProbability = Math.max(0.1, Math.min(0.9, 0.7 - (questionDiff - userLevel) * 0.1));
    
    return Math.random() < successProbability;
  }

  private calculateExpectedDifficulty(question: any, userPerformance: any): number {
    const baseDifficulty = this.mapDifficultyToNumber(question.difficulty);
    const userLevel = this.calculateProficiencyLevel(userPerformance);
    
    // Adjust expected difficulty based on user's proficiency
    const adjustment = (baseDifficulty - userLevel) * 0.1;
    
    return Math.max(1, Math.min(10, baseDifficulty + adjustment));
  }

  private calculateSelectionConfidence(question: any, userPerformance: any, position: number): number {
    const score = this.calculateQuestionScore(question, userPerformance, position);
    return Math.min(1, score / 6); // Normalize to 0-1
  }

  private generateSelectionReasoning(question: any, userPerformance: any, position: number): string {
    const questionDiff = this.mapDifficultyToNumber(question.difficulty);
    const userLevel = this.calculateProficiencyLevel(userPerformance);
    
    if (Math.abs(questionDiff - userLevel) <= 1) {
      return 'Optimal difficulty match for current skill level';
    } else if (questionDiff > userLevel) {
      return 'Challenge question to promote growth';
    } else {
      return 'Confidence building question';
    }
  }

  private generateMilitaryContext(question: any, userId: string): string {
    // This would be enhanced with actual military job correlations
    return `Essential skill for military technical roles and career advancement`;
  }

  private calculateCategoryConfidence(quizzes: any[]): number {
    if (quizzes.length === 0) return 0;
    
    const recentQuizzes = quizzes.slice(0, 5);
    const accuracy = this.calculateQuizAccuracy(recentQuizzes);
    const consistency = this.calculateConsistencyScore(quizzes);
    
    return (accuracy * 0.7) + (consistency * 0.3); // Weighted combination
  }

  private async updateDynamicDifficultyRating(
    userId: string,
    questionId: string,
    wasCorrect: boolean,
    timeSpent: number
  ): Promise<void> {
    // This would update a user's dynamic difficulty rating for ML model training
    // Implementation would depend on your specific ML infrastructure
    this.logger.debug(`Dynamic difficulty update: User ${userId}, Question ${questionId}, Correct: ${wasCorrect}, Time: ${timeSpent}ms`);
  }
}