import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MilitaryBranch, Flashcard, FlashcardReview, FlashcardStatus } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { flashcardService } from '../../services/flashcardService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  deckId?: string;
  onComplete?: () => void;
  onExit?: () => void;
}

export const FlashcardReviewScreen: React.FC<Props> = ({ deckId, onComplete, onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [cardStartTime, setCardStartTime] = useState<Date>(new Date());

  // Fetch due cards for review
  const { data: dueCards = [], isLoading, error } = useQuery({
    queryKey: ['dueFlashcards', deckId],
    queryFn: () => flashcardService.getDueFlashcards(deckId),
  });

  // Review flashcard mutation
  const reviewMutation = useMutation({
    mutationFn: flashcardService.reviewFlashcard,
    onSuccess: (data) => {
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Card reviewed successfully!',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Review Failed',
        text2: 'Failed to save review. Please try again.',
      });
    },
  });

  const currentCard = dueCards[currentCardIndex];
  const progress = dueCards.length > 0 ? (currentCardIndex + 1) / dueCards.length : 0;

  useEffect(() => {
    if (currentCard) {
      setCardStartTime(new Date());
      setIsFlipped(false);
    }
  }, [currentCardIndex, currentCard]);

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRating = async (rating: number) => {
    if (!currentCard) return;

    const timeSpent = Math.floor((new Date().getTime() - cardStartTime.getTime()) / 1000);
    
    try {
      await reviewMutation.mutateAsync({
        flashcardId: currentCard.id,
        rating,
        timeSpent,
        wasCorrect: rating >= 3,
        notes: undefined,
      });

      // Move to next card or complete session
      if (currentCardIndex < dueCards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        handleSessionComplete();
      }
    } catch (error) {
      console.error('Review failed:', error);
    }
  };

  const handleSessionComplete = () => {
    const sessionTime = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
    
    Alert.alert(
      `Outstanding Work, ${getBranchTitle(user?.selectedBranch)}!`,
      `Study session complete! You reviewed ${dueCards.length} cards in ${Math.floor(sessionTime / 60)}m ${sessionTime % 60}s.\n\n${getMilitaryGreeting().motto}`,
      [
        {
          text: 'Continue Training',
          onPress: onComplete || (() => {}),
        },
      ]
    );
  };

  const getBranchTitle = (branch?: MilitaryBranch): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor', 
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Coastie',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch || 'ARMY'];
  };

  const getRatingMessage = (rating: number): string => {
    const messages = {
      0: 'Complete blackout - No worries, every warrior starts somewhere!',
      1: 'Incorrect but familiar - You\'re making progress, keep pushing!',
      2: 'Incorrect but close - Almost there, maintain focus!',
      3: 'Correct with difficulty - Solid work, building strength!',
      4: 'Correct after hesitation - Good job, confidence growing!',
      5: 'Perfect response - Outstanding performance, mission ready!',
    };
    return messages[rating] || '';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading flashcards..." />
      </SafeAreaView>
    );
  }

  if (error || dueCards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="Flashcard Review" onBack={onExit} />
        <View style={styles.noCardsContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={[styles.noCardsTitle, { color: colors.text }]}>
            Mission Complete!
          </Text>
          <Text style={[styles.noCardsSubtitle, { color: colors.textSecondary }]}>
            No cards due for review right now.
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onExit}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Return to Base
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title={`Flashcard Review - ${currentCardIndex + 1}/${dueCards.length}`}
        onBack={onExit}
      />
      
      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.text }]}>
          Progress: {Math.round(progress * 100)}%
        </Text>
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          style={[
            styles.flashcard, 
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }
          ]}
          onPress={handleFlipCard}
          activeOpacity={0.8}
        >
          <ScrollView contentContainerStyle={styles.cardContent}>
            {!isFlipped ? (
              <>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardType, { color: colors.primary }]}>
                    Question
                  </Text>
                  <Ionicons 
                    name={currentCard?.type === 'MULTIPLE_CHOICE' ? 'list' : 'help-circle'}
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={[styles.cardText, { color: colors.text }]}>
                  {currentCard?.question}
                </Text>
                {currentCard?.choices && currentCard.choices.length > 0 && (
                  <View style={styles.choicesContainer}>
                    {currentCard.choices.map((choice, index) => (
                      <Text key={index} style={[styles.choice, { color: colors.textSecondary }]}>
                        {String.fromCharCode(65 + index)}. {choice}
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={[styles.flipInstruction, { color: colors.textSecondary }]}>
                  Tap to reveal answer
                </Text>
              </>
            ) : (
              <>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardType, { color: colors.accent }]}>
                    Answer
                  </Text>
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                </View>
                <Text style={[styles.cardText, { color: colors.text }]}>
                  {currentCard?.answer}
                </Text>
                {currentCard?.explanation && (
                  <View style={[styles.explanationContainer, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.explanationTitle, { color: colors.primary }]}>
                      Battle Brief:
                    </Text>
                    <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                      {currentCard.explanation}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </View>

      {/* Rating Buttons */}
      {isFlipped && (
        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingTitle, { color: colors.text }]}>
            How well did you know this?
          </Text>
          <View style={styles.ratingGrid}>
            {[
              { rating: 0, label: 'Again', color: '#FF4757', icon: 'close-circle' },
              { rating: 3, label: 'Hard', color: '#FFA502', icon: 'warning' },
              { rating: 4, label: 'Good', color: '#2ED573', icon: 'checkmark' },
              { rating: 5, label: 'Easy', color: '#1E90FF', icon: 'trophy' },
            ].map((item) => (
              <TouchableOpacity
                key={item.rating}
                style={[styles.ratingButton, { backgroundColor: item.color }]}
                onPress={() => handleRating(item.rating)}
                disabled={reviewMutation.isPending}
              >
                <Ionicons name={item.icon as any} size={24} color="white" />
                <Text style={[styles.ratingButtonText, { color: 'white' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  flashcard: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  cardContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  choicesContainer: {
    marginBottom: 20,
  },
  choice: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 10,
  },
  explanationContainer: {
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  flipInstruction: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  ratingContainer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  ratingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ratingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  noCardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noCardsTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  noCardsSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});