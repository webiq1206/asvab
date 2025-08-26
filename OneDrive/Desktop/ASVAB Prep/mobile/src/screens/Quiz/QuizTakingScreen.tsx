import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';

import { theme } from '@/constants/theme';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { QuestionCard } from '@/components/Question/QuestionCard';
import { QuizTimer } from '@/components/Quiz/QuizTimer';
import { QuizProgress } from '@/components/Quiz/QuizProgress';
import { WhiteboardModal } from '@/components/Quiz/WhiteboardModal';
import { useUserStore } from '@/store/userStore';
import { quizService, Quiz, SubmitQuizAnswerRequest } from '@/services/quizService';
import { Ionicons } from '@expo/vector-icons';

interface RouteParams {
  quizId: string;
}

const { width } = Dimensions.get('window');

export const QuizTakingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { quizId } = route.params as RouteParams;
  
  const { user } = useUserStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<string>('');
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());

  const timerRef = useRef<NodeJS.Timeout>();
  const isPremium = user?.subscriptionTier === 'PREMIUM';

  // Fetch quiz data
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizService.getQuiz(quizId),
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: (request: SubmitQuizAnswerRequest) =>
      quizService.submitQuizAnswer(quizId, request),
    onError: (error: any) => {
      Alert.alert(
        'Submission Error',
        error.response?.data?.message || 'Failed to submit answer. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  // Complete quiz mutation
  const completeQuizMutation = useMutation({
    mutationFn: () => quizService.completeQuiz(quizId, { timeSpent }),
    onSuccess: (result) => {
      navigation.replace('QuizResults', { 
        quizId, 
        result: result,
      });
    },
    onError: (error: any) => {
      Alert.alert(
        'Completion Error',
        error.response?.data?.message || 'Failed to complete quiz. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleExitQuiz();
        return true; // Prevent default back action
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  // Handle answer submission
  const handleAnswerSubmit = (answer: number) => {
    if (!quiz || !quiz.questions[currentQuestionIndex]) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const questionTimeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    // Store answer locally
    setAnswers(prev => new Map(prev).set(currentQuestion.questionId, answer));
    setSelectedAnswer(answer);

    // Submit to backend
    submitAnswerMutation.mutate({
      questionId: currentQuestion.questionId,
      userAnswer: answer,
      timeSpent: questionTimeSpent,
    });
  };

  const handleNextQuestion = () => {
    if (!quiz) return;

    if (currentQuestionIndex < quiz.questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuestionStartTime(Date.now());
    } else {
      // Quiz completed
      handleCompleteQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      const prevQuestion = quiz?.questions[currentQuestionIndex - 1];
      setSelectedAnswer(
        prevQuestion ? answers.get(prevQuestion.questionId) ?? null : null
      );
      setQuestionStartTime(Date.now());
    }
  };

  const handleCompleteQuiz = () => {
    Alert.alert(
      'Complete Quiz',
      'Are you sure you want to finish this quiz?',
      [
        { text: 'Continue Quiz', style: 'cancel' },
        { 
          text: 'Finish Quiz', 
          style: 'destructive',
          onPress: () => completeQuizMutation.mutate()
        },
      ]
    );
  };

  const handleExitQuiz = () => {
    Alert.alert(
      'Exit Quiz',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Continue Quiz', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        },
      ]
    );
  };

  const handleWhiteboardToggle = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Digital whiteboard is available for Premium subscribers only.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }
    setShowWhiteboard(!showWhiteboard);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Quiz...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Quiz not found</Text>
        <MilitaryButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          branch={user?.selectedBranch}
        />
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const branchColor = theme.branchColors[user?.selectedBranch || 'ARMY'];

  return (
    <View style={styles.container}>
      {/* Header with timer and progress */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <Text style={styles.questionCounter}>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </Text>
        </View>
        <QuizTimer 
          seconds={timeSpent}
          isASVABReplica={quiz.isASVABReplica}
          branch={user?.selectedBranch || 'ARMY'}
        />
      </View>

      <QuizProgress 
        progress={progress}
        branch={user?.selectedBranch || 'ARMY'}
      />

      {/* Question Card */}
      <View style={styles.questionContainer}>
        <QuestionCard
          question={currentQuestion.question}
          selectedAnswer={selectedAnswer}
          onAnswerSelect={handleAnswerSubmit}
          showCorrectAnswer={false}
          branch={user?.selectedBranch || 'ARMY'}
          questionNumber={currentQuestionIndex + 1}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <View style={styles.navigationButtons}>
          <MilitaryButton
            title="Previous"
            onPress={handlePreviousQuestion}
            variant="secondary"
            disabled={currentQuestionIndex === 0}
            style={styles.navButton}
            icon="arrow-back"
          />

          <MilitaryButton
            title={isLastQuestion ? "Finish Quiz" : "Next"}
            onPress={handleNextQuestion}
            variant="primary"
            branch={user?.selectedBranch}
            disabled={selectedAnswer === null}
            loading={submitAnswerMutation.isPending || completeQuizMutation.isPending}
            style={styles.navButton}
            icon={isLastQuestion ? "checkmark" : "arrow-forward"}
          />
        </View>

        <View style={styles.toolButtons}>
          <MilitaryButton
            title="Whiteboard"
            onPress={handleWhiteboardToggle}
            variant="secondary"
            disabled={!isPremium}
            style={[styles.toolButton, isPremium && { borderColor: branchColor }]}
            icon="create"
          />

          <MilitaryButton
            title="Exit Quiz"
            onPress={handleExitQuiz}
            variant="secondary"
            style={styles.toolButton}
            icon="exit"
          />
        </View>
      </View>

      {/* Whiteboard Modal */}
      <WhiteboardModal
        visible={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        data={whiteboardData}
        onSave={setWhiteboardData}
        branch={user?.selectedBranch || 'ARMY'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  loadingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.DARK_OLIVE,
    padding: theme.spacing[4],
  },
  errorText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.DANGER,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.MILITARY_GREEN}60`,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.KHAKI,
  },
  headerLeft: {
    flex: 1,
  },
  quizTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  questionCounter: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  questionContainer: {
    flex: 1,
    padding: theme.spacing[4],
  },
  actionsContainer: {
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    borderTopWidth: 1,
    borderTopColor: theme.colors.KHAKI,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  navButton: {
    flex: 1,
    marginHorizontal: theme.spacing[2],
  },
  toolButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  toolButton: {
    flex: 1,
    marginHorizontal: theme.spacing[2],
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
});