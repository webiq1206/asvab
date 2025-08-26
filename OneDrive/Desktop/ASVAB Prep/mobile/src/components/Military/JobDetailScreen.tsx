import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { militaryJobsService, MilitaryJob } from '../../services/militaryJobsService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';
import { CircularProgress } from '../common/CircularProgress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  jobId: string;
  job?: MilitaryJob;
  onExit?: () => void;
  onViewSimilar?: () => void;
}

export const JobDetailScreen: React.FC<Props> = ({ jobId, job, onExit, onViewSimilar }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'benefits'>('overview');

  // Fetch job details if not provided
  const { data: jobData, isLoading } = useQuery({
    queryKey: ['militaryJob', jobId],
    queryFn: () => militaryJobsService.getJobById(jobId),
    enabled: !job && !!jobId,
    initialData: job,
  });

  // Fetch user's favorite jobs
  const { data: favoriteJobs = [] } = useQuery({
    queryKey: ['favoriteJobs'],
    queryFn: militaryJobsService.getUserFavoriteJobs,
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: militaryJobsService.addJobToFavorites,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteJobs'] });
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Job added to favorites!',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: 'Could not add job to favorites.',
      });
    },
  });

  const currentJob = jobData || job;

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

  const getDifficultyInfo = (afqtScore: number) => {
    return militaryJobsService.getDifficultyLevel(afqtScore);
  };

  const getClearanceInfo = (clearanceRequired?: string) => {
    return militaryJobsService.getClearanceLevel(clearanceRequired);
  };

  const getTrainingInfo = (trainingLength?: string) => {
    return militaryJobsService.formatTrainingLength(trainingLength);
  };

  const isFavorite = (jobId: string): boolean => {
    return favoriteJobs.some(job => job.id === jobId);
  };

  const handleAddToFavorites = () => {
    if (currentJob && !isFavorite(currentJob.id)) {
      addToFavoritesMutation.mutate(currentJob.id);
    }
  };

  const handleQualificationCheck = () => {
    // This would navigate to a qualification checker screen
    Alert.alert(
      'Check Your Qualification',
      'Take a practice ASVAB to see if you qualify for this position.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Start Practice Test', onPress: () => {
          // Navigate to practice test
        }},
      ]
    );
  };

  const renderTabButton = (
    tab: 'overview' | 'requirements' | 'benefits',
    title: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: colors.primary },
        { borderColor: colors.border }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={activeTab === tab ? 'white' : colors.textSecondary} 
      />
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tab ? 'white' : colors.textSecondary }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Job Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.summaryGradient}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Mission Overview
          </Text>
          <Text style={[styles.jobDescription, { color: colors.textSecondary }]}>
            {currentJob?.description}
          </Text>
        </LinearGradient>
      </View>

      {/* Key Information */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Position Details
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="ribbon" size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>MOS Code</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{currentJob?.mosCode}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="flag" size={20} color={colors.accent} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Branch</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{currentJob?.branch}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="school" size={20} color={colors.info} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Min AFQT</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{currentJob?.minAFQTScore}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Training</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {getTrainingInfo(currentJob?.trainingLength)}
            </Text>
          </View>
        </View>
      </View>

      {/* Career Progression */}
      <View style={[styles.careerCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.success + '20', colors.primary + '20']}
          style={styles.careerGradient}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Career Progression
          </Text>
          <View style={styles.progressionPath}>
            <View style={styles.progressionStep}>
              <View style={[styles.stepCircle, { backgroundColor: colors.success }]}>
                <Text style={[styles.stepNumber, { color: 'white' }]}>1</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                Entry Level
              </Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                {currentJob?.title}
              </Text>
            </View>

            <View style={styles.progressionArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
            </View>

            <View style={styles.progressionStep}>
              <View style={[styles.stepCircle, { backgroundColor: colors.warning }]}>
                <Text style={[styles.stepNumber, { color: 'white' }]}>2</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                Advanced
              </Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Senior {currentJob?.title}
              </Text>
            </View>

            <View style={styles.progressionArrow}>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
            </View>

            <View style={styles.progressionStep}>
              <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
                <Text style={[styles.stepNumber, { color: 'white' }]}>3</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                Leadership
              </Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Team Leader
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const renderRequirementsTab = () => {
    const difficulty = getDifficultyInfo(currentJob?.minAFQTScore || 0);
    const clearance = getClearanceInfo(currentJob?.clearanceRequired);

    return (
      <View style={styles.tabContent}>
        {/* AFQT Requirements */}
        <View style={[styles.requirementCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            AFQT Score Requirement
          </Text>
          
          <View style={styles.afqtContainer}>
            <CircularProgress
              size={80}
              progress={currentJob?.minAFQTScore || 0}
              strokeWidth={8}
              color={difficulty.color}
              backgroundColor={colors.border}
              max={100}
            />
            <View style={styles.afqtInfo}>
              <Text style={[styles.afqtScore, { color: difficulty.color }]}>
                {currentJob?.minAFQTScore}
              </Text>
              <Text style={[styles.afqtLabel, { color: colors.textSecondary }]}>
                Minimum Required
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: difficulty.color + '20' }]}>
                <Text style={[styles.difficultyText, { color: difficulty.color }]}>
                  {difficulty.level} Difficulty
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={[styles.difficultyDescription, { color: colors.textSecondary }]}>
            {difficulty.description}
          </Text>
        </View>

        {/* Line Score Requirements */}
        {currentJob && Object.keys(currentJob.requiredLineScores).length > 0 && (
          <View style={[styles.lineScoresCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Required Line Scores
            </Text>
            <View style={styles.lineScoresGrid}>
              {Object.entries(currentJob.requiredLineScores).map(([score, value]) => (
                <View key={score} style={[styles.lineScoreItem, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.lineScoreCode, { color: colors.primary }]}>{score}</Text>
                  <Text style={[styles.lineScoreValue, { color: colors.text }]}>{value}+</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.lineScoreNote, { color: colors.textSecondary }]}>
              Line scores are calculated from your ASVAB subtest results
            </Text>
          </View>
        )}

        {/* Security Clearance */}
        {currentJob?.clearanceRequired && (
          <View style={[styles.clearanceCard, { backgroundColor: colors.surface }]}>
            <View style={styles.clearanceHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Security Clearance Required
              </Text>
            </View>
            <View style={[styles.clearanceBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.clearanceLevel, { color: colors.warning }]}>
                {clearance.level}
              </Text>
            </View>
            <Text style={[styles.clearanceDescription, { color: colors.textSecondary }]}>
              {clearance.description}
            </Text>
            <Text style={[styles.clearanceTimeframe, { color: colors.textSecondary }]}>
              Processing time: {clearance.timeframe}
            </Text>
          </View>
        )}

        {/* Physical Requirements */}
        {currentJob && currentJob.physicalRequirements.length > 0 && (
          <View style={[styles.physicalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Physical Requirements
            </Text>
            {currentJob.physicalRequirements.map((requirement, index) => (
              <View key={index} style={styles.physicalItem}>
                <Ionicons name="fitness" size={16} color={colors.accent} />
                <Text style={[styles.physicalText, { color: colors.textSecondary }]}>
                  {requirement}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderBenefitsTab = () => (
    <View style={styles.tabContent}>
      {/* Training Benefits */}
      <View style={[styles.benefitsCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.success + '20', colors.info + '20']}
          style={styles.benefitsGradient}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Training & Education
          </Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="school" size={20} color={colors.success} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Technical Training
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                {getTrainingInfo(currentJob?.trainingLength)} of specialized military training
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="certificate" size={20} color={colors.info} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                Industry Certifications
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Earn valuable civilian certifications during service
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="library" size={20} color={colors.warning} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                College Credits
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                Military training often translates to college credit hours
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Career Benefits */}
      <View style={[styles.careerBenefitsCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Career Advantages
        </Text>

        <View style={styles.advantagesList}>
          <View style={styles.advantageItem}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.advantageText, { color: colors.textSecondary }]}>
              Leadership development opportunities
            </Text>
          </View>

          <View style={styles.advantageItem}>
            <Ionicons name="people" size={16} color={colors.accent} />
            <Text style={[styles.advantageText, { color: colors.textSecondary }]}>
              Team management experience
            </Text>
          </View>

          <View style={styles.advantageItem}>
            <Ionicons name="globe" size={16} color={colors.info} />
            <Text style={[styles.advantageText, { color: colors.textSecondary }]}>
              Global assignment opportunities
            </Text>
          </View>

          <View style={styles.advantageItem}>
            <Ionicons name="briefcase" size={16} color={colors.success} />
            <Text style={[styles.advantageText, { color: colors.textSecondary }]}>
              Civilian career transition support
            </Text>
          </View>
        </View>
      </View>

      {/* Financial Benefits */}
      <View style={[styles.financialCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.success + '20', colors.warning + '20']}
          style={styles.financialGradient}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Financial Benefits
          </Text>
          
          <Text style={[styles.benefitHighlight, { color: colors.success }]}>
            Full Military Benefits Package
          </Text>
          
          <View style={styles.financialList}>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • Base pay based on rank and time in service
            </Text>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • Housing allowance (BAH) or on-base housing
            </Text>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • Food allowance (BAS) or meal plans
            </Text>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • Medical and dental coverage
            </Text>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • GI Bill education benefits
            </Text>
            <Text style={[styles.financialItem, { color: colors.textSecondary }]}>
              • Retirement savings plan (TSP)
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading job details..." />
      </SafeAreaView>
    );
  }

  if (!currentJob) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="Job Not Found" onBack={onExit} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Job details could not be loaded
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const favorite = isFavorite(currentJob.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title={currentJob.title} onBack={onExit} />
      
      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.jobHeaderInfo}>
              <Text style={[styles.jobTitle, { color: colors.text }]}>{currentJob.title}</Text>
              <View style={[styles.mosCodeBadge, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[styles.mosCodeText, { color: colors.primary }]}>
                  {currentJob.mosCode}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={handleAddToFavorites}
              style={styles.favoriteButton}
            >
              <Ionicons 
                name={favorite ? 'heart' : 'heart-outline'} 
                size={28} 
                color={favorite ? colors.error : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderTabButton('overview', 'Overview', 'information-circle')}
          {renderTabButton('requirements', 'Requirements', 'checkmark-circle')}
          {renderTabButton('benefits', 'Benefits', 'gift')}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'requirements' && renderRequirementsTab()}
        {activeTab === 'benefits' && renderBenefitsTab()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleQualificationCheck}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>Check Qualification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={onViewSimilar}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            Similar Jobs
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobHeaderInfo: {
    flex: 1,
    marginRight: 15,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  mosCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  mosCodeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteButton: {
    padding: 8,
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 5,
    marginLeft: 15,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  summaryCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  careerCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  careerGradient: {
    padding: 20,
  },
  progressionPath: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressionStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 10,
    textAlign: 'center',
  },
  progressionArrow: {
    paddingHorizontal: 10,
  },
  requirementCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  afqtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  afqtInfo: {
    marginLeft: 20,
    flex: 1,
  },
  afqtScore: {
    fontSize: 32,
    fontWeight: '700',
  },
  afqtLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  lineScoresCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  lineScoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  lineScoreItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  lineScoreCode: {
    fontSize: 12,
    fontWeight: '700',
  },
  lineScoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  lineScoreNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  clearanceCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  clearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginBottom: 10,
  },
  clearanceLevel: {
    fontSize: 16,
    fontWeight: '700',
  },
  clearanceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  clearanceTimeframe: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  physicalCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  physicalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  physicalText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  benefitsCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  benefitsGradient: {
    padding: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  benefitContent: {
    marginLeft: 15,
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  careerBenefitsCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  advantagesList: {
    marginTop: 10,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  advantageText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  financialCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  financialGradient: {
    padding: 20,
  },
  benefitHighlight: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
  },
  financialList: {
    marginTop: 10,
  },
  financialItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});