import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../services/api';
import { format } from 'date-fns';

interface UserDetails {
  id: string;
  profile: {
    email: string;
    firstName?: string;
    lastName?: string;
    selectedBranch: string;
    createdAt: Date;
    lastLoginAt?: Date;
    isActive: boolean;
    studyStreak: number;
  };
  subscription: {
    tier: string;
    trialEndsAt?: Date;
    isTrialActive: boolean;
  };
  activity: {
    totalQuizzes: number;
    averageScore: number;
    totalStudyTime: number;
    recentQuizzes: Array<{
      id: string;
      category: string;
      score: number;
      completedAt: Date;
      timeSpent: number;
    }>;
  };
  progress: {
    flashcardsCreated: number;
    studyGroups: number;
    fitnessEntries: number;
  };
  support: {
    tickets: any[];
    totalTickets: number;
  };
}

const UserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [subscriptionUpdate, setSubscriptionUpdate] = useState({
    tier: '',
    trialEndsAt: '',
    notes: '',
  });

  const { data: userDetails, isLoading, error } = useQuery<{ data: UserDetails }>({
    queryKey: ['user-details', userId],
    queryFn: () => usersApi.getUserDetails(userId!),
    enabled: !!userId,
  });

  const suspendUserMutation = useMutation({
    mutationFn: usersApi.suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: usersApi.activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-details', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => 
      usersApi.updateUserSubscription(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-details', userId] });
      setSubscriptionUpdate({ tier: '', trialEndsAt: '', notes: '' });
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: 'var(--spacing-md)' }}>Loading soldier profile...</p>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--error-red)' }}>
        <h3>❌ Soldier Not Found</h3>
        <p>Unable to locate the requested soldier profile.</p>
        <button className="btn btn-primary" onClick={() => navigate('/users')}>
          Return to Roster
        </button>
      </div>
    );
  }

  const user = userDetails.data;

  const handleUserAction = async (action: 'suspend' | 'activate') => {
    if (!confirm(`Are you sure you want to ${action} this soldier?`)) return;
    
    try {
      if (action === 'suspend') {
        await suspendUserMutation.mutateAsync(userId!);
      } else {
        await activateUserMutation.mutateAsync(userId!);
      }
    } catch (error) {
      alert(`Failed to ${action} soldier. Please try again.`);
    }
  };

  const handleSubscriptionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subscriptionUpdate.tier) {
      alert('Please select a subscription tier.');
      return;
    }

    try {
      await updateSubscriptionMutation.mutateAsync({
        userId: userId!,
        data: {
          subscriptionTier: subscriptionUpdate.tier,
          trialEndsAt: subscriptionUpdate.trialEndsAt ? new Date(subscriptionUpdate.trialEndsAt) : undefined,
          notes: subscriptionUpdate.notes,
        },
      });
    } catch (error) {
      alert('Failed to update subscription. Please try again.');
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
            style={{ marginBottom: 'var(--spacing-sm)' }}
          >
            ← Back to Roster
          </button>
          <h1 style={{ color: 'var(--military-dark-olive)', marginBottom: 'var(--spacing-xs)' }}>
            {getBranchIcon(user.profile.selectedBranch)} Soldier Profile
          </h1>
          <p style={{ color: 'var(--dark-gray)' }}>
            {user.profile.firstName || user.profile.lastName ? 
              `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : 
              'Unnamed Soldier'
            } • {formatBranch(user.profile.selectedBranch)}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {user.profile.isActive ? (
            <button
              className="btn btn-danger"
              onClick={() => handleUserAction('suspend')}
              disabled={suspendUserMutation.isPending}
            >
              {suspendUserMutation.isPending ? 'Suspending...' : 'Suspend Soldier'}
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => handleUserAction('activate')}
              disabled={activateUserMutation.isPending}
            >
              {activateUserMutation.isPending ? 'Activating...' : 'Activate Soldier'}
            </button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* Basic Info */}
        <div className="card">
          <h3 className="card-title">📋 Basic Information</h3>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div>
              <strong>Email:</strong>
              <div style={{ color: 'var(--dark-gray)' }}>{user.profile.email}</div>
            </div>
            <div>
              <strong>Enlisted:</strong>
              <div style={{ color: 'var(--dark-gray)' }}>
                {format(new Date(user.profile.createdAt), 'MMMM dd, yyyy')}
              </div>
            </div>
            <div>
              <strong>Last Active:</strong>
              <div style={{ color: 'var(--dark-gray)' }}>
                {user.profile.lastLoginAt ? 
                  format(new Date(user.profile.lastLoginAt), 'MMMM dd, yyyy HH:mm') : 
                  'Never'
                }
              </div>
            </div>
            <div>
              <strong>Status:</strong>
              <div>
                <span className={`badge ${user.profile.isActive ? 'badge-success' : 'badge-error'}`}>
                  {user.profile.isActive ? 'Active Duty' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="card">
          <h3 className="card-title">⭐ Subscription Status</h3>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div>
              <strong>Current Tier:</strong>
              <div>
                <span className={`badge ${user.subscription.tier === 'PREMIUM' ? 'badge-warning' : 'badge-info'}`}>
                  {user.subscription.tier}
                </span>
              </div>
            </div>
            {user.subscription.trialEndsAt && (
              <div>
                <strong>Trial Status:</strong>
                <div>
                  <span className={`badge ${user.subscription.isTrialActive ? 'badge-success' : 'badge-error'}`}>
                    {user.subscription.isTrialActive ? 'Active' : 'Expired'}
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--dark-gray)', marginTop: '4px' }}>
                    Ends: {format(new Date(user.subscription.trialEndsAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <h3 className="card-title">📊 Performance Metrics</h3>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div>
              <strong>Study Streak:</strong>
              <div style={{ color: 'var(--success-green)' }}>
                🔥 {user.profile.studyStreak} days
              </div>
            </div>
            <div>
              <strong>Total Missions:</strong>
              <div style={{ color: 'var(--dark-gray)' }}>{user.activity.totalQuizzes}</div>
            </div>
            <div>
              <strong>Average Score:</strong>
              <div style={{ color: 'var(--success-green)' }}>{user.activity.averageScore}%</div>
            </div>
            <div>
              <strong>Study Time:</strong>
              <div style={{ color: 'var(--dark-gray)' }}>
                {formatTime(user.activity.totalStudyTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity & Progress */}
      <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* Recent Activity */}
        <div className="card">
          <h3 className="card-title">📈 Recent Mission Activity</h3>
          {user.activity.recentQuizzes.length > 0 ? (
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {user.activity.recentQuizzes.map((quiz) => (
                <div key={quiz.id} style={{ 
                  padding: 'var(--spacing-sm)',
                  backgroundColor: 'var(--light-gray)',
                  borderRadius: 'var(--border-radius)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{quiz.category}</div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                      {format(new Date(quiz.completedAt), 'MMM dd, HH:mm')} • {formatTime(quiz.timeSpent)}
                    </div>
                  </div>
                  <span className={`badge ${quiz.score >= 80 ? 'badge-success' : quiz.score >= 60 ? 'badge-warning' : 'badge-error'}`}>
                    {quiz.score}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--dark-gray)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
              No recent mission activity
            </p>
          )}
        </div>

        {/* Progress Summary */}
        <div className="card">
          <h3 className="card-title">🎯 Progress Summary</h3>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🃏 Flashcards Created</span>
              <span className="badge badge-info">{user.progress.flashcardsCreated}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>👥 Study Groups Joined</span>
              <span className="badge badge-info">{user.progress.studyGroups}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💪 Fitness Entries</span>
              <span className="badge badge-info">{user.progress.fitnessEntries}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="card">
        <h3 className="card-title">⚙️ Subscription Management</h3>
        <form onSubmit={handleSubscriptionUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: 'var(--spacing-md)', alignItems: 'end' }}>
            <div className="form-group mb-0">
              <label className="form-label">Subscription Tier</label>
              <select
                className="form-select"
                value={subscriptionUpdate.tier}
                onChange={(e) => setSubscriptionUpdate(prev => ({ ...prev, tier: e.target.value }))}
              >
                <option value="">Select Tier</option>
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Trial End Date</label>
              <input
                type="date"
                className="form-input"
                value={subscriptionUpdate.trialEndsAt}
                onChange={(e) => setSubscriptionUpdate(prev => ({ ...prev, trialEndsAt: e.target.value }))}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Admin Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional notes..."
                value={subscriptionUpdate.notes}
                onChange={(e) => setSubscriptionUpdate(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateSubscriptionMutation.isPending || !subscriptionUpdate.tier}
            >
              {updateSubscriptionMutation.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserDetail;