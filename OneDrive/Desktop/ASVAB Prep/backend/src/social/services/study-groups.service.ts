import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, GroupRole, Prisma } from '@prisma/client';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

export interface CreateStudyGroupDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export interface UpdateStudyGroupDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export interface StudyGroupWithStats {
  id: string;
  name: string;
  description: string | null;
  branch: MilitaryBranch;
  isPublic: boolean;
  maxMembers: number;
  memberCount: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
  userRole?: GroupRole;
  isJoined?: boolean;
}

@Injectable()
export class StudyGroupsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createStudyGroup(
    userId: string,
    userBranch: MilitaryBranch,
    createDto: CreateStudyGroupDto,
  ): Promise<StudyGroupWithStats> {
    // Check if user has premium (social features require premium)
    const isPremium = await this.subscriptionsService.hasActivePremiumSubscription(userId);
    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required for creating study groups');
    }

    // Check if user already owns the maximum number of groups (premium limit: 3)
    const existingGroups = await this.prisma.studyGroup.count({
      where: { ownerId: userId },
    });

    if (existingGroups >= 3) {
      throw new BadRequestException('Maximum of 3 study groups allowed per user');
    }

    const studyGroup = await this.prisma.studyGroup.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        branch: userBranch, // Groups are branch-specific
        isPublic: createDto.isPublic ?? true,
        ownerId: userId,
        maxMembers: Math.min(createDto.maxMembers || 20, 50), // Cap at 50 members
        members: {
          create: {
            userId,
            role: GroupRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                currentRank: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return {
      ...studyGroup,
      memberCount: studyGroup._count.members,
      userRole: GroupRole.OWNER,
      isJoined: true,
    };
  }

  async getStudyGroupsByBranch(
    userBranch: MilitaryBranch,
    userId: string,
    limit = 20,
    offset = 0,
    searchTerm?: string,
    isPublicOnly = true,
  ): Promise<{
    groups: StudyGroupWithStats[];
    total: number;
    hasMore: boolean;
  }> {
    const where: Prisma.StudyGroupWhereInput = {
      branch: userBranch,
      isPublic: isPublicOnly ? true : undefined,
    };

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [groups, total] = await Promise.all([
      this.prisma.studyGroup.findMany({
        where,
        include: {
          owner: {
            select: {
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  currentRank: true,
                },
              },
            },
          },
          members: {
            where: { userId },
            select: {
              role: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      this.prisma.studyGroup.count({ where }),
    ]);

    const groupsWithStats: StudyGroupWithStats[] = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      branch: group.branch,
      isPublic: group.isPublic,
      maxMembers: group.maxMembers,
      memberCount: group._count.members,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      owner: group.owner,
      userRole: group.members[0]?.role,
      isJoined: group.members.length > 0,
    }));

    return {
      groups: groupsWithStats,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getMyStudyGroups(userId: string): Promise<StudyGroupWithStats[]> {
    const groups = await this.prisma.studyGroup.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                currentRank: true,
              },
            },
          },
        },
        members: {
          where: { userId },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      branch: group.branch,
      isPublic: group.isPublic,
      maxMembers: group.maxMembers,
      memberCount: group._count.members,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      owner: group.owner,
      userRole: group.members[0]?.role,
      isJoined: true,
    }));
  }

  async getStudyGroupById(
    groupId: string,
    userId: string,
  ): Promise<StudyGroupWithStats & {
    members: Array<{
      id: string;
      role: GroupRole;
      joinedAt: Date;
      user: {
        firstName: string | null;
        lastName: string | null;
        profile: {
          avatarUrl: string | null;
          currentRank: string | null;
          studyStreak: number;
        } | null;
      };
    }>;
    recentMessages: Array<{
      id: string;
      content: string;
      sentAt: Date;
      sender: {
        firstName: string | null;
        lastName: string | null;
        profile: {
          avatarUrl: string | null;
          currentRank: string | null;
        } | null;
      };
    }>;
  }> {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                currentRank: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profile: {
                  select: {
                    avatarUrl: true,
                    currentRank: true,
                    studyStreak: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // Owner first, then admins, then members
            { joinedAt: 'asc' },
          ],
        },
        messages: {
          include: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
                profile: {
                  select: {
                    avatarUrl: true,
                    currentRank: true,
                  },
                },
              },
            },
          },
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Study group not found');
    }

    // Check if user is a member or if group is public
    const userMember = group.members.find(member => member.userId === userId);
    if (!group.isPublic && !userMember) {
      throw new ForbiddenException('Access denied to private study group');
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      branch: group.branch,
      isPublic: group.isPublic,
      maxMembers: group.maxMembers,
      memberCount: group._count.members,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      owner: group.owner,
      userRole: userMember?.role,
      isJoined: !!userMember,
      members: group.members,
      recentMessages: group.messages,
    };
  }

  async joinStudyGroup(groupId: string, userId: string): Promise<void> {
    // Check if user has premium
    const isPremium = await this.subscriptionsService.hasActivePremiumSubscription(userId);
    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required for joining study groups');
    }

    const group = await this.prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          where: { userId },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Study group not found');
    }

    if (group.members.length > 0) {
      throw new BadRequestException('Already a member of this study group');
    }

    if (group._count.members >= group.maxMembers) {
      throw new BadRequestException('Study group is full');
    }

    // Check user's total group membership limit (premium: 10 groups)
    const userGroupCount = await this.prisma.studyGroupMember.count({
      where: { userId },
    });

    if (userGroupCount >= 10) {
      throw new BadRequestException('Maximum of 10 study group memberships allowed');
    }

    await this.prisma.studyGroupMember.create({
      data: {
        groupId,
        userId,
        role: GroupRole.MEMBER,
      },
    });
  }

  async leaveStudyGroup(groupId: string, userId: string): Promise<void> {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Not a member of this study group');
    }

    if (member.role === GroupRole.OWNER) {
      // Check if there are other members to transfer ownership to
      const otherMembers = await this.prisma.studyGroupMember.count({
        where: {
          groupId,
          userId: { not: userId },
        },
      });

      if (otherMembers > 0) {
        throw new BadRequestException('Transfer ownership before leaving the group');
      } else {
        // Delete the entire group if owner is the only member
        await this.prisma.studyGroup.delete({
          where: { id: groupId },
        });
        return;
      }
    }

    await this.prisma.studyGroupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
  }

  async updateStudyGroup(
    groupId: string,
    userId: string,
    updateDto: UpdateStudyGroupDto,
  ): Promise<StudyGroupWithStats> {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member || (member.role !== GroupRole.OWNER && member.role !== GroupRole.ADMIN)) {
      throw new ForbiddenException('Only group owners and admins can update the group');
    }

    const updatedGroup = await this.prisma.studyGroup.update({
      where: { id: groupId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isPublic: updateDto.isPublic,
        maxMembers: updateDto.maxMembers ? Math.min(updateDto.maxMembers, 50) : undefined,
      },
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                currentRank: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return {
      ...updatedGroup,
      memberCount: updatedGroup._count.members,
      userRole: member.role,
      isJoined: true,
    };
  }

  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    newRole: GroupRole,
    requestingUserId: string,
  ): Promise<void> {
    const [requestingMember, targetMember] = await Promise.all([
      this.prisma.studyGroupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: requestingUserId,
          },
        },
      }),
      this.prisma.studyGroupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      }),
    ]);

    if (!requestingMember || requestingMember.role !== GroupRole.OWNER) {
      throw new ForbiddenException('Only group owners can change member roles');
    }

    if (!targetMember) {
      throw new NotFoundException('Target user is not a member of this group');
    }

    if (newRole === GroupRole.OWNER) {
      // Transfer ownership
      await this.prisma.$transaction([
        this.prisma.studyGroupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId: targetUserId,
            },
          },
          data: { role: GroupRole.OWNER },
        }),
        this.prisma.studyGroupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId: requestingUserId,
            },
          },
          data: { role: GroupRole.ADMIN },
        }),
        this.prisma.studyGroup.update({
          where: { id: groupId },
          data: { ownerId: targetUserId },
        }),
      ]);
    } else {
      await this.prisma.studyGroupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
        data: { role: newRole },
      });
    }
  }

  async removeMember(
    groupId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<void> {
    const [requestingMember, targetMember] = await Promise.all([
      this.prisma.studyGroupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: requestingUserId,
          },
        },
      }),
      this.prisma.studyGroupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      }),
    ]);

    if (!requestingMember || (requestingMember.role !== GroupRole.OWNER && requestingMember.role !== GroupRole.ADMIN)) {
      throw new ForbiddenException('Only group owners and admins can remove members');
    }

    if (!targetMember) {
      throw new NotFoundException('Target user is not a member of this group');
    }

    if (targetMember.role === GroupRole.OWNER) {
      throw new BadRequestException('Cannot remove the group owner');
    }

    // Admins can't remove other admins, only the owner can
    if (requestingMember.role === GroupRole.ADMIN && targetMember.role === GroupRole.ADMIN) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await this.prisma.studyGroupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });
  }

  async deleteStudyGroup(groupId: string, userId: string): Promise<void> {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member || member.role !== GroupRole.OWNER) {
      throw new ForbiddenException('Only group owners can delete the group');
    }

    await this.prisma.studyGroup.delete({
      where: { id: groupId },
    });
  }
}