import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, QuestionCategory } from '@prisma/client';

export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  branch: MilitaryBranch;
  category?: QuestionCategory;
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  isPrivate: boolean;
  roomCode?: string;
  settings: StudyRoomSettings;
  participants: StudyRoomParticipant[];
  createdAt: Date;
  startedAt?: Date;
}

export interface StudyRoomSettings {
  allowVoiceChat: boolean;
  allowTextChat: boolean;
  allowScreenShare: boolean;
  autoStartQuiz: boolean;
  quizTimeLimit?: number;
  difficultyLevel: 'MIXED' | 'EASY' | 'MEDIUM' | 'HARD';
  questionCount: number;
  enableLeaderboard: boolean;
  allowHints: boolean;
  pauseOnWrongAnswer: boolean;
  showExplanations: boolean;
}

export interface StudyRoomParticipant {
  id: string;
  userId: string;
  displayName: string;
  branch: MilitaryBranch;
  role: 'HOST' | 'PARTICIPANT';
  joinedAt: Date;
  isActive: boolean;
  currentScore?: number;
  answeredQuestions: number;
  accuracy: number;
  isReady: boolean;
}

export interface LiveStudySession {
  id: string;
  roomId: string;
  currentQuestionId?: string;
  questionIndex: number;
  totalQuestions: number;
  startedAt: Date;
  timeRemaining?: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  participants: Array<{
    userId: string;
    hasAnswered: boolean;
    answer?: string;
    timeToAnswer?: number;
    isCorrect?: boolean;
  }>;
  leaderboard: Array<{
    userId: string;
    displayName: string;
    score: number;
    accuracy: number;
    rank: number;
  }>;
}

export interface StudyActivity {
  type: 'USER_JOINED' | 'USER_LEFT' | 'QUESTION_ANSWERED' | 'QUIZ_STARTED' | 'QUIZ_COMPLETED' | 'MESSAGE_SENT';
  userId: string;
  displayName: string;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class RealTimeStudyService {
  private readonly logger = new Logger(RealTimeStudyService.name);
  private activeRooms = new Map<string, StudyRoom>();
  private activeSessions = new Map<string, LiveStudySession>();

  constructor(private readonly prisma: PrismaService) {}

  async createStudyRoom(
    hostId: string,
    roomData: {
      name: string;
      description?: string;
      branch: MilitaryBranch;
      category?: QuestionCategory;
      maxParticipants: number;
      isPrivate: boolean;
      settings: StudyRoomSettings;
    }
  ): Promise<StudyRoom> {
    try {
      // Get host information
      const host = await this.prisma.user.findUnique({
        where: { id: hostId },
        select: {
          firstName: true,
          lastName: true,
          selectedBranch: true,
        },
      });

      if (!host) {
        throw new Error('Host user not found');
      }

      // Create room code for private rooms
      const roomCode = roomData.isPrivate ? this.generateRoomCode() : undefined;

      // Create study room in database
      const dbRoom = await this.prisma.studyRoom.create({
        data: {
          name: roomData.name,
          description: roomData.description,
          hostId,
          branch: roomData.branch,
          category: roomData.category,
          maxParticipants: roomData.maxParticipants,
          isPrivate: roomData.isPrivate,
          roomCode,
          settings: roomData.settings,
          isActive: true,
        },
      });

      // Create study room object
      const studyRoom: StudyRoom = {
        id: dbRoom.id,
        name: dbRoom.name,
        description: dbRoom.description,
        hostId,
        branch: dbRoom.branch,
        category: dbRoom.category,
        maxParticipants: dbRoom.maxParticipants,
        currentParticipants: 0,
        isActive: true,
        isPrivate: dbRoom.isPrivate,
        roomCode,
        settings: roomData.settings,
        participants: [],
        createdAt: dbRoom.createdAt,
      };

      // Store in memory for real-time operations
      this.activeRooms.set(studyRoom.id, studyRoom);

      this.logger.log(`Study room ${studyRoom.id} created by user ${hostId}`);

      return studyRoom;
    } catch (error) {
      this.logger.error('Failed to create study room:', error);
      throw new Error('Failed to create study room');
    }
  }

  async joinStudyRoom(roomId: string, userId: string, roomCode?: string): Promise<StudyRoomParticipant> {
    try {
      const room = this.activeRooms.get(roomId);
      if (!room) {
        throw new Error('Study room not found or inactive');
      }

      // Check room code for private rooms
      if (room.isPrivate && room.roomCode !== roomCode) {
        throw new Error('Invalid room code');
      }

      // Check room capacity
      if (room.currentParticipants >= room.maxParticipants) {
        throw new Error('Study room is full');
      }

      // Check if user is already in the room
      const existingParticipant = room.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        existingParticipant.isActive = true;
        return existingParticipant;
      }

      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          selectedBranch: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create participant
      const participant: StudyRoomParticipant = {
        id: `${roomId}_${userId}`,
        userId,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous Soldier',
        branch: user.selectedBranch,
        role: userId === room.hostId ? 'HOST' : 'PARTICIPANT',
        joinedAt: new Date(),
        isActive: true,
        answeredQuestions: 0,
        accuracy: 0,
        isReady: false,
      };

      // Add to room
      room.participants.push(participant);
      room.currentParticipants = room.participants.filter(p => p.isActive).length;

      // Update database
      await this.prisma.studyRoomParticipant.create({
        data: {
          roomId,
          userId,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: participant.joinedAt,
        },
      });

      this.logger.log(`User ${userId} joined study room ${roomId}`);

      return participant;
    } catch (error) {
      this.logger.error('Failed to join study room:', error);
      throw error;
    }
  }

  async leaveStudyRoom(roomId: string, userId: string): Promise<void> {
    try {
      const room = this.activeRooms.get(roomId);
      if (!room) return;

      // Find and deactivate participant
      const participant = room.participants.find(p => p.userId === userId);
      if (participant) {
        participant.isActive = false;
        room.currentParticipants = room.participants.filter(p => p.isActive).length;

        // Update database
        await this.prisma.studyRoomParticipant.updateMany({
          where: { roomId, userId },
          data: { leftAt: new Date() },
        });

        // If host left and there are other participants, transfer host role
        if (participant.role === 'HOST' && room.currentParticipants > 0) {
          const newHost = room.participants.find(p => p.isActive && p.userId !== userId);
          if (newHost) {
            newHost.role = 'HOST';
            room.hostId = newHost.userId;
            
            await this.prisma.studyRoom.update({
              where: { id: roomId },
              data: { hostId: newHost.userId },
            });
          }
        }

        // Close room if empty
        if (room.currentParticipants === 0) {
          await this.closeStudyRoom(roomId);
        }
      }

      this.logger.log(`User ${userId} left study room ${roomId}`);
    } catch (error) {
      this.logger.error('Failed to leave study room:', error);
    }
  }

  async startQuizSession(roomId: string, hostId: string): Promise<LiveStudySession> {
    try {
      const room = this.activeRooms.get(roomId);
      if (!room || room.hostId !== hostId) {
        throw new Error('Unauthorized or room not found');
      }

      // Check if all participants are ready (if required)
      const readyParticipants = room.participants.filter(p => p.isActive && p.isReady);
      if (readyParticipants.length === 0) {
        throw new Error('No participants are ready');
      }

      // Generate questions for the session
      const questions = await this.generateSessionQuestions(room);
      
      if (questions.length === 0) {
        throw new Error('No questions available for this configuration');
      }

      // Create live study session
      const session: LiveStudySession = {
        id: `${roomId}_${Date.now()}`,
        roomId,
        questionIndex: 0,
        totalQuestions: questions.length,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        participants: readyParticipants.map(p => ({
          userId: p.userId,
          hasAnswered: false,
        })),
        leaderboard: readyParticipants.map((p, index) => ({
          userId: p.userId,
          displayName: p.displayName,
          score: 0,
          accuracy: 0,
          rank: index + 1,
        })),
      };

      // Set first question
      if (questions.length > 0) {
        session.currentQuestionId = questions[0].id;
        session.timeRemaining = room.settings.quizTimeLimit;
      }

      // Store session
      this.activeSessions.set(session.id, session);
      room.startedAt = new Date();

      // Store in database
      await this.prisma.quizSession.create({
        data: {
          id: session.id,
          roomId,
          questionIds: questions.map(q => q.id),
          startedAt: session.startedAt,
          status: session.status,
        },
      });

      this.logger.log(`Quiz session ${session.id} started in room ${roomId}`);

      return session;
    } catch (error) {
      this.logger.error('Failed to start quiz session:', error);
      throw error;
    }
  }

  async submitQuizAnswer(
    sessionId: string,
    userId: string,
    answer: string,
    timeToAnswer: number
  ): Promise<{ isCorrect: boolean; explanation?: string }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || session.status !== 'IN_PROGRESS') {
        throw new Error('Session not found or not active');
      }

      // Find participant
      const participant = session.participants.find(p => p.userId === userId);
      if (!participant || participant.hasAnswered) {
        throw new Error('Participant not found or already answered');
      }

      // Get current question
      const question = await this.prisma.question.findUnique({
        where: { id: session.currentQuestionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check answer correctness
      const isCorrect = this.checkAnswer(question, answer);

      // Update participant response
      participant.hasAnswered = true;
      participant.answer = answer;
      participant.timeToAnswer = timeToAnswer;
      participant.isCorrect = isCorrect;

      // Update leaderboard
      const leaderboardEntry = session.leaderboard.find(l => l.userId === userId);
      if (leaderboardEntry) {
        if (isCorrect) {
          leaderboardEntry.score += this.calculateScore(timeToAnswer, session.timeRemaining);
        }
        leaderboardEntry.accuracy = this.calculateAccuracy(userId, session);
      }

      // Sort leaderboard
      session.leaderboard.sort((a, b) => b.score - a.score);
      session.leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Store answer in database
      await this.prisma.quizAnswer.create({
        data: {
          sessionId,
          userId,
          questionId: session.currentQuestionId!,
          answer,
          isCorrect,
          timeToAnswer,
          submittedAt: new Date(),
        },
      });

      this.logger.debug(`User ${userId} submitted answer for session ${sessionId}`);

      return {
        isCorrect,
        explanation: isCorrect ? undefined : question.explanation,
      };
    } catch (error) {
      this.logger.error('Failed to submit quiz answer:', error);
      throw error;
    }
  }

  async getActiveStudyRooms(
    branch?: MilitaryBranch,
    category?: QuestionCategory,
    limit = 20
  ): Promise<StudyRoom[]> {
    try {
      const rooms = Array.from(this.activeRooms.values())
        .filter(room => {
          if (!room.isActive) return false;
          if (room.isPrivate) return false;
          if (branch && room.branch !== branch) return false;
          if (category && room.category !== category) return false;
          return true;
        })
        .sort((a, b) => b.currentParticipants - a.currentParticipants)
        .slice(0, limit);

      return rooms;
    } catch (error) {
      this.logger.error('Failed to get active study rooms:', error);
      return [];
    }
  }

  async getStudyRoomDetails(roomId: string): Promise<StudyRoom | null> {
    return this.activeRooms.get(roomId) || null;
  }

  async getSessionDetails(sessionId: string): Promise<LiveStudySession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async generateSessionQuestions(room: StudyRoom): Promise<any[]> {
    const { category, settings } = room;

    // Build query conditions
    const whereConditions: any = {
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (settings.difficultyLevel !== 'MIXED') {
      whereConditions.difficulty = settings.difficultyLevel;
    }

    // Get questions
    const questions = await this.prisma.question.findMany({
      where: whereConditions,
      take: settings.questionCount * 2, // Get extra for randomization
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Randomize and limit
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, settings.questionCount);
  }

  private checkAnswer(question: any, userAnswer: string): boolean {
    try {
      const correctAnswerIndex = question.correctAnswer;
      const userAnswerIndex = parseInt(userAnswer, 10);
      return correctAnswerIndex === userAnswerIndex;
    } catch {
      return false;
    }
  }

  private calculateScore(timeToAnswer: number, timeLimit?: number): number {
    const baseScore = 100;
    const timeBonus = timeLimit ? Math.max(0, (timeLimit - timeToAnswer) / timeLimit * 50) : 0;
    return Math.round(baseScore + timeBonus);
  }

  private calculateAccuracy(userId: string, session: LiveStudySession): number {
    const userAnswers = session.participants.filter(p => p.userId === userId && p.hasAnswered);
    if (userAnswers.length === 0) return 0;

    const correctAnswers = userAnswers.filter(p => p.isCorrect).length;
    return Math.round((correctAnswers / userAnswers.length) * 100);
  }

  private async closeStudyRoom(roomId: string): Promise<void> {
    try {
      // Remove from active rooms
      this.activeRooms.delete(roomId);

      // Update database
      await this.prisma.studyRoom.update({
        where: { id: roomId },
        data: {
          isActive: false,
          closedAt: new Date(),
        },
      });

      this.logger.log(`Study room ${roomId} closed`);
    } catch (error) {
      this.logger.error('Failed to close study room:', error);
    }
  }
}