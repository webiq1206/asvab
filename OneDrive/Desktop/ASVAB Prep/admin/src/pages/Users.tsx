import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersApi } from '../services/api';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  selectedBranch: string;
  subscriptionTier: string;
  trialEndsAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  isActive: boolean;
  totalQuizzes: number;
  averageScore: number;
  studyStreak: number;
}

const Users: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    branch: '',
    subscriptionTier: '',
    page: 0,
  });

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.getUsers({
      limit: 50,
      offset: filters.page * 50,
      search: filters.search || undefined,
      branch: filters.branch || undefined,
      subscriptionTier: filters.subscriptionTier || undefined,
    }),
  });

  const suspendUserMutation = useMutation({
    mutationFn: usersApi.suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: usersApi.activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users = usersData?.data?.users || [];
  const total = usersData?.data?.total || 0;
  const hasMore = usersData?.data?.hasMore || false;

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate') => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      if (action === 'suspend') {
        await suspendUserMutation.mutateAsync(userId);
      } else {
        await activateUserMutation.mutateAsync(userId);
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(`Failed to ${action} user. Please try again.`);
    }
  };

  const getBranchIcon = (branch: string) => {
    const icons: Record<string, string> = {
      ARMY: '🪖',
      NAVY: '⚓',
      AIR_FORCE: '✈️',
      MARINES: '🦅',
      COAST_GUARD: '🚢',
      SPACE_FORCE: '🚀',
    };
    return icons[branch] || '🎖️';
  };

  const formatBranch = (branch: string) => {
    return branch.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ color: 'var(--military-dark-olive)' }}>👥 User Management</h1>
        <p style={{ color: 'var(--dark-gray)' }}>
          Managing {total} soldiers across all branches
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--spacing-md)', alignItems: 'end' }}>
          <div className="form-group mb-0">
            <label className="form-label">🔍 Search Users</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 0 }))}
            />
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label">Military Branch</label>
            <select
              className="form-select"
              value={filters.branch}
              onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value, page: 0 }))}
            >
              <option value="">All Branches</option>
              <option value="ARMY">Army</option>
              <option value="NAVY">Navy</option>
              <option value="AIR_FORCE">Air Force</option>
              <option value="MARINES">Marines</option>
              <option value="COAST_GUARD">Coast Guard</option>
              <option value="SPACE_FORCE">Space Force</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Subscription</label>
            <select
              className="form-select"
              value={filters.subscriptionTier}
              onChange={(e) => setFilters(prev => ({ ...prev, subscriptionTier: e.target.value, page: 0 }))}
            >
              <option value="">All Tiers</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => setFilters({ search: '', branch: '', subscriptionTier: '', page: 0 })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: 'var(--spacing-md)' }}>Loading soldier roster...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Soldier</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Performance</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--military-dark-olive)' }}>
                          {user.firstName || user.lastName ? 
                            `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
                            'Unnamed Soldier'
                          }
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                          {user.email}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--dark-gray)' }}>
                          Enlisted: {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <span>{getBranchIcon(user.selectedBranch)}</span>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          {formatBranch(user.selectedBranch)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </span>
                        <span className={`badge ${user.subscriptionTier === 'PREMIUM' ? 'badge-warning' : 'badge-info'}`}>
                          {user.subscriptionTier}
                        </span>
                        {user.trialEndsAt && new Date(user.trialEndsAt) > new Date() && (
                          <span className="badge badge-info">
                            Trial: {format(new Date(user.trialEndsAt), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div>
                          <strong>{user.totalQuizzes}</strong> missions
                        </div>
                        <div style={{ color: 'var(--dark-gray)' }}>
                          {user.averageScore}% avg score
                        </div>
                        <div style={{ color: 'var(--success-green)' }}>
                          🔥 {user.studyStreak} day streak
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                        {user.lastLoginAt ? 
                          format(new Date(user.lastLoginAt), 'MMM dd, HH:mm') : 
                          'Never'
                        }
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                        <Link
                          to={`/users/${user.id}`}
                          className="btn btn-sm btn-primary"
                        >
                          View
                        </Link>
                        {user.isActive ? (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            disabled={suspendUserMutation.isPending}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUserAction(user.id, 'activate')}
                            disabled={activateUserMutation.isPending}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: 'var(--spacing-md) 0',
            borderTop: '1px solid #e5e5e5',
            marginTop: 'var(--spacing-md)'
          }}>
            <div style={{ color: 'var(--dark-gray)', fontSize: '14px' }}>
              Showing {filters.page * 50 + 1} - {Math.min((filters.page + 1) * 50, total)} of {total} soldiers
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={filters.page === 0}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={!hasMore}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;