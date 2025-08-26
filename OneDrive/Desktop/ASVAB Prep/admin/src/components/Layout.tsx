import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: '250px',
        backgroundColor: 'var(--military-dark-olive)',
        color: 'var(--white)',
        padding: 'var(--spacing-lg) 0',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '0 var(--spacing-lg)', 
          marginBottom: 'var(--spacing-xl)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          paddingBottom: 'var(--spacing-lg)'
        }}>
          <h2 style={{ color: 'var(--khaki)', margin: 0, fontSize: '1.5rem' }}>
            🎖️ ASVAB Prep
          </h2>
          <p style={{ color: 'var(--desert-sand)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Admin Command Center
          </p>
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { to: '/dashboard', icon: '📊', label: 'Dashboard' },
            { to: '/users', icon: '👥', label: 'User Management' },
            { to: '/content', icon: '📚', label: 'Content Management' },
            { to: '/analytics', icon: '📈', label: 'Analytics' },
            { to: '/system', icon: '🔧', label: 'System Health' },
          ].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                color: isActive ? 'var(--tactical-orange)' : 'var(--white)',
                textDecoration: 'none',
                backgroundColor: isActive ? 'rgba(255, 140, 0, 0.1)' : 'transparent',
                borderRight: isActive ? '3px solid var(--tactical-orange)' : '3px solid transparent',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              })}
            >
              <span style={{ fontSize: '16px' }}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 'auto', 
          padding: 'var(--spacing-lg)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '12px',
          color: 'var(--desert-sand)'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Operational Status:</strong> ACTIVE
          </p>
          <p style={{ margin: '4px 0 0 0' }}>
            Version 1.0.0 • Secure
          </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        padding: 'var(--spacing-xl)', 
        backgroundColor: 'var(--light-gray)',
        overflow: 'auto'
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;