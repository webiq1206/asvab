import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, Gender, Prisma } from '@prisma/client';

export interface FitnessStandard {
  id: string;
  branch: MilitaryBranch;
  gender: Gender;
  ageMin: number;
  ageMax: number;
  runTimeMax: number; // seconds
  pushupsMin: number;
  situpsMin: number;
  planksMin?: number; // seconds
  bodyFatMax?: number; // percentage
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessScoreResult {
  exercise: string;
  userValue: number;
  requiredValue: number;
  maxPoints: number;
  earnedPoints: number;
  passed: boolean;
  grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE';
}

export interface PTTestResult {
  branch: MilitaryBranch;
  gender: Gender;
  age: number;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  overallGrade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE';
  exerciseResults: FitnessScoreResult[];
  recommendations: string[];
}

@Injectable()
export class FitnessStandardsService {
  constructor(private prisma: PrismaService) {}

  async getFitnessStandards(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
  ): Promise<FitnessStandard> {
    const standard = await this.prisma.physicalStandard.findFirst({
      where: {
        branch,
        gender,
        ageMin: { lte: age },
        ageMax: { gte: age },
      },
    });

    if (!standard) {
      throw new NotFoundException(
        `No fitness standards found for ${branch} ${gender} age ${age}`,
      );
    }

    return standard;
  }

  async getAllStandardsForBranch(branch: MilitaryBranch): Promise<FitnessStandard[]> {
    return this.prisma.physicalStandard.findMany({
      where: { branch },
      orderBy: [
        { gender: 'asc' },
        { ageMin: 'asc' },
      ],
    });
  }

  async calculatePTTestScore(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
    scores: {
      runTimeSeconds: number;
      pushups: number;
      situps: number;
      planksSeconds?: number;
    },
  ): Promise<PTTestResult> {
    const standards = await this.getFitnessStandards(branch, gender, age);
    const exerciseResults: FitnessScoreResult[] = [];
    let totalPoints = 0;
    let maxPoints = 0;

    // Calculate run score
    const runResult = this.calculateRunScore(branch, gender, age, scores.runTimeSeconds, standards.runTimeMax);
    exerciseResults.push(runResult);
    totalPoints += runResult.earnedPoints;
    maxPoints += runResult.maxPoints;

    // Calculate pushups score
    const pushupResult = this.calculatePushupScore(branch, gender, age, scores.pushups, standards.pushupsMin);
    exerciseResults.push(pushupResult);
    totalPoints += pushupResult.earnedPoints;
    maxPoints += pushupResult.maxPoints;

    // Calculate situps score (or planks for Army/Space Force)
    if (branch === MilitaryBranch.ARMY || branch === MilitaryBranch.SPACE_FORCE) {
      if (scores.planksSeconds && standards.planksMin) {
        const plankResult = this.calculatePlankScore(branch, gender, age, scores.planksSeconds, standards.planksMin);
        exerciseResults.push(plankResult);
        totalPoints += plankResult.earnedPoints;
        maxPoints += plankResult.maxPoints;
      }
    } else {
      const situpResult = this.calculateSitupScore(branch, gender, age, scores.situps, standards.situpsMin);
      exerciseResults.push(situpResult);
      totalPoints += situpResult.earnedPoints;
      maxPoints += situpResult.maxPoints;
    }

    const percentage = (totalPoints / maxPoints) * 100;
    const passed = this.isPTTestPassed(branch, totalPoints, maxPoints, exerciseResults);
    const overallGrade = this.getOverallGrade(percentage, passed);
    const recommendations = this.generateRecommendations(exerciseResults, branch);

    return {
      branch,
      gender,
      age,
      totalPoints,
      maxPoints,
      percentage,
      passed,
      overallGrade,
      exerciseResults,
      recommendations,
    };
  }

  private calculateRunScore(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
    userTimeSeconds: number,
    maxTimeSeconds: number,
  ): FitnessScoreResult {
    const exercise = this.getRunDistance(branch);
    const passed = userTimeSeconds <= maxTimeSeconds;
    const maxPoints = 100;

    let earnedPoints = 0;
    let grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE' = 'FAILURE';

    if (passed) {
      // Calculate points based on how much faster than max time
      const timeDifference = maxTimeSeconds - userTimeSeconds;
      const percentageFaster = timeDifference / maxTimeSeconds;
      
      earnedPoints = Math.min(100, 60 + (percentageFaster * 40));
      
      if (earnedPoints >= 90) grade = 'EXCELLENT';
      else if (earnedPoints >= 80) grade = 'GOOD';
      else if (earnedPoints >= 70) grade = 'SATISFACTORY';
      else grade = 'MARGINAL';
    }

    return {
      exercise,
      userValue: userTimeSeconds,
      requiredValue: maxTimeSeconds,
      maxPoints,
      earnedPoints: Math.round(earnedPoints),
      passed,
      grade,
    };
  }

  private calculatePushupScore(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
    userPushups: number,
    minPushups: number,
  ): FitnessScoreResult {
    const exercise = 'Push-ups';
    const passed = userPushups >= minPushups;
    const maxPoints = 100;

    let earnedPoints = 0;
    let grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE' = 'FAILURE';

    if (passed) {
      // Calculate points based on how many more than minimum
      const extraPushups = userPushups - minPushups;
      const bonusPoints = Math.min(40, extraPushups * 2);
      earnedPoints = 60 + bonusPoints;
      
      if (earnedPoints >= 90) grade = 'EXCELLENT';
      else if (earnedPoints >= 80) grade = 'GOOD';
      else if (earnedPoints >= 70) grade = 'SATISFACTORY';
      else grade = 'MARGINAL';
    }

    return {
      exercise,
      userValue: userPushups,
      requiredValue: minPushups,
      maxPoints,
      earnedPoints: Math.round(earnedPoints),
      passed,
      grade,
    };
  }

  private calculateSitupScore(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
    userSitups: number,
    minSitups: number,
  ): FitnessScoreResult {
    const exercise = 'Sit-ups';
    const passed = userSitups >= minSitups;
    const maxPoints = 100;

    let earnedPoints = 0;
    let grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE' = 'FAILURE';

    if (passed) {
      const extraSitups = userSitups - minSitups;
      const bonusPoints = Math.min(40, extraSitups * 2);
      earnedPoints = 60 + bonusPoints;
      
      if (earnedPoints >= 90) grade = 'EXCELLENT';
      else if (earnedPoints >= 80) grade = 'GOOD';
      else if (earnedPoints >= 70) grade = 'SATISFACTORY';
      else grade = 'MARGINAL';
    }

    return {
      exercise,
      userValue: userSitups,
      requiredValue: minSitups,
      maxPoints,
      earnedPoints: Math.round(earnedPoints),
      passed,
      grade,
    };
  }

  private calculatePlankScore(
    branch: MilitaryBranch,
    gender: Gender,
    age: number,
    userPlankSeconds: number,
    minPlankSeconds: number,
  ): FitnessScoreResult {
    const exercise = 'Plank';
    const passed = userPlankSeconds >= minPlankSeconds;
    const maxPoints = 100;

    let earnedPoints = 0;
    let grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE' = 'FAILURE';

    if (passed) {
      const extraSeconds = userPlankSeconds - minPlankSeconds;
      const bonusPoints = Math.min(40, extraSeconds / 5); // 1 point per 5 seconds
      earnedPoints = 60 + bonusPoints;
      
      if (earnedPoints >= 90) grade = 'EXCELLENT';
      else if (earnedPoints >= 80) grade = 'GOOD';
      else if (earnedPoints >= 70) grade = 'SATISFACTORY';
      else grade = 'MARGINAL';
    }

    return {
      exercise,
      userValue: userPlankSeconds,
      requiredValue: minPlankSeconds,
      maxPoints,
      earnedPoints: Math.round(earnedPoints),
      passed,
      grade,
    };
  }

  private isPTTestPassed(
    branch: MilitaryBranch,
    totalPoints: number,
    maxPoints: number,
    exerciseResults: FitnessScoreResult[],
  ): boolean {
    const percentage = (totalPoints / maxPoints) * 100;
    const allExercisesPassed = exerciseResults.every(result => result.passed);
    
    // Branch-specific passing requirements
    const passingPercentages = {
      [MilitaryBranch.ARMY]: 60,
      [MilitaryBranch.NAVY]: 60,
      [MilitaryBranch.AIR_FORCE]: 75,
      [MilitaryBranch.MARINES]: 70,
      [MilitaryBranch.COAST_GUARD]: 60,
      [MilitaryBranch.SPACE_FORCE]: 75,
    };

    return percentage >= passingPercentages[branch] && allExercisesPassed;
  }

  private getOverallGrade(percentage: number, passed: boolean): 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE' {
    if (!passed) return 'FAILURE';
    
    if (percentage >= 90) return 'EXCELLENT';
    if (percentage >= 80) return 'GOOD';
    if (percentage >= 70) return 'SATISFACTORY';
    return 'MARGINAL';
  }

  private getRunDistance(branch: MilitaryBranch): string {
    const distances = {
      [MilitaryBranch.ARMY]: '2-Mile Run',
      [MilitaryBranch.NAVY]: '1.5-Mile Run',
      [MilitaryBranch.AIR_FORCE]: '1.5-Mile Run',
      [MilitaryBranch.MARINES]: '3-Mile Run',
      [MilitaryBranch.COAST_GUARD]: '1.5-Mile Run',
      [MilitaryBranch.SPACE_FORCE]: '1.5-Mile Run',
    };
    return distances[branch];
  }

  private generateRecommendations(
    exerciseResults: FitnessScoreResult[],
    branch: MilitaryBranch,
  ): string[] {
    const recommendations: string[] = [];

    exerciseResults.forEach(result => {
      if (result.grade === 'FAILURE') {
        recommendations.push(`CRITICAL: Improve your ${result.exercise} - you need ${result.requiredValue - result.userValue} more to pass minimum standards.`);
      } else if (result.grade === 'MARGINAL') {
        recommendations.push(`Focus on ${result.exercise} improvement - aim for ${Math.ceil(result.requiredValue * 1.2)} to reach Good level.`);
      } else if (result.grade === 'SATISFACTORY') {
        recommendations.push(`Good work on ${result.exercise}! Push for ${Math.ceil(result.requiredValue * 1.4)} to reach Excellent.`);
      }
    });

    // Add branch-specific recommendations
    if (branch === MilitaryBranch.MARINES) {
      recommendations.push('Marine Corps standards are high - maintain consistency in training.');
    } else if (branch === MilitaryBranch.AIR_FORCE || branch === MilitaryBranch.SPACE_FORCE) {
      recommendations.push('Consider cross-training options available in your branch fitness programs.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Outstanding performance! Maintain your fitness level and consider mentoring others.');
    }

    return recommendations;
  }

  // Height/Weight standards
  async getHeightWeightStandards(
    branch: MilitaryBranch,
    gender: Gender,
    heightInches: number,
  ): Promise<{
    minWeight: number;
    maxWeight: number;
    maxBodyFat?: number;
  }> {
    // This would typically come from a separate table, but for now we'll use calculations
    const standards = this.calculateHeightWeightStandards(branch, gender, heightInches);
    return standards;
  }

  private calculateHeightWeightStandards(
    branch: MilitaryBranch,
    gender: Gender,
    heightInches: number,
  ): {
    minWeight: number;
    maxWeight: number;
    maxBodyFat?: number;
  } {
    // Simplified calculation - in reality this would be a lookup table
    const bmi22 = (heightInches * heightInches * 22) / 703; // Lower bound
    const bmi27 = (heightInches * heightInches * 27) / 703; // Upper bound

    const bodyFatLimits = {
      [MilitaryBranch.ARMY]: gender === Gender.MALE ? 26 : 36,
      [MilitaryBranch.NAVY]: gender === Gender.MALE ? 22 : 33,
      [MilitaryBranch.AIR_FORCE]: gender === Gender.MALE ? 20 : 28,
      [MilitaryBranch.MARINES]: gender === Gender.MALE ? 18 : 26,
      [MilitaryBranch.COAST_GUARD]: gender === Gender.MALE ? 22 : 32,
      [MilitaryBranch.SPACE_FORCE]: gender === Gender.MALE ? 20 : 28,
    };

    return {
      minWeight: Math.round(bmi22),
      maxWeight: Math.round(bmi27),
      maxBodyFat: bodyFatLimits[branch],
    };
  }
}