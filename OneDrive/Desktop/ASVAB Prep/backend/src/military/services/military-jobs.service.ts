import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, QuestionCategory, SubscriptionTier } from '@asvab-prep/shared';
import { SubscriptionService } from '../../subscriptions/subscriptions.service';

export interface AFQTScore {
  wordKnowledge: number;
  paragraphComprehension: number;
  arithmeticReasoning: number;
  mathematicsKnowledge: number;
  composite: number;
  percentile: number;
}

export interface LineScores {
  GT?: number;  // General Technical
  CL?: number;  // Clerical
  CO?: number;  // Combat
  EL?: number;  // Electronics
  FA?: number;  // Field Artillery
  GM?: number;  // General Maintenance
  MM?: number;  // Mechanical Maintenance
  OF?: number;  // Operators and Food
  SC?: number;  // Surveillance and Communications
  ST?: number;  // Skilled Technical
  // Navy specific
  AR?: number;  // Arithmetic Reasoning
  MK?: number;  // Mathematics Knowledge
  EI?: number;  // Electronics Information
  GS?: number;  // General Science
  // Air Force specific
  A?: number;   // Administrative
  G?: number;   // General
  M?: number;   // Mechanical
  E?: number;   // Electrical
}

export interface JobMatchResult {
  job: any;
  matchScore: number;
  qualifications: {
    afqtQualified: boolean;
    afqtRequired: number;
    afqtCurrent: number;
    lineScoresQualified: boolean;
    lineScoresStatus: Array<{
      score: string;
      required: number;
      current: number;
      qualified: boolean;
    }>;
    physicalQualified: boolean;
    clearanceRequired: string | null;
  };
  recommendations: string[];
}

@Injectable()
export class MilitaryJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Calculate AFQT score from individual test scores
   */
  calculateAFQTScore(scores: {
    wordKnowledge: number;
    paragraphComprehension: number;
    arithmeticReasoning: number;
    mathematicsKnowledge: number;
  }): AFQTScore {
    // ASVAB uses scaled scores, but for simulation we'll use percentage-based calculation
    const verbalExpression = (scores.wordKnowledge + scores.paragraphComprehension) * 2;
    const mathematicsKnowledge = scores.mathematicsKnowledge * 2;
    const arithmeticReasoning = scores.arithmeticReasoning * 2;
    
    const rawAFQT = verbalExpression + mathematicsKnowledge + arithmeticReasoning;
    const composite = Math.round(rawAFQT / 8); // Scaled to 100
    
    // Convert to percentile using approximate ASVAB percentile table
    let percentile = 0;
    if (composite >= 93) percentile = 99;
    else if (composite >= 85) percentile = 93;
    else if (composite >= 80) percentile = 85;
    else if (composite >= 75) percentile = 77;
    else if (composite >= 70) percentile = 65;
    else if (composite >= 65) percentile = 50;
    else if (composite >= 60) percentile = 35;
    else if (composite >= 55) percentile = 23;
    else if (composite >= 50) percentile = 15;
    else if (composite >= 45) percentile = 10;
    else if (composite >= 40) percentile = 7;
    else if (composite >= 35) percentile = 4;
    else if (composite >= 31) percentile = 2;
    else percentile = 1;

    return {
      wordKnowledge: scores.wordKnowledge,
      paragraphComprehension: scores.paragraphComprehension,
      arithmeticReasoning: scores.arithmeticReasoning,
      mathematicsKnowledge: scores.mathematicsKnowledge,
      composite,
      percentile,
    };
  }

  /**
   * Calculate line scores based on individual ASVAB subtest scores
   */
  calculateLineScores(scores: Record<QuestionCategory, number>, branch: MilitaryBranch): LineScores {
    const lineScores: LineScores = {};

    // Common line scores calculations
    const VE = (scores.WORD_KNOWLEDGE + scores.PARAGRAPH_COMPREHENSION) * 2;
    const AR = scores.ARITHMETIC_REASONING;
    const MK = scores.MATHEMATICS_KNOWLEDGE;
    const GS = scores.GENERAL_SCIENCE;
    const EI = scores.ELECTRONICS_INFORMATION;
    const AS = scores.AUTO_SHOP;
    const MC = scores.MECHANICAL_COMPREHENSION;
    const AO = scores.ASSEMBLING_OBJECTS;

    switch (branch) {
      case MilitaryBranch.ARMY:
        lineScores.GT = VE + AR; // General Technical
        lineScores.CL = VE + AR + MK; // Clerical
        lineScores.CO = VE + AS + MC; // Combat
        lineScores.EL = GS + AR + MK + EI; // Electronics
        lineScores.FA = AR + MK + EI + GS; // Field Artillery
        lineScores.GM = GS + AS + MK + EI; // General Maintenance
        lineScores.MM = AO + AS + MC + EI; // Mechanical Maintenance
        lineScores.OF = VE + AO + AS + MC; // Operators and Food
        lineScores.SC = VE + AR + AS + MC; // Surveillance Communications
        lineScores.ST = GS + VE + MK + MC; // Skilled Technical
        break;

      case MilitaryBranch.NAVY:
      case MilitaryBranch.COAST_GUARD:
        lineScores.GT = VE + AR;
        lineScores.AR = AR;
        lineScores.MK = MK;
        lineScores.EI = EI;
        lineScores.GS = GS;
        break;

      case MilitaryBranch.AIR_FORCE:
      case MilitaryBranch.SPACE_FORCE:
        lineScores.A = VE; // Administrative
        lineScores.G = VE + AR; // General
        lineScores.M = MK + EI + AS; // Mechanical
        lineScores.E = AR + MK + EI + GS; // Electrical
        break;

      case MilitaryBranch.MARINES:
        lineScores.GT = VE + AR;
        lineScores.CL = VE + AR + MK;
        lineScores.EL = GS + AR + MK + EI;
        lineScores.MM = AO + AS + MC + EI;
        break;
    }

    return lineScores;
  }

  /**
   * Find all military jobs for a specific branch
   */
  async getJobsByBranch(
    branch: MilitaryBranch,
    limit = 50,
    offset = 0,
    searchTerm?: string
  ) {
    const whereClause: any = {
      branch,
      isActive: true,
    };

    if (searchTerm) {
      whereClause.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { mosCode: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const jobs = await this.prisma.militaryJob.findMany({
      where: whereClause,
      orderBy: [
        { minAFQTScore: 'asc' },
        { title: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.militaryJob.count({
      where: whereClause,
    });

    return {
      jobs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get detailed job information by ID
   */
  async getJobById(jobId: string) {
    const job = await this.prisma.militaryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Military job not found');
    }

    return job;
  }

  /**
   * Find matching jobs based on user's AFQT and line scores
   */
  async findMatchingJobs(
    userId: string,
    afqtScore: AFQTScore,
    lineScores: LineScores,
    branch: MilitaryBranch,
    options: {
      limit?: number;
      includePartialMatches?: boolean;
      sortBy?: 'match' | 'afqt' | 'title';
    } = {}
  ): Promise<JobMatchResult[]> {
    const subscription = await this.subscriptionService.getUserSubscription(userId);
    const limit = subscription.tier === SubscriptionTier.PREMIUM ? (options.limit || 100) : 10;

    const jobs = await this.prisma.militaryJob.findMany({
      where: {
        branch,
        isActive: true,
      },
      orderBy: { minAFQTScore: 'asc' },
    });

    const matchResults: JobMatchResult[] = [];

    for (const job of jobs) {
      const matchResult = this.calculateJobMatch(job, afqtScore, lineScores);
      
      // Include job if fully qualified or if partial matches are requested
      if (matchResult.qualifications.afqtQualified || options.includePartialMatches) {
        matchResults.push(matchResult);
      }
    }

    // Sort results
    switch (options.sortBy) {
      case 'match':
        matchResults.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'afqt':
        matchResults.sort((a, b) => a.job.minAFQTScore - b.job.minAFQTScore);
        break;
      case 'title':
        matchResults.sort((a, b) => a.job.title.localeCompare(b.job.title));
        break;
      default:
        matchResults.sort((a, b) => b.matchScore - a.matchScore);
    }

    return matchResults.slice(0, limit);
  }

  /**
   * Calculate match score for a specific job
   */
  private calculateJobMatch(job: any, afqtScore: AFQTScore, lineScores: LineScores): JobMatchResult {
    let matchScore = 0;
    const recommendations: string[] = [];

    // Check AFQT qualification
    const afqtQualified = afqtScore.composite >= job.minAFQTScore;
    if (afqtQualified) {
      matchScore += 40;
    } else {
      const afqtGap = job.minAFQTScore - afqtScore.composite;
      recommendations.push(`Improve AFQT score by ${afqtGap} points`);
    }

    // Check line score requirements
    const requiredLineScores = job.requiredLineScores as Record<string, number>;
    const lineScoreResults: Array<{
      score: string;
      required: number;
      current: number;
      qualified: boolean;
    }> = [];

    let lineScoresQualified = true;
    let qualifiedLineScores = 0;
    const totalLineScores = Object.keys(requiredLineScores).length;

    for (const [scoreType, requiredValue] of Object.entries(requiredLineScores)) {
      const currentValue = lineScores[scoreType as keyof LineScores] || 0;
      const qualified = currentValue >= requiredValue;
      
      lineScoreResults.push({
        score: scoreType,
        required: requiredValue,
        current: currentValue,
        qualified,
      });

      if (qualified) {
        qualifiedLineScores++;
        matchScore += 40 / totalLineScores; // Distribute 40 points among line scores
      } else {
        lineScoresQualified = false;
        const gap = requiredValue - currentValue;
        recommendations.push(`Improve ${scoreType} score by ${gap} points`);
      }
    }

    // Bonus points for exceeding requirements
    if (afqtScore.composite > job.minAFQTScore) {
      const bonus = Math.min(20, (afqtScore.composite - job.minAFQTScore) * 2);
      matchScore += bonus;
    }

    // Physical requirements check (simplified)
    const physicalQualified = job.physicalRequirements.length === 0; // Assume qualified if no specific requirements

    return {
      job,
      matchScore: Math.round(matchScore),
      qualifications: {
        afqtQualified,
        afqtRequired: job.minAFQTScore,
        afqtCurrent: afqtScore.composite,
        lineScoresQualified,
        lineScoresStatus: lineScoreResults,
        physicalQualified,
        clearanceRequired: job.clearanceRequired,
      },
      recommendations,
    };
  }

  /**
   * Get job recommendations based on user's interests and aptitude
   */
  async getPersonalizedRecommendations(
    userId: string,
    branch: MilitaryBranch,
    userProgress: Record<QuestionCategory, number>,
    interests?: string[]
  ) {
    const afqtScore = this.calculateAFQTScore({
      wordKnowledge: userProgress.WORD_KNOWLEDGE || 0,
      paragraphComprehension: userProgress.PARAGRAPH_COMPREHENSION || 0,
      arithmeticReasoning: userProgress.ARITHMETIC_REASONING || 0,
      mathematicsKnowledge: userProgress.MATHEMATICS_KNOWLEDGE || 0,
    });

    const lineScores = this.calculateLineScores(userProgress, branch);
    
    const matchingJobs = await this.findMatchingJobs(
      userId,
      afqtScore,
      lineScores,
      branch,
      { 
        limit: 20,
        includePartialMatches: true,
        sortBy: 'match'
      }
    );

    // Filter by interests if provided
    let recommendedJobs = matchingJobs;
    if (interests && interests.length > 0) {
      recommendedJobs = matchingJobs.filter(match => {
        const jobDescription = match.job.description.toLowerCase();
        return interests.some(interest => 
          jobDescription.includes(interest.toLowerCase())
        );
      });
    }

    // Categorize jobs
    const fullyQualified = recommendedJobs.filter(job => 
      job.qualifications.afqtQualified && job.qualifications.lineScoresQualified
    );
    
    const partiallyQualified = recommendedJobs.filter(job => 
      job.qualifications.afqtQualified && !job.qualifications.lineScoresQualified
    );

    const needsImprovement = recommendedJobs.filter(job => 
      !job.qualifications.afqtQualified
    );

    return {
      afqtScore,
      lineScores,
      recommendations: {
        fullyQualified: fullyQualified.slice(0, 10),
        partiallyQualified: partiallyQualified.slice(0, 5),
        needsImprovement: needsImprovement.slice(0, 5),
      },
      studyPlan: this.generateStudyPlan(userProgress, needsImprovement.slice(0, 3)),
    };
  }

  /**
   * Generate personalized study plan based on job goals
   */
  private generateStudyPlan(
    currentProgress: Record<QuestionCategory, number>,
    targetJobs: JobMatchResult[]
  ) {
    const studyPlan = {
      priority: [] as string[],
      goals: [] as Array<{ category: string; currentScore: number; targetScore: number; improvement: number }>,
      timeframe: 'medium', // short, medium, long
    };

    if (targetJobs.length === 0) return studyPlan;

    // Analyze what needs improvement most
    const improvements: Record<string, number> = {};
    
    for (const jobMatch of targetJobs) {
      for (const rec of jobMatch.recommendations) {
        if (rec.includes('AFQT')) {
          improvements['AFQT'] = (improvements['AFQT'] || 0) + 1;
        }
        if (rec.includes('GT')) {
          improvements['Word Knowledge'] = (improvements['Word Knowledge'] || 0) + 1;
          improvements['Arithmetic Reasoning'] = (improvements['Arithmetic Reasoning'] || 0) + 1;
        }
        // Add more line score mappings as needed
      }
    }

    // Sort by priority
    studyPlan.priority = Object.entries(improvements)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return studyPlan;
  }

  /**
   * Save job to user's favorites
   */
  async addJobToFavorites(userId: string, jobId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const job = await this.prisma.militaryJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // For now, we'll store favorites in user profile preferences
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        preferences: {
          ...((await this.prisma.userProfile.findUnique({ 
            where: { userId }, 
            select: { preferences: true } 
          }))?.preferences as any || {}),
          favoriteJobs: [
            ...(((await this.prisma.userProfile.findUnique({ 
              where: { userId }, 
              select: { preferences: true } 
            }))?.preferences as any)?.favoriteJobs || []),
            jobId
          ].filter((id, index, arr) => arr.indexOf(id) === index), // Remove duplicates
        },
      },
      create: {
        userId,
        preferences: {
          favoriteJobs: [jobId],
        },
      },
    });

    return { success: true, message: 'Job added to favorites' };
  }

  /**
   * Get user's favorite jobs
   */
  async getUserFavoriteJobs(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { preferences: true },
    });

    const favoriteJobIds = (profile?.preferences as any)?.favoriteJobs || [];
    
    if (favoriteJobIds.length === 0) {
      return [];
    }

    const favoriteJobs = await this.prisma.militaryJob.findMany({
      where: {
        id: { in: favoriteJobIds },
        isActive: true,
      },
    });

    return favoriteJobs;
  }
}