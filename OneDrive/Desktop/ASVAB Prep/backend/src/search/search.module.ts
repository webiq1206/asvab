import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AdvancedSearchService } from './services/advanced-search.service';
import { ContentFilterService } from './services/content-filter.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { SearchAnalyticsService } from './services/search-analytics.service';
import { SearchController } from './controllers/search.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SearchController],
  providers: [
    AdvancedSearchService,
    ContentFilterService,
    SemanticSearchService,
    SearchAnalyticsService,
  ],
  exports: [
    AdvancedSearchService,
    ContentFilterService,
    SemanticSearchService,
    SearchAnalyticsService,
  ],
})
export class SearchModule {}