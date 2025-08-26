import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MilitaryBranch } from '@asvab-prep/shared';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    // Implementation for push notifications
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId },
    });

    // Send notifications to all user devices
    const results = await Promise.all(
      deviceTokens.map(token => this.sendToDevice(token.token, title, body, data))
    );

    // Log notification
    await this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        sentAt: new Date(),
        deliveredCount: results.filter(r => r.success).length,
      },
    });

    return results;
  }

  async sendBranchSpecificNotification(branch: MilitaryBranch, title: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: { selectedBranch: branch },
      include: { deviceTokens: true },
    });

    const notifications = users.map(user => 
      this.sendPushNotification(user.id, title, body)
    );

    return Promise.all(notifications);
  }

  private async sendToDevice(token: string, title: string, body: string, data?: any) {
    // Mock implementation - replace with actual push service
    return { success: true, token };
  }
}