import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has premium subscription or active trial
    const isPremium = user.subscriptionTier === 'PREMIUM';
    const isTrialActive = user.trialEndsAt && new Date() < user.trialEndsAt;

    if (!isPremium && !isTrialActive) {
      throw new ForbiddenException('Premium subscription required');
    }

    return true;
  }
}