import { SetMetadata } from '@nestjs/common';

export const IS_PREMIUM_KEY = 'isPremium';
export const RequirePremium = () => SetMetadata(IS_PREMIUM_KEY, true);