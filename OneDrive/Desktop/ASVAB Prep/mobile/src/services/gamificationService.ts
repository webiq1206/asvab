import { apiService } from './api';
import { MilitaryBranch } from '@asvab-prep/shared';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'STUDY' | 'QUIZ' | 'STREAK' | 'SCORE' | 'SPECIAL' | 'MILESTONE';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  xpReward: number;
  icon: string;
  requirement: {
    type: string;
    target: number;
    current?: number;
  };
  unlockedAt?: string;
  progress: number; // 0-100
  isUnlocked: boolean;
  isBranchSpecific: boolean;
  branchRequirement?: MilitaryBranch;
}

export interface UserRank {
  id: string;
  name: string;
  title: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
  benefits: string[];
  branchSpecific: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  branch: MilitaryBranch;
  rank: UserRank;
  totalXP: number;
  weeklyXP: number;
  monthlyXP: number;
  position: number;
  avatar?: string;
  achievements: number;
  studyStreak: number;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  isActive: boolean;
  nextMilestone: number;
  milestoneReward: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  xpReward: number;
  pointsReward: number;
  requirements: {
    type: 'QUESTIONS_CORRECT' | 'QUIZ_COMPLETE' | 'STUDY_TIME' | 'ACCURACY_RATE';
    target: number;
    current: number;
  };
  progress: number; // 0-100
  isCompleted: boolean;
  expiresAt: string;
  branchBonus?: {
    branch: MilitaryBranch;
    multiplier: number;
  };
}

export interface WeeklyMission {
  id: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  pointsReward: number;
  specialReward?: {
    type: 'BADGE' | 'TITLE' | 'AVATAR' | 'PRIVILEGE';
    name: string;
    description: string;
  };
  objectives: Array<{
    id: string;
    description: string;
    requirement: {
      type: string;
      target: number;
    };
    current: number;
    isCompleted: boolean;
  }>;
  progress: number; // 0-100
  isCompleted: boolean;
  expiresAt: string;
}

export interface GameStats {
  totalXP: number;
  currentRank: UserRank;
  nextRank: UserRank | null;
  progressToNextRank: number; // 0-100
  totalAchievements: number;
  unlockedAchievements: number;
  totalPoints: number;
  studyStreak: StudyStreak;
  weeklyXP: number;
  monthlyXP: number;
  globalRanking: number;
  branchRanking: number;
  challengesCompleted: number;
  missionsCompleted: number;
}

export interface RewardNotification {
  id: string;
  type: 'ACHIEVEMENT' | 'RANK_UP' | 'CHALLENGE_COMPLETE' | 'MISSION_COMPLETE' | 'STREAK_MILESTONE';
  title: string;
  description: string;
  reward: {
    xp?: number;
    points?: number;
    badge?: string;
    title?: string;
  };
  timestamp: string;
  isRead: boolean;
}

class GamificationService {
  // Get user's gamification stats
  async getGameStats(): Promise<GameStats> {
    return await apiService.get<GameStats>('/gamification/stats');
  }

  // Get all available achievements
  async getAchievements(branch?: MilitaryBranch): Promise<Achievement[]> {
    const params = branch ? `?branch=${branch}` : '';
    return await apiService.get<Achievement[]>(`/gamification/achievements${params}`);
  }

  // Get unlocked achievements for user
  async getUnlockedAchievements(): Promise<Achievement[]> {
    return await apiService.get<Achievement[]>('/gamification/achievements/unlocked');
  }

  // Get leaderboard data
  async getLeaderboard(
    type: 'GLOBAL' | 'BRANCH' | 'WEEKLY' | 'MONTHLY' = 'GLOBAL',
    branch?: MilitaryBranch,
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    return await apiService.get<LeaderboardEntry[]>(`/gamification/leaderboard`, {
      params: { type, branch, limit }
    });
  }

  // Get daily challenges
  async getDailyChallenges(): Promise<DailyChallenge[]> {
    return await apiService.get<DailyChallenge[]>('/gamification/challenges/daily');
  }

  // Get weekly missions
  async getWeeklyMissions(): Promise<WeeklyMission[]> {
    return await apiService.get<WeeklyMission[]>('/gamification/missions/weekly');
  }

  // Get user's rank history
  async getRankHistory(): Promise<Array<{
    rank: UserRank;
    achievedAt: string;
    xpAtTime: number;
  }>> {
    return await apiService.get('/gamification/ranks/history');
  }

  // Get reward notifications
  async getRewardNotifications(limit: number = 20): Promise<RewardNotification[]> {
    return await apiService.get<RewardNotification[]>(`/gamification/notifications?limit=${limit}`);
  }

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<void> {
    await apiService.patch(`/gamification/notifications/${notificationId}/read`);
  }

  // Award XP for activity
  async awardXP(
    activity: 'QUESTION_CORRECT' | 'QUIZ_COMPLETE' | 'STUDY_SESSION' | 'STREAK_MAINTAIN' | 'ACHIEVEMENT_UNLOCK',
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{
    xpAwarded: number;
    totalXP: number;
    rankUp?: UserRank;
    achievementsUnlocked?: Achievement[];
  }> {
    return await apiService.post('/gamification/xp/award', {
      activity,
      amount,
      metadata
    });
  }

  // Update study streak
  async updateStudyStreak(): Promise<StudyStreak> {
    return await apiService.post<StudyStreak>('/gamification/streak/update');
  }

  // Complete daily challenge
  async completeDailyChallenge(challengeId: string): Promise<{
    challenge: DailyChallenge;
    xpAwarded: number;
    pointsAwarded: number;
    achievementsUnlocked?: Achievement[];
  }> {
    return await apiService.post(`/gamification/challenges/${challengeId}/complete`);
  }

  // Complete weekly mission objective
  async completeObjective(missionId: string, objectiveId: string): Promise<WeeklyMission> {
    return await apiService.post(`/gamification/missions/${missionId}/objectives/${objectiveId}/complete`);
  }

  // Get available ranks
  async getRanks(branch?: MilitaryBranch): Promise<UserRank[]> {
    const params = branch ? `?branch=${branch}` : '';
    return await apiService.get<UserRank[]>(`/gamification/ranks${params}`);
  }

  // Claim achievement
  async claimAchievement(achievementId: string): Promise<{
    achievement: Achievement;
    xpAwarded: number;
    pointsAwarded: number;
    rankUp?: UserRank;
  }> {
    return await apiService.post(`/gamification/achievements/${achievementId}/claim`);
  }

  // Get friend/study group leaderboard
  async getFriendLeaderboard(): Promise<LeaderboardEntry[]> {
    return await apiService.get<LeaderboardEntry[]>('/gamification/leaderboard/friends');
  }

  // Challenge a friend
  async challengeFriend(
    friendId: string,
    challengeType: 'QUIZ_DUEL' | 'STUDY_RACE' | 'ACCURACY_CONTEST',
    parameters: Record<string, any>
  ): Promise<{
    challengeId: string;
    expiresAt: string;
  }> {
    return await apiService.post('/gamification/challenges/friend', {
      friendId,
      challengeType,
      parameters
    });
  }

  // Get user's badges and titles
  async getUserBadges(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    earnedAt: string;
    category: string;
  }>> {
    return await apiService.get('/gamification/badges');
  }

  // Get user's titles
  async getUserTitles(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    unlockedAt: string;
    branchSpecific: boolean;
  }>> {
    return await apiService.get('/gamification/titles');
  }

  // Set active title
  async setActiveTitle(titleId: string): Promise<void> {
    await apiService.post(`/gamification/titles/${titleId}/activate`);
  }

  // Utility functions
  getDifficultyColor(difficulty: Achievement['difficulty']): string {
    switch (difficulty) {
      case 'BRONZE': return '#CD7F32';
      case 'SILVER': return '#C0C0C0';
      case 'GOLD': return '#FFD700';
      case 'PLATINUM': return '#E5E4E2';
      default: return '#CD7F32';
    }
  }

  getRankColor(rank: UserRank): string {
    return rank.color;
  }

  formatXP(xp: number): string {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    } else if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  }

  calculateTimeUntilReset(type: 'DAILY' | 'WEEKLY'): string {
    const now = new Date();
    let resetTime: Date;

    if (type === 'DAILY') {
      resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Next midnight
    } else {
      resetTime = new Date();
      const daysUntilSunday = (7 - resetTime.getDay()) % 7;
      resetTime.setDate(resetTime.getDate() + daysUntilSunday);
      resetTime.setHours(0, 0, 0, 0);
    }

    const timeDiff = resetTime.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getMilestoneMessage(streak: number, branch: MilitaryBranch): string {
    const messages = {
      ARMY: [
        'Outstanding dedication, Soldier! Hooah!',
        'Army Strong commitment! Keep marching forward!',
        'Disciplined training pays off! Stay Army Strong!'
      ],
      NAVY: [
        'Smooth seas ahead, Sailor! Hooyah!',
        'Steady as she goes! Anchors Aweigh!',
        'Navy precision at its finest! Full speed ahead!'
      ],
      AIR_FORCE: [
        'High-flying performance, Airman! Hoorah!',
        'Aim high and soar! Excellence in training!',
        'Above and beyond expectations! Fly, Fight, Win!'
      ],
      MARINES: [
        'Semper Fi excellence, Marine! Oorah!',
        'The Few, The Proud, The Dedicated! Outstanding!',
        'Marine Corps precision! Always Faithful!'
      ],
      COAST_GUARD: [
        'Semper Paratus dedication, Guardian! Hooyah!',
        'Always Ready, Always Learning! Outstanding work!',
        'Coast Guard commitment! Ready for anything!'
      ],
      SPACE_FORCE: [
        'Semper Supra achievement, Guardian! Hoorah!',
        'Above and Beyond the atmosphere! Space Force Strong!',
        'Guardian excellence! Always Above!'
      ]
    };

    const branchMessages = messages[branch];
    const messageIndex = Math.min(Math.floor(streak / 10), branchMessages.length - 1);
    return branchMessages[messageIndex];
  }

  getAchievementCelebration(achievement: Achievement, branch: MilitaryBranch): string {
    const celebrations = {
      ARMY: 'Outstanding achievement, Soldier! Hooah!',
      NAVY: 'Well done, Sailor! Hooyah!',
      AIR_FORCE: 'Excellent work, Airman! Hoorah!',
      MARINES: 'Semper Fi, Marine! Oorah!',
      COAST_GUARD: 'Semper Paratus, Guardian! Hooyah!',
      SPACE_FORCE: 'Semper Supra, Guardian! Hoorah!'
    };

    return celebrations[branch];
  }

  // Track activity for analytics
  async trackGameActivity(
    action: 'VIEW_ACHIEVEMENTS' | 'VIEW_LEADERBOARD' | 'COMPLETE_CHALLENGE' | 'CHECK_STREAK',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await apiService.post('/gamification/analytics/track', {
        action,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Analytics tracking failures should not impact user experience
      console.warn('Failed to track gamification activity:', error);
    }
  }
}

export const gamificationService = new GamificationService();