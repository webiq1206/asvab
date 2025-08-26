import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../services/api';
import { format } from 'date-fns';

interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    premium: number;
    byBranch: Record<string, number>;
    newThisMonth: number;
    churnRate: number;
  };
  content: {
    totalQuestions: number;
    totalFlashcards: number;
    totalMilitaryJobs: number;
    contentByCategory: Record<string, number>;
  };
  engagement: {
    dailyActiveUsers: number;
    averageSessionTime: number;
    quizzesCompleted: number;
    studyGroupsActive: number;
    fitnessEntriesLogged: number;
  };
  revenue: {
    monthlyRevenue: number;
    totalRevenue: number;
    averageRevenuePerUser: number;
    subscriptionConversionRate: number;
  };
  system: {
    serverUptime: number;
    databaseConnections: number;
    errorRate: number;
    responseTime: number;
  };
}

const Dashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery<{ data: PlatformMetrics }>({
    queryKey: ['platform-metrics'],
    queryFn: () => platformApi.getMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--dark-gray)' }}>
          Loading operational data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--error-red)' }}>
        <h3>⚠️ Mission Critical Error</h3>
        <p>Unable to retrieve platform metrics. Check system status.</p>
      </div>
    );
  }

  const data = metrics?.data;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ color: 'var(--military-dark-olive)', marginBottom: 'var(--spacing-sm)' }}>
          🎖️ Command Center Dashboard
        </h1>
        <p style={{ color: 'var(--dark-gray)', fontSize: '16px' }}>
          Mission Status: <strong style={{ color: 'var(--success-green)' }}>OPERATIONAL</strong> • 
          Last Updated: {format(new Date(), 'HH:mm:ss')}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* Total Users */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>👥</div>
          <h3 style={{ color: 'var(--military-green)' }}>{data?.users.total || 0}</h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Total Soldiers</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-success">
              +{data?.users.newThisMonth || 0} this month
            </span>
          </div>
        </div>

        {/* Premium Users */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>⭐</div>
          <h3 style={{ color: 'var(--tactical-orange)' }}>{data?.users.premium || 0}</h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Premium Active</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-info">
              {data?.users.total ? Math.round((data.users.premium / data.users.total) * 100) : 0}% conversion
            </span>
          </div>
        </div>

        {/* Daily Active Users */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>🔥</div>
          <h3 style={{ color: 'var(--success-green)' }}>{data?.engagement.dailyActiveUsers || 0}</h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Daily Active</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-success">
              {data?.engagement.quizzesCompleted || 0} quizzes completed
            </span>
          </div>
        </div>

        {/* System Health */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>🟢</div>
          <h3 style={{ color: 'var(--success-green)' }}>
            {data ? formatUptime(data.system.serverUptime) : '0d 0h 0m'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>System Uptime</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-success">All systems go</span>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* User Demographics */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👥 Force Distribution</h3>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {data?.users.byBranch && Object.entries(data.users.byBranch).map(([branch, count]) => (
              <div key={branch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>
                  {branch.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className="badge badge-info">{count}</span>
                  <span style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                    ({data.users.total ? Math.round((count / data.users.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              paddingTop: 'var(--spacing-md)', 
              borderTop: '1px solid #e5e5e5',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--military-green)' }}>
                Churn Rate
              </span>
              <span className={`badge ${(data?.users.churnRate || 0) > 10 ? 'badge-warning' : 'badge-success'}`}>
                {(data?.users.churnRate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Content Statistics */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📚 Arsenal Overview</h3>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📝 Questions</span>
              <span className="badge badge-info">{data?.content.totalQuestions || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🃏 Flashcards</span>
              <span className="badge badge-info">{data?.content.totalFlashcards || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎖️ Military Jobs</span>
              <span className="badge badge-info">{data?.content.totalMilitaryJobs || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👥 Study Groups Active</span>
              <span className="badge badge-success">{data?.engagement.studyGroupsActive || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💪 Fitness Entries</span>
              <span className="badge badge-success">{data?.engagement.fitnessEntriesLogged || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">
            📊 Generate Report
          </button>
          <button className="btn btn-secondary">
            👥 User Management
          </button>
          <button className="btn btn-secondary">
            📚 Content Review
          </button>
          <button className="btn btn-secondary">
            🔧 System Check
          </button>
          <button className="btn btn-secondary">
            📢 Send Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;