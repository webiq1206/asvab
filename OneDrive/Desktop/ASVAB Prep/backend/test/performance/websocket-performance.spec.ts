import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CollaborationModule } from '../../src/collaboration/collaboration.module';
import { StudyRoomGateway } from '../../src/collaboration/gateways/study-room.gateway';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { io, Socket } from 'socket.io-client';

describe('WebSocket Performance Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let studyRoomGateway: StudyRoomGateway;
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

    await setupPerformanceTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Connection Performance', () => {
    it('should handle 50 concurrent connections within acceptable time', async () => {
      const connectionCount = 50;
      const maxConnectionTime = 2000; // 2 seconds
      const connections: Socket[] = [];
      const startTime = Date.now();

      try {
        // Create all connections simultaneously
        const connectionPromises = Array.from({ length: connectionCount }, (_, index) =>
          new Promise<Socket>((resolve, reject) => {
            const socket = io(`http://localhost:${serverPort}`, {
              auth: { token: `test-token-${index}` },
              transports: ['websocket'],
              timeout: 5000,
            });

            const connectionTimer = setTimeout(() => {
              reject(new Error(`Connection ${index} timed out`));
            }, 5000);

            socket.on('connect', () => {
              clearTimeout(connectionTimer);
              connections.push(socket);
              resolve(socket);
            });

            socket.on('connect_error', (error) => {
              clearTimeout(connectionTimer);
              reject(error);
            });
          })
        );

        // Wait for all connections
        await Promise.all(connectionPromises);
        const totalConnectionTime = Date.now() - startTime;

        // Assert
        expect(connections).toHaveLength(connectionCount);
        expect(totalConnectionTime).toBeLessThan(maxConnectionTime);
        
        console.log(`✅ ${connectionCount} connections established in ${totalConnectionTime}ms`);
      } finally {
        // Clean up connections
        connections.forEach(socket => socket.disconnect());
      }
    });

    it('should handle connection drops and reconnections gracefully', async () => {
      const reconnectionCount = 10;
      const maxReconnectionTime = 1000; // 1 second per reconnection
      
      const socket = io(`http://localhost:${serverPort}`, {
        auth: { token: 'test-reconnection-token' },
        transports: ['websocket'],
      });

      await new Promise(resolve => socket.on('connect', resolve));

      try {
        for (let i = 0; i < reconnectionCount; i++) {
          const startTime = Date.now();
          
          // Disconnect
          socket.disconnect();
          
          // Reconnect
          const reconnectPromise = new Promise(resolve => {
            socket.on('connect', resolve);
          });
          
          socket.connect();
          await reconnectPromise;
          
          const reconnectionTime = Date.now() - startTime;
          expect(reconnectionTime).toBeLessThan(maxReconnectionTime);
        }
        
        console.log(`✅ ${reconnectionCount} reconnections completed successfully`);
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('Message Broadcasting Performance', () => {
    it('should broadcast messages to 100 users within 500ms', async () => {
      const userCount = 100;
      const maxBroadcastTime = 500;
      const roomId = 'performance-broadcast-room';
      
      // Setup test room
      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'Performance Broadcast Room',
          description: 'Testing message broadcasting performance',
          category: 'ARITHMETIC_REASONING',
          branch: 'ARMY',
          maxParticipants: userCount,
          isActive: true,
          createdById: 'performance-test-user',
        },
      });

      const connections: Socket[] = [];
      const messagePromises: Promise<any>[] = [];

      try {
        // Create connections and join room
        for (let i = 0; i < userCount; i++) {
          const socket = io(`http://localhost:${serverPort}`, {
            auth: { token: `perf-token-${i}` },
            transports: ['websocket'],
          });

          await new Promise(resolve => socket.on('connect', resolve));
          
          connections.push(socket);
          
          // Join room
          socket.emit('joinRoom', { roomId, userId: `perf-user-${i}` });
          
          // Setup message listener
          if (i > 0) { // Don't listen on sender
            messagePromises.push(
              new Promise(resolve => {
                socket.on('messageReceived', resolve);
              })
            );
          }
        }

        // Wait a bit for all joins to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Send message and measure broadcast time
        const startTime = Date.now();
        const senderSocket = connections[0];
        
        senderSocket.emit('sendMessage', {
          roomId,
          message: 'Performance test message broadcast',
          userId: 'perf-user-0',
        });

        // Wait for all messages to be received
        await Promise.all(messagePromises);
        const broadcastTime = Date.now() - startTime;

        // Assert
        expect(broadcastTime).toBeLessThan(maxBroadcastTime);
        console.log(`✅ Message broadcast to ${userCount} users in ${broadcastTime}ms`);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    });

    it('should handle high-frequency messaging without performance degradation', async () => {
      const messageCount = 1000;
      const userCount = 10;
      const maxTotalTime = 5000; // 5 seconds
      const roomId = 'high-frequency-room';

      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'High Frequency Room',
          description: 'Testing high-frequency messaging',
          category: 'MATHEMATICS_KNOWLEDGE',
          branch: 'NAVY',
          maxParticipants: userCount,
          isActive: true,
          createdById: 'high-freq-test-user',
        },
      });

      const connections: Socket[] = [];
      let receivedMessages = 0;
      const expectedTotalMessages = messageCount * (userCount - 1); // Each message received by all except sender

      try {
        // Setup connections
        for (let i = 0; i < userCount; i++) {
          const socket = io(`http://localhost:${serverPort}`, {
            auth: { token: `freq-token-${i}` },
            transports: ['websocket'],
          });

          await new Promise(resolve => socket.on('connect', resolve));
          connections.push(socket);

          socket.emit('joinRoom', { roomId, userId: `freq-user-${i}` });

          // Count received messages
          socket.on('messageReceived', () => {
            receivedMessages++;
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        const startTime = Date.now();

        // Send messages rapidly
        for (let i = 0; i < messageCount; i++) {
          const senderIndex = i % userCount;
          connections[senderIndex].emit('sendMessage', {
            roomId,
            message: `High frequency message ${i}`,
            userId: `freq-user-${senderIndex}`,
          });

          // Small delay to prevent overwhelming
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Wait for all messages to propagate
        const checkInterval = setInterval(() => {
          if (receivedMessages >= expectedTotalMessages) {
            clearInterval(checkInterval);
          }
        }, 100);

        // Wait with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Timeout waiting for messages'));
          }, maxTotalTime);

          checkInterval;
          
          const finalCheck = setInterval(() => {
            if (receivedMessages >= expectedTotalMessages) {
              clearInterval(finalCheck);
              clearTimeout(timeout);
              resolve(undefined);
            }
          }, 50);
        });

        const totalTime = Date.now() - startTime;

        // Assert
        expect(receivedMessages).toBe(expectedTotalMessages);
        expect(totalTime).toBeLessThan(maxTotalTime);
        console.log(`✅ ${messageCount} messages processed in ${totalTime}ms`);
        console.log(`📊 Average: ${(totalTime / messageCount).toFixed(2)}ms per message`);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    });
  });

  describe('Quiz Session Performance', () => {
    it('should handle live quiz with 50 participants efficiently', async () => {
      const participantCount = 50;
      const questionCount = 10;
      const maxQuizSetupTime = 3000; // 3 seconds
      const roomId = 'performance-quiz-room';

      await prismaService.studyRoom.create({
        data: {
          id: roomId,
          name: 'Performance Quiz Room',
          description: 'Testing live quiz performance',
          category: 'GENERAL_SCIENCE',
          branch: 'AIR_FORCE',
          maxParticipants: participantCount,
          isActive: true,
          createdById: 'quiz-perf-test-user',
        },
      });

      const connections: Socket[] = [];
      const quizStartPromises: Promise<any>[] = [];

      try {
        // Setup participants
        for (let i = 0; i < participantCount; i++) {
          const socket = io(`http://localhost:${serverPort}`, {
            auth: { token: `quiz-token-${i}` },
            transports: ['websocket'],
          });

          await new Promise(resolve => socket.on('connect', resolve));
          connections.push(socket);

          socket.emit('joinRoom', { roomId, userId: `quiz-user-${i}` });

          if (i > 0) { // Don't listen on quiz starter
            quizStartPromises.push(
              new Promise(resolve => socket.on('quizStarted', resolve))
            );
          }
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        // Start quiz and measure setup time
        const startTime = Date.now();
        
        connections[0].emit('startQuiz', {
          roomId,
          category: 'GENERAL_SCIENCE',
          difficulty: 'MEDIUM',
          questionCount,
          timeLimit: 600,
        });

        await Promise.all(quizStartPromises);
        const quizSetupTime = Date.now() - startTime;

        // Assert
        expect(quizSetupTime).toBeLessThan(maxQuizSetupTime);
        console.log(`✅ Quiz setup for ${participantCount} participants in ${quizSetupTime}ms`);

        // Test answer submission performance
        const answerPromises: Promise<any>[] = [];
        connections.slice(1).forEach(socket => {
          answerPromises.push(
            new Promise(resolve => socket.on('leaderboardUpdate', resolve))
          );
        });

        const answerStartTime = Date.now();
        
        // Submit answers simultaneously
        connections.forEach((socket, index) => {
          socket.emit('submitAnswer', {
            roomId,
            questionId: 'test-question-1',
            answer: 'A',
            userId: `quiz-user-${index}`,
            timeSpent: 30,
          });
        });

        await Promise.all(answerPromises);
        const answerProcessingTime = Date.now() - answerStartTime;

        expect(answerProcessingTime).toBeLessThan(2000); // 2 seconds for answer processing
        console.log(`✅ Answer processing for ${participantCount} participants in ${answerProcessingTime}ms`);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks with frequent connections', async () => {
      const iterations = 20;
      const connectionsPerIteration = 10;
      
      const initialMemory = process.memoryUsage();

      for (let iteration = 0; iteration < iterations; iteration++) {
        const connections: Socket[] = [];

        // Create connections
        for (let i = 0; i < connectionsPerIteration; i++) {
          const socket = io(`http://localhost:${serverPort}`, {
            auth: { token: `memory-token-${iteration}-${i}` },
            transports: ['websocket'],
          });

          await new Promise(resolve => socket.on('connect', resolve));
          connections.push(socket);
        }

        // Use connections briefly
        await new Promise(resolve => setTimeout(resolve, 100));

        // Disconnect all
        connections.forEach(socket => socket.disconnect());

        // Allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAcceptableIncrease = 50 * 1024 * 1024; // 50MB

      // Assert
      expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);
      console.log(`📊 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle connection cleanup efficiently', async () => {
      const connectionCount = 100;
      const maxCleanupTime = 2000; // 2 seconds

      const connections: Socket[] = [];

      // Create connections
      for (let i = 0; i < connectionCount; i++) {
        const socket = io(`http://localhost:${serverPort}`, {
          auth: { token: `cleanup-token-${i}` },
          transports: ['websocket'],
        });

        await new Promise(resolve => socket.on('connect', resolve));
        connections.push(socket);
      }

      // Measure cleanup time
      const startTime = Date.now();
      
      // Disconnect all simultaneously
      connections.forEach(socket => socket.disconnect());

      // Wait for server-side cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      const cleanupTime = Date.now() - startTime;

      // Assert
      expect(cleanupTime).toBeLessThan(maxCleanupTime);
      console.log(`✅ Cleanup of ${connectionCount} connections in ${cleanupTime}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle stress test scenario with multiple rooms and activities', async () => {
      const roomCount = 10;
      const usersPerRoom = 10;
      const messagesPerUser = 5;
      const maxStressTestTime = 10000; // 10 seconds

      const startTime = Date.now();

      // Create test rooms
      const roomIds = [];
      for (let i = 0; i < roomCount; i++) {
        const roomId = `stress-room-${i}`;
        roomIds.push(roomId);
        
        await prismaService.studyRoom.create({
          data: {
            id: roomId,
            name: `Stress Test Room ${i}`,
            description: 'Stress testing concurrent activities',
            category: 'WORD_KNOWLEDGE',
            branch: 'MARINES',
            maxParticipants: usersPerRoom,
            isActive: true,
            createdById: 'stress-test-user',
          },
        });
      }

      const allConnections: Socket[] = [];

      try {
        // Create users and join rooms
        for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
          const roomId = roomIds[roomIndex];
          
          for (let userIndex = 0; userIndex < usersPerRoom; userIndex++) {
            const socket = io(`http://localhost:${serverPort}`, {
              auth: { token: `stress-token-${roomIndex}-${userIndex}` },
              transports: ['websocket'],
            });

            await new Promise(resolve => socket.on('connect', resolve));
            allConnections.push(socket);

            socket.emit('joinRoom', { 
              roomId, 
              userId: `stress-user-${roomIndex}-${userIndex}` 
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate concurrent activity
        const messagePromises = [];
        for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
          const roomId = roomIds[roomIndex];
          const roomConnections = allConnections.slice(
            roomIndex * usersPerRoom,
            (roomIndex + 1) * usersPerRoom
          );

          for (const socket of roomConnections) {
            for (let msgIndex = 0; msgIndex < messagesPerUser; msgIndex++) {
              messagePromises.push(
                new Promise<void>(resolve => {
                  setTimeout(() => {
                    socket.emit('sendMessage', {
                      roomId,
                      message: `Stress message ${msgIndex}`,
                      userId: `stress-user-${roomIndex}-${socket.id}`,
                    });
                    resolve();
                  }, Math.random() * 1000);
                })
              );
            }
          }
        }

        await Promise.all(messagePromises);

        const totalTime = Date.now() - startTime;

        // Assert
        expect(totalTime).toBeLessThan(maxStressTestTime);
        console.log(`✅ Stress test completed in ${totalTime}ms`);
        console.log(`📊 ${roomCount} rooms, ${usersPerRoom * roomCount} users, ${messagesPerUser * usersPerRoom * roomCount} messages`);

      } finally {
        allConnections.forEach(socket => socket.disconnect());
      }
    });
  });

  // Helper functions
  async function setupPerformanceTestData() {
    // Create test questions for quiz performance tests
    const testQuestions = [
      {
        id: 'test-question-1',
        content: 'What is the chemical symbol for gold?',
        category: 'GENERAL_SCIENCE',
        difficulty: 'MEDIUM',
        correctAnswer: 'C',
        options: JSON.stringify(['Go', 'Gd', 'Au', 'Ag']),
        explanation: 'The chemical symbol for gold is Au, from the Latin aurum.',
        tags: JSON.stringify(['chemistry', 'elements']),
        branchRelevance: JSON.stringify(['ARMY', 'NAVY', 'AIR_FORCE', 'MARINES']),
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

    // Create performance test users
    const performanceUsers = [
      'performance-test-user',
      'high-freq-test-user',
      'quiz-perf-test-user',
      'stress-test-user',
    ];

    for (const userId of performanceUsers) {
      await prismaService.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@perf.test`,
          passwordHash: 'hashed',
          selectedBranch: 'ARMY',
          subscriptionTier: 'PREMIUM',
        },
      });
    }
  }

  async function cleanupTestData() {
    // Clean up performance test data
    await prismaService.studyRoomParticipant.deleteMany({});
    await prismaService.studyRoom.deleteMany({
      where: {
        id: {
          startsWith: 'performance-',
        },
      },
    });
    
    await prismaService.studyRoom.deleteMany({
      where: {
        id: {
          startsWith: 'high-frequency-',
        },
      },
    });

    await prismaService.studyRoom.deleteMany({
      where: {
        id: {
          startsWith: 'stress-room-',
        },
      },
    });

    const performanceUsers = [
      'performance-test-user',
      'high-freq-test-user', 
      'quiz-perf-test-user',
      'stress-test-user',
    ];

    await prismaService.user.deleteMany({
      where: { id: { in: performanceUsers } },
    });

    await prismaService.question.deleteMany({
      where: { id: 'test-question-1' },
    });
  }
});