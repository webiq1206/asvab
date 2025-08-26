import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';

import { theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';
import { MilitaryCard, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { ProgressCircle } from '@/components/UI/ProgressCircle';
import { flashcardService, Flashcard } from '@/services/flashcardService';
import { BRANCH_INFO } from '@asvab-prep/shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouteParams {
  deckId: string;
  sessionType?: 'new' | 'review' | 'mixed';
}

interface StudySession {
  sessionId: string;
  cards: Flashcard[];
  estimatedTime: number;
  currentIndex: number;
  sessionStartTime: Date;
  cardStartTime: Date;
  isFlipped: boolean;
  answers: Map<string, {
    rating: number;
    timeSpent: number;
    wasCorrect: boolean;
  }>;
}

export const FlashcardStudyScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { deckId, sessionType = 'mixed' } = route.params as RouteParams;
  
  const { selectedBranch, isPremium } = useAuth();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<StudySession | null>(null);
  const [flipAnimation] = useState(new Animated.Value(0));
  const [ratingButtons] = useState([
    { rating: 1, label: 'Again', color: theme.colors.DANGER, icon: 'close-circle' },
    { rating: 3, label: 'Hard', color: theme.colors.WARNING, icon: 'alert-circle' },
    { rating: 4, label: 'Good', color: theme.colors.SUCCESS, icon: 'checkmark-circle' },
    { rating: 5, label: 'Easy', color: theme.colors.info, icon: 'star' },
  ]);

  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;
  const branchInfo = selectedBranch ? BRANCH_INFO[selectedBranch] : null;

  // Start study session
  const startSessionMutation = useMutation({
    mutationFn: () => flashcardService.startStudySession(deckId, sessionType),
    onSuccess: (data) => {
      setSession({
        sessionId: data.sessionId,
        cards: data.cards,
        estimatedTime: data.estimatedTime,
        currentIndex: 0,
        sessionStartTime: new Date(),
        cardStartTime: new Date(),
        isFlipped: false,
        answers: new Map(),
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Session Failed',
        text2: 'Could not start study session. Please try again.',
      });
      navigation.goBack();
    },
  });

  // Review flashcard
  const reviewMutation = useMutation({
    mutationFn: flashcardService.reviewFlashcard,
    onSuccess: () => {
      if (session && session.currentIndex + 1 >= session.cards.length) {
        // Session complete
        completeSession();
      } else {
        // Move to next card
        nextCard();
      }
    },
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => flashcardService.endStudySession(sessionId),
    onSuccess: (data) => {
      const { results, achievements } = data;
      
      // Show results
      Alert.alert(
        `${branchInfo?.exclamation} Session Complete!`,
        `Cards Reviewed: ${results.cardsReviewed}\n` +
        `Accuracy: ${Math.round(results.accuracy * 100)}%\n` +
        `Time: ${Math.round(results.timeSpent / 60)} minutes\n` +
        `New Mastered: ${results.newMasteredCards}`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Show achievements
      if (achievements && achievements.length > 0) {
        achievements.forEach(achievement => {
          Toast.show({
            type: 'success',
            text1: achievement.title,
            text2: `${achievement.description} (+${achievement.xpReward} XP)`,
          });
        });
      }

      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });

  useEffect(() => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Flashcards with spaced repetition require a Premium subscription.',
        [
          { text: 'Upgrade', onPress: () => {/* Navigate to subscription */} },
          { text: 'Back', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }
    
    startSessionMutation.mutate();
  }, []);

  const flipCard = () => {
    if (!session) return;

    Animated.timing(flipAnimation, {
      toValue: session.isFlipped ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setSession(prev => prev ? { ...prev, isFlipped: !prev.isFlipped } : null);
    });
  };

  const handleRating = (rating: number) => {
    if (!session || !session.isFlipped) {
      Toast.show({
        type: 'error',
        text1: 'Flip Card First',
        text2: 'You must read the answer before rating.',
      });
      return;
    }

    const currentCard = session.cards[session.currentIndex];
    const timeSpent = Math.floor((new Date().getTime() - session.cardStartTime.getTime()) / 1000);
    
    // Determine if answer was correct based on rating
    const wasCorrect = rating >= 3;

    // Save answer
    const newAnswers = new Map(session.answers);
    newAnswers.set(currentCard.id, { rating, timeSpent, wasCorrect });
    
    setSession(prev => prev ? { ...prev, answers: newAnswers } : null);

    // Submit review
    reviewMutation.mutate({
      flashcardId: currentCard.id,
      rating,
      timeSpent,
      wasCorrect,
    });
  };

  const nextCard = () => {
    if (!session) return;

    const nextIndex = session.currentIndex + 1;
    setSession(prev => prev ? {
      ...prev,
      currentIndex: nextIndex,
      cardStartTime: new Date(),
      isFlipped: false,
    } : null);

    // Reset flip animation
    flipAnimation.setValue(0);
  };

  const completeSession = () => {
    if (!session) return;
    completeSessionMutation.mutate(session.sessionId);
  };

  const exitSession = () => {
    Alert.alert(
      'Exit Session?',
      'Your progress will be saved, but incomplete cards will need to be reviewed again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (startSessionMutation.isLoading || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>PREPARING SESSION...</Text>
          <Text style={styles.loadingSubtext}>
            {branchInfo?.motto || 'Setting up your study session'}
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (session.cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.emptyContainer}
        >
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.SUCCESS} />
          <Text style={styles.emptyTitle}>ALL CAUGHT UP!</Text>
          <Text style={styles.emptySubtext}>
            No cards are due for review right now.{'\n'}
            Check back later or create new flashcards.
          </Text>
          <MilitaryButton
            title="BACK TO DECKS"
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: branchColor, marginTop: 20 }}
          />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const currentCard = session.cards[session.currentIndex];
  const progress = (session.currentIndex + 1) / session.cards.length;
  const remainingCards = session.cards.length - session.currentIndex - 1;

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[branchColor, theme.colors.DARK_OLIVE]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={exitSession} style={styles.exitButton}>
            <Ionicons name="close" size={24} color={theme.colors.KHAKI} />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {session.currentIndex + 1} / {session.cards.length}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          
          <Text style={styles.remainingText}>{remainingCards} left</Text>
        </View>
      </LinearGradient>

      {/* Card Container */}
      <View style={styles.cardContainer}>
        <View style={styles.flipContainer}>
          {/* Front of Card */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardFront,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <MilitaryCard style={styles.flashcard}>
              <MilitaryCardContent>
                <View style={styles.cardHeader}>
                  <Ionicons name="help-circle" size={24} color={branchColor} />
                  <Text style={styles.cardType}>Question</Text>
                </View>
                
                <Text style={styles.cardContent}>{currentCard.question}</Text>
                
                {currentCard.hint && (
                  <View style={styles.hintContainer}>
                    <Ionicons name="bulb" size={16} color={theme.colors.WARNING} />
                    <Text style={styles.hintText}>{currentCard.hint}</Text>
                  </View>
                )}
              </MilitaryCardContent>
            </MilitaryCard>
          </Animated.View>

          {/* Back of Card */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <MilitaryCard style={styles.flashcard}>
              <MilitaryCardContent>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.SUCCESS} />
                  <Text style={styles.cardType}>Answer</Text>
                </View>
                
                <Text style={styles.cardContent}>{currentCard.answer}</Text>
                
                {currentCard.explanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationLabel}>Explanation:</Text>
                    <Text style={styles.explanationText}>{currentCard.explanation}</Text>
                  </View>
                )}
              </MilitaryCardContent>
            </MilitaryCard>
          </Animated.View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {!session.isFlipped ? (
          <MilitaryButton
            title="SHOW ANSWER"
            onPress={flipCard}
            style={{ backgroundColor: branchColor }}
            icon="eye"
          />
        ) : (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingTitle}>How well did you know this?</Text>
            <View style={styles.ratingButtons}>
              {ratingButtons.map((button) => (
                <TouchableOpacity
                  key={button.rating}
                  style={[styles.ratingButton, { borderColor: button.color }]}
                  onPress={() => handleRating(button.rating)}
                  disabled={reviewMutation.isLoading}
                >
                  <Ionicons name={button.icon as any} size={24} color={button.color} />
                  <Text style={[styles.ratingLabel, { color: button.color }]}>
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Card Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { 
          backgroundColor: currentCard.cardStatus === 'NEW' ? theme.colors.info :
                          currentCard.cardStatus === 'LEARNING' ? theme.colors.WARNING :
                          currentCard.cardStatus === 'REVIEW' ? theme.colors.SUCCESS :
                          theme.colors.TACTICAL_ORANGE 
        }]}>
          <Text style={styles.statusText}>
            {currentCard.cardStatus.replace('_', ' ')}
          </Text>
        </View>
        
        {currentCard.tags && currentCard.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {currentCard.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={[styles.tag, { borderColor: branchColor }]}>
                <Text style={[styles.tagText, { color: branchColor }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DESERT_SAND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  loadingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
    letterSpacing: 2,
  },
  loadingSubtext: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.SUCCESS,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
    letterSpacing: 2,
  },
  emptySubtext: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exitButton: {
    padding: theme.spacing[2],
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  progressText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  remainingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  flipContainer: {
    width: SCREEN_WIDTH - theme.spacing[8],
    height: SCREEN_HEIGHT * 0.5,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    // Front face styling
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  flashcard: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  cardType: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[2],
    textTransform: 'uppercase',
  },
  cardContent: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    lineHeight: 28,
    marginBottom: theme.spacing[4],
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing[4],
  },
  hintText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#856404',
    marginLeft: theme.spacing[2],
    fontStyle: 'italic',
  },
  explanationContainer: {
    marginTop: theme.spacing[4],
    paddingTop: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  explanationLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
    textTransform: 'uppercase',
  },
  explanationText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    lineHeight: 24,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  ratingButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    borderWidth: 2,
    borderRadius: theme.borderRadius.md,
    flex: 1,
    marginHorizontal: theme.spacing[1],
  },
  ratingLabel: {
    fontFamily: theme.fonts.body.bold,
    fontSize: theme.fontSizes.xs,
    marginTop: theme.spacing[1],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing[3],
  },
  statusText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tag: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    marginRight: theme.spacing[2],
  },
  tagText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
  },
});