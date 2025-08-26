import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { ProgressCircle } from '@/components/UI/ProgressCircle';
import { fitnessService, PTTestResult, FitnessStandard } from '@/services/fitnessService';
import { BRANCH_INFO } from '@asvab-prep/shared';

interface PTTestForm {
  runTime: string; // MM:SS format
  pushups: string;
  situps: string;
  waist?: string; // inches
  weight?: string; // lbs
  bodyFatPercentage?: string;
}

interface TestEvent {
  name: string;
  value: string;
  unit: string;
  standardValue: number;
  standardOperator: 'min' | 'max' | 'time';
  passed: boolean;
  points: number;
  maxPoints: number;
}

export const PTTestScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBranch, user, isPremium } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<PTTestForm>({
    runTime: '',
    pushups: '',
    situps: '',
    waist: '',
    weight: '',
    bodyFatPercentage: '',
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [testResults, setTestResults] = useState<{
    events: TestEvent[];
    totalScore: number;
    maxScore: number;
    passed: boolean;
    category: string;
  } | null>(null);

  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;
  const branchInfo = selectedBranch ? BRANCH_INFO[selectedBranch] : null;

  // Fetch fitness standards for user's branch
  const { data: standards } = useQuery({
    queryKey: ['fitnessStandards', selectedBranch, user?.profile?.age, user?.profile?.gender],
    queryFn: () => fitnessService.getFitnessStandards(
      selectedBranch!,
      user?.profile?.age || 20,
      user?.profile?.gender || 'MALE'
    ),
    enabled: !!selectedBranch && !!user,
  });

  // Submit PT test mutation
  const submitTestMutation = useMutation({
    mutationFn: (data: any) => fitnessService.submitPTTest(data),
    onSuccess: (result) => {
      Toast.show({
        type: 'success',
        text1: `${branchInfo?.exclamation} Test Recorded!`,
        text2: `Score: ${result.totalScore}/${result.maxScore} - ${result.category}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['fitnessAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ptTestHistory'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Test Submission Failed',
        text2: 'Please try again.',
      });
    },
  });

  const convertTimeToSeconds = (timeStr: string): number => {
    if (!timeStr.includes(':')) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    if (!standards || !form.runTime || !form.pushups || !form.situps) {
      Alert.alert('Incomplete Data', 'Please fill in all required fields.');
      return;
    }

    setIsCalculating(true);

    try {
      const runTimeSeconds = convertTimeToSeconds(form.runTime);
      const pushupsCount = parseInt(form.pushups);
      const situpsCount = parseInt(form.situps);

      // Calculate based on branch standards
      const events: TestEvent[] = [];
      let totalScore = 0;
      let maxScore = 300; // Most branches use 300 max

      // Push-ups
      const pushupStandard = standards.pushups;
      const pushupPassed = pushupsCount >= pushupStandard.minimum;
      const pushupPoints = Math.min(100, Math.max(0, 
        60 + ((pushupsCount - pushupStandard.minimum) / (pushupStandard.maximum - pushupStandard.minimum)) * 40
      ));
      
      events.push({
        name: 'Push-ups',
        value: form.pushups,
        unit: 'reps',
        standardValue: pushupStandard.minimum,
        standardOperator: 'min',
        passed: pushupPassed,
        points: Math.round(pushupPoints),
        maxPoints: 100,
      });

      totalScore += Math.round(pushupPoints);

      // Sit-ups
      const situpStandard = standards.situps;
      const situpPassed = situpsCount >= situpStandard.minimum;
      const situpPoints = Math.min(100, Math.max(0, 
        60 + ((situpsCount - situpStandard.minimum) / (situpStandard.maximum - situpStandard.minimum)) * 40
      ));
      
      events.push({
        name: 'Sit-ups',
        value: form.situps,
        unit: 'reps',
        standardValue: situpStandard.minimum,
        standardOperator: 'min',
        passed: situpPassed,
        points: Math.round(situpPoints),
        maxPoints: 100,
      });

      totalScore += Math.round(situpPoints);

      // Run Time
      const runStandard = standards.run;
      const runPassed = runTimeSeconds <= runStandard.maxTime;
      const runPoints = Math.min(100, Math.max(0, 
        100 - ((runTimeSeconds - runStandard.bestTime) / (runStandard.maxTime - runStandard.bestTime)) * 40
      ));
      
      events.push({
        name: selectedBranch === 'NAVY' ? '1.5 Mile Run' : '2 Mile Run',
        value: form.runTime,
        unit: 'time',
        standardValue: runStandard.maxTime,
        standardOperator: 'time',
        passed: runPassed,
        points: Math.round(runPoints),
        maxPoints: 100,
      });

      totalScore += Math.round(runPoints);

      // Determine category
      let category = 'Failure';
      if (totalScore >= 270) category = 'Excellent';
      else if (totalScore >= 240) category = 'Very Good';
      else if (totalScore >= 210) category = 'Good';
      else if (totalScore >= 180) category = 'Satisfactory';

      const passed = events.every(event => event.passed) && totalScore >= 180;

      setTestResults({
        events,
        totalScore,
        maxScore,
        passed,
        category,
      });

    } catch (error) {
      Alert.alert('Calculation Error', 'Please check your input values.');
    }

    setIsCalculating(false);
  };

  const saveTest = () => {
    if (!testResults) return;

    const testData = {
      branch: selectedBranch,
      testDate: new Date().toISOString(),
      runTime: convertTimeToSeconds(form.runTime),
      pushups: parseInt(form.pushups),
      situps: parseInt(form.situps),
      waist: form.waist ? parseFloat(form.waist) : undefined,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      bodyFatPercentage: form.bodyFatPercentage ? parseFloat(form.bodyFatPercentage) : undefined,
      totalScore: testResults.totalScore,
      maxScore: testResults.maxScore,
      passed: testResults.passed,
      category: testResults.category,
    };

    submitTestMutation.mutate(testData);
  };

  const resetForm = () => {
    setForm({
      runTime: '',
      pushups: '',
      situps: '',
      waist: '',
      weight: '',
      bodyFatPercentage: '',
    });
    setTestResults(null);
  };

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.premiumGate}
        >
          <View style={styles.premiumGateContent}>
            <Ionicons name="fitness" size={64} color={theme.colors.TACTICAL_ORANGE} />
            <Text style={styles.premiumTitle}>PT TEST CALCULATOR</Text>
            <Text style={styles.premiumSubtitle}>PREMIUM FEATURE</Text>
            <Text style={styles.premiumDescription}>
              Track your physical fitness with branch-specific PT test calculations, 
              progress monitoring, and training recommendations.
            </Text>
            
            <MilitaryButton
              title="UPGRADE TO PREMIUM"
              onPress={() => {/* Navigate to subscription */}}
              style={{ backgroundColor: theme.colors.TACTICAL_ORANGE, marginTop: 20 }}
              textStyle={{ color: theme.colors.DARK_OLIVE }}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={[branchColor, theme.colors.DARK_OLIVE]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={resetForm} style={styles.resetButton}>
              <Ionicons name="refresh" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>PT TEST CALCULATOR</Text>
            <Text style={styles.headerSubtitle}>
              {selectedBranch?.replace('_', ' ')} Standards
            </Text>
            {branchInfo && (
              <Text style={styles.headerMotto}>{branchInfo.motto}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Input Form */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="TEST RESULTS"
            subtitle="Enter your performance"
            iconName="clipboard"
            iconColor={branchColor}
          />
          <MilitaryCardContent>
            {/* Run Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {selectedBranch === 'NAVY' ? '1.5 Mile Run Time' : '2 Mile Run Time'}
              </Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="MM:SS"
                  value={form.runTime}
                  onChangeText={(value) => setForm(prev => ({ ...prev, runTime: value }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>MM:SS</Text>
              </View>
              {standards && (
                <Text style={styles.standardText}>
                  Standard: {formatTime(standards.run.maxTime)} or better
                </Text>
              )}
            </View>

            {/* Push-ups */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Push-ups (2 minutes)</Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  placeholder="0"
                  value={form.pushups}
                  onChangeText={(value) => setForm(prev => ({ ...prev, pushups: value }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>reps</Text>
              </View>
              {standards && (
                <Text style={styles.standardText}>
                  Minimum: {standards.pushups.minimum} reps
                </Text>
              )}
            </View>

            {/* Sit-ups */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sit-ups (2 minutes)</Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  placeholder="0"
                  value={form.situps}
                  onChangeText={(value) => setForm(prev => ({ ...prev, situps: value }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>reps</Text>
              </View>
              {standards && (
                <Text style={styles.standardText}>
                  Minimum: {standards.situps.minimum} reps
                </Text>
              )}
            </View>

            {/* Additional Measurements */}
            <Text style={styles.sectionTitle}>Additional Measurements (Optional)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Waist Measurement</Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  placeholder="0.0"
                  value={form.waist}
                  onChangeText={(value) => setForm(prev => ({ ...prev, waist: value }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>inches</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight</Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  placeholder="0.0"
                  value={form.weight}
                  onChangeText={(value) => setForm(prev => ({ ...prev, weight: value }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>lbs</Text>
              </View>
            </View>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Calculate Button */}
        <View style={styles.calculateContainer}>
          <MilitaryButton
            title="CALCULATE SCORE"
            onPress={calculateScore}
            style={{ backgroundColor: branchColor }}
            icon="calculator"
            loading={isCalculating}
            disabled={!form.runTime || !form.pushups || !form.situps}
          />
        </View>

        {/* Results */}
        {testResults && (
          <>
            <MilitaryCard style={styles.card}>
              <MilitaryCardHeader
                title="TEST RESULTS"
                subtitle={`Overall: ${testResults.category}`}
                iconName={testResults.passed ? "checkmark-circle" : "close-circle"}
                iconColor={testResults.passed ? theme.colors.SUCCESS : theme.colors.DANGER}
              />
              <MilitaryCardContent>
                <View style={styles.overallScoreContainer}>
                  <ProgressCircle
                    progress={testResults.totalScore / testResults.maxScore}
                    size={80}
                    strokeWidth={8}
                    color={testResults.passed ? theme.colors.SUCCESS : theme.colors.DANGER}
                  />
                  <View style={styles.overallScoreInfo}>
                    <Text style={[styles.totalScore, { 
                      color: testResults.passed ? theme.colors.SUCCESS : theme.colors.DANGER 
                    }]}>
                      {testResults.totalScore}
                    </Text>
                    <Text style={styles.maxScore}>/ {testResults.maxScore}</Text>
                    <Text style={[styles.category, { 
                      color: testResults.passed ? theme.colors.SUCCESS : theme.colors.DANGER 
                    }]}>
                      {testResults.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventBreakdown}>
                  <Text style={styles.breakdownTitle}>Event Breakdown:</Text>
                  {testResults.events.map((event, index) => (
                    <View key={index} style={styles.eventRow}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventName}>{event.name}</Text>
                        <Text style={styles.eventValue}>
                          {event.unit === 'time' ? event.value : `${event.value} ${event.unit}`}
                        </Text>
                      </View>
                      <View style={styles.eventScore}>
                        <Text style={[styles.eventPoints, { 
                          color: event.passed ? theme.colors.SUCCESS : theme.colors.DANGER 
                        }]}>
                          {event.points}/100
                        </Text>
                        <Ionicons
                          name={event.passed ? "checkmark-circle" : "close-circle"}
                          size={20}
                          color={event.passed ? theme.colors.SUCCESS : theme.colors.DANGER}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </MilitaryCardContent>
            </MilitaryCard>

            {/* Save Test */}
            <View style={styles.saveContainer}>
              <MilitaryButton
                title="SAVE TEST RESULTS"
                onPress={saveTest}
                style={{ 
                  backgroundColor: theme.colors.SUCCESS,
                  marginBottom: theme.spacing[3],
                }}
                icon="save"
                loading={submitTestMutation.isLoading}
              />
              
              <MilitaryButton
                title="NEW TEST"
                onPress={resetForm}
                style={{
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: branchColor,
                }}
                textStyle={{ color: branchColor }}
                icon="refresh"
              />
            </View>
          </>
        )}

        {/* Training Recommendations */}
        {testResults && !testResults.passed && (
          <MilitaryCard style={[styles.card, styles.recommendationsCard]}>
            <MilitaryCardHeader
              title="TRAINING RECOMMENDATIONS"
              subtitle="Areas for improvement"
              iconName="fitness"
              iconColor={theme.colors.WARNING}
            />
            <MilitaryCardContent>
              <Text style={styles.recommendationsIntro}>
                Based on your test results, focus on these areas:
              </Text>
              
              {testResults.events.filter(event => !event.passed).map((event, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.WARNING} />
                  <Text style={styles.recommendationText}>
                    {event.name}: Need {event.standardOperator === 'min' ? 'at least' : 'under'}{' '}
                    {event.standardOperator === 'time' ? formatTime(event.standardValue) : event.standardValue}
                    {event.unit !== 'time' ? ` ${event.unit}` : ''}
                  </Text>
                </View>
              ))}
              
              <MilitaryButton
                title="CREATE TRAINING PLAN"
                onPress={() => {
                  Toast.show({
                    type: 'info',
                    text1: 'Training Plans Coming Soon',
                    text2: 'Personalized PT training plans are in development.',
                  });
                }}
                style={{ 
                  backgroundColor: theme.colors.WARNING,
                  marginTop: theme.spacing[4],
                }}
                size="small"
              />
            </MilitaryCardContent>
          </MilitaryCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DESERT_SAND,
  },
  scrollView: {
    flex: 1,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumGateContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  premiumTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    marginTop: theme.spacing[4],
    letterSpacing: 2,
  },
  premiumSubtitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[4],
  },
  premiumDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  header: {
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  backButton: {
    padding: theme.spacing[2],
  },
  resetButton: {
    padding: theme.spacing[2],
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    letterSpacing: 2,
    marginBottom: theme.spacing[2],
  },
  headerSubtitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    marginBottom: theme.spacing[2],
  },
  headerMotto: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DESERT_SAND,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  inputGroup: {
    marginBottom: theme.spacing[6],
  },
  inputLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  timeInput: {
    flex: 1,
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  numberInput: {
    flex: 1,
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
  },
  inputUnit: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.textSecondary,
  },
  standardText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  calculateContainer: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  overallScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  overallScoreInfo: {
    flex: 1,
    marginLeft: theme.spacing[4],
    alignItems: 'center',
  },
  totalScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['3xl'],
  },
  maxScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.textSecondary,
  },
  category: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginTop: theme.spacing[2],
  },
  eventBreakdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing[4],
  },
  breakdownTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },
  eventValue: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  eventScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPoints: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginRight: theme.spacing[2],
  },
  saveContainer: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  recommendationsCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.WARNING,
  },
  recommendationsIntro: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
    lineHeight: 22,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  recommendationText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing[2],
    lineHeight: 22,
  },
});