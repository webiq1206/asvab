import { apiClient } from './api';
import { 
  MilitaryBranch,
  StudyGroupDetails,
  StudyGroupMember,
  StudyGroupMessage,
  DetailedStudyGroup,
  CreateStudyGroupRequest,
  UpdateStudyGroupRequest,
  GroupRole
} from '@asvab-prep/shared';

// Type alias for consistency with existing code
export type StudyGroup = StudyGroupDetails;
export { StudyGroupMember, StudyGroupMessage, DetailedStudyGroup, CreateStudyGroupRequest, UpdateStudyGroupRequest, GroupRole };

class StudyGroupsService {
  async createStudyGroup(data: CreateStudyGroupRequest): Promise<StudyGroup> {
    const response = await apiClient.post('/social/study-groups', data);
    return response.data;
  }

  async getStudyGroups(
    limit = 20,
    offset = 0,
    searchTerm?: string,
    publicOnly = true,
  ): Promise<{
    groups: StudyGroup[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      publicOnly: publicOnly.toString(),
    });

    if (searchTerm) {
      params.append('search', searchTerm);
    }

    const response = await apiClient.get(`/social/study-groups?${params}`);
    return response.data;
  }

  async getMyStudyGroups(): Promise<StudyGroup[]> {
    const response = await apiClient.get('/social/study-groups/my-groups');
    return response.data;
  }

  async getStudyGroupById(groupId: string): Promise<DetailedStudyGroup> {
    const response = await apiClient.get(`/social/study-groups/${groupId}`);
    return response.data;
  }

  async joinStudyGroup(groupId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/social/study-groups/${groupId}/join`);
    return response.data;
  }

  async leaveStudyGroup(groupId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/social/study-groups/${groupId}/leave`);
    return response.data;
  }

  async updateStudyGroup(
    groupId: string,
    data: UpdateStudyGroupRequest,
  ): Promise<StudyGroup> {
    const response = await apiClient.patch(`/social/study-groups/${groupId}`, data);
    return response.data;
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    role: GroupRole,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch(
      `/social/study-groups/${groupId}/members/${userId}/role`,
      { role },
    );
    return response.data;
  }

  async removeMember(
    groupId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(
      `/social/study-groups/${groupId}/members/${userId}`,
    );
    return response.data;
  }

  async deleteStudyGroup(groupId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/social/study-groups/${groupId}`);
    return response.data;
  }

  // Utility functions for display
  getDisplayName(user: {
    firstName: string | null;
    lastName: string | null;
    profile: { currentRank: string | null } | null;
  }): string {
    const rank = user.profile?.currentRank;
    const firstName = user.firstName || 'Unknown';
    const lastName = user.lastName ? ` ${user.lastName.charAt(0)}.` : '';
    
    return rank ? `${rank} ${firstName}${lastName}` : `${firstName}${lastName}`;
  }

  getRoleDisplayName(role: GroupRole): string {
    const roleNames = {
      [GroupRole.OWNER]: 'Group Leader',
      [GroupRole.ADMIN]: 'Squad Leader',
      [GroupRole.MEMBER]: 'Member',
    };
    return roleNames[role];
  }

  formatGroupSize(memberCount: number, maxMembers: number): string {
    return `${memberCount}/${maxMembers} members`;
  }

  canManageGroup(userRole?: GroupRole): boolean {
    return userRole === GroupRole.OWNER || userRole === GroupRole.ADMIN;
  }

  canChangeRoles(userRole?: GroupRole): boolean {
    return userRole === GroupRole.OWNER;
  }

  canRemoveMembers(
    userRole?: GroupRole,
    targetRole?: GroupRole,
  ): boolean {
    if (userRole === GroupRole.OWNER) return targetRole !== GroupRole.OWNER;
    if (userRole === GroupRole.ADMIN) return targetRole === GroupRole.MEMBER;
    return false;
  }

  getBranchDisplayName(branch: MilitaryBranch): string {
    const branchNames = {
      ARMY: 'Army',
      NAVY: 'Navy',
      AIR_FORCE: 'Air Force',
      MARINES: 'Marines',
      COAST_GUARD: 'Coast Guard',
      SPACE_FORCE: 'Space Force',
    };
    return branchNames[branch];
  }
}

export const studyGroupsService = new StudyGroupsService();