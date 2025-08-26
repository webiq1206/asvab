import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { studyGroupsService, StudyGroup } from '../../services/studyGroupsService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';

interface Props {
  onSelectGroup?: (group: StudyGroup) => void;
  onCreateGroup?: () => void;
  onExit?: () => void;
}

export const StudyGroupsScreen: React.FC<Props> = ({ 
  onSelectGroup, 
  onCreateGroup,
  onExit 
}) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my-groups'>('discover');

  // Fetch all study groups for discovery
  const { data: discoverData, isLoading: isLoadingDiscover, refetch: refetchDiscover } = useQuery({
    queryKey: ['studyGroups', 'discover', user?.selectedBranch, searchTerm],
    queryFn: () => studyGroupsService.getStudyGroups(50, 0, searchTerm || undefined),
    enabled: activeTab === 'discover' && !!user?.selectedBranch,
  });

  // Fetch user's study groups
  const { data: myGroups = [], isLoading: isLoadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['studyGroups', 'my-groups'],
    queryFn: studyGroupsService.getMyStudyGroups,
    enabled: activeTab === 'my-groups',
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: studyGroupsService.joinStudyGroup,
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['studyGroups'] });
      Toast.show({
        type: 'success',
        text1: getMilitaryGreeting().exclamation,
        text2: 'Successfully joined study group!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Mission Failed',
        text2: error.response?.data?.message || 'Could not join study group.',
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: studyGroupsService.leaveStudyGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studyGroups'] });
      Toast.show({
        type: 'success',
        text1: 'Confirmed',
        text2: 'Left study group successfully.',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Mission Failed',
        text2: error.response?.data?.message || 'Could not leave study group.',
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

  const handleJoinGroup = (groupId: string) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleLeaveGroup = (groupId: string) => {
    leaveGroupMutation.mutate(groupId);
  };

  const renderGroupItem = ({ item: group }: { item: StudyGroup }) => {
    const ownerName = studyGroupsService.getDisplayName(group.owner);
    const canJoin = !group.isJoined && group.memberCount < group.maxMembers;
    const isOwner = group.userRole === 'OWNER';

    return (
      <TouchableOpacity
        style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onSelectGroup?.(group)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary + '10', colors.accent + '10']}
          style={styles.groupGradient}
        >
          <View style={styles.groupHeader}>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
              <Text style={[styles.groupDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {group.description || 'No description provided'}
              </Text>
            </View>
            
            <View style={styles.groupStats}>
              <View style={[styles.membersBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={[styles.membersText, { color: colors.primary }]}>
                  {studyGroupsService.formatGroupSize(group.memberCount, group.maxMembers)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.groupDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="person" size={16} color={colors.info} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Leader: {ownerName}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons 
                name={group.isPublic ? 'globe' : 'lock-closed'} 
                size={16} 
                color={group.isPublic ? colors.success : colors.warning} 
              />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {group.isPublic ? 'Public Group' : 'Private Group'}
              </Text>
            </View>

            {group.userRole && (
              <View style={styles.detailItem}>
                <Ionicons name="star" size={16} color={colors.accent} />
                <Text style={[styles.detailText, { color: colors.accent }]}>
                  {studyGroupsService.getRoleDisplayName(group.userRole)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.groupActions}>
            {group.isJoined ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => onSelectGroup?.(group)}
                >
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    View Group
                  </Text>
                </TouchableOpacity>
                
                {!isOwner && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.leaveButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => handleLeaveGroup(group.id)}
                    disabled={leaveGroupMutation.isPending}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Leave
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : canJoin ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton, { backgroundColor: colors.success + '20' }]}
                onPress={() => handleJoinGroup(group.id)}
                disabled={joinGroupMutation.isPending}
              >
                <Text style={[styles.actionButtonText, { color: colors.success }]}>
                  Join Group
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionButton, styles.fullButton, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                  Group Full
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const isLoading = activeTab === 'discover' ? isLoadingDiscover : isLoadingMy;
  const groups = activeTab === 'discover' ? (discoverData?.groups || []) : myGroups;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title="Study Groups" 
        onBack={onExit}
        actions={[
          {
            icon: 'add',
            onPress: onCreateGroup,
          },
        ]}
      />

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'discover' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'discover' ? colors.primary : colors.textSecondary },
            ]}
          >
            Discover Groups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'my-groups' && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setActiveTab('my-groups')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'my-groups' ? colors.primary : colors.textSecondary },
            ]}
          >
            My Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Only for discover tab */}
      {activeTab === 'discover' && (
        <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${studyGroupsService.getBranchDisplayName(user?.selectedBranch || 'ARMY')} study groups...`}
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
        </View>
      )}

      {/* Mission Brief */}
      <View style={[styles.briefCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '20', colors.accent + '20']}
          style={styles.briefGradient}
        >
          <Text style={[styles.briefText, { color: colors.text }]}>
            {activeTab === 'discover' 
              ? `Connect with fellow ${getBranchTitle(user?.selectedBranch)}s in study groups. Share knowledge, compete in challenges, and achieve ASVAB success together.`
              : 'Manage your study groups, track progress, and lead your squad to victory.'
            }
          </Text>
        </LinearGradient>
      </View>

      {/* Groups List */}
      {isLoading ? (
        <LoadingSpinner message="Loading study groups..." />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.groupsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={activeTab === 'discover' ? refetchDiscover : refetchMy}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons 
                name={activeTab === 'discover' ? 'people' : 'person-add'} 
                size={60} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'discover' ? 'No Study Groups Found' : 'No Groups Joined'}
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                {activeTab === 'discover'
                  ? searchTerm
                    ? `No groups match "${searchTerm}". Try different search terms.`
                    : `No study groups available for ${studyGroupsService.getBranchDisplayName(user?.selectedBranch || 'ARMY')} yet.`
                  : 'Join study groups to collaborate with fellow service members and boost your ASVAB preparation.'
                }
              </Text>
              {activeTab === 'my-groups' && (
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={onCreateGroup}
                >
                  <Text style={[styles.createButtonText, { color: colors.surface }]}>
                    Create Study Group
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
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
  groupsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  groupCard: {
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
  groupGradient: {
    padding: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  groupInfo: {
    flex: 1,
    marginRight: 15,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  groupStats: {
    alignItems: 'flex-end',
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membersText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  groupDetails: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 8,
  },
  groupActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  viewButton: {
    flex: 1,
    marginRight: 8,
  },
  leaveButton: {
    flex: 1,
    marginLeft: 8,
  },
  joinButton: {
    alignSelf: 'flex-start',
  },
  fullButton: {
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});