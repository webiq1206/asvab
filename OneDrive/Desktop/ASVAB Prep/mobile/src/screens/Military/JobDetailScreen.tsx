import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { ProgressCircle } from '@/components/UI/ProgressCircle';
import { militaryJobsService, MilitaryJob } from '@/services/militaryJobsService';
import { BRANCH_INFO } from '@asvab-prep/shared';

interface RouteParams {
  jobId: string;
  job?: MilitaryJob; // Optional pre-loaded job data
}

interface LineScoreRequirement {
  name: string;
  required: number;
  userScore?: number;
  met: boolean;
}

export const JobDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId, job: preloadedJob } = route.params as RouteParams;
  
  const { selectedBranch, user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSecurityClearance, setShowSecurityClearance] = useState(false);

  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;
  const branchInfo = selectedBranch ? BRANCH_INFO[selectedBranch] : null;

  // Fetch job details if not pre-loaded
  const { data: job, isLoading } = useQuery({
    queryKey: ['militaryJob', jobId],
    queryFn: () => militaryJobsService.getJobById(jobId),
    initialData: preloadedJob,
    enabled: !preloadedJob,
  });

  // Add to favorites mutation
  const favoriteJobMutation = useMutation({
    mutationFn: (jobId: string) => militaryJobsService.addToFavorites(jobId),
    onSuccess: () => {
      setIsFavorite(true);
      Toast.show({
        type: 'success',
        text1: 'Job Saved!',
        text2: 'Added to your favorites list.',
      });
    },
  });

  // Get ASVAB score compatibility
  const { data: compatibility } = useQuery({
    queryKey: ['jobCompatibility', jobId],
    queryFn: () => militaryJobsService.checkJobCompatibility(jobId),
    enabled: !!job,
  });

  if (isLoading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>LOADING JOB DETAILS...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this military job: ${job.title} (${job.mosCode})\n\n${job.overview}\n\nLearn more about military careers with ASVAB Prep!`,
        title: `${job.title} - Military Job`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleApplyNow = () => {
    if (job.applicationUrl) {
      Linking.openURL(job.applicationUrl);
    } else {
      Toast.show({
        type: 'info',
        text1: 'Contact Recruiter',
        text2: 'Speak with your branch recruiter to learn more about this position.',
      });
    }
  };

  const calculateCompatibilityScore = (): number => {
    if (!compatibility) return 0;
    const { meetsAFQT, lineScores } = compatibility;
    
    if (!meetsAFQT) return 0;
    
    const metScores = lineScores.filter(score => score.met).length;
    return Math.round((metScores / lineScores.length) * 100);
  };

  const getCompatibilityColor = (score: number): string => {
    if (score >= 80) return theme.colors.SUCCESS;
    if (score >= 60) return theme.colors.WARNING;
    return theme.colors.DANGER;
  };

  const compatibilityScore = calculateCompatibilityScore();
  const compatibilityColor = getCompatibilityColor(compatibilityScore);

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
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                <Ionicons name="share" size={24} color={theme.colors.KHAKI} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => favoriteJobMutation.mutate(job.id)}
                style={styles.actionButton}
                disabled={isFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? theme.colors.DANGER : theme.colors.KHAKI}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.jobHeader}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.mosCode}>{job.mosCode}</Text>
            <Text style={styles.jobBranch}>
              {selectedBranch?.replace('_', ' ')} • {job.category}
            </Text>
          </View>
        </LinearGradient>

        {/* ASVAB Compatibility */}
        {compatibility && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="ASVAB COMPATIBILITY"
              subtitle="How well do your scores match?"
              iconName="analytics"
              iconColor={compatibilityColor}
            />
            <MilitaryCardContent>
              <View style={styles.compatibilityContainer}>
                <ProgressCircle
                  progress={compatibilityScore / 100}
                  size={80}
                  strokeWidth={8}
                  color={compatibilityColor}
                />
                <View style={styles.compatibilityInfo}>
                  <Text style={[styles.compatibilityScore, { color: compatibilityColor }]}>
                    {compatibilityScore}%
                  </Text>
                  <Text style={styles.compatibilityLabel}>MATCH</Text>
                  
                  {compatibilityScore >= 80 ? (
                    <Text style={styles.compatibilityMessage}>
                      Excellent match! You qualify for this position.
                    </Text>
                  ) : compatibilityScore >= 60 ? (
                    <Text style={styles.compatibilityMessage}>
                      Good match! Study to improve specific line scores.
                    </Text>
                  ) : (
                    <Text style={styles.compatibilityMessage}>
                      Study needed. Focus on required ASVAB sections.
                    </Text>
                  )}
                </View>
              </View>

              {/* AFQT Requirement */}
              <View style={styles.scoreRequirement}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>AFQT Minimum</Text>
                  <Text style={styles.scoreValue}>{job.minAfqtScore}</Text>
                  <Ionicons
                    name={compatibility.meetsAFQT ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={compatibility.meetsAFQT ? theme.colors.SUCCESS : theme.colors.DANGER}
                  />
                </View>
              </View>

              {/* Line Scores */}
              <Text style={styles.lineScoresTitle}>Required Line Scores:</Text>
              {compatibility.lineScores.map((lineScore, index) => (
                <View key={index} style={styles.scoreRequirement}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>{lineScore.name}</Text>
                    <Text style={styles.scoreValue}>
                      {lineScore.userScore || '?'} / {lineScore.required}
                    </Text>
                    <Ionicons
                      name={lineScore.met ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={lineScore.met ? theme.colors.SUCCESS : theme.colors.DANGER}
                    />
                  </View>
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Job Overview */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="MISSION OVERVIEW"
            iconName="document-text"
            iconColor={branchColor}
          />
          <MilitaryCardContent>
            <Text style={styles.overviewText}>{job.overview}</Text>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Duties & Responsibilities */}
        {job.duties && job.duties.length > 0 && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="DUTIES & RESPONSIBILITIES"
              iconName="list"
              iconColor={branchColor}
            />
            <MilitaryCardContent>
              {job.duties.map((duty, index) => (
                <View key={index} style={styles.dutyItem}>
                  <Ionicons name="chevron-forward" size={16} color={branchColor} />
                  <Text style={styles.dutyText}>{duty}</Text>
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Training Information */}
        {job.training && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="TRAINING PIPELINE"
              iconName="school"
              iconColor={theme.colors.info}
            />
            <MilitaryCardContent>
              {job.training.basicTraining && (
                <View style={styles.trainingItem}>
                  <Text style={styles.trainingLabel}>Basic Training:</Text>
                  <Text style={styles.trainingValue}>{job.training.basicTraining}</Text>
                </View>
              )}
              
              {job.training.techSchool && (
                <View style={styles.trainingItem}>
                  <Text style={styles.trainingLabel}>Technical School:</Text>
                  <Text style={styles.trainingValue}>{job.training.techSchool}</Text>
                </View>
              )}
              
              {job.training.duration && (
                <View style={styles.trainingItem}>
                  <Text style={styles.trainingLabel}>Total Duration:</Text>
                  <Text style={styles.trainingValue}>{job.training.duration}</Text>
                </View>
              )}
              
              {job.training.location && (
                <View style={styles.trainingItem}>
                  <Text style={styles.trainingLabel}>Training Location:</Text>
                  <Text style={styles.trainingValue}>{job.training.location}</Text>
                </View>
              )}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Security Clearance */}
        {job.securityClearance && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="SECURITY CLEARANCE"
              iconName="shield"
              iconColor={theme.colors.WARNING}
            />
            <MilitaryCardContent>
              <TouchableOpacity
                onPress={() => setShowSecurityClearance(!showSecurityClearance)}
                style={styles.clearanceHeader}
              >
                <Text style={styles.clearanceLevel}>{job.securityClearance.level}</Text>
                <Ionicons
                  name={showSecurityClearance ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              
              {showSecurityClearance && (
                <View style={styles.clearanceDetails}>
                  <Text style={styles.clearanceDescription}>
                    {job.securityClearance.description}
                  </Text>
                  
                  {job.securityClearance.requirements && (
                    <>
                      <Text style={styles.clearanceRequirementsTitle}>Requirements:</Text>
                      {job.securityClearance.requirements.map((req, index) => (
                        <View key={index} style={styles.clearanceRequirement}>
                          <Ionicons name="checkmark" size={16} color={theme.colors.SUCCESS} />
                          <Text style={styles.clearanceRequirementText}>{req}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Career Progression */}
        {job.careerProgression && job.careerProgression.length > 0 && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="CAREER PROGRESSION"
              iconName="trending-up"
              iconColor={theme.colors.SUCCESS}
            />
            <MilitaryCardContent>
              {job.careerProgression.map((stage, index) => (
                <View key={index} style={styles.progressionStage}>
                  <View style={styles.progressionHeader}>
                    <View style={[styles.progressionNumber, { backgroundColor: branchColor }]}>
                      <Text style={styles.progressionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.progressionTitle}>{stage.rank}</Text>
                  </View>
                  
                  {stage.description && (
                    <Text style={styles.progressionDescription}>{stage.description}</Text>
                  )}
                  
                  {stage.requirements && stage.requirements.length > 0 && (
                    <View style={styles.progressionRequirements}>
                      <Text style={styles.requirementsTitle}>Requirements:</Text>
                      {stage.requirements.map((req, reqIndex) => (
                        <Text key={reqIndex} style={styles.requirementItem}>• {req}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Civilian Career Opportunities */}
        {job.civilianCareers && job.civilianCareers.length > 0 && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="CIVILIAN CAREER TRANSITION"
              iconName="business"
              iconColor={theme.colors.info}
            />
            <MilitaryCardContent>
              <Text style={styles.civilianIntro}>
                This military experience translates well to these civilian careers:
              </Text>
              
              {job.civilianCareers.map((career, index) => (
                <View key={index} style={styles.civilianCareer}>
                  <Text style={styles.civilianTitle}>{career.title}</Text>
                  <Text style={styles.civilianSalary}>
                    Average Salary: ${career.averageSalary?.toLocaleString() || 'Varies'}
                  </Text>
                  <Text style={styles.civilianDescription}>{career.description}</Text>
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <MilitaryButton
            title="CONTACT RECRUITER"
            onPress={handleApplyNow}
            style={{ backgroundColor: branchColor }}
            icon="person"
            disabled={false}
          />
          
          <MilitaryButton
            title="STUDY FOR THIS JOB"
            onPress={() => {
              // Navigate to personalized study plan
              Toast.show({
                type: 'info',
                text1: 'Study Plan Coming Soon',
                text2: 'Personalized study plans are being developed.',
              });
            }}
            style={{
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: branchColor,
              marginTop: theme.spacing[3],
            }}
            textStyle={{ color: branchColor }}
            icon="book"
          />
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.KHAKI,
    letterSpacing: 2,
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
    marginBottom: theme.spacing[6],
  },
  backButton: {
    padding: theme.spacing[2],
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: theme.spacing[2],
    marginLeft: theme.spacing[2],
  },
  jobHeader: {
    alignItems: 'center',
  },
  jobTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  mosCode: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[2],
  },
  jobBranch: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textTransform: 'uppercase',
  },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  compatibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  compatibilityInfo: {
    flex: 1,
    marginLeft: theme.spacing[4],
  },
  compatibilityScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
  },
  compatibilityLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
  },
  compatibilityMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  scoreRequirement: {
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
  },
  scoreValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginRight: theme.spacing[3],
  },
  lineScoresTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  overviewText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    lineHeight: 24,
  },
  dutyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  dutyText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing[2],
    lineHeight: 22,
  },
  trainingItem: {
    marginBottom: theme.spacing[3],
  },
  trainingLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  trainingValue: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  clearanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearanceLevel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.WARNING,
  },
  clearanceDetails: {
    marginTop: theme.spacing[4],
  },
  clearanceDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing[4],
  },
  clearanceRequirementsTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  clearanceRequirement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  clearanceRequirementText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing[2],
    lineHeight: 20,
  },
  progressionStage: {
    marginBottom: theme.spacing[6],
  },
  progressionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  progressionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  progressionNumberText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.white,
  },
  progressionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
  },
  progressionDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing[3],
  },
  progressionRequirements: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  requirementsTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  requirementItem: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  civilianIntro: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
    lineHeight: 22,
  },
  civilianCareer: {
    marginBottom: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  civilianTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  civilianSalary: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.SUCCESS,
    marginBottom: theme.spacing[2],
  },
  civilianDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
});