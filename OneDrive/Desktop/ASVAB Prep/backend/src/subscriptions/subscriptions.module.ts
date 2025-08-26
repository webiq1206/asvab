import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { AppStoreService } from './app-store.service';
import { GooglePlayService } from './google-play.service';

@Module({
  imports: [ConfigModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    StripeService,
    AppStoreService,
    GooglePlayService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}