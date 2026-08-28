import React from 'react';

export const StatusBadge = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'LIVE':
      case 'ONGOING':
      case 'UNDER_REVIEW':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          borderColor: 'rgba(239, 68, 68, 0.5)'
        };
      case 'COMPLETED':
      case 'ENDED':
      case 'CONFIRMED':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          color: '#10b981',
          borderColor: 'rgba(16, 185, 129, 0.5)'
        };
      case 'SCHEDULED':
      case 'UPCOMING':
      case 'PENDING':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          color: '#3b82f6',
          borderColor: 'rgba(59, 130, 246, 0.5)'
        };
      case 'PAUSED':
      case 'HALF_TIME':
      case 'OVERTURNED':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          color: '#f59e0b',
          borderColor: 'rgba(245, 158, 11, 0.5)'
        };
      default:
        return {
          backgroundColor: 'rgba(148, 163, 184, 0.2)',
          color: '#94a3b8',
          borderColor: 'rgba(148, 163, 184, 0.5)'
        };
    }
  };

  const badgeStyle = getStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '800',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: `1px solid ${badgeStyle.borderColor}`,
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color
      }}
    >
      {(status === 'LIVE' || status === 'ONGOING') && (
        <span
          className="animate-pulse"
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'inline-block',
            boxShadow: '0 0 8px #ef4444'
          }}
        />
      )}
      {status ? status.replace('_', ' ') : 'N/A'}
    </span>
  );
};
