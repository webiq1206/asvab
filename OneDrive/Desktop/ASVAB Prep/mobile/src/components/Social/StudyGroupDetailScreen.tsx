import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { studyGroupsService, DetailedStudyGroup, StudyGroupMember } from '../../services/studyGroupsService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';

interface Props {
  groupId: string;
  onBack?: () => void;
  onEditGroup?: (group: DetailedStudyGroup) => void;
  onViewMember?: (member: StudyGroupMember) => void;
}

export const StudyGroupDetailScreen: React.FC<Props> = ({ 
  groupId, 
  onBack, 
  onEditGroup,
  onViewMember 
}) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview');

  // Fetch study group details
  const { data: group, isLoading, error } = useQuery({
    queryKey: ['studyGroup', groupId],
    queryFn: () => studyGroupsService.getStudyGroupById(groupId),
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () => studyGroupsService.leaveStudyGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyGroups'] });
      queryClient.invalidateQueries({ queryKey: ['studyGroup', groupId] });
      Toast.show({
        type: 'success',
        text1: 'Confirmed',
        text2: 'Left study group successfully.',
      });
      onBack?.();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Mission Failed',
        text2: error.response?.data?.message || 'Could not leave study group.',
      });
    },
  });

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Study Group',
      'Are you sure you want to leave this study group? You will need to request to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => leaveGroupMutation.mutate(),
        },
      ]
    );
  };

  const renderMemberItem = (member: StudyGroupMember) => {
    const displayName = studyGroupsService.getDisplayName(member.user);
    const roleDisplay = studyGroupsService.getRoleDisplayName(member.role);
    const canManage = studyGroupsService.canChangeRoles(group?.userRole) && member.role !== 'OWNER';

    return (
      <TouchableOpacity
        key={member.id}
        style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onViewMember?.(member)}
        activeOpacity={0.7}
      >
        <View style={styles.memberInfo}>
          <View style={styles.memberAvatar}>
            {member.user.profile?.avatarUrl ? (
              <Image source={{ uri: member.user.profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
            )}
          </View>
          
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, { color: colors.text }]}>{displayName}</Text>
            <View style={styles.memberMeta}>
              <View style={[styles.roleBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.roleText, { color: colors.accent }]}>{roleDisplay}</Text>
              </View>
              {member.user.profile?.studyStreak && (
                <View style={styles.streakInfo}>
                  <Ionicons name="flame" size={12} color={colors.warning} />
                  <Text style={[styles.streakText, { color: colors.textSecondary }]}>
                    {member.user.profile.studyStreak} day streak
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {canManage && (
          <TouchableOpacity style={styles.memberActionButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessageItem = (message: any, index: number) => {
    const senderName = studyGroupsService.getDisplayName(message.sender);
    const messageTime = new Date(message.sentAt).toLocaleDateString();

    return (
      <View key={message.id} style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageSender, { color: colors.text }]}>{senderName}</Text>
          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>{messageTime}</Text>
        </View>
        <Text style={[styles.messageContent, { color: colors.textSecondary }]}>{message.content}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading study group..." />
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="Study Group" onBack={onBack} />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Group Not Found</Text>
          <Text style={[styles.errorDescription, { color: colors.textSecondary }]}>
            This study group may have been deleted or you don't have access to view it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const ownerName = studyGroupsService.getDisplayName(group.owner);
  const canManageGroup = studyGroupsService.canManageGroup(group.userRole);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title={group.name}
        onBack={onBack}
        actions={canManageGroup ? [
          {
            icon: 'settings',
            onPress: () => onEditGroup?.(group),
          },
        ] : undefined}
      />

      {/* Group Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
            {group.description && (
              <Text style={[styles.groupDescription, { color: colors.textSecondary }]}>
                {group.description}
              </Text>
            )}
            
            <View style={styles.groupStats}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {studyGroupsService.formatGroupSize(group.memberCount, group.maxMembers)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="person-circle" size={16} color={colors.info} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  Leader: {ownerName}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons 
                  name={group.isPublic ? 'globe' : 'lock-closed'} 
                  size={16} 
                  color={group.isPublic ? colors.success : colors.warning} 
                />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {group.isPublic ? 'Public Group' : 'Private Group'}
                </Text>
              </View>
            </View>
          </View>
          
          {group.isJoined && group.userRole !== 'OWNER' && (
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: colors.error + '20' }]}
              onPress={handleLeaveGroup}
              disabled={leaveGroupMutation.isPending}
            >
              <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                Leave Group
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'overview' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setActiveTab('overview')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'overview' ? colors.primary : colors.textSecondary },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'members' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setActiveTab('members')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'members' ? colors.primary : colors.textSecondary },
            ]}
          >
            Members ({group.memberCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'activity' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setActiveTab('activity')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'activity' ? colors.primary : colors.textSecondary },
            ]}
          >
            Activity
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View style={styles.overviewContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Group Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Branch</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {studyGroupsService.getBranchDisplayName(group.branch)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Created</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(group.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Group Type</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {group.isPublic ? 'Open to All' : 'Invite Only'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Your Role</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {group.userRole ? studyGroupsService.getRoleDisplayName(group.userRole) : 'Not a Member'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={[styles.actionsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="chatbubbles" size={20} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Group Chat</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="trophy" size={20} color={colors.accent} />
                  <Text style={[styles.actionButtonText, { color: colors.accent }]}>Challenges</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="school" size={20} color={colors.success} />
                  <Text style={[styles.actionButtonText, { color: colors.success }]}>Study Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.membersContent}>
            {group.members.map(renderMemberItem)}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.activityContent}>
            {group.recentMessages.length > 0 ? (
              group.recentMessages.map(renderMessageItem)
            ) : (
              <View style={styles.emptyActivity}>
                <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recent Activity</Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  Be the first to start a conversation in this study group!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    marginBottom: 15,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  groupStats: {
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    marginLeft: 8,
  },
  leaveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: 20,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  actionsCard: {
    padding: 20,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  membersContent: {
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 10,
    marginLeft: 4,
  },
  memberActionButton: {
    padding: 8,
  },
  activityContent: {
    padding: 20,
  },
  messageCard: {
    padding: 15,
    marginBottom: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyActivity: {
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
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});