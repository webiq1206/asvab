import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBranchTheme } from '../../../hooks/useBranchTheme';
import { useAuth } from '../../../hooks/useAuth';
import { GoalTracking, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: GoalTracking;
}

export const GoalTracker: React.FC<Props> = ({ data }) => {
  const { colors } = useBranchTheme();
  const { user } = useAuth();
  const [editingGoal, setEditingGoal] = useState(false);
  const [targetAFQT, setTargetAFQT] = useState(data.targetAFQT.toString());

  const getBranchTitle = (branch?: string): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor',
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Guardian',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch as keyof typeof titles] || 'Recruit';
  };

  const handleSaveGoal = async () => {
    const newTarget = parseInt(targetAFQT);
    if (newTarget < 31 || newTarget > 99) {
      Alert.alert('Invalid AFQT Score', 'Please enter a score between 31 and 99');
      return;
    }

    try {
      await analyticsService.updateGoals({
        targetAFQT: newTarget,
        targetDate: data.estimatedCompletion,
        studyTimeGoal: 30, // 30 minutes per day
        accuracyGoal: 85, // 85% accuracy target
      });
      setEditingGoal(false);
      Alert.alert('Goal Updated', `Target AFQT score set to ${newTarget}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const renderGoalOverview = () => (
    <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.goalGradient}
      >
        <View style={styles.goalHeader}>
          <Ionicons name="flag" size={28} color={colors.primary} />
          <View style={styles.goalInfo}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>
              Mission Objective
            </Text>
            <Text style={[styles.goalSubtitle, { color: colors.textSecondary }]}>
              AFQT Target for {getBranchTitle(user?.selectedBranch)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.accent }]}
            onPress={() => setEditingGoal(!editingGoal)}
          >
            <Ionicons 
              name={editingGoal ? "checkmark" : "pencil"} 
              size={16} 
              color={colors.background} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.goalContent}>
          {editingGoal ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.goalInput, { 
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                value={targetAFQT}
                onChangeText={setTargetAFQT}
                keyboardType="number-pad"
                placeholder="Target AFQT Score"
                placeholderTextColor={colors.textSecondary}
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.success }]}
                onPress={handleSaveGoal}
              >
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.targetContainer}>
              <Text style={[styles.targetScore, { color: colors.primary }]}>
                {data.targetAFQT}
              </Text>
              <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                Target Score
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressOverview}>
          <View style={styles.progressStats}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              Progress: {Math.round(data.currentProgress)}%
            </Text>
            <Text style={[styles.estimatedText, { color: colors.textSecondary }]}>
              Est. Completion: {new Date(data.estimatedCompletion).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={[styles.progressFill, { width: `${data.currentProgress}%` }]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderMilestones = () => (
    <View style={[styles.milestonesCard, { backgroundColor: colors.surface }]}>
      <View style={styles.milestonesHeader}>
        <Ionicons name="checkmark-done" size={20} color={colors.success} />
        <Text style={[styles.milestonesTitle, { color: colors.text }]}>
          Mission Milestones
        </Text>
      </View>

      <View style={styles.milestonesList}>
        {data.milestones.map((milestone, index) => (
          <View key={milestone.id} style={styles.milestoneItem}>
            <View style={styles.milestoneLeft}>
              <View style={[
                styles.milestoneIndicator,
                { backgroundColor: milestone.completed ? colors.success : colors.border }
              ]}>
                <Ionicons 
                  name={milestone.completed ? "checkmark" : "ellipse-outline"} 
                  size={16} 
                  color={milestone.completed ? colors.background : colors.textSecondary} 
                />
              </View>
              
              {index < data.milestones.length - 1 && (
                <View style={[
                  styles.milestoneConnector,
                  { backgroundColor: colors.border }
                ]} />
              )}
            </View>

            <View style={styles.milestoneContent}>
              <Text style={[
                styles.milestoneTitle,
                { 
                  color: milestone.completed ? colors.success : colors.text,
                  textDecorationLine: milestone.completed ? 'line-through' : 'none'
                }
              ]}>
                {milestone.title}
              </Text>
              
              <View style={styles.milestoneProgress}>
                <Text style={[styles.milestoneProgressText, { color: colors.textSecondary }]}>
                  {milestone.current}/{milestone.target}
                </Text>
                
                <View style={[styles.milestoneProgressBar, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={milestone.completed ? [colors.success, colors.success] : [colors.primary, colors.accent]}
                    style={[
                      styles.milestoneProgressFill,
                      { width: `${(milestone.current / milestone.target) * 100}%` }
                    ]}
                  />
                </View>
              </View>

              <Text style={[styles.milestoneDueDate, { color: colors.textSecondary }]}>
                Due: {new Date(milestone.dueDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderRecommendations = () => (
    <View style={[styles.recommendationsCard, { backgroundColor: colors.surface }]}>
      <View style={styles.recommendationsHeader}>
        <Ionicons name="bulb" size={20} color={colors.warning} />
        <Text style={[styles.recommendationsTitle, { color: colors.text }]}>
          Strategic Recommendations
        </Text>
      </View>

      <View style={styles.recommendationsList}>
        {data.recommendations.map((recommendation, index) => {
          const priorityColor = recommendation.priority === 'HIGH' ? colors.error :
                               recommendation.priority === 'MEDIUM' ? colors.warning :
                               colors.info;

          return (
            <View key={index} style={[styles.recommendationItem, { borderLeftColor: priorityColor }]}>
              <View style={styles.recommendationHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                  <Text style={[styles.priorityText, { color: priorityColor }]}>
                    {recommendation.priority}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
              </View>
              
              <Text style={[styles.recommendationAction, { color: colors.text }]}>
                {recommendation.action}
              </Text>
              
              <Text style={[styles.recommendationImpact, { color: colors.textSecondary }]}>
                Impact: {recommendation.impact}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderGoalStats = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.info + '20', colors.primary + '20']}
        style={styles.statsGradient}
      >
        <View style={styles.statsHeader}>
          <Ionicons name="analytics" size={20} color={colors.info} />
          <Text style={[styles.statsTitle, { color: colors.text }]}>
            Goal Statistics
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {Math.round(data.currentProgress)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Complete
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {data.milestones.filter(m => m.completed).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Milestones
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {Math.ceil((new Date(data.estimatedCompletion).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Days Left
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {data.recommendations.filter(r => r.priority === 'HIGH').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Priority
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Goal Overview */}
      {renderGoalOverview()}

      {/* Goal Statistics */}
      {renderGoalStats()}

      {/* Milestones */}
      {renderMilestones()}

      {/* Recommendations */}
      {renderRecommendations()}

      {/* Motivation Card */}
      <View style={[styles.motivationCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.success + '20', colors.primary + '20']}
          style={styles.motivationGradient}
        >
          <View style={styles.motivationHeader}>
            <Ionicons name="star" size={24} color={colors.success} />
            <Text style={[styles.motivationTitle, { color: colors.text }]}>
              Keep Up the Excellent Work!
            </Text>
          </View>
          
          <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
            You're {Math.round(data.currentProgress)}% of the way to your target, {getBranchTitle(user?.selectedBranch)}! 
            Stay disciplined, follow your training regimen, and you'll achieve your AFQT goal. 
            Every question answered brings you closer to your military career objectives.
          </Text>

          <View style={styles.motivationActions}>
            <TouchableOpacity
              style={[styles.motivationButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Navigate to study session
              }}
            >
              <Ionicons name="school" size={16} color={colors.background} />
              <Text style={[styles.motivationButtonText, { color: colors.background }]}>
                Study Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.motivationButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                // Navigate to quiz
              }}
            >
              <Ionicons name="help-circle" size={16} color={colors.background} />
              <Text style={[styles.motivationButtonText, { color: colors.background }]}>
                Take Quiz
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  goalCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalInfo: {
    flex: 1,
    marginLeft: 15,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    width: 80,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetContainer: {
    alignItems: 'center',
  },
  targetScore: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressOverview: {
    width: '100%',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  estimatedText: {
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  milestonesCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  milestonesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  milestonesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  milestonesList: {
    paddingLeft: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  milestoneLeft: {
    alignItems: 'center',
    marginRight: 15,
  },
  milestoneIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneConnector: {
    width: 2,
    flex: 1,
    marginTop: 5,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  milestoneProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  milestoneProgressText: {
    fontSize: 12,
    marginRight: 10,
    minWidth: 40,
  },
  milestoneProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  milestoneDueDate: {
    fontSize: 11,
  },
  recommendationsCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    borderLeftWidth: 4,
    paddingLeft: 15,
    paddingVertical: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recommendationAction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationImpact: {
    fontSize: 12,
    lineHeight: 16,
  },
  motivationCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  motivationGradient: {
    padding: 20,
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  motivationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  motivationActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  motivationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.45,
    justifyContent: 'center',
  },
  motivationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});