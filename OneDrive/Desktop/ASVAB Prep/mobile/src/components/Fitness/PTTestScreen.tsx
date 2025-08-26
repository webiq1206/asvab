import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MilitaryBranch, PTTestResult } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { fitnessService } from '../../services/fitnessService';
import { MilitaryHeader } from '../common/MilitaryHeader';

interface Props {
  onBack?: () => void;
  onViewResults?: (result: PTTestResult) => void;
}

export const PTTestScreen: React.FC<Props> = ({ onBack, onViewResults }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();

  const [testScores, setTestScores] = useState({
    runTime: '',
    pushups: '',
    situps: '',
    plankTime: '',
  });

  const [testResult, setTestResult] = useState<PTTestResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // PT Test simulation mutation
  const ptTestMutation = useMutation({
    mutationFn: fitnessService.simulatePTTest,
    onSuccess: (result) => {
      setTestResult(result);
      setShowResults(true);
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'PT Test completed successfully!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Test Failed',
        text2: error.response?.data?.message || 'Could not complete PT test.',
      });
    },
  });

  const handleScoreChange = (field: string, value: string) => {
    setTestScores(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateInputs = (): string | null => {
    if (!testScores.runTime.trim()) {
      return 'Run time is required';
    }

    if (!testScores.pushups.trim()) {
      return 'Push-ups count is required';
    }

    if (!testScores.situps.trim()) {
      return 'Sit-ups count is required';
    }

    // Validate run time format (MM:SS)
    const runTimeRegex = /^\d{1,2}:\d{2}$/;
    if (!runTimeRegex.test(testScores.runTime)) {
      return 'Run time must be in MM:SS format';
    }

    // Validate push-ups and sit-ups are numbers
    const pushups = parseInt(testScores.pushups);
    const situps = parseInt(testScores.situps);

    if (isNaN(pushups) || pushups < 0 || pushups > 200) {
      return 'Push-ups must be a number between 0-200';
    }

    if (isNaN(situps) || situps < 0 || situps > 200) {
      return 'Sit-ups must be a number between 0-200';
    }

    // Validate plank time if provided (Army/Space Force)
    if (needsPlank() && testScores.plankTime.trim()) {
      const plankTimeRegex = /^\d{1,2}:\d{2}$/;
      if (!plankTimeRegex.test(testScores.plankTime)) {
        return 'Plank time must be in MM:SS format';
      }
    }

    return null;
  };

  const needsPlank = (): boolean => {
    return user?.selectedBranch === MilitaryBranch.ARMY || 
           user?.selectedBranch === MilitaryBranch.SPACE_FORCE;
  };

  const handleSubmitTest = () => {
    const validationError = validateInputs();
    if (validationError) {
      Alert.alert('Invalid Input', validationError);
      return;
    }

    const runTimeSeconds = fitnessService.parseTimeToSeconds(testScores.runTime);
    const pushups = parseInt(testScores.pushups);
    const situps = parseInt(testScores.situps);
    const plankTimeSeconds = testScores.plankTime ? 
      fitnessService.parseTimeToSeconds(testScores.plankTime) : undefined;

    const scores = {
      runTimeSeconds,
      pushups,
      situps,
      ...(plankTimeSeconds && { planksSeconds: plankTimeSeconds }),
    };

    ptTestMutation.mutate(scores);
  };

  const resetTest = () => {
    setTestScores({
      runTime: '',
      pushups: '',
      situps: '',
      plankTime: '',
    });
    setTestResult(null);
    setShowResults(false);
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

  const renderTestForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.instructionsGradient}
        >
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            {user?.selectedBranch} PT Test Simulation
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Enter your performance scores for each exercise. This will calculate your official PT test score and provide recommendations.
          </Text>
        </LinearGradient>
      </View>

      {/* Run Test */}
      <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
        <View style={styles.exerciseHeader}>
          <Ionicons name="footsteps" size={20} color={colors.primary} />
          <Text style={[styles.exerciseTitle, { color: colors.text }]}>
            {fitnessService.getRunDistanceByBranch(user?.selectedBranch || MilitaryBranch.ARMY)}
          </Text>
        </View>
        
        <TextInput
          style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="MM:SS (e.g., 15:30)"
          placeholderTextColor={colors.textSecondary}
          value={testScores.runTime}
          onChangeText={(value) => handleScoreChange('runTime', value)}
          keyboardType="numeric"
        />
      </View>

      {/* Push-ups */}
      <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
        <View style={styles.exerciseHeader}>
          <Ionicons name="body" size={20} color={colors.primary} />
          <Text style={[styles.exerciseTitle, { color: colors.text }]}>Push-ups</Text>
        </View>
        
        <TextInput
          style={[styles.countInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Number of push-ups"
          placeholderTextColor={colors.textSecondary}
          value={testScores.pushups}
          onChangeText={(value) => handleScoreChange('pushups', value)}
          keyboardType="numeric"
        />
      </View>

      {/* Sit-ups or Plank */}
      {needsPlank() ? (
        <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
          <View style={styles.exerciseHeader}>
            <Ionicons name="timer" size={20} color={colors.primary} />
            <Text style={[styles.exerciseTitle, { color: colors.text }]}>Plank Hold</Text>
          </View>
          
          <TextInput
            style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="MM:SS (e.g., 2:30)"
            placeholderTextColor={colors.textSecondary}
            value={testScores.plankTime}
            onChangeText={(value) => handleScoreChange('plankTime', value)}
            keyboardType="numeric"
          />
        </View>
      ) : (
        <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
          <View style={styles.exerciseHeader}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
            <Text style={[styles.exerciseTitle, { color: colors.text }]}>Sit-ups</Text>
          </View>
          
          <TextInput
            style={[styles.countInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Number of sit-ups"
            placeholderTextColor={colors.textSecondary}
            value={testScores.situps}
            onChangeText={(value) => handleScoreChange('situps', value)}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleSubmitTest}
        disabled={ptTestMutation.isPending}
      >
        <Text style={[styles.submitButtonText, { color: colors.surface }]}>
          {ptTestMutation.isPending ? 'Calculating...' : 'Calculate PT Score'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderResults = () => {
    if (!testResult) return null;

    return (
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {/* Overall Score */}
        <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[
              fitnessService.getGradeColor(testResult.overallGrade) + '20',
              fitnessService.getGradeColor(testResult.overallGrade) + '10',
            ]}
            style={styles.scoreGradient}
          >
            <View style={styles.scoreHeader}>
              <Text style={[styles.overallScore, { color: fitnessService.getGradeColor(testResult.overallGrade) }]}>
                {Math.round(testResult.percentage)}%
              </Text>
              <View style={styles.scoreDetails}>
                <Text style={[styles.gradeText, { color: fitnessService.getGradeColor(testResult.overallGrade) }]}>
                  {testResult.overallGrade}
                </Text>
                <Text style={[styles.passFailText, { color: testResult.passed ? colors.success : colors.error }]}>
                  {testResult.passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.scoreBreakdown, { color: colors.textSecondary }]}>
              {testResult.totalPoints} / {testResult.maxPoints} points
            </Text>
            
            <Text style={[styles.motivationalMessage, { color: colors.text }]}>
              {fitnessService.getMotivationalMessage(testResult.overallGrade, testResult.branch)}
            </Text>
          </LinearGradient>
        </View>

        {/* Exercise Breakdown */}
        <View style={[styles.breakdownCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>Exercise Breakdown</Text>
          
          {testResult.exerciseResults.map((exercise, index) => (
            <View key={index} style={[styles.exerciseResult, { backgroundColor: colors.background }]}>
              <View style={styles.exerciseResultHeader}>
                <Text style={[styles.exerciseResultName, { color: colors.text }]}>
                  {exercise.exercise}
                </Text>
                <Text style={[styles.exerciseResultGrade, { color: fitnessService.getGradeColor(exercise.grade) }]}>
                  {exercise.grade}
                </Text>
              </View>
              
              <View style={styles.exerciseResultDetails}>
                <Text style={[styles.exerciseResultScore, { color: colors.primary }]}>
                  Your Score: {fitnessService.getFormattedValue(
                    exercise.exercise === 'Push-ups' ? 'PUSHUPS' : 
                    exercise.exercise === 'Sit-ups' ? 'SITUPS' : 
                    exercise.exercise === 'Plank' ? 'PLANK' : 'RUN',
                    exercise.userValue
                  )}
                </Text>
                <Text style={[styles.exerciseResultRequired, { color: colors.textSecondary }]}>
                  Required: {fitnessService.getFormattedValue(
                    exercise.exercise === 'Push-ups' ? 'PUSHUPS' : 
                    exercise.exercise === 'Sit-ups' ? 'SITUPS' : 
                    exercise.exercise === 'Plank' ? 'PLANK' : 'RUN',
                    exercise.requiredValue
                  )}
                </Text>
              </View>
              
              <View style={styles.pointsDisplay}>
                <Text style={[styles.pointsText, { color: colors.accent }]}>
                  {exercise.earnedPoints} / {exercise.maxPoints} points
                </Text>
                <Ionicons
                  name={exercise.passed ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={exercise.passed ? colors.success : colors.error}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        {testResult.recommendations.length > 0 && (
          <View style={[styles.recommendationsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.recommendationsTitle, { color: colors.text }]}>
              Training Recommendations
            </Text>
            
            {testResult.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  {rec}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={resetTest}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Take New Test
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => onViewResults?.(testResult)}
          >
            <Text style={[styles.primaryButtonText, { color: colors.surface }]}>
              View Detailed Analysis
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title="PT Test Simulator"
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {showResults ? renderResults() : renderTestForm()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 10,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  exerciseCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  countInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  submitButton: {
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scoreCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreGradient: {
    padding: 25,
    alignItems: 'center',
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 10,
  },
  scoreDetails: {
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  passFailText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreBreakdown: {
    fontSize: 16,
    marginBottom: 15,
  },
  motivationalMessage: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  breakdownCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  exerciseResult: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  exerciseResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseResultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseResultGrade: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseResultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exerciseResultScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseResultRequired: {
    fontSize: 14,
  },
  pointsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 40,
  },
  secondaryButton: {
    flex: 1,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});