import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService, LeaderboardEntry } from '../../services/gamificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
}

export const LeaderboardScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedType, setSelectedType] = useState<'GLOBAL' | 'BRANCH' | 'WEEKLY' | 'MONTHLY'>('GLOBAL');
  const [refreshing, setRefreshing] = useState(false);

  const getBranchTitle = (branch?: MilitaryBranch): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor',
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Guardian',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch || 'ARMY'];
  };

  const getBranchName = (branch: MilitaryBranch): string => {
    const names = {
      ARMY: 'Army',
      NAVY: 'Navy',
      AIR_FORCE: 'Air Force',
      MARINES: 'Marines',
      COAST_GUARD: 'Coast Guard',
      SPACE_FORCE: 'Space Force',
    };
    return names[branch];
  };

  // Fetch leaderboard data
  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', selectedType, user?.selectedBranch],
    queryFn: () => gamificationService.getLeaderboard(selectedType, selectedType === 'BRANCH' ? user?.selectedBranch : undefined),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return '#FFD700'; // Gold
    if (position === 2) return '#C0C0C0'; // Silver
    if (position === 3) return '#CD7F32'; // Bronze
    return colors.textSecondary;
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return 'trophy';
    if (position === 2) return 'medal';
    if (position === 3) return 'ribbon';
    return 'chevron-forward';
  };

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { type: 'GLOBAL' as const, label: 'Global', icon: 'earth' },
          { type: 'BRANCH' as const, label: getBranchName(user?.selectedBranch!), icon: 'shield' },
          { type: 'WEEKLY' as const, label: 'Weekly', icon: 'calendar' },
          { type: 'MONTHLY' as const, label: 'Monthly', icon: 'stats-chart' }
        ].map(({ type, label, icon }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedType === type && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Ionicons 
              name={icon as any} 
              size={16} 
              color={selectedType === type ? colors.background : colors.text} 
            />
            <Text style={[
              styles.typeText,
              { color: selectedType === type ? colors.background : colors.text }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTopThree = () => {
    if (!leaderboard || leaderboard.length === 0) return null;

    const topThree = leaderboard.slice(0, 3);
    const userEntry = leaderboard.find(entry => entry.userId === user?.id);

    return (
      <View style={[styles.podiumCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.podiumGradient}
        >
          <Text style={[styles.podiumTitle, { color: colors.text }]}>
            <Ionicons name="trophy" size={20} color={colors.warning} /> Top Performers
          </Text>

          <View style={styles.podiumContainer}>
            {/* Second Place */}
            {topThree[1] && (
              <View style={[styles.podiumPlace, styles.secondPlace]}>
                <View style={styles.podiumRank}>
                  <Text style={[styles.podiumRankText, { color: '#C0C0C0' }]}>2</Text>
                </View>
                <View style={[styles.podiumAvatar, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[styles.podiumAvatarText, { color: colors.accent }]}>
                    {topThree[1].displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                  {topThree[1].displayName}
                </Text>
                <Text style={[styles.podiumBranch, { color: colors.textSecondary }]}>
                  {getBranchName(topThree[1].branch)}
                </Text>
                <Text style={[styles.podiumXP, { color: colors.accent }]}>
                  {gamificationService.formatXP(topThree[1].totalXP)}
                </Text>
              </View>
            )}

            {/* First Place */}
            {topThree[0] && (
              <View style={[styles.podiumPlace, styles.firstPlace]}>
                <View style={styles.podiumCrown}>
                  <Ionicons name="crown" size={20} color="#FFD700" />
                </View>
                <View style={[styles.podiumAvatar, styles.championAvatar, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.podiumAvatarText, { color: colors.warning, fontSize: 20 }]}>
                    {topThree[0].displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.podiumName, styles.championName, { color: colors.text }]} numberOfLines={1}>
                  {topThree[0].displayName}
                </Text>
                <Text style={[styles.podiumBranch, { color: colors.textSecondary }]}>
                  {getBranchName(topThree[0].branch)}
                </Text>
                <Text style={[styles.podiumXP, styles.championXP, { color: colors.warning }]}>
                  {gamificationService.formatXP(topThree[0].totalXP)}
                </Text>
              </View>
            )}

            {/* Third Place */}
            {topThree[2] && (
              <View style={[styles.podiumPlace, styles.thirdPlace]}>
                <View style={styles.podiumRank}>
                  <Text style={[styles.podiumRankText, { color: '#CD7F32' }]}>3</Text>
                </View>
                <View style={[styles.podiumAvatar, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.podiumAvatarText, { color: colors.success }]}>
                    {topThree[2].displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                  {topThree[2].displayName}
                </Text>
                <Text style={[styles.podiumBranch, { color: colors.textSecondary }]}>
                  {getBranchName(topThree[2].branch)}
                </Text>
                <Text style={[styles.podiumXP, { color: colors.success }]}>
                  {gamificationService.formatXP(topThree[2].totalXP)}
                </Text>
              </View>
            )}
          </View>

          {/* User's Position */}
          {userEntry && userEntry.position > 3 && (
            <View style={styles.userPositionCard}>
              <Text style={[styles.userPositionTitle, { color: colors.text }]}>
                Your Position
              </Text>
              <View style={styles.userPositionContent}>
                <Text style={[styles.userPosition, { color: colors.primary }]}>
                  #{userEntry.position}
                </Text>
                <Text style={[styles.userPositionXP, { color: colors.textSecondary }]}>
                  {gamificationService.formatXP(userEntry.totalXP)} XP
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderLeaderboardList = () => {
    if (!leaderboard || leaderboard.length === 0) return null;

    // Skip top 3 for the list if showing global/branch, show all for weekly/monthly
    const listEntries = selectedType === 'WEEKLY' || selectedType === 'MONTHLY' 
      ? leaderboard 
      : leaderboard.slice(3);

    return (
      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, { color: colors.text }]}>
          {selectedType === 'WEEKLY' || selectedType === 'MONTHLY' ? 'Rankings' : 'Full Rankings'}
        </Text>

        {listEntries.map((entry, index) => {
          const isCurrentUser = entry.userId === user?.id;
          const displayPosition = selectedType === 'WEEKLY' || selectedType === 'MONTHLY' 
            ? entry.position 
            : entry.position;

          return (
            <View
              key={entry.userId}
              style={[
                styles.listItem,
                { backgroundColor: isCurrentUser ? colors.primary + '10' : colors.surface },
                isCurrentUser && { borderColor: colors.primary, borderWidth: 1 }
              ]}
            >
              <View style={styles.listPosition}>
                <Ionicons 
                  name={getPositionIcon(displayPosition) as any} 
                  size={20} 
                  color={getPositionColor(displayPosition)} 
                />
                <Text style={[
                  styles.listPositionText, 
                  { color: getPositionColor(displayPosition) }
                ]}>
                  #{displayPosition}
                </Text>
              </View>

              <View style={[styles.listAvatar, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.listAvatarText, { color: colors.accent }]}>
                  {entry.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.listInfo}>
                <View style={styles.listNameRow}>
                  <Text style={[
                    styles.listName, 
                    { color: isCurrentUser ? colors.primary : colors.text }
                  ]}>
                    {entry.displayName}
                    {isCurrentUser && ' (You)'}
                  </Text>
                  
                  <View style={[
                    styles.listRankBadge,
                    { backgroundColor: entry.rank.color + '20' }
                  ]}>
                    <Ionicons name={entry.rank.icon as any} size={12} color={entry.rank.color} />
                    <Text style={[styles.listRankText, { color: entry.rank.color }]}>
                      {entry.rank.name}
                    </Text>
                  </View>
                </View>

                <View style={styles.listStats}>
                  <Text style={[styles.listBranch, { color: colors.textSecondary }]}>
                    {getBranchName(entry.branch)}
                  </Text>
                  
                  <View style={styles.listStatsRow}>
                    <View style={styles.listStatItem}>
                      <Ionicons name="star" size={12} color={colors.warning} />
                      <Text style={[styles.listStatText, { color: colors.textSecondary }]}>
                        {gamificationService.formatXP(entry.totalXP)}
                      </Text>
                    </View>

                    <View style={styles.listStatItem}>
                      <Ionicons name="trophy" size={12} color={colors.success} />
                      <Text style={[styles.listStatText, { color: colors.textSecondary }]}>
                        {entry.achievements}
                      </Text>
                    </View>

                    <View style={styles.listStatItem}>
                      <Ionicons name="flame" size={12} color={colors.accent} />
                      <Text style={[styles.listStatText, { color: colors.textSecondary }]}>
                        {entry.studyStreak}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.listScore}>
                <Text style={[styles.listScoreValue, { color: colors.primary }]}>
                  {selectedType === 'WEEKLY' ? gamificationService.formatXP(entry.weeklyXP) :
                   selectedType === 'MONTHLY' ? gamificationService.formatXP(entry.monthlyXP) :
                   gamificationService.formatXP(entry.totalXP)}
                </Text>
                <Text style={[styles.listScoreLabel, { color: colors.textSecondary }]}>
                  {selectedType === 'WEEKLY' ? 'Weekly' :
                   selectedType === 'MONTHLY' ? 'Monthly' : 'Total'} XP
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading leaderboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="Leaderboard" onBack={onExit} />
      
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Type Selector */}
        {renderTypeSelector()}

        {/* Top Three Podium */}
        {renderTopThree()}

        {/* Full Leaderboard List */}
        {renderLeaderboardList()}

        {/* Empty State */}
        {!leaderboard || leaderboard.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="podium" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Rankings Available
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Start studying and earning XP to appear on the leaderboard!
            </Text>
          </View>
        ) : null}

        {/* Leaderboard Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.info + '20', colors.primary + '20']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Leaderboard Information
              </Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Global:</Text> All users across all military branches
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Branch:</Text> Users from your selected military branch only
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Weekly:</Text> XP earned in the current week (resets Sunday)
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Monthly:</Text> XP earned in the current month
              </Text>
            </View>

            <Text style={[styles.infoNote, { color: colors.info }]}>
              Rankings update in real-time. Compete with honor and achieve excellence!
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  typeSelectorContainer: {
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  podiumCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  podiumGradient: {
    padding: 20,
  },
  podiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  podiumPlace: {
    alignItems: 'center',
    marginHorizontal: 10,
    flex: 1,
  },
  firstPlace: {
    paddingBottom: 10,
  },
  secondPlace: {
    paddingBottom: 5,
  },
  thirdPlace: {
    paddingBottom: 0,
  },
  podiumCrown: {
    marginBottom: 5,
  },
  podiumRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  podiumRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  championAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  podiumAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  championName: {
    fontSize: 14,
  },
  podiumBranch: {
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumXP: {
    fontSize: 12,
    fontWeight: '700',
  },
  championXP: {
    fontSize: 14,
  },
  userPositionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userPositionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  userPositionContent: {
    alignItems: 'center',
  },
  userPosition: {
    fontSize: 18,
    fontWeight: '700',
  },
  userPositionXP: {
    fontSize: 12,
  },
  listContainer: {
    marginBottom: 25,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  listPosition: {
    alignItems: 'center',
    width: 50,
  },
  listPositionText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listInfo: {
    flex: 1,
  },
  listNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  listRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listRankText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  listStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listBranch: {
    fontSize: 11,
  },
  listStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listStatText: {
    fontSize: 10,
    marginLeft: 2,
  },
  listScore: {
    alignItems: 'flex-end',
  },
  listScoreValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  listScoreLabel: {
    fontSize: 10,
  },
  emptyState: {
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  infoContent: {
    marginBottom: 15,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoNote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});