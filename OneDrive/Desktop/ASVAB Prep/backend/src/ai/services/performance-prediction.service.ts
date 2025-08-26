import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

export interface ASVABScorePrediction {
  predictedAFQT: number; // Overall AFQT score (1-99)
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  categoryPredictions: Record<QuestionCategory, {
    predictedScore: number;
    confidence: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  }>;
  recommendedStudyTime: number; // weeks until ready
  readinessLevel: 'NOT_READY' | 'NEEDS_WORK' | 'READY' | 'EXCELLENT';
  keyInsights: string[];
  militaryJobEligibility: Array<{
    jobCode: string;
    jobTitle: string;
    currentEligibility: boolean;
    projectedEligibility: boolean;
    requiredImprovement?: string[];
  }>;
}

export interface LearningProgressAnalysis {
  learningVelocity: number; // Points improved per week
  plateauRisk: number; // 0-1 scale
  burnoutRisk: number; // 0-1 scale
  optimalStudyLoad: {
    questionsPerDay: number;
    minutesPerSession: number;
    sessionsPerWeek: number;
  };
  strengthAreas: QuestionCategory[];
  improvementAreas: QuestionCategory[];
  nextMilestone: {
    description: string;
    targetDate: Date;
    probability: number;
  };
}

export interface CompetitiveAnalysis {
  percentileRank: number; // Among all users
  branchPercentileRank: number; // Among same military branch
  peerComparison: {
    averagePeerScore: number;
    userAdvantage: number; // Positive if above average
    topPerformerGap: number; // Gap to top 10%
  };
  goalProjections: Array<{
    targetScore: number;
    timeToAchieve: number; // weeks
    probability: number;
    requiredEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

@Injectable()
export class PerformancePredictionService {
  private readonly logger = new Logger(PerformancePredictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async predictASVABPerformance(userId: string): Promise<ASVABScorePrediction> {
    try {
      // Get comprehensive user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          quizzes: {
            include: {
              questions: {
                select: {
                  category: true,
                  difficulty: true,
                  isCorrect: true,
                  timeSpent: true,
                },
              },
            },
            orderBy: { completedAt: 'desc' },
          },
        },
      });

      if (!user || user.quizzes.length === 0) {
        throw new Error('Insufficient data for prediction');
      }

      // Analyze current performance by category
      const categoryAnalysis = this.analyzeCategoryPerformance(user.quizzes);

      // Apply machine learning model for AFQT prediction
      const afqtPrediction = this.calculateAFQTPrediction(categoryAnalysis);

      // Calculate confidence intervals
      const confidenceInterval = this.calculateConfidenceInterval(
        afqtPrediction,
        user.quizzes.length,
        categoryAnalysis
      );

      // Determine readiness level
      const readinessLevel = this.determineReadinessLevel(afqtPrediction, categoryAnalysis);

      // Calculate recommended study time
      const recommendedStudyTime = this.calculateRecommendedStudyTime(
        afqtPrediction,
        categoryAnalysis,
        readinessLevel
      );

      // Generate key insights
      const keyInsights = this.generateKeyInsights(afqtPrediction, categoryAnalysis, user);

      // Analyze military job eligibility
      const militaryJobEligibility = await this.analyzeMilitaryJobEligibility(
        user.selectedBranch,
        afqtPrediction,
        categoryAnalysis
      );

      return {
        predictedAFQT: Math.round(afqtPrediction),
        confidenceInterval: {
          lower: Math.round(confidenceInterval.lower),
          upper: Math.round(confidenceInterval.upper),
        },
        categoryPredictions: categoryAnalysis,
        recommendedStudyTime,
        readinessLevel,
        keyInsights,
        militaryJobEligibility,
      };
    } catch (error) {
      this.logger.error(`Failed to predict ASVAB performance:`, error);
      throw new Error('Failed to predict performance');
    }
  }

  async analyzeLearningProgress(userId: string): Promise<LearningProgressAnalysis> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          quizzes: {
            include: {
              questions: {
                select: {
                  category: true,
                  isCorrect: true,
                  timeSpent: true,
                },
              },
            },
            orderBy: { completedAt: 'asc' }, // Chronological for trend analysis
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate learning velocity
      const learningVelocity = this.calculateLearningVelocity(user.quizzes);

      // Assess plateau risk
      const plateauRisk = this.assessPlateauRisk(user.quizzes);

      // Assess burnout risk
      const burnoutRisk = this.assessBurnoutRisk(user.quizzes, user.profile?.studyStreak || 0);

      // Calculate optimal study load
      const optimalStudyLoad = this.calculateOptimalStudyLoad(user.quizzes, learningVelocity);

      // Identify strength and improvement areas
      const { strengthAreas, improvementAreas } = this.identifyStrengthAndWeakness(user.quizzes);

      // Project next milestone
      const nextMilestone = this.projectNextMilestone(user.quizzes, learningVelocity);

      return {
        learningVelocity,
        plateauRisk,
        burnoutRisk,
        optimalStudyLoad,
        strengthAreas,
        improvementAreas,
        nextMilestone,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze learning progress:`, error);
      throw new Error('Failed to analyze learning progress');
    }
  }

  async generateCompetitiveAnalysis(userId: string): Promise<CompetitiveAnalysis> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          quizzes: {
            include: {
              questions: {
                select: {
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

      // Calculate user's overall performance
      const userPerformance = this.calculateOverallPerformance(user.quizzes);

      // Get platform-wide statistics
      const platformStats = await this.getPlatformStatistics();

      // Get branch-specific statistics
      const branchStats = await this.getBranchStatistics(user.selectedBranch);

      // Calculate percentile rankings
      const percentileRank = this.calculatePercentileRank(userPerformance, platformStats);
      const branchPercentileRank = this.calculatePercentileRank(userPerformance, branchStats);

      // Generate peer comparison
      const peerComparison = {
        averagePeerScore: branchStats.averageScore,
        userAdvantage: userPerformance - branchStats.averageScore,
        topPerformerGap: branchStats.top10PercentScore - userPerformance,
      };

      // Generate goal projections
      const goalProjections = this.generateGoalProjections(userPerformance, user.quizzes);

      return {
        percentileRank,
        branchPercentileRank,
        peerComparison,
        goalProjections,
      };
    } catch (error) {
      this.logger.error(`Failed to generate competitive analysis:`, error);
      throw new Error('Failed to generate competitive analysis');
    }
  }

  private analyzeCategoryPerformance(quizzes: any[]) {
    const categoryData: Record<string, any> = {};

    // Initialize categories
    Object.values(QuestionCategory).forEach(category => {
      categoryData[category] = {
        totalQuestions: 0,
        correctAnswers: 0,
        totalTime: 0,
        difficultyBreakdown: { EASY: 0, MEDIUM: 0, HARD: 0 },
        recentTrend: [],
      };
    });

    // Analyze each quiz
    quizzes.forEach((quiz, index) => {
      quiz.questions.forEach((question: any) => {
        const category = question.category;
        const data = categoryData[category];

        data.totalQuestions++;
        if (question.isCorrect) data.correctAnswers++;
        data.totalTime += question.timeSpent || 0;

        // Track difficulty performance
        const difficulty = question.difficulty;
        if (difficulty in data.difficultyBreakdown) {
          data.difficultyBreakdown[difficulty]++;
        }

        // Track recent trend (last 10 quizzes)
        if (index < 10) {
          data.recentTrend.push(question.isCorrect ? 1 : 0);
        }
      });
    });

    // Calculate metrics for each category
    Object.keys(categoryData).forEach(category => {
      const data = categoryData[category];
      
      if (data.totalQuestions > 0) {
        const accuracy = data.correctAnswers / data.totalQuestions;
        const averageTime = data.totalTime / data.totalQuestions;
        
        // Calculate trend
        let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
        if (data.recentTrend.length >= 6) {
          const firstHalf = data.recentTrend.slice(0, Math.floor(data.recentTrend.length / 2));
          const secondHalf = data.recentTrend.slice(Math.floor(data.recentTrend.length / 2));
          
          const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          
          if (secondHalfAvg > firstHalfAvg + 0.1) trend = 'IMPROVING';
          else if (secondHalfAvg < firstHalfAvg - 0.1) trend = 'DECLINING';
        }

        categoryData[category] = {
          predictedScore: this.convertAccuracyToASVABScore(accuracy),
          confidence: this.calculatePredictionConfidence(data.totalQuestions, accuracy),
          trend,
          ...data,
        };
      } else {
        categoryData[category] = {
          predictedScore: 50, // Default middle score
          confidence: 0.1, // Very low confidence
          trend: 'STABLE' as const,
          ...data,
        };
      }
    });

    return categoryData;
  }

  private calculateAFQTPrediction(categoryAnalysis: any): number {
    // AFQT is calculated from four core areas with specific weights
    const afqtCategories = {
      [QuestionCategory.ARITHMETIC_REASONING]: 0.25,
      [QuestionCategory.MATHEMATICS_KNOWLEDGE]: 0.25,
      [QuestionCategory.WORD_KNOWLEDGE]: 0.25,
      [QuestionCategory.PARAGRAPH_COMPREHENSION]: 0.25,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(afqtCategories).forEach(([category, weight]) => {
      if (categoryAnalysis[category] && categoryAnalysis[category].predictedScore) {
        weightedSum += categoryAnalysis[category].predictedScore * weight;
        totalWeight += weight;
      }
    });

    if (totalWeight === 0) return 50; // Default middle score

    const rawScore = weightedSum / totalWeight;

    // Apply learning curve adjustment based on total questions answered
    const totalQuestions = Object.values(categoryAnalysis).reduce(
      (sum: number, cat: any) => sum + (cat.totalQuestions || 0),
      0
    );

    const experienceBonus = Math.min(5, Math.log10(totalQuestions + 1) * 2);

    return Math.min(99, Math.max(1, rawScore + experienceBonus));
  }

  private calculateConfidenceInterval(prediction: number, totalQuizzes: number, categoryAnalysis: any) {
    // Calculate overall confidence based on data quality
    const dataQualityScore = Math.min(1, totalQuizzes / 50); // More data = higher confidence
    
    // Calculate consistency across categories
    const categoryConfidences = Object.values(categoryAnalysis).map((cat: any) => cat.confidence || 0);
    const averageConfidence = categoryConfidences.reduce((a: number, b: number) => a + b, 0) / categoryConfidences.length;

    const overallConfidence = (dataQualityScore + averageConfidence) / 2;

    // Confidence interval width inversely related to confidence
    const intervalWidth = (1 - overallConfidence) * 20; // Max ±20 points

    return {
      lower: Math.max(1, prediction - intervalWidth),
      upper: Math.min(99, prediction + intervalWidth),
    };
  }

  private determineReadinessLevel(afqtPrediction: number, categoryAnalysis: any): 'NOT_READY' | 'NEEDS_WORK' | 'READY' | 'EXCELLENT' {
    // Check minimum requirements for military service
    if (afqtPrediction < 31) return 'NOT_READY'; // Below minimum for most branches
    
    // Check category balance (important for line scores)
    const categoryScores = Object.values(categoryAnalysis).map((cat: any) => cat.predictedScore || 50);
    const lowestCategory = Math.min(...categoryScores);
    const categoryBalance = Math.min(...categoryScores) / Math.max(...categoryScores);

    if (afqtPrediction >= 80 && categoryBalance > 0.8) return 'EXCELLENT';
    if (afqtPrediction >= 65 && categoryBalance > 0.7) return 'READY';
    if (afqtPrediction >= 50 || lowestCategory >= 45) return 'NEEDS_WORK';
    
    return 'NOT_READY';
  }

  private calculateRecommendedStudyTime(
    prediction: number,
    categoryAnalysis: any,
    readinessLevel: string
  ): number {
    const baseWeeks = {
      'NOT_READY': 12,
      'NEEDS_WORK': 8,
      'READY': 4,
      'EXCELLENT': 2,
    };

    let weeks = baseWeeks[readinessLevel as keyof typeof baseWeeks] || 8;

    // Adjust based on weak categories
    const weakCategories = Object.values(categoryAnalysis).filter(
      (cat: any) => cat.predictedScore < 60
    ).length;

    weeks += weakCategories * 2;

    // Adjust based on learning trends
    const decliningCategories = Object.values(categoryAnalysis).filter(
      (cat: any) => cat.trend === 'DECLINING'
    ).length;

    weeks += decliningCategories * 1;

    return Math.min(20, Math.max(2, weeks));
  }

  private generateKeyInsights(prediction: number, categoryAnalysis: any, user: any): string[] {
    const insights: string[] = [];

    // Overall performance insight
    if (prediction >= 80) {
      insights.push('You\'re on track for excellent ASVAB performance with access to top military roles.');
    } else if (prediction >= 65) {
      insights.push('Solid performance predicted. You qualify for most military occupational specialties.');
    } else if (prediction >= 50) {
      insights.push('Good foundation, but focused study can significantly improve your opportunities.');
    } else {
      insights.push('Intensive study recommended to meet military entrance requirements.');
    }

    // Category-specific insights
    const strongCategories = Object.entries(categoryAnalysis)
      .filter(([, cat]: [string, any]) => cat.predictedScore >= 70)
      .map(([category]) => category.replace(/_/g, ' ').toLowerCase());

    const weakCategories = Object.entries(categoryAnalysis)
      .filter(([, cat]: [string, any]) => cat.predictedScore < 60)
      .map(([category]) => category.replace(/_/g, ' ').toLowerCase());

    if (strongCategories.length > 0) {
      insights.push(`Your strengths lie in ${strongCategories.join(', ')}. Leverage these areas for technical roles.`);
    }

    if (weakCategories.length > 0) {
      insights.push(`Focus study time on ${weakCategories.join(', ')} for maximum score improvement.`);
    }

    // Trend insights
    const improvingCategories = Object.entries(categoryAnalysis)
      .filter(([, cat]: [string, any]) => cat.trend === 'IMPROVING')
      .length;

    if (improvingCategories >= 2) {
      insights.push('Great momentum! Your consistent study is showing clear improvement trends.');
    }

    return insights;
  }

  private async analyzeMilitaryJobEligibility(
    branch: MilitaryBranch,
    afqtPrediction: number,
    categoryAnalysis: any
  ) {
    // Get relevant military jobs for the branch
    const jobs = await this.prisma.militaryJob.findMany({
      where: {
        branch,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        mosCode: true,
        minAFQTScore: true,
        requiredLineScores: true,
      },
    });

    return jobs.map(job => {
      const currentlyEligible = afqtPrediction >= (job.minAFQTScore || 50);
      
      // Calculate line score requirements (simplified)
      const meetsLineScores = this.checkLineScoreRequirements(
        job.requiredLineScores as any,
        categoryAnalysis
      );

      const projectedEligible = currentlyEligible && meetsLineScores.meets;

      return {
        jobCode: job.mosCode || job.id,
        jobTitle: job.title,
        currentEligibility: currentlyEligible && meetsLineScores.meets,
        projectedEligibility: projectedEligible,
        requiredImprovement: projectedEligible ? undefined : meetsLineScores.improvements,
      };
    });
  }

  private checkLineScoreRequirements(requirements: any, categoryAnalysis: any) {
    if (!requirements || typeof requirements !== 'object') {
      return { meets: true, improvements: [] };
    }

    const improvements: string[] = [];
    let meets = true;

    // This would be more sophisticated in a real implementation
    Object.entries(requirements).forEach(([lineScore, minScore]) => {
      // Map line scores to categories (simplified)
      const relevantCategories = this.mapLineScoreToCategories(lineScore);
      const userScore = relevantCategories.reduce(
        (avg, cat) => avg + (categoryAnalysis[cat]?.predictedScore || 50),
        0
      ) / relevantCategories.length;

      if (userScore < (minScore as number)) {
        meets = false;
        improvements.push(`Improve ${lineScore} score (need ${minScore}, predicted ${Math.round(userScore)})`);
      }
    });

    return { meets, improvements };
  }

  private mapLineScoreToCategories(lineScore: string): QuestionCategory[] {
    // Simplified mapping - would be more comprehensive in real implementation
    const mapping: Record<string, QuestionCategory[]> = {
      GT: [QuestionCategory.WORD_KNOWLEDGE, QuestionCategory.PARAGRAPH_COMPREHENSION, QuestionCategory.ARITHMETIC_REASONING],
      MM: [QuestionCategory.MATHEMATICS_KNOWLEDGE, QuestionCategory.ARITHMETIC_REASONING],
      CL: [QuestionCategory.WORD_KNOWLEDGE, QuestionCategory.PARAGRAPH_COMPREHENSION],
    };

    return mapping[lineScore] || [QuestionCategory.ARITHMETIC_REASONING];
  }

  // Additional helper methods for learning progress analysis
  private calculateLearningVelocity(quizzes: any[]): number {
    if (quizzes.length < 5) return 0;

    // Calculate accuracy over time
    const timeWindows = [];
    const windowSize = Math.max(5, Math.floor(quizzes.length / 4));

    for (let i = 0; i < quizzes.length; i += windowSize) {
      const window = quizzes.slice(i, i + windowSize);
      const accuracy = this.calculateQuizAccuracy(window);
      timeWindows.push(accuracy);
    }

    if (timeWindows.length < 2) return 0;

    // Calculate slope (improvement per time window)
    const improvement = timeWindows[timeWindows.length - 1] - timeWindows[0];
    const timeSpan = timeWindows.length - 1;

    return improvement / timeSpan; // Points per time window
  }

  private calculateQuizAccuracy(quizzes: any[]): number {
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const correctAnswers = quizzes.reduce(
      (sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );
    return totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  }

  private convertAccuracyToASVABScore(accuracy: number): number {
    // Convert percentage accuracy to ASVAB scale (1-99)
    // This is a simplified conversion - actual ASVAB scoring is more complex
    return Math.round(Math.min(99, Math.max(1, accuracy * 100)));
  }

  private calculatePredictionConfidence(questionsAnswered: number, accuracy: number): number {
    // Higher confidence with more data and consistent performance
    const dataConfidence = Math.min(1, questionsAnswered / 100);
    const consistencyConfidence = 1 - Math.abs(accuracy - 0.7); // Penalty for extreme scores with little data
    
    return (dataConfidence + Math.max(0, consistencyConfidence)) / 2;
  }

  private assessPlateauRisk(quizzes: any[]): number {
    if (quizzes.length < 10) return 0.3; // Default moderate risk

    // Look for lack of improvement in recent sessions
    const recent = quizzes.slice(0, 10);
    const older = quizzes.slice(10, 20);

    const recentAccuracy = this.calculateQuizAccuracy(recent);
    const olderAccuracy = this.calculateQuizAccuracy(older);

    const improvement = recentAccuracy - olderAccuracy;

    if (improvement < 0.05) return 0.8; // High plateau risk
    if (improvement < 0.1) return 0.5; // Moderate risk
    return 0.2; // Low risk
  }

  private assessBurnoutRisk(quizzes: any[], studyStreak: number): number {
    // Consider factors like study intensity and consistency
    const recentIntensity = quizzes.slice(0, 7).length; // Questions in last week
    const averageSessionTime = quizzes.slice(0, 5).reduce(
      (sum, quiz) => sum + quiz.questions.reduce((qSum: number, q: any) => qSum + (q.timeSpent || 0), 0),
      0
    ) / Math.max(1, quizzes.slice(0, 5).length);

    let risk = 0;

    // High intensity indicator
    if (recentIntensity > 100) risk += 0.3;
    
    // Very long study sessions
    if (averageSessionTime > 60 * 60 * 1000) risk += 0.2; // Over 1 hour
    
    // Very high streak without breaks
    if (studyStreak > 30) risk += 0.2;
    
    // Declining performance despite high effort
    const learningVelocity = this.calculateLearningVelocity(quizzes);
    if (learningVelocity < -0.1 && recentIntensity > 50) risk += 0.3;

    return Math.min(1, risk);
  }

  private calculateOptimalStudyLoad(quizzes: any[], learningVelocity: number) {
    // Base recommendations
    let questionsPerDay = 15;
    let minutesPerSession = 25;
    let sessionsPerWeek = 5;

    // Adjust based on learning velocity
    if (learningVelocity > 0.1) {
      // Learning well - can handle more
      questionsPerDay = 20;
      minutesPerSession = 30;
    } else if (learningVelocity < -0.05) {
      // Struggling - reduce load
      questionsPerDay = 10;
      minutesPerSession = 20;
      sessionsPerWeek = 4;
    }

    // Adjust based on current performance
    if (quizzes.length > 0) {
      const recentAccuracy = this.calculateQuizAccuracy(quizzes.slice(0, 5));
      if (recentAccuracy < 0.6) {
        // Need more focused, shorter sessions
        questionsPerDay = Math.max(8, questionsPerDay - 5);
        minutesPerSession = Math.max(15, minutesPerSession - 5);
      }
    }

    return {
      questionsPerDay,
      minutesPerSession,
      sessionsPerWeek,
    };
  }

  private identifyStrengthAndWeakness(quizzes: any[]) {
    const categoryPerformance: Record<string, number[]> = {};

    // Collect performance by category
    quizzes.forEach(quiz => {
      quiz.questions.forEach((question: any) => {
        const category = question.category;
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = [];
        }
        categoryPerformance[category].push(question.isCorrect ? 1 : 0);
      });
    });

    // Calculate averages and identify strengths/weaknesses
    const categoryAverages: Array<[QuestionCategory, number]> = [];

    Object.entries(categoryPerformance).forEach(([category, scores]) => {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      categoryAverages.push([category as QuestionCategory, average]);
    });

    // Sort by performance
    categoryAverages.sort((a, b) => b[1] - a[1]);

    const strengthAreas = categoryAverages
      .filter(([, avg]) => avg >= 0.7)
      .slice(0, 3)
      .map(([category]) => category);

    const improvementAreas = categoryAverages
      .filter(([, avg]) => avg < 0.6)
      .slice(-3)
      .map(([category]) => category);

    return { strengthAreas, improvementAreas };
  }

  private projectNextMilestone(quizzes: any[], learningVelocity: number) {
    const currentAccuracy = this.calculateQuizAccuracy(quizzes.slice(0, 10));
    
    // Determine next logical milestone
    let targetAccuracy = 0.8; // Default target
    let description = 'Achieve 80% accuracy';

    if (currentAccuracy >= 0.8) {
      targetAccuracy = 0.9;
      description = 'Achieve 90% mastery level';
    } else if (currentAccuracy >= 0.9) {
      targetAccuracy = 0.95;
      description = 'Achieve expert level (95% accuracy)';
    } else if (currentAccuracy < 0.6) {
      targetAccuracy = 0.7;
      description = 'Reach proficiency level (70% accuracy)';
    }

    // Calculate time to achieve based on learning velocity
    const improvementNeeded = targetAccuracy - currentAccuracy;
    const weeksNeeded = learningVelocity > 0 ? 
      Math.max(2, improvementNeeded / learningVelocity) : 
      12; // Default if no clear velocity

    // Calculate probability based on current trajectory
    const probability = learningVelocity > 0 ? 
      Math.min(0.9, Math.max(0.1, learningVelocity * 2)) : 
      0.5;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);

    return {
      description,
      targetDate,
      probability,
    };
  }

  private calculateOverallPerformance(quizzes: any[]): number {
    return this.calculateQuizAccuracy(quizzes) * 100;
  }

  private async getPlatformStatistics() {
    // This would query actual platform statistics
    // For now, returning mock data
    return {
      averageScore: 65,
      userCount: 10000,
      scoreDistribution: [/* score distribution data */],
    };
  }

  private async getBranchStatistics(branch: MilitaryBranch) {
    // This would query branch-specific statistics
    return {
      averageScore: 67,
      userCount: 2000,
      top10PercentScore: 85,
      scoreDistribution: [/* branch score distribution */],
    };
  }

  private calculatePercentileRank(userScore: number, stats: any): number {
    // Simplified percentile calculation
    // In reality, this would use the actual score distribution
    if (userScore >= 85) return 90;
    if (userScore >= 75) return 75;
    if (userScore >= 65) return 50;
    if (userScore >= 55) return 25;
    return 10;
  }

  private generateGoalProjections(currentScore: number, quizzes: any[]) {
    const learningVelocity = this.calculateLearningVelocity(quizzes);
    const projections = [];

    const targets = [70, 75, 80, 85, 90];
    
    targets.forEach(target => {
      if (target > currentScore) {
        const improvement = target - currentScore;
        const timeToAchieve = learningVelocity > 0 ? 
          Math.max(2, improvement / (learningVelocity * 10)) : // Convert to weeks
          999;

        let probability = 0.5;
        let effort: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

        if (timeToAchieve < 8) {
          probability = 0.8;
          effort = 'LOW';
        } else if (timeToAchieve < 16) {
          probability = 0.6;
          effort = 'MEDIUM';
        } else if (timeToAchieve < 999) {
          probability = 0.3;
          effort = 'HIGH';
        } else {
          probability = 0.1;
          effort = 'HIGH';
        }

        projections.push({
          targetScore: target,
          timeToAchieve: Math.min(52, timeToAchieve), // Cap at 1 year
          probability,
          requiredEffort: effort,
        });
      }
    });

    return projections;
  }
}