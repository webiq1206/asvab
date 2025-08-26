import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

import { theme } from '@/constants/theme';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { QuestionLimitNotice } from '@/components/Question/QuestionLimitNotice';
import { useUserStore } from '@/store/userStore';
import { quizService, CreateQuizRequest } from '@/services/quizService';
import { QuestionCategory, QuestionDifficulty, CATEGORY_DISPLAY_NAMES, ALL_ASVAB_CATEGORIES, FREE_TIER_LIMITS } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface RouteParams {
  isASVABReplica?: boolean;
}

export const QuizSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isASVABReplica = false } = (route.params as RouteParams) || {};
  
  const { user } = useUserStore();
  const [title, setTitle] = useState(isASVABReplica ? 'ASVAB Practice Exam' : 'Practice Quiz');
  const [category, setCategory] = useState<QuestionCategory | ''>('');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('');
  const [questionCount, setQuestionCount] = useState(isASVABReplica ? 200 : 10);
  const [targetScore, setTargetScore] = useState(80);
  const [showLimitNotice, setShowLimitNotice] = useState(false);

  const isPremium = user?.subscriptionTier === 'PREMIUM';
  const maxQuestions = isPremium ? 50 : FREE_TIER_LIMITS.QUIZ_QUESTION_LIMIT;

  const createQuizMutation = useMutation({
    mutationFn: async (request: CreateQuizRequest) => {
      if (isASVABReplica) {
        return quizService.createASVABReplica(title, targetScore);
      }
      return quizService.createQuiz(request);
    },
    onSuccess: (quiz) => {
      navigation.navigate('QuizTaking', { quizId: quiz.id });
    },
    onError: (error: any) => {
      if (error.response?.status === 403) {
        setShowLimitNotice(true);
      } else {
        Alert.alert(
          'Quiz Creation Failed',
          error.response?.data?.message || 'Failed to create quiz. Please try again.',
          [{ text: 'OK' }]
        );
      }
    },
  });

  const handleCreateQuiz = () => {
    if (!title.trim()) {
      Alert.alert('Invalid Title', 'Please enter a quiz title.');
      return;
    }

    if (!isASVABReplica && questionCount < 1) {
      Alert.alert('Invalid Question Count', 'Quiz must have at least 1 question.');
      return;
    }

    const request: CreateQuizRequest = {
      title: title.trim(),
      category: category || undefined,
      difficulty: difficulty || undefined,
      questionCount,
      isASVABReplica,
      targetScore,
    };

    createQuizMutation.mutate(request);
  };

  const handleASVABReplica = () => {
    if (!isPremium) {
      setShowLimitNotice(true);
      return;
    }
    navigation.navigate('QuizSetup', { isASVABReplica: true });
  };

  const branchColor = theme.branchColors[user?.selectedBranch || 'ARMY'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <MilitaryCard variant="command" branch={user?.selectedBranch}>
        <MilitaryCardHeader
          title={isASVABReplica ? "ASVAB REPLICA EXAM" : "QUIZ SETUP"}
          subtitle={isASVABReplica ? "Full ASVAB simulation with all 9 sections" : "Configure your practice quiz"}
          variant="command"
        />

        <MilitaryCardContent>
          {isASVABReplica && (
            <View style={styles.asvabInfo}>
              <View style={styles.infoHeader}>
                <Ionicons name="time-outline" size={20} color={branchColor} />
                <Text style={styles.infoTitle}>EXAM DETAILS</Text>
              </View>
              <Text style={styles.infoText}>• 9 sections with official timing</Text>
              <Text style={styles.infoText}>• 200+ questions total</Text>
              <Text style={styles.infoText}>• 2 hours 29 minutes duration</Text>
              <Text style={styles.infoText}>• Premium whiteboard included</Text>
            </View>
          )}

          {/* Quiz Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUIZ TITLE</Text>
            <TouchableOpacity
              style={styles.textInput}
              onPress={() => {
                // In a real app, you'd open a text input modal here
                Alert.prompt(
                  'Quiz Title',
                  'Enter a title for your quiz:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', onPress: (text) => text && setTitle(text) },
                  ],
                  'plain-text',
                  title
                );
              }}
            >
              <Text style={styles.textInputText}>{title}</Text>
              <Ionicons name="pencil" size={16} color={theme.colors.KHAKI} />
            </TouchableOpacity>
          </View>

          {!isASVABReplica && (
            <>
              {/* Category Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CATEGORY (OPTIONAL)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={category}
                    onValueChange={setCategory}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="All Categories" value="" />
                    {ALL_ASVAB_CATEGORIES.map(cat => (
                      <Picker.Item
                        key={cat}
                        label={CATEGORY_DISPLAY_NAMES[cat]}
                        value={cat}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Difficulty Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DIFFICULTY (OPTIONAL)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={difficulty}
                    onValueChange={setDifficulty}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="All Difficulties" value="" />
                    <Picker.Item label="Easy" value={QuestionDifficulty.EASY} />
                    <Picker.Item label="Medium" value={QuestionDifficulty.MEDIUM} />
                    <Picker.Item label="Hard" value={QuestionDifficulty.HARD} />
                  </Picker>
                </View>
              </View>

              {/* Question Count */}
              <View style={styles.section}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sectionTitle}>QUESTION COUNT</Text>
                  <Text style={[styles.countValue, { color: branchColor }]}>
                    {questionCount}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={maxQuestions}
                  value={questionCount}
                  onValueChange={(value) => setQuestionCount(Math.round(value))}
                  step={1}
                  minimumTrackTintColor={branchColor}
                  maximumTrackTintColor={`${branchColor}40`}
                  thumbStyle={{ backgroundColor: branchColor }}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>1</Text>
                  <Text style={styles.sliderLabel}>{maxQuestions}</Text>
                </View>
                {!isPremium && (
                  <Text style={styles.limitText}>
                    Free tier limited to {FREE_TIER_LIMITS.QUIZ_QUESTION_LIMIT} questions
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Target Score */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sectionTitle}>TARGET SCORE</Text>
              <Text style={[styles.countValue, { color: branchColor }]}>
                {targetScore}%
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={100}
              value={targetScore}
              onValueChange={(value) => setTargetScore(Math.round(value))}
              step={5}
              minimumTrackTintColor={branchColor}
              maximumTrackTintColor={`${branchColor}40`}
              thumbStyle={{ backgroundColor: branchColor }}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>50%</Text>
              <Text style={styles.sliderLabel}>100%</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <MilitaryButton
              title={isASVABReplica ? "START ASVAB EXAM" : "CREATE QUIZ"}
              onPress={handleCreateQuiz}
              variant="primary"
              branch={user?.selectedBranch}
              loading={createQuizMutation.isPending}
              style={styles.createButton}
              icon="rocket"
            />

            {!isASVABReplica && (
              <MilitaryButton
                title="ASVAB REPLICA EXAM"
                onPress={handleASVABReplica}
                variant="secondary"
                disabled={!isPremium}
                style={styles.asvabButton}
                icon="star"
              />
            )}
          </View>

          {!isPremium && !isASVABReplica && (
            <View style={styles.premiumPromo}>
              <Ionicons name="star" size={16} color={theme.colors.TACTICAL_ORANGE} />
              <Text style={styles.promoText}>
                Upgrade to Premium for unlimited questions and ASVAB replica exam
              </Text>
            </View>
          )}
        </MilitaryCardContent>
      </MilitaryCard>

      <QuestionLimitNotice
        visible={showLimitNotice}
        onClose={() => setShowLimitNotice(false)}
        branch={user?.selectedBranch || 'ARMY'}
        message="Quiz creation requires Premium subscription for full features."
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  contentContainer: {
    padding: theme.spacing[4],
  },
  asvabInfo: {
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}15`,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing[6],
    borderWidth: 1,
    borderColor: theme.colors.TACTICAL_ORANGE,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  infoTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
    marginLeft: theme.spacing[2],
  },
  infoText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[3],
  },
  textInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
  },
  textInputText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
  },
  picker: {
    height: 50,
    color: '#FFFFFF',
  },
  pickerItem: {
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  countValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
  },
  slider: {
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
  },
  sliderLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  limitText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.TACTICAL_ORANGE,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  buttonContainer: {
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
  },
  createButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  asvabButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
  premiumPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    borderRadius: theme.borderRadius.base,
  },
  promoText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginLeft: theme.spacing[2],
    textAlign: 'center',
    flex: 1,
  },
});