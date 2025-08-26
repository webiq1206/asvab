import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory } from '@prisma/client';

export interface SemanticSearchOptions {
  category?: QuestionCategory;
  limit?: number;
  includeExplanations?: boolean;
  difficultyRange?: string[];
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  type: 'QUESTION' | 'FLASHCARD' | 'MILITARY_JOB';
  relevanceScore: number;
  semanticSimilarity: number;
  category?: QuestionCategory;
  difficulty?: string;
  explanation?: string;
  tags: string[];
}

export interface SimilarContentOptions {
  limit?: number;
  threshold?: number; // Minimum similarity threshold
  excludeSame?: boolean;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async performSemanticSearch(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // Extract semantic concepts from the query
      const semanticConcepts = this.extractSemanticConcepts(query);
      
      // Get user context for personalization
      const userContext = await this.getUserSemanticContext(userId);

      // Search across different content types with semantic understanding
      const results = await this.performSemanticContentSearch(query, semanticConcepts, options);

      // Apply semantic similarity scoring
      const scoredResults = this.applySemanticScoring(results, semanticConcepts, userContext);

      // Sort by semantic relevance
      const sortedResults = scoredResults.sort((a, b) => b.semanticSimilarity - a.semanticSimilarity);

      // Limit results
      const limitedResults = sortedResults.slice(0, options.limit || 20);

      this.logger.log(`Semantic search for "${query}" returned ${limitedResults.length} results`);

      return limitedResults;
    } catch (error) {
      this.logger.error('Semantic search failed:', error);
      throw new Error('Semantic search operation failed');
    }
  }

  async findSimilarContent(
    itemId: string,
    userId: string,
    options: SimilarContentOptions = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // Get the source item
      const sourceItem = await this.getItemForSimilarity(itemId);
      if (!sourceItem) {
        throw new Error('Source item not found');
      }

      // Extract semantic features from source item
      const sourceFeatures = this.extractSemanticFeatures(sourceItem);

      // Find similar items based on semantic features
      const similarItems = await this.findSemanticallySimilarItems(
        sourceItem,
        sourceFeatures,
        options
      );

      // Calculate similarity scores
      const scoredItems = similarItems.map(item => ({
        ...item,
        semanticSimilarity: this.calculateSemanticSimilarity(sourceFeatures, item),
      }));

      // Filter by threshold and sort
      const filteredItems = scoredItems
        .filter(item => item.semanticSimilarity >= (options.threshold || 0.3))
        .sort((a, b) => b.semanticSimilarity - a.semanticSimilarity)
        .slice(0, options.limit || 10);

      this.logger.log(`Found ${filteredItems.length} similar items for ${itemId}`);

      return filteredItems;
    } catch (error) {
      this.logger.error('Find similar content failed:', error);
      throw new Error('Similar content search failed');
    }
  }

  async getSemanticSuggestions(partialQuery: string): Promise<string[]> {
    try {
      // Extract partial concepts
      const partialConcepts = this.extractSemanticConcepts(partialQuery);

      // Get related concepts and terms
      const suggestions = await this.generateSemanticSuggestions(partialConcepts, partialQuery);

      return suggestions.slice(0, 8);
    } catch (error) {
      this.logger.error('Semantic suggestions failed:', error);
      return [];
    }
  }

  private extractSemanticConcepts(query: string): string[] {
    // Simplified semantic concept extraction
    // In production, this would use NLP libraries or AI services
    const concepts: string[] = [];
    
    const lowercaseQuery = query.toLowerCase();
    
    // Mathematical concepts
    const mathConcepts = [
      'algebra', 'geometry', 'arithmetic', 'fractions', 'decimals', 'percentages',
      'equations', 'ratios', 'proportions', 'statistics', 'probability'
    ];
    
    // Military concepts  
    const militaryConcepts = [
      'military', 'army', 'navy', 'air force', 'marines', 'coast guard', 'space force',
      'combat', 'tactics', 'strategy', 'logistics', 'operations', 'deployment'
    ];
    
    // Subject areas
    const subjectConcepts = [
      'reading', 'comprehension', 'vocabulary', 'grammar', 'writing',
      'science', 'physics', 'chemistry', 'biology', 'technology'
    ];

    // Check for concept matches
    [...mathConcepts, ...militaryConcepts, ...subjectConcepts].forEach(concept => {
      if (lowercaseQuery.includes(concept)) {
        concepts.push(concept);
      }
    });

    // Add query words as concepts if none found
    if (concepts.length === 0) {
      concepts.push(...lowercaseQuery.split(' ').filter(word => word.length > 2));
    }

    return concepts;
  }

  private async getUserSemanticContext(userId: string): Promise<any> {
    try {
      // Get user's learning history for semantic context
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          quizzes: {
            take: 20,
            orderBy: { completedAt: 'desc' },
            include: {
              questions: {
                select: {
                  category: true,
                  difficulty: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      });

      if (!user) return {};

      // Analyze user's preferred categories and difficulty levels
      const categoryPreferences = this.analyzeCategoryPreferences(user.quizzes);
      const difficultyPreferences = this.analyzeDifficultyPreferences(user.quizzes);

      return {
        preferredCategories: categoryPreferences,
        preferredDifficulties: difficultyPreferences,
        branch: user.selectedBranch,
      };
    } catch (error) {
      this.logger.warn('Failed to get user semantic context:', error);
      return {};
    }
  }

  private async performSemanticContentSearch(
    query: string,
    concepts: string[],
    options: SemanticSearchOptions
  ): Promise<any[]> {
    const results: any[] = [];

    // Search questions with semantic understanding
    const questions = await this.prisma.question.findMany({
      where: {
        isActive: true,
        category: options.category,
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { explanation: { contains: query, mode: 'insensitive' } },
          ...concepts.map(concept => ({ content: { contains: concept, mode: 'insensitive' } })),
          ...concepts.map(concept => ({ explanation: { contains: concept, mode: 'insensitive' } })),
        ],
      },
      take: 100,
    });

    results.push(...questions.map(q => ({
      ...q,
      type: 'QUESTION',
      relevanceScore: this.calculateBasicRelevance(q.content + ' ' + (q.explanation || ''), query),
    })));

    // Search flashcards
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        isActive: true,
        category: options.category,
        OR: [
          { front: { contains: query, mode: 'insensitive' } },
          { back: { contains: query, mode: 'insensitive' } },
          ...concepts.map(concept => ({ front: { contains: concept, mode: 'insensitive' } })),
          ...concepts.map(concept => ({ back: { contains: concept, mode: 'insensitive' } })),
        ],
      },
      take: 50,
    });

    results.push(...flashcards.map(f => ({
      ...f,
      type: 'FLASHCARD',
      content: f.front,
      explanation: f.back,
      relevanceScore: this.calculateBasicRelevance(f.front + ' ' + f.back, query),
    })));

    // Search military jobs
    const jobs = await this.prisma.militaryJob.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          ...concepts.map(concept => ({ title: { contains: concept, mode: 'insensitive' } })),
          ...concepts.map(concept => ({ description: { contains: concept, mode: 'insensitive' } })),
        ],
      },
      take: 30,
    });

    results.push(...jobs.map(j => ({
      ...j,
      type: 'MILITARY_JOB',
      content: j.title,
      explanation: j.description,
      relevanceScore: this.calculateBasicRelevance((j.title || '') + ' ' + (j.description || ''), query),
    })));

    return results;
  }

  private applySemanticScoring(
    results: any[],
    concepts: string[],
    userContext: any
  ): SemanticSearchResult[] {
    return results.map(result => {
      let semanticSimilarity = result.relevanceScore || 0;

      // Boost based on concept matches
      concepts.forEach(concept => {
        const text = (result.content + ' ' + (result.explanation || '')).toLowerCase();
        if (text.includes(concept.toLowerCase())) {
          semanticSimilarity += 0.2;
        }
      });

      // Personalization boost
      if (userContext.preferredCategories && result.category) {
        if (userContext.preferredCategories.includes(result.category)) {
          semanticSimilarity += 0.1;
        }
      }

      if (userContext.preferredDifficulties && result.difficulty) {
        if (userContext.preferredDifficulties.includes(result.difficulty)) {
          semanticSimilarity += 0.05;
        }
      }

      // Normalize to 0-1 range
      semanticSimilarity = Math.min(1, Math.max(0, semanticSimilarity));

      return {
        id: result.id,
        content: result.content || '',
        type: result.type,
        relevanceScore: result.relevanceScore || 0,
        semanticSimilarity,
        category: result.category,
        difficulty: result.difficulty,
        explanation: result.explanation,
        tags: result.tags || [],
      };
    });
  }

  private async getItemForSimilarity(itemId: string): Promise<any> {
    // Try to find in questions first
    let item = await this.prisma.question.findUnique({
      where: { id: itemId },
    });
    
    if (item) return { ...item, type: 'QUESTION' };

    // Try flashcards
    item = await this.prisma.flashcard.findUnique({
      where: { id: itemId },
    });
    
    if (item) return { ...item, type: 'FLASHCARD', content: item.front, explanation: item.back };

    // Try military jobs
    item = await this.prisma.militaryJob.findUnique({
      where: { id: itemId },
    });
    
    if (item) return { ...item, type: 'MILITARY_JOB', content: item.title, explanation: item.description };

    return null;
  }

  private extractSemanticFeatures(item: any): any {
    const text = (item.content + ' ' + (item.explanation || '')).toLowerCase();
    
    // Extract features for similarity calculation
    return {
      words: text.split(' ').filter(word => word.length > 2),
      category: item.category,
      difficulty: item.difficulty,
      type: item.type,
      length: text.length,
      concepts: this.extractSemanticConcepts(text),
    };
  }

  private async findSemanticallySimilarItems(
    sourceItem: any,
    sourceFeatures: any,
    options: SimilarContentOptions
  ): Promise<any[]> {
    const similarItems: any[] = [];

    // Find similar questions
    if (sourceItem.type !== 'QUESTION' || !options.excludeSame) {
      const questions = await this.prisma.question.findMany({
        where: {
          isActive: true,
          id: options.excludeSame ? { not: sourceItem.id } : undefined,
          category: sourceItem.category, // Same category for better similarity
        },
        take: 50,
      });

      similarItems.push(...questions.map(q => ({
        ...q,
        type: 'QUESTION',
      })));
    }

    // Find similar flashcards
    if (sourceItem.type !== 'FLASHCARD' || !options.excludeSame) {
      const flashcards = await this.prisma.flashcard.findMany({
        where: {
          isActive: true,
          id: options.excludeSame ? { not: sourceItem.id } : undefined,
          category: sourceItem.category,
        },
        take: 30,
      });

      similarItems.push(...flashcards.map(f => ({
        ...f,
        type: 'FLASHCARD',
        content: f.front,
        explanation: f.back,
      })));
    }

    return similarItems;
  }

  private calculateSemanticSimilarity(sourceFeatures: any, item: any): number {
    let similarity = 0;
    
    const itemText = (item.content + ' ' + (item.explanation || '')).toLowerCase();
    const itemWords = itemText.split(' ').filter(word => word.length > 2);
    
    // Word overlap similarity
    const commonWords = sourceFeatures.words.filter((word: string) => itemWords.includes(word));
    const wordSimilarity = commonWords.length / Math.max(sourceFeatures.words.length, itemWords.length);
    similarity += wordSimilarity * 0.4;

    // Category similarity
    if (sourceFeatures.category === item.category) {
      similarity += 0.3;
    }

    // Difficulty similarity
    if (sourceFeatures.difficulty === item.difficulty) {
      similarity += 0.1;
    }

    // Type similarity
    if (sourceFeatures.type === item.type) {
      similarity += 0.1;
    }

    // Concept similarity
    const itemConcepts = this.extractSemanticConcepts(itemText);
    const commonConcepts = sourceFeatures.concepts.filter((concept: string) => itemConcepts.includes(concept));
    const conceptSimilarity = commonConcepts.length / Math.max(sourceFeatures.concepts.length, itemConcepts.length);
    similarity += conceptSimilarity * 0.1;

    return Math.min(1, similarity);
  }

  private async generateSemanticSuggestions(concepts: string[], partialQuery: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Add concept-based suggestions
    const conceptSuggestions = [
      'arithmetic reasoning problems',
      'mathematics knowledge questions',
      'word knowledge vocabulary',
      'paragraph comprehension reading',
      'military job requirements',
      'ASVAB practice test',
      'study guide materials',
      'flashcard review',
    ];

    // Filter suggestions based on partial query
    const relevantSuggestions = conceptSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(partialQuery.toLowerCase()) ||
      concepts.some(concept => suggestion.toLowerCase().includes(concept.toLowerCase()))
    );

    suggestions.push(...relevantSuggestions);

    // Add dynamic suggestions from database (simplified)
    try {
      const popularQueries = await this.prisma.searchHistory.groupBy({
        by: ['query'],
        where: {
          query: {
            contains: partialQuery,
            mode: 'insensitive',
          },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 5,
      });

      suggestions.push(...popularQueries.map(p => p.query));
    } catch (error) {
      this.logger.warn('Failed to get dynamic suggestions:', error);
    }

    // Remove duplicates and return
    return [...new Set(suggestions)];
  }

  private calculateBasicRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match bonus
    if (textLower.includes(queryLower)) {
      return 0.8;
    }

    // Word match scoring
    const queryWords = queryLower.split(' ').filter(w => w.length > 2);
    let matchCount = 0;
    
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        matchCount++;
      }
    });

    return Math.min(0.7, (matchCount / queryWords.length) * 0.7);
  }

  private analyzeCategoryPreferences(quizzes: any[]): QuestionCategory[] {
    const categoryCount: Record<string, number> = {};
    
    quizzes.forEach(quiz => {
      quiz.questions.forEach((q: any) => {
        categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
      });
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as QuestionCategory);
  }

  private analyzeDifficultyPreferences(quizzes: any[]): string[] {
    const difficultyCount: Record<string, number> = {};
    
    quizzes.forEach(quiz => {
      quiz.questions.forEach((q: any) => {
        difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
      });
    });

    return Object.entries(difficultyCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([difficulty]) => difficulty);
  }
}