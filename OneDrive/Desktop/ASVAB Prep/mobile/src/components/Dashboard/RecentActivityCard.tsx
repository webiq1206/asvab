import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch, CATEGORY_DISPLAY_NAMES } from '@asvab-prep/shared';
import { ActivityItem } from '@/services/dashboardService';
import { Ionicons } from '@expo/vector-icons';

interface RecentActivityCardProps {
  activities: ActivityItem[];
  branch: MilitaryBranch;
  onViewAll: () => void;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  activities,
  branch,
  onViewAll,
}) => {
  const branchColor = theme.branchColors[branch];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'QUIZ': return 'document-text';
      case 'QUESTION': return 'help-circle';
      case 'ACHIEVEMENT': return 'trophy';
      case 'STREAK': return 'flame';
      default: return 'information-circle';
    }
  };

  const getActivityColor = (type: ActivityItem['type'], score?: number) => {
    switch (type) {
      case 'QUIZ': 
        if (score !== undefined) {
          if (score >= 90) return theme.colors.SUCCESS;
          if (score >= 70) return branchColor;
          if (score >= 50) return theme.colors.TACTICAL_ORANGE;
          return theme.colors.DANGER;
        }
        return branchColor;
      case 'QUESTION': return theme.colors.INFO;
      case 'ACHIEVEMENT': return theme.colors.SUCCESS;
      case 'STREAK': return theme.colors.TACTICAL_ORANGE;
      default: return theme.colors.KHAKI;
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const renderActivityItem = ({ item }: { item: ActivityItem }) => {
    const activityColor = getActivityColor(item.type, item.score);
    const categoryName = item.category 
      ? CATEGORY_DISPLAY_NAMES[item.category as keyof typeof CATEGORY_DISPLAY_NAMES] 
      : undefined;

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: `${activityColor}20` }]}>
          <Ionicons
            name={getActivityIcon(item.type)}
            size={20}
            color={activityColor}
          />
        </View>

        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityDescription}>
            {item.description}
          </Text>
          
          <View style={styles.activityMeta}>
            {categoryName && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{categoryName}</Text>
              </View>
            )}
            
            {item.score !== undefined && (
              <View style={[styles.scoreTag, { backgroundColor: `${activityColor}20` }]}>
                <Text style={[styles.scoreTagText, { color: activityColor }]}>
                  {item.score}%
                </Text>
              </View>
            )}
            
            <Text style={styles.timeText}>
              {formatTimeAgo(item.timestamp)}
            </Text>
          </View>
        </View>

        <View style={styles.activityStatus}>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.KHAKI}
          />
        </View>
      </View>
    );
  };

  return (
    <MilitaryCard variant="intel" branch={branch} style={styles.card}>
      <MilitaryCardHeader
        title="RECENT ACTIVITY"
        subtitle="Your latest training operations"
        variant="intel"
        rightContent={
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
            <Ionicons name="arrow-forward" size={14} color={branchColor} />
          </TouchableOpacity>
        }
      />

      <MilitaryCardContent>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={32} color={theme.colors.KHAKI} />
            <Text style={styles.emptyTitle}>No Recent Activity</Text>
            <Text style={styles.emptyMessage}>
              Start your training to see your progress here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={activities.slice(0, 5)} // Show only top 5 activities
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Activity Summary */}
        {activities.length > 0 && (
          <View style={styles.activitySummary}>
            <View style={styles.summaryLine} />
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {activities.filter(a => a.type === 'QUIZ').length}
                </Text>
                <Text style={styles.summaryLabel}>Quizzes</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {activities.filter(a => a.type === 'QUESTION').length}
                </Text>
                <Text style={styles.summaryLabel}>Questions</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {activities.filter(a => a.type === 'ACHIEVEMENT').length}
                </Text>
                <Text style={styles.summaryLabel}>Achievements</Text>
              </View>
            </View>
          </View>
        )}
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.TACTICAL_ORANGE,
    marginRight: theme.spacing[1],
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  emptyMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  activityDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  categoryTag: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  categoryTagText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  scoreTag: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  scoreTagText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
  },
  timeText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginLeft: 'auto',
  },
  activityStatus: {
    marginLeft: theme.spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: `${theme.colors.KHAKI}20`,
    marginVertical: theme.spacing[1],
  },
  activitySummary: {
    marginTop: theme.spacing[4],
  },
  summaryLine: {
    height: 1,
    backgroundColor: theme.colors.KHAKI,
    marginBottom: theme.spacing[3],
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  summaryLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
});