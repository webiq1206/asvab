import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RealTimeStudyService } from '../services/realtime-study.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  roomId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
  namespace: '/study-rooms',
})
@UseGuards(JwtAuthGuard)
export class StudyRoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StudyRoomGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(private readonly realTimeStudyService: RealTimeStudyService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user ID from JWT token
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        client.disconnect();
        return;
      }

      // Validate and extract user ID (simplified - in production use proper JWT validation)
      const userId = await this.validateTokenAndGetUserId(token);
      if (!userId) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      this.connectedUsers.set(client.id, client);

      this.logger.log(`User ${userId} connected to study rooms gateway`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.roomId) {
      // Remove user from study room
      this.leaveRoom(client, { roomId: client.roomId });
    }

    this.connectedUsers.delete(client.id);
    this.logger.log(`User ${client.userId} disconnected from study rooms gateway`);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; roomCode?: string }
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Join the study room
      const participant = await this.realTimeStudyService.joinStudyRoom(
        data.roomId,
        client.userId,
        data.roomCode
      );

      // Join Socket.IO room
      client.join(data.roomId);
      client.roomId = data.roomId;

      // Get updated room details
      const room = await this.realTimeStudyService.getStudyRoomDetails(data.roomId);

      // Notify user of successful join
      client.emit('joinedRoom', { room, participant });

      // Notify other participants
      client.to(data.roomId).emit('userJoined', { participant });

      // Send room activity
      this.broadcastActivity(data.roomId, {
        type: 'USER_JOINED',
        userId: client.userId,
        displayName: participant.displayName,
        timestamp: new Date(),
      });

      this.logger.log(`User ${client.userId} joined room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Failed to join room:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      if (!client.userId) return;

      // Leave the study room
      await this.realTimeStudyService.leaveStudyRoom(data.roomId, client.userId);

      // Leave Socket.IO room
      client.leave(data.roomId);
      client.roomId = undefined;

      // Notify other participants
      client.to(data.roomId).emit('userLeft', { userId: client.userId });

      // Send room activity
      this.broadcastActivity(data.roomId, {
        type: 'USER_LEFT',
        userId: client.userId,
        displayName: 'User', // Would get from participant data
        timestamp: new Date(),
      });

      client.emit('leftRoom', { roomId: data.roomId });

      this.logger.log(`User ${client.userId} left room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Failed to leave room:', error);
    }
  }

  @SubscribeMessage('startQuiz')
  async startQuiz(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Start quiz session
      const session = await this.realTimeStudyService.startQuizSession(data.roomId, client.userId);

      // Notify all participants
      this.server.to(data.roomId).emit('quizStarted', { session });

      // Send first question
      await this.sendCurrentQuestion(data.roomId, session.id);

      // Send room activity
      this.broadcastActivity(data.roomId, {
        type: 'QUIZ_STARTED',
        userId: client.userId,
        displayName: 'Host',
        timestamp: new Date(),
      });

      this.logger.log(`Quiz started in room ${data.roomId} by user ${client.userId}`);
    } catch (error) {
      this.logger.error('Failed to start quiz:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('submitAnswer')
  async submitAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; answer: string; timeToAnswer: number }
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Submit answer
      const result = await this.realTimeStudyService.submitQuizAnswer(
        data.sessionId,
        client.userId,
        data.answer,
        data.timeToAnswer
      );

      // Send result to user
      client.emit('answerResult', {
        isCorrect: result.isCorrect,
        explanation: result.explanation,
      });

      // Get updated session
      const session = await this.realTimeStudyService.getSessionDetails(data.sessionId);
      if (session) {
        // Update leaderboard for all participants
        this.server.to(session.roomId).emit('leaderboardUpdate', {
          leaderboard: session.leaderboard,
        });

        // Check if all participants have answered
        const allAnswered = session.participants.every(p => p.hasAnswered);
        if (allAnswered) {
          // Move to next question or end quiz
          await this.handleQuestionComplete(session);
        }
      }

      this.logger.debug(`Answer submitted by user ${client.userId} for session ${data.sessionId}`);
    } catch (error) {
      this.logger.error('Failed to submit answer:', error);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; message: string; type: 'TEXT' | 'EMOJI' | 'REACTION' }
  ) {
    try {
      if (!client.userId || !client.roomId) {
        client.emit('error', { message: 'User not in a room' });
        return;
      }

      // Get participant info for display name
      const room = await this.realTimeStudyService.getStudyRoomDetails(data.roomId);
      const participant = room?.participants.find(p => p.userId === client.userId);

      if (!participant) {
        client.emit('error', { message: 'Participant not found' });
        return;
      }

      const messageData = {
        id: `msg_${Date.now()}_${client.userId}`,
        userId: client.userId,
        displayName: participant.displayName,
        message: data.message,
        type: data.type,
        timestamp: new Date(),
      };

      // Broadcast message to all room participants
      this.server.to(data.roomId).emit('messageReceived', messageData);

      // Send room activity
      this.broadcastActivity(data.roomId, {
        type: 'MESSAGE_SENT',
        userId: client.userId,
        displayName: participant.displayName,
        timestamp: new Date(),
        data: { messageType: data.type },
      });

      this.logger.debug(`Message sent by user ${client.userId} in room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('setReady')
  async setReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; isReady: boolean }
  ) {
    try {
      if (!client.userId) return;

      const room = await this.realTimeStudyService.getStudyRoomDetails(data.roomId);
      if (!room) return;

      const participant = room.participants.find(p => p.userId === client.userId);
      if (participant) {
        participant.isReady = data.isReady;

        // Notify all participants of ready status change
        this.server.to(data.roomId).emit('participantReadyChanged', {
          userId: client.userId,
          isReady: data.isReady,
        });

        // Check if all participants are ready
        const allReady = room.participants.filter(p => p.isActive).every(p => p.isReady);
        if (allReady && room.participants.filter(p => p.isActive).length > 0) {
          this.server.to(data.roomId).emit('allParticipantsReady', { canStartQuiz: true });
        }
      }
    } catch (error) {
      this.logger.error('Failed to set ready status:', error);
    }
  }

  private async sendCurrentQuestion(roomId: string, sessionId: string) {
    try {
      const session = await this.realTimeStudyService.getSessionDetails(sessionId);
      if (!session || !session.currentQuestionId) return;

      // Get question details
      const question = await this.prisma.question.findUnique({
        where: { id: session.currentQuestionId },
        select: {
          id: true,
          content: true,
          options: true,
          difficulty: true,
          category: true,
          estimatedTimeToSolve: true,
        },
      });

      if (question) {
        // Send question to all participants
        this.server.to(roomId).emit('currentQuestion', {
          question,
          questionIndex: session.questionIndex,
          totalQuestions: session.totalQuestions,
          timeLimit: session.timeRemaining,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send current question:', error);
    }
  }

  private async handleQuestionComplete(session: any) {
    try {
      // Show results for current question
      this.server.to(session.roomId).emit('questionResults', {
        results: session.participants.map(p => ({
          userId: p.userId,
          answer: p.answer,
          isCorrect: p.isCorrect,
          timeToAnswer: p.timeToAnswer,
        })),
      });

      // Wait a moment for results to be shown
      setTimeout(async () => {
        // Move to next question or end quiz
        if (session.questionIndex < session.totalQuestions - 1) {
          session.questionIndex++;
          // Reset participants for next question
          session.participants.forEach(p => {
            p.hasAnswered = false;
            p.answer = undefined;
            p.timeToAnswer = undefined;
            p.isCorrect = undefined;
          });

          // Send next question
          await this.sendCurrentQuestion(session.roomId, session.id);
        } else {
          // End quiz
          session.status = 'COMPLETED';
          this.server.to(session.roomId).emit('quizCompleted', {
            finalLeaderboard: session.leaderboard,
            sessionSummary: {
              totalQuestions: session.totalQuestions,
              duration: Date.now() - session.startedAt.getTime(),
            },
          });

          // Send final activity
          this.broadcastActivity(session.roomId, {
            type: 'QUIZ_COMPLETED',
            userId: 'system',
            displayName: 'System',
            timestamp: new Date(),
          });
        }
      }, 3000); // 3 second delay to show results
    } catch (error) {
      this.logger.error('Failed to handle question complete:', error);
    }
  }

  private broadcastActivity(roomId: string, activity: any) {
    this.server.to(roomId).emit('roomActivity', activity);
  }

  private async validateTokenAndGetUserId(token: string): Promise<string | null> {
    try {
      // Simplified token validation - implement proper JWT validation
      // This is a placeholder implementation
      const cleanToken = token.replace('Bearer ', '');
      
      // In production, use your JWT service to validate and decode
      // const decoded = await this.jwtService.verify(cleanToken);
      // return decoded.sub;
      
      // For now, return a mock user ID
      return 'user-id-from-token';
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      return null;
    }
  }

  // Placeholder for Prisma service access (would be injected)
  private get prisma() {
    // This would be injected via constructor
    return null as any;
  }
}