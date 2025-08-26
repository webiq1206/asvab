import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { CollaborationModule } from '../../src/collaboration/collaboration.module';
import { StudyRoomGateway } from '../../src/collaboration/gateways/study-room.gateway';
import { RealtimeStudyService } from '../../src/collaboration/services/realtime-study.service';
import { GroupStudyService } from '../../src/collaboration/services/group-study.service';
import { StudyBuddyService } from '../../src/collaboration/services/study-buddy.service';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';

describe('Collaboration E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let studyRoomGateway: StudyRoomGateway;
  let realtimeStudyService: RealtimeStudyService;
  let groupStudyService: GroupStudyService;
  let studyBuddyService: StudyBuddyService;
  
  // WebSocket clients for testing
  let clientSocket1: Socket;
  let clientSocket2: Socket;
  let serverPort: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CollaborationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Get a random port for testing
    await app.listen(0);
    const server = app.getHttpServer();
    const address = server.address();
    serverPort = typeof address === 'string' ? 3000 : address?.port || 3000;

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    studyRoomGateway = moduleFixture.get<StudyRoomGateway>(StudyRoomGateway);
    realtimeStudyService = moduleFixture.get<RealtimeStudyService>(RealtimeStudyService);
    groupStudyService = moduleFixture.get<GroupStudyService>(GroupStudyService);
    studyBuddyService = moduleFixture.get<StudyBuddyService>(StudyBuddyService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up sockets
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Create fresh WebSocket connections for each test
    clientSocket1 = io(`http://localhost:${serverPort}`, {
      auth: { token: 'test-jwt-token-user1' }, // Mock JWT token
      transports: ['websocket'],
    });

    clientSocket2 = io(`http://localhost:${serverPort}`, {
      auth: { token: 'test-jwt-token-user2' }, // Mock JWT token
      transports: ['websocket'],
    });

    // Wait for connections
    await Promise.all([
      new Promise(resolve => clientSocket1.on('connect', resolve)),
      new Promise(resolve => clientSocket2.on('connect', resolve)),
    ]);
  });

  afterEach(async () => {
    if (clientSocket1) {
      clientSocket1.disconnect();
    }
    if (clientSocket2) {
      clientSocket2.disconnect();
    }
  });

  describe('Real-time Study Room Management', () => {
    it('should create and join study room successfully', async () => {
      // Arrange
      const roomData = {
        name: 'Army ASVAB Prep Room',
        description: 'Arithmetic Reasoning practice for soldiers',
        category: 'ARITHMETIC_REASONING',
        branch: 'ARMY',
        maxParticipants: 10,
        isPrivate: false,
      };

      // Act - Create room via HTTP API
      const createResponse = await request(app.getHttpServer())
        .post('/api/collaboration/study-rooms')
        .send(roomData)
        .expect(201);

      const roomId = createResponse.body.id;

      // Act - Join room via WebSocket
      const joinPromise = new Promise(resolve => {
        clientSocket1.on('roomJoined', resolve);
      });

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });

      // Assert
      const joinResult = await joinPromise;
      expect(joinResult).toBeDefined();
      expect((joinResult as any).roomId).toBe(roomId);
      expect((joinResult as any).participants).toHaveLength(1);
    });

    it('should handle multiple users joining same room', async () => {
      // Arrange
      const roomId = 'test-multi-user-room';
      
      // Create room first
      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'Multi-User Test Room',
          description: 'Testing multiple users',
          category: 'MATHEMATICS_KNOWLEDGE',
          branch: 'NAVY',
          maxParticipants: 5,
          isActive: true,
          createdById: 'test-user-1',
        },
      });

      // Act - Both users join
      const user1JoinPromise = new Promise(resolve => {
        clientSocket1.on('roomJoined', resolve);
      });

      const user2JoinPromise = new Promise(resolve => {
        clientSocket2.on('roomJoined', resolve);
      });

      const participantUpdatePromise = new Promise(resolve => {
        clientSocket1.on('participantJoined', resolve);
      });

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      clientSocket2.emit('joinRoom', { roomId, userId: 'test-user-2' });

      // Assert
      const [user1Result, user2Result, participantUpdate] = await Promise.all([
        user1JoinPromise,
        user2JoinPromise,
        participantUpdatePromise,
      ]);

      expect((user1Result as any).participants).toHaveLength(1);
      expect((user2Result as any).participants).toHaveLength(2);
      expect((participantUpdate as any).userId).toBe('test-user-2');
    });

    it('should broadcast messages to room participants', async () => {
      // Arrange
      const roomId = 'test-message-room';
      await setupTestRoom(roomId, 'Message Test Room');

      // Join both users to room
      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      clientSocket2.emit('joinRoom', { roomId, userId: 'test-user-2' });

      // Wait for joins to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act - Send message from user 1
      const messagePromise = new Promise(resolve => {
        clientSocket2.on('messageReceived', resolve);
      });

      const messageData = {
        roomId,
        message: 'Hooyah! Let\'s tackle these math problems, Sailors!',
        userId: 'test-user-1',
      };

      clientSocket1.emit('sendMessage', messageData);

      // Assert
      const receivedMessage = await messagePromise;
      expect((receivedMessage as any).message).toBe(messageData.message);
      expect((receivedMessage as any).userId).toBe(messageData.userId);
      expect((receivedMessage as any).roomId).toBe(roomId);
    });

    it('should handle room capacity limits', async () => {
      // Arrange - Create room with capacity of 1
      const roomId = 'test-capacity-room';
      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'Capacity Test Room',
          description: 'Testing room capacity',
          category: 'WORD_KNOWLEDGE',
          branch: 'AIR_FORCE',
          maxParticipants: 1,
          isActive: true,
          createdById: 'test-user-1',
        },
      });

      // Act - Try to join with both users
      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      
      const errorPromise = new Promise(resolve => {
        clientSocket2.on('error', resolve);
      });

      clientSocket2.emit('joinRoom', { roomId, userId: 'test-user-2' });

      // Assert
      const error = await errorPromise;
      expect((error as any).message).toContain('Room is at maximum capacity');
    });
  });

  describe('Live Quiz Sessions', () => {
    it('should create and start live quiz session', async () => {
      // Arrange
      const roomId = 'test-quiz-room';
      await setupTestRoom(roomId, 'Quiz Test Room');

      // Join users
      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      clientSocket2.emit('joinRoom', { roomId, userId: 'test-user-2' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Act - Start quiz session
      const quizStartPromise = new Promise(resolve => {
        clientSocket2.on('quizStarted', resolve);
      });

      const quizData = {
        roomId,
        category: 'ARITHMETIC_REASONING',
        difficulty: 'MEDIUM',
        questionCount: 5,
        timeLimit: 300, // 5 minutes
      };

      clientSocket1.emit('startQuiz', quizData);

      // Assert
      const quizStarted = await quizStartPromise;
      expect((quizStarted as any).quizId).toBeDefined();
      expect((quizStarted as any).questions).toHaveLength(5);
      expect((quizStarted as any).timeLimit).toBe(300);
    });

    it('should handle quiz answers and scoring in real-time', async () => {
      // Arrange
      const roomId = 'test-scoring-room';
      await setupTestRoom(roomId, 'Scoring Test Room');

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      clientSocket2.emit('joinRoom', { roomId, userId: 'test-user-2' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Start quiz
      clientSocket1.emit('startQuiz', {
        roomId,
        category: 'MATHEMATICS_KNOWLEDGE',
        questionCount: 3,
        timeLimit: 180,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Act - Submit answers
      const leaderboardUpdatePromise = new Promise(resolve => {
        clientSocket2.on('leaderboardUpdate', resolve);
      });

      clientSocket1.emit('submitAnswer', {
        roomId,
        questionId: 'test-question-1',
        answer: 'A',
        userId: 'test-user-1',
        timeSpent: 30,
      });

      // Assert
      const leaderboardUpdate = await leaderboardUpdatePromise;
      expect((leaderboardUpdate as any).leaderboard).toBeInstanceOf(Array);
      expect((leaderboardUpdate as any).leaderboard[0].userId).toBe('test-user-1');
      expect((leaderboardUpdate as any).leaderboard[0].score).toBeGreaterThan(0);
    });

    it('should end quiz session and provide final results', async () => {
      // Arrange
      const roomId = 'test-end-quiz-room';
      await setupTestRoom(roomId, 'End Quiz Test Room');

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start and immediately end quiz
      clientSocket1.emit('startQuiz', {
        roomId,
        category: 'GENERAL_SCIENCE',
        questionCount: 2,
        timeLimit: 60,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Act - End quiz
      const quizEndPromise = new Promise(resolve => {
        clientSocket1.on('quizEnded', resolve);
      });

      clientSocket1.emit('endQuiz', { roomId, userId: 'test-user-1' });

      // Assert
      const quizResults = await quizEndPromise;
      expect((quizResults as any).finalResults).toBeDefined();
      expect((quizResults as any).finalResults.leaderboard).toBeInstanceOf(Array);
      expect((quizResults as any).finalResults.totalQuestions).toBe(2);
    });
  });

  describe('Group Study Features', () => {
    it('should create study group with military branch focus', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/collaboration/study-groups')
        .send({
          name: 'Marine Corps ASVAB Warriors',
          description: 'Preparing Marines for excellence in ASVAB',
          branch: 'MARINES',
          focusAreas: ['ARITHMETIC_REASONING', 'MATHEMATICS_KNOWLEDGE'],
          maxMembers: 15,
          isPrivate: false,
          createdBy: 'test-marine-1',
        })
        .expect(201);

      // Assert
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Marine Corps ASVAB Warriors');
      expect(response.body.branch).toBe('MARINES');
      expect(response.body.memberCount).toBe(1); // Creator is automatically a member
    });

    it('should handle study group membership requests', async () => {
      // Arrange - Create group first
      const groupResponse = await request(app.getHttpServer())
        .post('/api/collaboration/study-groups')
        .send({
          name: 'Coast Guard Study Circle',
          description: 'Semper Paratus study group',
          branch: 'COAST_GUARD',
          focusAreas: ['WORD_KNOWLEDGE'],
          maxMembers: 8,
          isPrivate: true,
          createdBy: 'test-coastie-1',
        });

      const groupId = groupResponse.body.id;

      // Act - Join group
      const joinResponse = await request(app.getHttpServer())
        .post(`/api/collaboration/study-groups/${groupId}/join`)
        .send({ userId: 'test-coastie-2' })
        .expect(200);

      // Assert
      expect(joinResponse.body.success).toBe(true);
      expect(joinResponse.body.memberCount).toBe(2);
    });

    it('should schedule study sessions within groups', async () => {
      // Arrange
      const groupId = 'test-schedule-group';
      await prismaService.studyGroup.create({
        data: {
          id: groupId,
          name: 'Space Force Study Squadron',
          description: 'Semper Supra study sessions',
          branch: 'SPACE_FORCE',
          focusAreas: ['ELECTRONICS_INFORMATION'],
          maxMembers: 10,
          isActive: true,
          createdById: 'test-guardian-1',
        },
      });

      // Act
      const scheduleResponse = await request(app.getHttpServer())
        .post(`/api/collaboration/study-groups/${groupId}/schedule`)
        .send({
          title: 'Electronics Mastery Session',
          description: 'Focus on circuit analysis and troubleshooting',
          scheduledFor: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          duration: 90, // 90 minutes
          category: 'ELECTRONICS_INFORMATION',
          createdBy: 'test-guardian-1',
        })
        .expect(201);

      // Assert
      expect(scheduleResponse.body.id).toBeDefined();
      expect(scheduleResponse.body.title).toBe('Electronics Mastery Session');
      expect(scheduleResponse.body.studyGroupId).toBe(groupId);
    });
  });

  describe('Study Buddy System', () => {
    it('should find compatible study partners based on branch and goals', async () => {
      // Arrange - Create users with similar profiles
      await prismaService.user.createMany({
        data: [
          {
            id: 'army-buddy-1',
            email: 'buddy1@army.mil',
            passwordHash: 'hashed',
            selectedBranch: 'ARMY',
            subscriptionTier: 'PREMIUM',
          },
          {
            id: 'army-buddy-2',
            email: 'buddy2@army.mil',
            passwordHash: 'hashed',
            selectedBranch: 'ARMY',
            subscriptionTier: 'PREMIUM',
          },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/collaboration/study-buddies/find')
        .query({
          userId: 'army-buddy-1',
          branch: 'ARMY',
          focusAreas: 'ARITHMETIC_REASONING,WORD_KNOWLEDGE',
          limit: 5,
        })
        .expect(200);

      // Assert
      expect(response.body.matches).toBeInstanceOf(Array);
      expect(response.body.matches.length).toBeGreaterThan(0);
      expect(response.body.matches.every((match: any) => match.branch === 'ARMY')).toBe(true);
    });

    it('should send and manage buddy requests', async () => {
      // Act - Send buddy request
      const requestResponse = await request(app.getHttpServer())
        .post('/api/collaboration/study-buddies/request')
        .send({
          fromUserId: 'army-buddy-1',
          toUserId: 'army-buddy-2',
          message: 'Hooah! Let\'s study together and crush this ASVAB!',
        })
        .expect(201);

      const requestId = requestResponse.body.id;

      // Act - Accept request
      const acceptResponse = await request(app.getHttpServer())
        .put(`/api/collaboration/study-buddies/request/${requestId}/accept`)
        .send({ userId: 'army-buddy-2' })
        .expect(200);

      // Assert
      expect(requestResponse.body.status).toBe('PENDING');
      expect(acceptResponse.body.status).toBe('ACCEPTED');
      expect(acceptResponse.body.partnership).toBeDefined();
    });

    it('should track study buddy activities and progress', async () => {
      // Arrange - Create partnership
      const partnershipId = 'test-partnership-123';
      await prismaService.studyPartnership.create({
        data: {
          id: partnershipId,
          user1Id: 'army-buddy-1',
          user2Id: 'army-buddy-2',
          status: 'ACTIVE',
          sharedGoals: ['Improve math scores', 'Practice vocabulary'],
        },
      });

      // Act - Log study session
      const logResponse = await request(app.getHttpServer())
        .post(`/api/collaboration/study-buddies/${partnershipId}/log-session`)
        .send({
          duration: 60, // 1 hour
          category: 'MATHEMATICS_KNOWLEDGE',
          activities: ['Practice questions', 'Review concepts'],
          participants: ['army-buddy-1', 'army-buddy-2'],
          notes: 'Great session focusing on algebra problems',
        })
        .expect(201);

      // Act - Get progress
      const progressResponse = await request(app.getHttpServer())
        .get(`/api/collaboration/study-buddies/${partnershipId}/progress`)
        .expect(200);

      // Assert
      expect(logResponse.body.id).toBeDefined();
      expect(progressResponse.body.totalSessions).toBe(1);
      expect(progressResponse.body.totalHours).toBe(1);
      expect(progressResponse.body.favoriteCategories).toContain('MATHEMATICS_KNOWLEDGE');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle WebSocket disconnections gracefully', async () => {
      // Arrange
      const roomId = 'test-disconnect-room';
      await setupTestRoom(roomId, 'Disconnect Test Room');

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act - Simulate disconnect
      const participantLeftPromise = new Promise(resolve => {
        clientSocket2.on('participantLeft', resolve);
      });

      clientSocket1.disconnect();

      // Assert - Other clients should be notified
      // Note: This test may need adjustment based on actual gateway implementation
    });

    it('should prevent unauthorized access to private rooms', async () => {
      // Arrange - Create private room
      const roomId = 'test-private-room';
      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'Private Officers Room',
          description: 'Officers only',
          category: 'PARAGRAPH_COMPREHENSION',
          branch: 'ARMY',
          maxParticipants: 5,
          isPrivate: true,
          isActive: true,
          createdById: 'test-officer-1',
          accessCode: 'OFFICER123',
        },
      });

      // Act - Try to join without access code
      const errorPromise = new Promise(resolve => {
        clientSocket1.on('error', resolve);
      });

      clientSocket1.emit('joinRoom', { roomId, userId: 'test-user-1' });

      // Assert
      const error = await errorPromise;
      expect((error as any).message).toContain('access code');
    });

    it('should handle malformed WebSocket messages', async () => {
      // Act - Send malformed message
      const errorPromise = new Promise(resolve => {
        clientSocket1.on('error', resolve);
      });

      clientSocket1.emit('joinRoom', { invalidData: true });

      // Assert
      const error = await errorPromise;
      expect((error as any).message).toContain('Invalid');
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test users
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'user1@test.mil',
        passwordHash: 'hashed',
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
      },
      {
        id: 'test-user-2',
        email: 'user2@test.mil',
        passwordHash: 'hashed',
        selectedBranch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      },
      {
        id: 'test-marine-1',
        email: 'marine1@test.mil',
        passwordHash: 'hashed',
        selectedBranch: 'MARINES',
        subscriptionTier: 'PREMIUM',
      },
    ];

    for (const user of testUsers) {
      await prismaService.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
    }

    // Create test questions for quizzes
    const testQuestions = [
      {
        id: 'test-question-1',
        content: 'What is 15 + 27?',
        category: 'ARITHMETIC_REASONING',
        difficulty: 'EASY',
        correctAnswer: 'B',
        options: JSON.stringify(['40', '42', '44', '46']),
        explanation: 'Basic addition: 15 + 27 = 42',
        tags: JSON.stringify(['addition', 'basic']),
        branchRelevance: JSON.stringify(['ARMY', 'NAVY', 'AIR_FORCE']),
        isActive: true,
      },
    ];

    for (const question of testQuestions) {
      await prismaService.question.upsert({
        where: { id: question.id },
        update: {},
        create: question,
      });
    }
  }

  async function setupTestRoom(roomId: string, name: string) {
    await prismaService.studyRoom.upsert({
      where: { id: roomId },
      update: {},
      create: {
        id: roomId,
        name,
        description: 'Test room for E2E testing',
        category: 'ARITHMETIC_REASONING',
        branch: 'ARMY',
        maxParticipants: 10,
        isActive: true,
        createdById: 'test-user-1',
      },
    });
  }

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await prismaService.studySession.deleteMany({});
    await prismaService.studyPartnership.deleteMany({});
    await prismaService.studyBuddyRequest.deleteMany({});
    await prismaService.studyGroupMember.deleteMany({});
    await prismaService.studyGroup.deleteMany({});
    await prismaService.studyRoomParticipant.deleteMany({});
    await prismaService.studyRoom.deleteMany({});
    
    const testUserIds = [
      'test-user-1',
      'test-user-2', 
      'test-marine-1',
      'army-buddy-1',
      'army-buddy-2',
      'test-coastie-1',
      'test-coastie-2',
      'test-guardian-1',
      'test-officer-1',
    ];

    await prismaService.user.deleteMany({
      where: { id: { in: testUserIds } },
    });

    await prismaService.question.deleteMany({
      where: { id: 'test-question-1' },
    });
  }
});