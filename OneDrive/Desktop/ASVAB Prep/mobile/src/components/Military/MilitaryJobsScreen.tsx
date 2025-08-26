import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MilitaryBranch, MilitaryJobDetails } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { militaryJobsService } from '../../services/militaryJobsService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';

type MilitaryJob = MilitaryJobDetails;

interface Props {
  onSelectJob?: (job: MilitaryJob) => void;
  onExit?: () => void;
}

export const MilitaryJobsScreen: React.FC<Props> = ({ onSelectJob, onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Fetch jobs for user's branch
  const { data: jobsData, isLoading, error, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['militaryJobs', user?.selectedBranch, searchTerm],
    queryFn: ({ pageParam = 0 }) => 
      militaryJobsService.getJobsByBranch(
        user?.selectedBranch || MilitaryBranch.ARMY,
        20,
        pageParam,
        searchTerm || undefined
      ),
    enabled: !!user?.selectedBranch,
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

  const getDifficultyLevel = (afqtScore: number): { level: string; color: string } => {
    if (afqtScore >= 65) return { level: 'High', color: colors.error };
    if (afqtScore >= 50) return { level: 'Medium', color: colors.warning };
    return { level: 'Entry', color: colors.success };
  };

  const isFavorite = (jobId: string): boolean => {
    return favoriteJobs.some(job => job.id === jobId);
  };

  const handleAddToFavorites = (jobId: string) => {
    if (!isFavorite(jobId)) {
      addToFavoritesMutation.mutate(jobId);
    }
  };

  const renderJobItem = ({ item: job }: { item: MilitaryJob }) => {
    const difficulty = getDifficultyLevel(job.minAFQTScore);
    const favorite = isFavorite(job.id);

    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onSelectJob?.(job)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary + '10', colors.accent + '10']}
          style={styles.jobGradient}
        >
          <View style={styles.jobHeader}>
            <View style={styles.jobTitleContainer}>
              <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
              <View style={[styles.mosCodeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.mosCodeText, { color: colors.primary }]}>
                  {job.mosCode}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={() => handleAddToFavorites(job.id)}
              style={styles.favoriteButton}
            >
              <Ionicons 
                name={favorite ? 'heart' : 'heart-outline'} 
                size={24} 
                color={favorite ? colors.error : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.jobDescription, { color: colors.textSecondary }]} numberOfLines={3}>
            {job.description}
          </Text>

          <View style={styles.requirementsContainer}>
            <View style={styles.requirementItem}>
              <Ionicons name="school" size={16} color={colors.info} />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                AFQT: {job.minAFQTScore}
              </Text>
              <View style={[styles.difficultyBadge, { backgroundColor: difficulty.color + '20' }]}>
                <Text style={[styles.difficultyText, { color: difficulty.color }]}>
                  {difficulty.level}
                </Text>
              </View>
            </View>

            {job.clearanceRequired && (
              <View style={styles.requirementItem}>
                <Ionicons name="shield-checkmark" size={16} color={colors.warning} />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  {job.clearanceRequired} Clearance
                </Text>
              </View>
            )}

            {job.trainingLength && (
              <View style={styles.requirementItem}>
                <Ionicons name="time" size={16} color={colors.accent} />
                <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                  {job.trainingLength} Training
                </Text>
              </View>
            )}
          </View>

          {Object.keys(job.requiredLineScores).length > 0 && (
            <View style={styles.lineScoresContainer}>
              <Text style={[styles.lineScoresTitle, { color: colors.text }]}>
                Required Line Scores:
              </Text>
              <View style={styles.lineScoresList}>
                {Object.entries(job.requiredLineScores).slice(0, 3).map(([score, value]) => (
                  <View key={score} style={[styles.lineScoreBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.lineScoreText, { color: colors.accent }]}>
                      {score}: {value}
                    </Text>
                  </View>
                ))}
                {Object.keys(job.requiredLineScores).length > 3 && (
                  <Text style={[styles.moreScoresText, { color: colors.textSecondary }]}>
                    +{Object.keys(job.requiredLineScores).length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading military jobs..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title={`${user?.selectedBranch} Jobs`} 
        onBack={onExit}
      />
      
      {/* Search and Filter Section */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search ${user?.selectedBranch} jobs...`}
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {jobsData?.total || 0} jobs available
        </Text>
      </View>

      {/* Mission Brief */}
      <View style={[styles.briefCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.briefGradient}
        >
          <Text style={[styles.briefText, { color: colors.text }]}>
            Explore career opportunities for {getBranchTitle(user?.selectedBranch)}s. 
            Find jobs that match your AFQT scores and interests.
          </Text>
        </LinearGradient>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobsData?.jobs || []}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
        contentContainerStyle={styles.jobsList}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Jobs Found
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                {searchTerm 
                  ? `No jobs match "${searchTerm}". Try a different search term.`
                  : 'No jobs available at this time.'
                }
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  resultsCount: {
    fontSize: 12,
    textAlign: 'center',
  },
  briefCard: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  briefGradient: {
    padding: 15,
  },
  briefText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  jobsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  jobCard: {
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobGradient: {
    padding: 20,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  mosCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mosCodeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 5,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  requirementsContainer: {
    marginBottom: 15,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lineScoresContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  lineScoresTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  lineScoresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  lineScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  lineScoreText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreScoresText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 30,
  },
});