import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudyGroupsService } from './services/study-groups.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MilitaryBranch, GroupRole } from '@prisma/client';

describe('StudyGroupsService', () => {
  let service: StudyGroupsService;
  let prismaService: PrismaService;
  let subscriptionsService: SubscriptionsService;

  const mockPrismaService = {
    studyGroup: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    studyGroupMember: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSubscriptionsService = {
    hasActivePremiumSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyGroupsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    service = module.get<StudyGroupsService>(StudyGroupsService);
    prismaService = module.get<PrismaService>(PrismaService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('createStudyGroup', () => {
    const userId = 'user-1';
    const userBranch = MilitaryBranch.ARMY;
    const createDto = {
      name: 'Army Study Group',
      description: 'Prepare for ASVAB together',
      isPublic: true,
      maxMembers: 20,
    };

    it('should create study group for premium user', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.count.mockResolvedValue(0);
      mockPrismaService.studyGroup.create.mockResolvedValue({
        id: 'group-1',
        ...createDto,
        branch: userBranch,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            avatarUrl: null,
            currentRank: 'PVT',
          },
        },
        _count: { members: 1 },
      });

      const result = await service.createStudyGroup(userId, userBranch, createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.branch).toBe(userBranch);
      expect(result.userRole).toBe(GroupRole.OWNER);
      expect(result.isJoined).toBe(true);
    });

    it('should throw ForbiddenException for non-premium user', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(false);

      await expect(service.createStudyGroup(userId, userBranch, createDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when user has max groups', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.count.mockResolvedValue(3);

      await expect(service.createStudyGroup(userId, userBranch, createDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('joinStudyGroup', () => {
    const groupId = 'group-1';
    const userId = 'user-2';

    it('should allow premium user to join group', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.findUnique.mockResolvedValue({
        id: groupId,
        maxMembers: 20,
        _count: { members: 5 },
        members: [], // User not already a member
      });
      mockPrismaService.studyGroupMember.count.mockResolvedValue(2); // User in 2 other groups
      mockPrismaService.studyGroupMember.create.mockResolvedValue({});

      await service.joinStudyGroup(groupId, userId);

      expect(mockPrismaService.studyGroupMember.create).toHaveBeenCalledWith({
        data: {
          groupId,
          userId,
          role: GroupRole.MEMBER,
        },
      });
    });

    it('should throw ForbiddenException for non-premium user', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(false);

      await expect(service.joinStudyGroup(groupId, userId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent group', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.findUnique.mockResolvedValue(null);

      await expect(service.joinStudyGroup(groupId, userId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when group is full', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.findUnique.mockResolvedValue({
        id: groupId,
        maxMembers: 20,
        _count: { members: 20 }, // Group is full
        members: [],
      });

      await expect(service.joinStudyGroup(groupId, userId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already a member', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.findUnique.mockResolvedValue({
        id: groupId,
        maxMembers: 20,
        _count: { members: 5 },
        members: [{ userId }], // User already a member
      });

      await expect(service.joinStudyGroup(groupId, userId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user has max group memberships', async () => {
      mockSubscriptionsService.hasActivePremiumSubscription.mockResolvedValue(true);
      mockPrismaService.studyGroup.findUnique.mockResolvedValue({
        id: groupId,
        maxMembers: 20,
        _count: { members: 5 },
        members: [],
      });
      mockPrismaService.studyGroupMember.count.mockResolvedValue(10); // User at max

      await expect(service.joinStudyGroup(groupId, userId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getStudyGroupsByBranch', () => {
    const userBranch = MilitaryBranch.ARMY;
    const userId = 'user-1';

    it('should return study groups for branch with pagination', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Army Study Group 1',
          description: 'First group',
          branch: userBranch,
          isPublic: true,
          maxMembers: 20,
          ownerId: 'owner-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: {
            firstName: 'John',
            lastName: 'Doe',
            profile: {
              avatarUrl: null,
              currentRank: 'SGT',
            },
          },
          members: [],
          _count: { members: 15 },
        },
      ];

      mockPrismaService.studyGroup.findMany.mockResolvedValue(mockGroups);
      mockPrismaService.studyGroup.count.mockResolvedValue(1);

      const result = await service.getStudyGroupsByBranch(userBranch, userId, 20, 0);

      expect(result.groups).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.groups[0].memberCount).toBe(15);
      expect(result.groups[0].isJoined).toBe(false);
    });

    it('should filter by search term', async () => {
      const searchTerm = 'Advanced';
      mockPrismaService.studyGroup.findMany.mockResolvedValue([]);
      mockPrismaService.studyGroup.count.mockResolvedValue(0);

      await service.getStudyGroupsByBranch(userBranch, userId, 20, 0, searchTerm);

      expect(mockPrismaService.studyGroup.findMany).toHaveBeenCalledWith({
        where: {
          branch: userBranch,
          isPublic: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
        skip: 0,
        take: 20,
      });
    });
  });

  describe('leaveStudyGroup', () => {
    const groupId = 'group-1';
    const userId = 'user-1';

    it('should allow member to leave group', async () => {
      mockPrismaService.studyGroupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        role: GroupRole.MEMBER,
      });
      mockPrismaService.studyGroupMember.delete.mockResolvedValue({});

      await service.leaveStudyGroup(groupId, userId);

      expect(mockPrismaService.studyGroupMember.delete).toHaveBeenCalledWith({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });
    });

    it('should delete group when owner leaves and no other members', async () => {
      mockPrismaService.studyGroupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        role: GroupRole.OWNER,
      });
      mockPrismaService.studyGroupMember.count.mockResolvedValue(0); // No other members
      mockPrismaService.studyGroup.delete.mockResolvedValue({});

      await service.leaveStudyGroup(groupId, userId);

      expect(mockPrismaService.studyGroup.delete).toHaveBeenCalledWith({
        where: { id: groupId },
      });
    });

    it('should throw BadRequestException when owner tries to leave with other members', async () => {
      mockPrismaService.studyGroupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        role: GroupRole.OWNER,
      });
      mockPrismaService.studyGroupMember.count.mockResolvedValue(3); // Other members exist

      await expect(service.leaveStudyGroup(groupId, userId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-member', async () => {
      mockPrismaService.studyGroupMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveStudyGroup(groupId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });
});