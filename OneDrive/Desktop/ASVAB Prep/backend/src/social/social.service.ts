import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch } from '@asvab-prep/shared';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(fromUserId: string, toUserId: string, content: string) {
    return await this.prisma.message.create({
      data: {
        fromUserId,
        toUserId,
        content,
        sentAt: new Date(),
      },
    });
  }

  async sendGroupMessage(userId: string, groupId: string, content: string) {
    return await this.prisma.groupMessage.create({
      data: {
        userId,
        groupId,
        content,
        sentAt: new Date(),
      },
    });
  }

  async getUserMessages(userId: string, limit: number = 50) {
    return await this.prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      include: {
        fromUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        toUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  async getGroupMessages(groupId: string, limit: number = 100) {
    return await this.prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { sentAt: 'asc' },
      take: limit,
    });
  }
}