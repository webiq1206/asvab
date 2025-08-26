import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FlashcardsService } from '../services/flashcards.service';
import {
  CreateFlashcardDto,
  UpdateFlashcardDto,
  CreateFlashcardDeckDto,
  UpdateFlashcardDeckDto,
  ReviewFlashcardDto,
  StudySessionDto,
  FlashcardProgressDto,
  FlashcardDifficulty,
} from '../dto/flashcard.dto';

@ApiTags('Flashcards')
@Controller('flashcards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flashcard' })
  @ApiResponse({ status: 201, description: 'Flashcard created successfully' })
  @ApiResponse({ status: 400, description: 'Free user limit exceeded' })
  async createFlashcard(@Request() req, @Body() createFlashcardDto: CreateFlashcardDto) {
    return this.flashcardsService.createFlashcard(req.user.sub, createFlashcardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user flashcards' })
  @ApiQuery({ name: 'deckId', required: false, description: 'Filter by deck ID' })
  @ApiResponse({ status: 200, description: 'User flashcards retrieved' })
  async getUserFlashcards(@Request() req, @Query('deckId') deckId?: string) {
    return this.flashcardsService.getUserFlashcards(req.user.sub, deckId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard updated successfully' })
  @ApiResponse({ status: 404, description: 'Flashcard not found' })
  async updateFlashcard(
    @Request() req,
    @Param('id') flashcardId: string,
    @Body() updateFlashcardDto: UpdateFlashcardDto,
  ) {
    return this.flashcardsService.updateFlashcard(req.user.sub, flashcardId, updateFlashcardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard deleted successfully' })
  @ApiResponse({ status: 404, description: 'Flashcard not found' })
  async deleteFlashcard(@Request() req, @Param('id') flashcardId: string) {
    return this.flashcardsService.deleteFlashcard(req.user.sub, flashcardId);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review a flashcard with spaced repetition' })
  @ApiResponse({ status: 201, description: 'Flashcard review recorded' })
  @ApiResponse({ status: 404, description: 'Flashcard not found' })
  async reviewFlashcard(@Request() req, @Body() reviewFlashcardDto: ReviewFlashcardDto) {
    return this.flashcardsService.reviewFlashcard(req.user.sub, reviewFlashcardDto);
  }

  @Get('due')
  @ApiOperation({ summary: 'Get flashcards due for review' })
  @ApiQuery({ name: 'deckId', required: false, description: 'Filter by deck ID' })
  @ApiResponse({ status: 200, description: 'Due flashcards retrieved' })
  async getDueFlashcards(@Request() req, @Query('deckId') deckId?: string) {
    return this.flashcardsService.getDueFlashcards(req.user.sub, deckId);
  }

  @Post('study-session')
  @ApiOperation({ summary: 'Start a study session with optimal card selection' })
  @ApiResponse({ status: 201, description: 'Study session created' })
  async startStudySession(@Request() req, @Body() studySessionDto: StudySessionDto) {
    return this.flashcardsService.startStudySession(req.user.sub, studySessionDto);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get flashcard study progress' })
  @ApiResponse({ status: 200, description: 'Progress data retrieved', type: FlashcardProgressDto })
  async getFlashcardProgress(@Request() req): Promise<FlashcardProgressDto> {
    return this.flashcardsService.getFlashcardProgress(req.user.sub);
  }
}

@ApiTags('Flashcard Decks')
@Controller('flashcards/decks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlashcardDecksController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flashcard deck' })
  @ApiResponse({ status: 201, description: 'Deck created successfully' })
  @ApiResponse({ status: 400, description: 'Free user limit exceeded' })
  async createDeck(@Request() req, @Body() createDeckDto: CreateFlashcardDeckDto) {
    return this.flashcardsService.createFlashcardDeck(req.user.sub, createDeckDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user flashcard decks' })
  @ApiResponse({ status: 200, description: 'User decks retrieved' })
  async getUserDecks(@Request() req) {
    return this.flashcardsService.getUserDecks(req.user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a flashcard deck' })
  @ApiResponse({ status: 200, description: 'Deck updated successfully' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  async updateDeck(
    @Request() req,
    @Param('id') deckId: string,
    @Body() updateDeckDto: UpdateFlashcardDeckDto,
  ) {
    return this.flashcardsService.updateDeck(req.user.sub, deckId, updateDeckDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard deck' })
  @ApiResponse({ status: 200, description: 'Deck deleted successfully' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  async deleteDeck(@Request() req, @Param('id') deckId: string) {
    return this.flashcardsService.deleteDeck(req.user.sub, deckId);
  }

  @Get('public')
  @ApiOperation({ summary: 'Browse public flashcard decks' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Public decks retrieved' })
  async getPublicDecks(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.flashcardsService.getPublicDecks(req.user.sub, page, limit);
  }
}