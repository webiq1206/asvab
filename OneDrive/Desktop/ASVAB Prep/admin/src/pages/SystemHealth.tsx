import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../services/api';

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    queryTime: number;
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  server: {
    uptime: number;
    cpu: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      errorsLast24h: number;
      averageResponseTime: number;
    };
  };
  services: {
    auth: boolean;
    subscriptions: boolean;
    notifications: boolean;
    fileStorage: boolean;
  };
}

const SystemHealth: React.FC = () => {
  const { data: healthData, isLoading, error } = useQuery<{ data: SystemHealth }>({
    queryKey: ['system-health'],
    queryFn: () => platformApi.getSystemHealth(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'var(--success-green)';
      case 'warning': return 'var(--warning-yellow)';
      case 'error': return 'var(--error-red)';
      default: return 'var(--dark-gray)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: 'var(--spacing-md)' }}>Running system diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--error-red)' }}>
        <h3>🚨 System Diagnostics Failed</h3>
        <p>Unable to retrieve system health data. Check system connectivity.</p>
      </div>
    );
  }

  const health = healthData?.data;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ color: 'var(--military-dark-olive)' }}>🔧 System Health Monitor</h1>
        <p style={{ color: 'var(--dark-gray)' }}>
          Mission Critical System Status • Auto-refreshes every 10 seconds
        </p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>
            {getStatusIcon(health?.database.status || 'error')}
          </div>
          <h3 style={{ color: getStatusColor(health?.database.status || 'error') }}>
            {health?.database.status.toUpperCase()}
          </h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Database Status</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-info">
              {health?.database.queryTime || 0}ms query time
            </span>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>⚡</div>
          <h3 style={{ color: 'var(--success-green)' }}>
            {health ? formatUptime(health.server.uptime) : '0d 0h 0m'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Server Uptime</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-success">
              Operational
            </span>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>💾</div>
          <h3 style={{ color: 'var(--military-green)' }}>
            {health ? Math.round(health.server.memory.percentage) : 0}%
          </h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Memory Usage</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className="badge badge-info">
              {health ? formatBytes(health.server.memory.used) : '0 B'} used
            </span>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-sm)' }}>🔗</div>
          <h3 style={{ color: 'var(--success-green)' }}>
            {health?.server.requests.errorsLast24h || 0}
          </h3>
          <p className="text-sm" style={{ color: 'var(--dark-gray)' }}>Errors (24h)</p>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <span className={`badge ${(health?.server.requests.errorsLast24h || 0) > 10 ? 'badge-warning' : 'badge-success'}`}>
              {(health?.server.requests.errorsLast24h || 0) > 10 ? 'Monitor' : 'Normal'}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed System Information */}
      <div className="grid grid-cols-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* Database Health */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💾 Database Health</h3>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Status</span>
              <span className={`badge ${health?.database.status === 'healthy' ? 'badge-success' : health?.database.status === 'warning' ? 'badge-warning' : 'badge-error'}`}>
                {health?.database.status || 'Unknown'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Active Connections</span>
              <span>{health?.database.connections || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Average Query Time</span>
              <span>{health?.database.queryTime || 0}ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Storage Used</span>
              <span>
                {health ? formatBytes(health.database.storage.used) : '0 B'} / {health ? formatBytes(health.database.storage.total) : '0 B'}
                ({health?.database.storage.percentage || 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Server Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🖥️ Server Performance</h3>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>CPU Usage</span>
              <span>{health?.server.cpu || 0}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Memory Usage</span>
              <span>
                {health ? formatBytes(health.server.memory.used) : '0 B'} / {health ? formatBytes(health.server.memory.total) : '0 B'}
                ({health ? Math.round(health.server.memory.percentage) : 0}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Requests</span>
              <span>{health?.server.requests.total || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Average Response Time</span>
              <span>{health?.server.requests.averageResponseTime || 0}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔧 Service Status</h3>
        </div>
        <div className="grid grid-cols-4">
          {health?.services && Object.entries(health.services).map(([service, status]) => (
            <div key={service} style={{ 
              padding: 'var(--spacing-md)',
              textAlign: 'center',
              borderRight: '1px solid #e5e5e5'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>
                {status ? '🟢' : '🔴'}
              </div>
              <h4 style={{ 
                textTransform: 'capitalize', 
                marginBottom: 'var(--spacing-xs)',
                color: status ? 'var(--success-green)' : 'var(--error-red)'
              }}>
                {service.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </h4>
              <span className={`badge ${status ? 'badge-success' : 'badge-error'}`}>
                {status ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚙️ System Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">
            🔄 Refresh Status
          </button>
          <button className="btn btn-secondary">
            📊 View Logs
          </button>
          <button className="btn btn-secondary">
            📈 Performance Report
          </button>
          <button className="btn btn-secondary">
            🚨 Alert Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;