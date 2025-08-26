import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { SubscriptionService } from '../../subscriptions/subscriptions.service';
import { 
  CreateFlashcardDto, 
  UpdateFlashcardDto, 
  CreateFlashcardDeckDto, 
  UpdateFlashcardDeckDto,
  ReviewFlashcardDto,
  StudySessionDto,
  FlashcardProgressDto,
  FlashcardDifficulty,
  FlashcardType
} from '../dto/flashcard.dto';
import { SubscriptionTier } from '@asvab-prep/shared';

@Injectable()
export class FlashcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacedRepetition: SpacedRepetitionService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createFlashcard(userId: string, createFlashcardDto: CreateFlashcardDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionService.getUserSubscription(userId);
    
    // Premium gate: Free users limited to 50 flashcards
    if (subscription.tier === SubscriptionTier.FREE) {
      const userFlashcardCount = await this.prisma.flashcard.count({
        where: { createdBy: userId },
      });

      if (userFlashcardCount >= 50) {
        throw new BadRequestException('Free users can only create 50 flashcards. Upgrade to Premium for unlimited flashcards.');
      }
    }

    const flashcard = await this.prisma.flashcard.create({
      data: {
        ...createFlashcardDto,
        createdBy: userId,
        deck: createFlashcardDto.deckId ? {
          connect: { id: createFlashcardDto.deckId },
        } : undefined,
      },
      include: {
        deck: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return flashcard;
  }

  async createFlashcardDeck(userId: string, createDeckDto: CreateFlashcardDeckDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionService.getUserSubscription(userId);

    // Premium gate: Free users limited to 3 decks
    if (subscription.tier === SubscriptionTier.FREE) {
      const userDeckCount = await this.prisma.flashcardDeck.count({
        where: { createdBy: userId },
      });

      if (userDeckCount >= 3) {
        throw new BadRequestException('Free users can only create 3 decks. Upgrade to Premium for unlimited decks.');
      }
    }

    const deck = await this.prisma.flashcardDeck.create({
      data: {
        ...createDeckDto,
        createdBy: userId,
      },
      include: {
        flashcards: true,
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
    });

    return deck;
  }

  async getUserFlashcards(userId: string, deckId?: string) {
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        createdBy: userId,
        deckId: deckId || undefined,
        isActive: true,
      },
      include: {
        deck: true,
        reviews: {
          orderBy: { reviewDate: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add spaced repetition data to each flashcard
    const flashcardsWithSRS = flashcards.map(flashcard => {
      const lastReview = flashcard.reviews[0];
      return {
        ...flashcard,
        spacedRepetitionData: {
          interval: lastReview?.interval || 0,
          repetitions: lastReview?.repetitions || 0,
          easeFactor: lastReview?.easeFactor || 2.5,
          nextReviewDate: lastReview?.nextReviewDate || new Date(),
          lastReviewDate: lastReview?.reviewDate || null,
          rating: lastReview?.rating || 0,
        },
      };
    });

    return flashcardsWithSRS;
  }

  async getUserDecks(userId: string) {
    const decks = await this.prisma.flashcardDeck.findMany({
      where: {
        createdBy: userId,
        isActive: true,
      },
      include: {
        flashcards: {
          where: { isActive: true },
        },
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add study statistics to each deck
    const decksWithStats = await Promise.all(
      decks.map(async (deck) => {
        const dueCards = await this.getDueFlashcards(userId, deck.id);
        const newCards = deck.flashcards.filter(card => 
          !card.reviews || card.reviews.length === 0
        ).length;
        
        return {
          ...deck,
          statistics: {
            totalCards: deck._count.flashcards,
            dueCards: dueCards.length,
            newCards,
            masteredCards: deck.flashcards.filter(card => 
              card.cardStatus === 'mastered'
            ).length,
          },
        };
      })
    );

    return decksWithStats;
  }

  async updateFlashcard(userId: string, flashcardId: string, updateDto: UpdateFlashcardDto) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: {
        id: flashcardId,
        createdBy: userId,
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const updated = await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: updateDto,
      include: {
        deck: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return updated;
  }

  async updateDeck(userId: string, deckId: string, updateDto: UpdateFlashcardDeckDto) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        createdBy: userId,
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const updated = await this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: updateDto,
      include: {
        flashcards: {
          where: { isActive: true },
        },
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
    });

    return updated;
  }

  async deleteFlashcard(userId: string, flashcardId: string) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: {
        id: flashcardId,
        createdBy: userId,
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: { isActive: false },
    });

    return { success: true, message: 'Flashcard deleted successfully' };
  }

  async deleteDeck(userId: string, deckId: string) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        createdBy: userId,
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Soft delete deck and all associated flashcards
    await this.prisma.$transaction([
      this.prisma.flashcard.updateMany({
        where: { deckId },
        data: { isActive: false },
      }),
      this.prisma.flashcardDeck.update({
        where: { id: deckId },
        data: { isActive: false },
      }),
    ]);

    return { success: true, message: 'Deck and all flashcards deleted successfully' };
  }

  async reviewFlashcard(userId: string, reviewDto: ReviewFlashcardDto) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: {
        id: reviewDto.flashcardId,
        OR: [
          { createdBy: userId },
          { isPublic: true },
        ],
      },
      include: {
        reviews: {
          where: { userId },
          orderBy: { reviewDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const lastReview = flashcard.reviews[0];
    const currentData = {
      interval: lastReview?.interval || 0,
      repetitions: lastReview?.repetitions || 0,
      easeFactor: lastReview?.easeFactor || 2.5,
      lastReviewDate: lastReview?.reviewDate || new Date(),
    };

    // Calculate next review using spaced repetition algorithm
    const reviewResult = this.spacedRepetition.calculateNextReview(
      currentData,
      reviewDto.rating
    );

    // Create review record
    const review = await this.prisma.flashcardReview.create({
      data: {
        userId,
        flashcardId: reviewDto.flashcardId,
        rating: reviewDto.rating,
        timeSpent: reviewDto.timeSpent,
        wasCorrect: reviewDto.wasCorrect,
        userAnswer: reviewDto.userAnswer,
        notes: reviewDto.notes,
        interval: reviewResult.interval,
        repetitions: reviewResult.repetitions,
        easeFactor: reviewResult.easeFactor,
        nextReviewDate: reviewResult.nextReviewDate,
        reviewDate: new Date(),
      },
    });

    // Update flashcard status
    await this.prisma.flashcard.update({
      where: { id: reviewDto.flashcardId },
      data: { 
        cardStatus: reviewResult.cardStatus,
        lastReviewed: new Date(),
      },
    });

    return {
      review,
      nextReviewDate: reviewResult.nextReviewDate,
      cardStatus: reviewResult.cardStatus,
      interval: reviewResult.interval,
    };
  }

  async getDueFlashcards(userId: string, deckId?: string) {
    const now = new Date();
    
    // Get all user's flashcards with their latest review
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { isPublic: true },
        ],
        deckId: deckId || undefined,
        isActive: true,
      },
      include: {
        reviews: {
          where: { userId },
          orderBy: { reviewDate: 'desc' },
          take: 1,
        },
        deck: true,
      },
    });

    const dueFlashcards = flashcards.filter(flashcard => {
      const lastReview = flashcard.reviews[0];
      if (!lastReview) return true; // New cards are due
      return new Date(lastReview.nextReviewDate) <= now;
    });

    return this.spacedRepetition.getDueCards(dueFlashcards);
  }

  async startStudySession(userId: string, sessionDto: StudySessionDto) {
    const subscription = await this.subscriptionService.getUserSubscription(userId);

    // Premium gate: Free users limited to 10 cards per session
    let maxCards = sessionDto.maxCards || 20;
    if (subscription.tier === SubscriptionTier.FREE) {
      maxCards = Math.min(maxCards, 10);
    }

    const dueCards = await this.getDueFlashcards(userId, sessionDto.deckId);
    const newCards = await this.prisma.flashcard.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { isPublic: true },
        ],
        deckId: sessionDto.deckId,
        isActive: true,
        reviews: {
          none: { userId },
        },
      },
      include: {
        deck: true,
      },
    });

    // Filter by difficulty if specified
    let studyCards = [...dueCards];
    if (sessionDto.includeNew !== false) {
      studyCards = [...studyCards, ...newCards];
    }

    if (sessionDto.difficulties && sessionDto.difficulties.length > 0) {
      studyCards = studyCards.filter(card => 
        sessionDto.difficulties?.includes(card.difficulty as FlashcardDifficulty)
      );
    }

    if (sessionDto.tags && sessionDto.tags.length > 0) {
      studyCards = studyCards.filter(card => 
        card.tags?.some(tag => sessionDto.tags?.includes(tag))
      );
    }

    // Limit cards for session
    const sessionCards = studyCards.slice(0, maxCards);

    // Calculate study load
    const studyLoad = this.spacedRepetition.calculateOptimalStudyLoad(
      sessionCards.length,
      sessionDto.timeLimit || 30,
      subscription.tier === SubscriptionTier.PREMIUM ? 'advanced' : 'beginner'
    );

    return {
      cards: sessionCards,
      studyLoad,
      sessionConfig: {
        maxCards,
        timeLimit: sessionDto.timeLimit,
        includeNew: sessionDto.includeNew,
        includeDue: sessionDto.includeDue,
        difficulties: sessionDto.difficulties,
        tags: sessionDto.tags,
      },
    };
  }

  async getFlashcardProgress(userId: string): Promise<FlashcardProgressDto> {
    const allReviews = await this.prisma.flashcardReview.findMany({
      where: { userId },
      orderBy: { reviewDate: 'desc' },
      include: {
        flashcard: true,
      },
    });

    const userFlashcards = await this.prisma.flashcard.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { 
            isPublic: true,
            reviews: { some: { userId } },
          },
        ],
        isActive: true,
      },
    });

    const stats = this.spacedRepetition.generateStudyStats(allReviews);
    const dueCards = await this.getDueFlashcards(userId);

    const masteredCards = userFlashcards.filter(card => 
      card.cardStatus === 'mastered'
    ).length;

    const learningCards = userFlashcards.filter(card => 
      card.cardStatus === 'learning'
    ).length;

    const newCards = userFlashcards.filter(card => 
      !allReviews.some(review => review.flashcardId === card.id)
    ).length;

    return {
      totalCards: userFlashcards.length,
      masteredCards,
      learningCards,
      newCards,
      dueCards: dueCards.length,
      streakDays: stats.streak,
      lastStudied: allReviews[0]?.reviewDate?.toISOString() || new Date().toISOString(),
      totalStudyTime: stats.totalStudyTime,
      averageRating: stats.averageRating,
      retentionRate: stats.retentionRate,
    };
  }

  async getPublicDecks(userId: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { selectedBranch: true },
    });

    const skip = (page - 1) * limit;

    const decks = await this.prisma.flashcardDeck.findMany({
      where: {
        isPublic: true,
        isActive: true,
        createdBy: { not: userId },
      },
      include: {
        creator: {
          select: {
            id: true,
            selectedBranch: true,
          },
        },
        flashcards: {
          where: { isActive: true },
          select: { id: true, difficulty: true },
        },
        _count: {
          select: {
            flashcards: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Prioritize decks from same branch
    const sortedDecks = decks.sort((a, b) => {
      if (a.creator.selectedBranch === user?.selectedBranch && 
          b.creator.selectedBranch !== user?.selectedBranch) {
        return -1;
      }
      if (b.creator.selectedBranch === user?.selectedBranch && 
          a.creator.selectedBranch !== user?.selectedBranch) {
        return 1;
      }
      return 0;
    });

    return {
      decks: sortedDecks,
      pagination: {
        page,
        limit,
        hasNext: decks.length === limit,
      },
    };
  }
}