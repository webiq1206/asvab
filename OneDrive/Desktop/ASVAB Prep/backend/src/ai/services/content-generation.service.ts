import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

export interface GeneratedQuestion {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: QuestionCategory;
  explanation: string;
  militaryContext?: string;
  tags: string[];
  estimatedTimeToSolve: number; // seconds
  confidenceScore: number; // 0-1
}

export interface GeneratedExplanation {
  detailedExplanation: string;
  stepByStepSolution?: string[];
  keyConcepts: string[];
  commonMistakes: string[];
  studyTips: string[];
  relatedTopics: string[];
  militaryApplication?: string;
  difficulty: number; // 1-10
}

export interface GeneratedStudyPlan {
  title: string;
  description: string;
  totalWeeks: number;
  weeklyPlans: Array<{
    week: number;
    focus: QuestionCategory;
    goals: string[];
    studyHours: number;
    activities: Array<{
      type: 'QUIZ' | 'REVIEW' | 'PRACTICE' | 'ASSESSMENT';
      description: string;
      duration: number; // minutes
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    milestones: string[];
  }>;
  progressMarkers: Array<{
    week: number;
    metric: string;
    target: number;
    description: string;
  }>;
  contingencyPlans: Array<{
    scenario: string;
    adjustments: string[];
  }>;
}

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateQuestion(
    userId: string,
    requestData: {
      category: QuestionCategory;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      topic?: string;
      militaryContext?: boolean;
    }
  ): Promise<GeneratedQuestion> {
    try {
      // Get user profile to personalize content
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          selectedBranch: true,
          profile: true,
        },
      });

      // Analyze user's performance in this category for difficulty calibration
      const userPerformance = await this.analyzeUserPerformance(userId, requestData.category);

      // Generate question based on category and specifications
      const generatedQuestion = await this.createAdaptiveQuestion(
        requestData,
        user?.selectedBranch,
        userPerformance
      );

      // Store generated question for future use and improvement
      const savedQuestion = await this.saveGeneratedQuestion(generatedQuestion, userId);

      this.logger.log(`Generated question ${savedQuestion.id} for user ${userId} in category ${requestData.category}`);

      return {
        ...generatedQuestion,
        id: savedQuestion.id,
      };
    } catch (error) {
      this.logger.error(`Failed to generate question:`, error);
      throw new Error('Failed to generate question');
    }
  }

  async generateExplanation(
    userId: string,
    requestData: {
      questionId: string;
      userAnswer?: string;
      includeStrategy?: boolean;
    }
  ): Promise<GeneratedExplanation> {
    try {
      // Get question details
      const question = await this.prisma.question.findUnique({
        where: { id: requestData.questionId },
        include: {
          category: true,
        },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Get user profile for personalization
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          selectedBranch: true,
          profile: true,
        },
      });

      // Analyze user's historical performance for context
      const userPerformance = await this.analyzeUserPerformance(userId, question.category);

      // Generate comprehensive explanation
      const explanation = await this.createPersonalizedExplanation(
        question,
        requestData.userAnswer,
        user?.selectedBranch,
        userPerformance,
        requestData.includeStrategy
      );

      this.logger.log(`Generated explanation for question ${requestData.questionId} for user ${userId}`);

      return explanation;
    } catch (error) {
      this.logger.error(`Failed to generate explanation:`, error);
      throw new Error('Failed to generate explanation');
    }
  }

  async generateStudyPlan(
    userId: string,
    requestData: {
      targetScore: number;
      timeframe: number; // weeks
      focusAreas?: QuestionCategory[];
      studyHoursPerWeek?: number;
    }
  ): Promise<GeneratedStudyPlan> {
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
                  isCorrect: true,
                  difficulty: true,
                },
              },
            },
            orderBy: { completedAt: 'desc' },
            take: 50, // Recent performance data
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Analyze current performance across all categories
      const performanceAnalysis = await this.comprehensivePerformanceAnalysis(user.quizzes);

      // Calculate gap between current and target performance
      const performanceGap = this.calculatePerformanceGap(
        performanceAnalysis,
        requestData.targetScore
      );

      // Generate adaptive study plan
      const studyPlan = await this.createAdaptiveStudyPlan(
        performanceGap,
        requestData,
        user.selectedBranch,
        performanceAnalysis
      );

      this.logger.log(`Generated study plan for user ${userId} targeting ${requestData.targetScore} AFQT score`);

      return studyPlan;
    } catch (error) {
      this.logger.error(`Failed to generate study plan:`, error);
      throw new Error('Failed to generate study plan');
    }
  }

  private async analyzeUserPerformance(userId: string, category: QuestionCategory) {
    const recentQuizzes = await this.prisma.quiz.findMany({
      where: {
        userId,
        category,
        completedAt: { not: null },
      },
      include: {
        questions: {
          select: {
            difficulty: true,
            isCorrect: true,
            timeSpent: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    if (recentQuizzes.length === 0) {
      return {
        accuracy: 0.5, // Default middle accuracy
        averageTime: 60000, // 60 seconds default
        difficultyPreference: 'MEDIUM',
        totalQuestions: 0,
        recentTrend: 'STABLE',
      };
    }

    const allQuestions = recentQuizzes.flatMap(quiz => quiz.questions);
    const correctAnswers = allQuestions.filter(q => q.isCorrect).length;
    const accuracy = correctAnswers / allQuestions.length;
    
    const averageTime = allQuestions.reduce((sum, q) => sum + (q.timeSpent || 60000), 0) / allQuestions.length;

    // Analyze difficulty performance
    const difficultyPerformance = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    const difficultyCounts = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    allQuestions.forEach(q => {
      const diff = q.difficulty as keyof typeof difficultyPerformance;
      if (diff in difficultyPerformance) {
        if (q.isCorrect) difficultyPerformance[diff]++;
        difficultyCounts[diff]++;
      }
    });

    // Determine preferred difficulty
    let difficultyPreference: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
    let bestPerformance = 0;

    Object.entries(difficultyPerformance).forEach(([diff, correct]) => {
      const total = difficultyCounts[diff as keyof typeof difficultyCounts];
      if (total > 0) {
        const performance = correct / total;
        if (performance > bestPerformance) {
          bestPerformance = performance;
          difficultyPreference = diff as 'EASY' | 'MEDIUM' | 'HARD';
        }
      }
    });

    // Calculate recent trend
    const recentTrend = this.calculateTrend(recentQuizzes);

    return {
      accuracy,
      averageTime,
      difficultyPreference,
      totalQuestions: allQuestions.length,
      recentTrend,
      difficultyPerformance,
    };
  }

  private async createAdaptiveQuestion(
    requestData: any,
    branch?: MilitaryBranch,
    userPerformance?: any
  ): Promise<Omit<GeneratedQuestion, 'id'>> {
    // This would integrate with an AI service (like OpenAI) in production
    // For now, we'll create template-based questions

    const questionTemplates = this.getQuestionTemplates(requestData.category);
    const selectedTemplate = this.selectOptimalTemplate(questionTemplates, requestData, userPerformance);

    // Generate question content based on template and user data
    const questionContent = this.populateQuestionTemplate(selectedTemplate, requestData, branch);

    // Calculate confidence score based on template quality and user match
    const confidenceScore = this.calculateQuestionConfidence(selectedTemplate, userPerformance);

    return {
      content: questionContent.question,
      options: questionContent.options,
      correctAnswer: questionContent.correctAnswer,
      difficulty: requestData.difficulty,
      category: requestData.category,
      explanation: questionContent.explanation,
      militaryContext: requestData.militaryContext ? questionContent.militaryContext : undefined,
      tags: questionContent.tags,
      estimatedTimeToSolve: questionContent.estimatedTime,
      confidenceScore,
    };
  }

  private async createPersonalizedExplanation(
    question: any,
    userAnswer?: string,
    branch?: MilitaryBranch,
    userPerformance?: any,
    includeStrategy?: boolean
  ): Promise<GeneratedExplanation> {
    // Analyze the question type and generate appropriate explanation
    const explanationStyle = this.determineExplanationStyle(userPerformance);
    
    const baseExplanation = this.generateBaseExplanation(question, explanationStyle);
    
    // Add personalized elements
    const personalizedElements = this.addPersonalizedElements(
      baseExplanation,
      userAnswer,
      branch,
      userPerformance
    );

    // Include strategy tips if requested
    const strategyTips = includeStrategy ? 
      this.generateStrategyTips(question, userPerformance) : 
      [];

    return {
      detailedExplanation: personalizedElements.explanation,
      stepByStepSolution: personalizedElements.steps,
      keyConcepts: personalizedElements.concepts,
      commonMistakes: personalizedElements.mistakes,
      studyTips: [...personalizedElements.tips, ...strategyTips],
      relatedTopics: personalizedElements.relatedTopics,
      militaryApplication: branch ? personalizedElements.militaryApplication : undefined,
      difficulty: this.calculateExplanationDifficulty(question, userPerformance),
    };
  }

  private async createAdaptiveStudyPlan(
    performanceGap: any,
    requestData: any,
    branch?: MilitaryBranch,
    performanceAnalysis?: any
  ): Promise<GeneratedStudyPlan> {
    const studyHoursPerWeek = requestData.studyHoursPerWeek || 10;
    const totalWeeks = requestData.timeframe;

    // Prioritize categories based on performance gaps
    const categoryPriorities = this.prioritizeCategories(
      performanceGap,
      requestData.focusAreas
    );

    // Generate weekly plans
    const weeklyPlans = [];
    for (let week = 1; week <= totalWeeks; week++) {
      const weekPlan = this.generateWeeklyPlan(
        week,
        totalWeeks,
        categoryPriorities,
        studyHoursPerWeek,
        performanceAnalysis,
        branch
      );
      weeklyPlans.push(weekPlan);
    }

    // Generate progress markers
    const progressMarkers = this.generateProgressMarkers(totalWeeks, requestData.targetScore);

    // Generate contingency plans
    const contingencyPlans = this.generateContingencyPlans(performanceGap);

    return {
      title: `${totalWeeks}-Week ASVAB Preparation Plan`,
      description: `Personalized study plan to achieve ${requestData.targetScore} AFQT score through focused preparation`,
      totalWeeks,
      weeklyPlans,
      progressMarkers,
      contingencyPlans,
    };
  }

  // Helper methods for question generation
  private getQuestionTemplates(category: QuestionCategory) {
    const templates = {
      [QuestionCategory.ARITHMETIC_REASONING]: [
        {
          type: 'word_problem',
          difficulty: 'MEDIUM',
          template: 'A soldier needs to distribute {quantity} {items} equally among {groups} groups. How many {items} will each group receive?',
          variables: {
            quantity: [24, 36, 48, 60, 72],
            items: ['ammunition rounds', 'MREs', 'water bottles', 'equipment pieces'],
            groups: [3, 4, 6, 8, 12],
          },
          solution: 'quantity / groups',
        },
        // More templates would be added here
      ],
      [QuestionCategory.MATHEMATICS_KNOWLEDGE]: [
        {
          type: 'algebra',
          difficulty: 'EASY',
          template: 'If x + {constant} = {result}, what is the value of x?',
          variables: {
            constant: [5, 7, 12, 15, 23],
            result: [20, 25, 30, 35, 45],
          },
          solution: 'result - constant',
        },
        // More templates would be added here
      ],
      // Other categories would have their templates
    };

    return templates[category] || [];
  }

  private selectOptimalTemplate(templates: any[], requestData: any, userPerformance?: any) {
    if (templates.length === 0) {
      return this.getDefaultTemplate(requestData.category);
    }

    // Filter templates by difficulty
    let filteredTemplates = templates.filter(t => t.difficulty === requestData.difficulty);
    
    if (filteredTemplates.length === 0) {
      filteredTemplates = templates;
    }

    // Select template based on user performance patterns
    if (userPerformance && userPerformance.recentTrend === 'DECLINING') {
      // Choose easier templates
      return filteredTemplates[0];
    }

    // Random selection from appropriate templates
    return filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
  }

  private populateQuestionTemplate(template: any, requestData: any, branch?: MilitaryBranch) {
    if (!template.variables) {
      return this.createFallbackQuestion(requestData.category, requestData.difficulty);
    }

    // Populate template variables
    let questionText = template.template;
    const selectedValues: Record<string, any> = {};

    Object.entries(template.variables).forEach(([key, values]: [string, any]) => {
      const selectedValue = Array.isArray(values) ? 
        values[Math.floor(Math.random() * values.length)] : 
        values;
      selectedValues[key] = selectedValue;
      questionText = questionText.replace(`{${key}}`, selectedValue);
    });

    // Generate options and correct answer
    const correctAnswer = this.calculateCorrectAnswer(template.solution, selectedValues);
    const options = this.generateDistractorOptions(correctAnswer, requestData.difficulty);

    return {
      question: questionText,
      options,
      correctAnswer: 0, // Assuming correct answer is always first, then shuffled
      explanation: this.generateTemplateExplanation(template, selectedValues, correctAnswer),
      militaryContext: this.generateMilitaryContext(template, branch),
      tags: [template.type, requestData.category.toLowerCase()],
      estimatedTime: this.estimateTimeForTemplate(template, requestData.difficulty),
    };
  }

  // Additional helper methods would be implemented here...
  private calculateTrend(quizzes: any[]): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    if (quizzes.length < 4) return 'STABLE';

    const recent = quizzes.slice(0, Math.floor(quizzes.length / 2));
    const older = quizzes.slice(Math.floor(quizzes.length / 2));

    const recentAccuracy = this.calculateQuizAccuracy(recent);
    const olderAccuracy = this.calculateQuizAccuracy(older);

    const improvement = recentAccuracy - olderAccuracy;

    if (improvement > 0.1) return 'IMPROVING';
    if (improvement < -0.1) return 'DECLINING';
    return 'STABLE';
  }

  private calculateQuizAccuracy(quizzes: any[]): number {
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const correctAnswers = quizzes.reduce(
      (sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );
    return totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  }

  private getDefaultTemplate(category: QuestionCategory) {
    // Fallback template for when no specific templates are found
    return {
      type: 'basic',
      difficulty: 'MEDIUM',
      template: 'This is a sample question for {category}',
      variables: { category: [category.toLowerCase()] },
      solution: '1',
    };
  }

  private createFallbackQuestion(category: QuestionCategory, difficulty: string) {
    return {
      question: `Sample ${difficulty.toLowerCase()} question for ${category.replace(/_/g, ' ').toLowerCase()}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a sample explanation.',
      militaryContext: 'This concept is important for military applications.',
      tags: [difficulty.toLowerCase(), category.toLowerCase()],
      estimatedTime: 90,
    };
  }

  private calculateCorrectAnswer(solution: string, variables: Record<string, any>): any {
    try {
      // Simple expression evaluation - in production, use a proper expression parser
      let expression = solution;
      Object.entries(variables).forEach(([key, value]) => {
        expression = expression.replace(new RegExp(key, 'g'), value.toString());
      });

      // Basic arithmetic evaluation
      if (expression.includes('/')) {
        const [numerator, denominator] = expression.split('/').map(Number);
        return Math.floor(numerator / denominator);
      }
      if (expression.includes('*')) {
        const [a, b] = expression.split('*').map(Number);
        return a * b;
      }
      if (expression.includes('+')) {
        const [a, b] = expression.split('+').map(Number);
        return a + b;
      }
      if (expression.includes('-')) {
        const [a, b] = expression.split('-').map(Number);
        return a - b;
      }

      return Number(expression);
    } catch {
      return 42; // Fallback answer
    }
  }

  private generateDistractorOptions(correctAnswer: any, difficulty: string): string[] {
    const options = [correctAnswer.toString()];

    // Generate plausible wrong answers
    const variations = [
      Math.floor(correctAnswer * 1.2),
      Math.floor(correctAnswer * 0.8),
      correctAnswer + Math.floor(Math.random() * 10) + 1,
      correctAnswer - Math.floor(Math.random() * 5) - 1,
    ].filter(v => v !== correctAnswer && v > 0);

    // Add the best variations
    variations.slice(0, 3).forEach(v => options.push(v.toString()));

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return options.slice(0, 4);
  }

  private calculateQuestionConfidence(template: any, userPerformance?: any): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on template quality
    if (template.type === 'word_problem') confidence += 0.1;
    if (template.variables && Object.keys(template.variables).length > 2) confidence += 0.1;

    // Adjust based on user performance match
    if (userPerformance) {
      if (userPerformance.totalQuestions > 20) confidence += 0.1;
      if (userPerformance.recentTrend === 'IMPROVING') confidence += 0.05;
    }

    return Math.min(1, confidence);
  }

  private async saveGeneratedQuestion(question: Omit<GeneratedQuestion, 'id'>, userId: string) {
    return this.prisma.generatedQuestion.create({
      data: {
        content: question.content,
        options: question.options,
        correctAnswer: question.correctAnswer,
        difficulty: question.difficulty,
        category: question.category,
        explanation: question.explanation,
        militaryContext: question.militaryContext,
        tags: question.tags,
        estimatedTimeToSolve: question.estimatedTimeToSolve,
        confidenceScore: question.confidenceScore,
        generatedBy: userId,
        createdAt: new Date(),
      },
    });
  }

  // Placeholder implementations for remaining methods
  private determineExplanationStyle(userPerformance?: any): string {
    if (!userPerformance) return 'standard';
    
    if (userPerformance.accuracy < 0.5) return 'detailed';
    if (userPerformance.accuracy > 0.8) return 'concise';
    return 'standard';
  }

  private generateBaseExplanation(question: any, style: string) {
    return {
      explanation: `Detailed explanation for: ${question.content}`,
      steps: ['Step 1: Analyze the problem', 'Step 2: Apply the formula', 'Step 3: Calculate the result'],
      concepts: ['Key concept 1', 'Key concept 2'],
      mistakes: ['Common mistake 1', 'Common mistake 2'],
      tips: ['Study tip 1', 'Study tip 2'],
      relatedTopics: ['Related topic 1', 'Related topic 2'],
    };
  }

  private addPersonalizedElements(baseExplanation: any, userAnswer?: string, branch?: MilitaryBranch, userPerformance?: any) {
    const militaryApplication = branch ? 
      `This concept is essential for ${branch.toLowerCase().replace('_', ' ')} personnel in field operations.` :
      undefined;

    return {
      ...baseExplanation,
      militaryApplication,
    };
  }

  private generateStrategyTips(question: any, userPerformance?: any): string[] {
    return [
      'Read the question twice before solving',
      'Eliminate obviously wrong answers first',
      'Check your work if time permits',
    ];
  }

  private calculateExplanationDifficulty(question: any, userPerformance?: any): number {
    let difficulty = 5; // Base difficulty

    if (question.difficulty === 'HARD') difficulty += 2;
    if (question.difficulty === 'EASY') difficulty -= 2;

    if (userPerformance?.accuracy < 0.5) difficulty += 1;

    return Math.max(1, Math.min(10, difficulty));
  }

  private comprehensivePerformanceAnalysis(quizzes: any[]) {
    return {
      overallAccuracy: this.calculateQuizAccuracy(quizzes),
      categoryBreakdown: {},
      timeManagement: 'good',
      consistencyScore: 0.8,
    };
  }

  private calculatePerformanceGap(analysis: any, targetScore: number) {
    const currentEquivalentScore = Math.round(analysis.overallAccuracy * 100);
    return {
      overallGap: targetScore - currentEquivalentScore,
      categoryGaps: {},
      priorityAreas: [],
    };
  }

  private prioritizeCategories(performanceGap: any, focusAreas?: QuestionCategory[]) {
    return focusAreas || Object.values(QuestionCategory).slice(0, 4);
  }

  private generateWeeklyPlan(week: number, totalWeeks: number, categories: QuestionCategory[], studyHours: number, performance?: any, branch?: MilitaryBranch) {
    const focusCategory = categories[(week - 1) % categories.length];
    
    return {
      week,
      focus: focusCategory,
      goals: [`Master ${focusCategory.toLowerCase().replace('_', ' ')} fundamentals`],
      studyHours,
      activities: [
        {
          type: 'QUIZ' as const,
          description: `Practice ${focusCategory.toLowerCase().replace('_', ' ')} questions`,
          duration: 120,
          priority: 'HIGH' as const,
        },
      ],
      milestones: [`Complete 50 ${focusCategory.toLowerCase().replace('_', ' ')} questions`],
    };
  }

  private generateProgressMarkers(totalWeeks: number, targetScore: number) {
    return [
      {
        week: Math.floor(totalWeeks / 4),
        metric: 'Overall Accuracy',
        target: 70,
        description: 'Achieve 70% accuracy across all categories',
      },
      {
        week: Math.floor(totalWeeks / 2),
        metric: 'AFQT Prediction',
        target: Math.floor(targetScore * 0.8),
        description: `Reach ${Math.floor(targetScore * 0.8)} predicted AFQT score`,
      },
    ];
  }

  private generateContingencyPlans(performanceGap: any) {
    return [
      {
        scenario: 'Falling behind schedule',
        adjustments: ['Increase study time by 2 hours per week', 'Focus on highest-impact categories'],
      },
      {
        scenario: 'Plateau in performance',
        adjustments: ['Change study methods', 'Add group study sessions'],
      },
    ];
  }

  private generateTemplateExplanation(template: any, values: Record<string, any>, answer: any): string {
    return `To solve this problem, we need to ${template.type === 'word_problem' ? 'break down the word problem' : 'apply the mathematical concept'}. The answer is ${answer}.`;
  }

  private generateMilitaryContext(template: any, branch?: MilitaryBranch): string | undefined {
    if (!branch) return undefined;
    
    return `This type of calculation is commonly used by ${branch.toLowerCase().replace('_', ' ')} personnel for logistics and planning.`;
  }

  private estimateTimeForTemplate(template: any, difficulty: string): number {
    const baseTimes = { EASY: 60, MEDIUM: 90, HARD: 120 };
    return baseTimes[difficulty as keyof typeof baseTimes] || 90;
  }
}