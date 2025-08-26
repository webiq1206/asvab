import { Injectable } from '@nestjs/common';

export interface SpacedRepetitionData {
  interval: number; // in days
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
  rating: number; // 0-5 scale
}

export interface ReviewResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
  cardStatus: 'new' | 'learning' | 'review' | 'mastered';
}

@Injectable()
export class SpacedRepetitionService {
  private readonly DEFAULT_EASE_FACTOR = 2.5;
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly MAX_EASE_FACTOR = 5.0;
  private readonly GRADUATION_INTERVAL = 4; // days to graduate from learning
  private readonly MASTERY_REPETITIONS = 8; // repetitions to consider mastered

  /**
   * Calculate next review using modified SM-2 algorithm
   * Rating scale:
   * 0 - Complete blackout
   * 1 - Incorrect response with correct answer seeming familiar
   * 2 - Incorrect response with correct answer seeming easy to recall
   * 3 - Correct response recalled with serious difficulty
   * 4 - Correct response after hesitation
   * 5 - Perfect response
   */
  calculateNextReview(
    currentData: Partial<SpacedRepetitionData>,
    rating: number
  ): ReviewResult {
    // Initialize defaults for new cards
    const interval = currentData.interval || 0;
    let repetitions = currentData.repetitions || 0;
    let easeFactor = currentData.easeFactor || this.DEFAULT_EASE_FACTOR;
    const lastReviewDate = currentData.lastReviewDate || new Date();

    // Validate rating
    rating = Math.max(0, Math.min(5, Math.floor(rating)));

    // Calculate new ease factor (only for ratings 3+)
    if (rating >= 3) {
      easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
      easeFactor = Math.max(this.MIN_EASE_FACTOR, Math.min(this.MAX_EASE_FACTOR, easeFactor));
    }

    let newInterval: number;
    let cardStatus: 'new' | 'learning' | 'review' | 'mastered';

    if (rating < 3) {
      // Incorrect response - reset to learning phase
      repetitions = 0;
      newInterval = 1; // Review again tomorrow
      cardStatus = 'learning';
    } else {
      repetitions += 1;

      if (repetitions === 1) {
        newInterval = 1; // First correct answer - 1 day
        cardStatus = 'learning';
      } else if (repetitions === 2) {
        newInterval = this.GRADUATION_INTERVAL; // Graduate from learning
        cardStatus = 'review';
      } else {
        // Apply SM-2 algorithm for subsequent reviews
        newInterval = Math.round(interval * easeFactor);
        
        // Determine card status based on repetitions and intervals
        if (repetitions >= this.MASTERY_REPETITIONS && newInterval >= 30) {
          cardStatus = 'mastered';
        } else {
          cardStatus = 'review';
        }
      }
    }

    // Add some randomization to prevent clustering (±10%)
    const randomFactor = 0.9 + Math.random() * 0.2;
    newInterval = Math.max(1, Math.round(newInterval * randomFactor));

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      interval: newInterval,
      repetitions,
      easeFactor,
      nextReviewDate,
      cardStatus,
    };
  }

  /**
   * Get cards due for review
   */
  getDueCards(cards: any[]): any[] {
    const now = new Date();
    return cards.filter(card => {
      if (!card.nextReviewDate) return true; // New cards
      return new Date(card.nextReviewDate) <= now;
    });
  }

  /**
   * Calculate optimal study load for a session
   */
  calculateOptimalStudyLoad(
    totalCards: number,
    availableTime: number, // in minutes
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): {
    newCards: number;
    reviewCards: number;
    estimatedTime: number;
  } {
    // Average time per card based on user level
    const timePerCard = {
      beginner: 2.5, // 2.5 minutes per card
      intermediate: 2.0,
      advanced: 1.5,
    };

    const avgTime = timePerCard[userLevel];
    const maxCards = Math.floor(availableTime / avgTime);

    // Optimal ratio: 20% new cards, 80% review cards
    const optimalNewCards = Math.floor(maxCards * 0.2);
    const optimalReviewCards = Math.floor(maxCards * 0.8);

    const actualNewCards = Math.min(optimalNewCards, Math.floor(totalCards * 0.1));
    const actualReviewCards = Math.min(optimalReviewCards, maxCards - actualNewCards);

    return {
      newCards: actualNewCards,
      reviewCards: actualReviewCards,
      estimatedTime: (actualNewCards + actualReviewCards) * avgTime,
    };
  }

  /**
   * Calculate retention rate based on review history
   */
  calculateRetentionRate(reviews: Array<{ rating: number; reviewDate: Date }>): number {
    if (reviews.length === 0) return 0;

    const correctReviews = reviews.filter(review => review.rating >= 3).length;
    return Math.round((correctReviews / reviews.length) * 100);
  }

  /**
   * Determine if a card should be considered "mastered"
   */
  isCardMastered(
    repetitions: number,
    interval: number,
    easeFactor: number,
    retentionRate: number
  ): boolean {
    return (
      repetitions >= this.MASTERY_REPETITIONS &&
      interval >= 30 && // 30+ day intervals
      easeFactor >= 2.2 && // Good ease factor
      retentionRate >= 90 // 90%+ retention rate
    );
  }

  /**
   * Get recommended study schedule
   */
  getStudySchedule(
    dueCards: number,
    newCards: number,
    dailyTarget: number = 20
  ): {
    today: { due: number; new: number };
    tomorrow: { due: number; new: number };
    thisWeek: { due: number; new: number };
  } {
    const todayDue = Math.min(dueCards, Math.floor(dailyTarget * 0.8));
    const todayNew = Math.min(newCards, dailyTarget - todayDue);

    const tomorrowDue = Math.max(0, dueCards - todayDue);
    const tomorrowNew = Math.min(Math.max(0, newCards - todayNew), dailyTarget);

    const weeklyDue = tomorrowDue * 6; // Rough estimate
    const weeklyNew = Math.min(Math.max(0, newCards - todayNew - tomorrowNew), dailyTarget * 5);

    return {
      today: { due: todayDue, new: todayNew },
      tomorrow: { due: tomorrowDue, new: tomorrowNew },
      thisWeek: { due: weeklyDue, new: weeklyNew },
    };
  }

  /**
   * Calculate difficulty adjustment based on performance
   */
  adjustDifficulty(
    currentDifficulty: 'EASY' | 'MEDIUM' | 'HARD',
    averageRating: number,
    reviewCount: number
  ): 'EASY' | 'MEDIUM' | 'HARD' {
    // Need sufficient reviews to make adjustment
    if (reviewCount < 3) return currentDifficulty;

    if (averageRating >= 4.5) {
      // Performing very well - consider increasing difficulty
      return currentDifficulty === 'EASY' ? 'MEDIUM' : 
             currentDifficulty === 'MEDIUM' ? 'HARD' : 'HARD';
    } else if (averageRating <= 2.5) {
      // Struggling - consider decreasing difficulty
      return currentDifficulty === 'HARD' ? 'MEDIUM' : 
             currentDifficulty === 'MEDIUM' ? 'EASY' : 'EASY';
    }

    return currentDifficulty; // No change needed
  }

  /**
   * Generate study statistics
   */
  generateStudyStats(reviews: Array<{
    rating: number;
    timeSpent: number;
    reviewDate: Date;
    flashcardId: string;
  }>): {
    totalReviews: number;
    averageRating: number;
    totalStudyTime: number;
    averageTimePerCard: number;
    retentionRate: number;
    streak: number;
    cardsPerDay: number;
    weeklyProgress: Array<{ date: string; reviews: number; time: number }>;
  } {
    const totalReviews = reviews.length;
    const averageRating = reviews.length > 0 ? 
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const totalStudyTime = reviews.reduce((sum, r) => sum + r.timeSpent, 0);
    const averageTimePerCard = totalReviews > 0 ? totalStudyTime / totalReviews : 0;
    const retentionRate = this.calculateRetentionRate(reviews);

    // Calculate current streak
    const sortedReviews = reviews.sort((a, b) => 
      new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    
    for (const review of sortedReviews) {
      const reviewDate = new Date(review.reviewDate);
      reviewDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      
      if (reviewDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate cards per day (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentReviews = reviews.filter(r => new Date(r.reviewDate) >= weekAgo);
    const cardsPerDay = recentReviews.length / 7;

    // Weekly progress
    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayReviews = reviews.filter(r => {
        const reviewDate = new Date(r.reviewDate);
        return reviewDate.toDateString() === date.toDateString();
      });
      
      weeklyProgress.push({
        date: date.toISOString().split('T')[0],
        reviews: dayReviews.length,
        time: dayReviews.reduce((sum, r) => sum + r.timeSpent, 0),
      });
    }

    return {
      totalReviews,
      averageRating,
      totalStudyTime,
      averageTimePerCard,
      retentionRate,
      streak,
      cardsPerDay,
      weeklyProgress,
    };
  }
}