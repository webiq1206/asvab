import { apiClient } from './api';
import {
  FitnessType,
  Gender,
  MilitaryBranch,
  FitnessEntry,
  FitnessGoal,
  FitnessStandard,
  FitnessProgress,
  FitnessAnalytics,
  PTTestResult,
  CreateFitnessEntryRequest,
  CreateFitnessGoalRequest,
  WorkoutSession,
  BodyCompositionStandards,
} from '@asvab-prep/shared';

class FitnessService {
  // Fitness Entries
  async createFitnessEntry(data: CreateFitnessEntryRequest): Promise<FitnessEntry> {
    const response = await apiClient.post('/fitness/entries', data);
    return response.data;
  }

  async getFitnessEntries(
    type?: FitnessType,
    limit = 50,
    offset = 0,
  ): Promise<{
    entries: FitnessEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (type) {
      params.append('type', type);
    }

    const response = await apiClient.get(`/fitness/entries?${params}`);
    return response.data;
  }

  // Progress and Analytics
  async getFitnessProgress(): Promise<FitnessProgress[]> {
    const response = await apiClient.get('/fitness/progress');
    return response.data;
  }

  async getFitnessAnalytics(): Promise<FitnessAnalytics> {
    const response = await apiClient.get('/fitness/analytics');
    return response.data;
  }

  // Goals
  async createFitnessGoal(data: CreateFitnessGoalRequest): Promise<FitnessGoal> {
    const response = await apiClient.post('/fitness/goals', data);
    return response.data;
  }

  async getFitnessGoals(activeOnly = true): Promise<FitnessGoal[]> {
    const params = new URLSearchParams({
      activeOnly: activeOnly.toString(),
    });

    const response = await apiClient.get(`/fitness/goals?${params}`);
    return response.data;
  }

  async updateGoalProgress(goalId: string): Promise<FitnessGoal> {
    const response = await apiClient.patch(`/fitness/goals/${goalId}`);
    return response.data;
  }

  // PT Test
  async simulatePTTest(scores: {
    runTimeSeconds: number;
    pushups: number;
    situps: number;
    planksSeconds?: number;
  }): Promise<PTTestResult> {
    const response = await apiClient.post('/fitness/pt-test/simulate', scores);
    return response.data;
  }

  async calculatePTTestScore(
    scores: {
      runTimeSeconds: number;
      pushups: number;
      situps: number;
      planksSeconds?: number;
    },
    age?: number,
    gender?: Gender,
  ): Promise<PTTestResult> {
    const response = await apiClient.post('/fitness/pt-test/calculate', {
      scores,
      age,
      gender,
    });
    return response.data;
  }

  // Standards
  async getFitnessStandards(age?: number, gender?: Gender): Promise<FitnessStandard> {
    const params = new URLSearchParams();
    if (age) params.append('age', age.toString());
    if (gender) params.append('gender', gender);

    const response = await apiClient.get(`/fitness/standards?${params}`);
    return response.data;
  }

  async getBranchStandards(branch: MilitaryBranch): Promise<FitnessStandard[]> {
    const response = await apiClient.get(`/fitness/standards/branch/${branch}`);
    return response.data;
  }

  async getBodyCompositionStandards(
    heightInches: number,
    gender?: Gender,
  ): Promise<BodyCompositionStandards> {
    const params = new URLSearchParams({
      heightInches: heightInches.toString(),
    });
    if (gender) params.append('gender', gender);

    const response = await apiClient.get(`/fitness/body-composition/standards?${params}`);
    return response.data;
  }

  // Workout Sessions
  async createWorkoutSession(sessionData: {
    name: string;
    date: string;
    duration: number;
    exercises: CreateFitnessEntryRequest[];
    notes?: string;
  }): Promise<WorkoutSession> {
    const response = await apiClient.post('/fitness/workout-sessions', sessionData);
    return response.data;
  }

  // Utility functions for display
  getFitnessTypeDisplayName(type: FitnessType): string {
    const displayNames = {
      [FitnessType.RUN]: 'Run',
      [FitnessType.PUSHUPS]: 'Push-ups',
      [FitnessType.SITUPS]: 'Sit-ups',
      [FitnessType.PLANK]: 'Plank',
    };
    return displayNames[type];
  }

  getFormattedValue(type: FitnessType, value: number): string {
    switch (type) {
      case FitnessType.RUN:
        return this.formatTime(value);
      case FitnessType.PLANK:
        return this.formatTime(value);
      case FitnessType.PUSHUPS:
      case FitnessType.SITUPS:
        return value.toString();
      default:
        return value.toString();
    }
  }

  getUnitLabel(type: FitnessType): string {
    switch (type) {
      case FitnessType.RUN:
      case FitnessType.PLANK:
        return 'time';
      case FitnessType.PUSHUPS:
      case FitnessType.SITUPS:
        return 'reps';
      default:
        return '';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  }

  getGradeColor(grade: string): string {
    const gradeColors = {
      EXCELLENT: '#2ED573',
      GOOD: '#7ED321',
      SATISFACTORY: '#FFA502',
      MARGINAL: '#FF7675',
      FAILURE: '#FF4757',
    };
    return gradeColors[grade as keyof typeof gradeColors] || '#95A5A6';
  }

  getTrendIcon(trend: string): string {
    const trendIcons = {
      IMPROVING: 'trending-up',
      DECLINING: 'trending-down',
      STABLE: 'remove',
    };
    return trendIcons[trend as keyof typeof trendIcons] || 'remove';
  }

  getTrendColor(trend: string): string {
    const trendColors = {
      IMPROVING: '#2ED573',
      DECLINING: '#FF4757',
      STABLE: '#74B9FF',
    };
    return trendColors[trend as keyof typeof trendColors] || '#95A5A6';
  }

  getRunDistanceByBranch(branch: MilitaryBranch): string {
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

  getFitnessTypeIcon(type: FitnessType): string {
    const icons = {
      [FitnessType.RUN]: 'footsteps',
      [FitnessType.PUSHUPS]: 'body',
      [FitnessType.SITUPS]: 'fitness',
      [FitnessType.PLANK]: 'timer',
    };
    return icons[type];
  }

  validateFitnessEntry(type: FitnessType, value: number): string | null {
    const validationRules = {
      [FitnessType.RUN]: { min: 180, max: 3600, message: 'Run time must be between 3-60 minutes' },
      [FitnessType.PUSHUPS]: { min: 0, max: 200, message: 'Push-ups must be between 0-200' },
      [FitnessType.SITUPS]: { min: 0, max: 200, message: 'Sit-ups must be between 0-200' },
      [FitnessType.PLANK]: { min: 0, max: 600, message: 'Plank time must be between 0-10 minutes' },
    };

    const rules = validationRules[type];
    if (value < rules.min || value > rules.max) {
      return rules.message;
    }
    return null;
  }

  getMotivationalMessage(grade: string, branch: MilitaryBranch): string {
    const messages = {
      EXCELLENT: [
        'Outstanding performance! Keep up the excellent work!',
        'You\'re setting the standard! Hooah!',
        'Exceptional fitness level! Lead by example!',
      ],
      GOOD: [
        'Solid performance! Push for excellence!',
        'Good work! Aim higher next time!',
        'Strong showing! Keep building on this!',
      ],
      SATISFACTORY: [
        'Meeting standards! Time to push harder!',
        'Good foundation! Let\'s build on this!',
        'Steady progress! Keep improving!',
      ],
      MARGINAL: [
        'Close to the mark! Focus your training!',
        'Almost there! Dedicate more effort!',
        'Room for improvement! Step up your game!',
      ],
      FAILURE: [
        'Mission not accomplished! Time for serious training!',
        'Need immediate improvement! Focus and train harder!',
        'Unsat performance! Commit to your fitness!',
      ],
    };

    const gradeMessages = messages[grade as keyof typeof messages] || messages.SATISFACTORY;
    return gradeMessages[Math.floor(Math.random() * gradeMessages.length)];
  }

  calculateBMI(weightPounds: number, heightInches: number): number {
    return (weightPounds * 703) / (heightInches * heightInches);
  }

  getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getProgressMessage(improvement: number): string {
    if (improvement > 10) return 'Significant improvement!';
    if (improvement > 5) return 'Good progress!';
    if (improvement > 0) return 'Steady improvement!';
    if (improvement > -5) return 'Maintaining level';
    return 'Focus on training!';
  }
}

export const fitnessService = new FitnessService();