import React from 'react';

export const StatusBadge = ({ status, type = 'generic' }) => {
  const getColors = () => {
    switch (status) {
      case 'LIVE':
      case 'ONGOING':
      case 'UNDER_REVIEW':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'COMPLETED':
      case 'ENDED':
      case 'CONFIRMED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'SCHEDULED':
      case 'UPCOMING':
      case 'PENDING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'PAUSED':
      case 'HALF_TIME':
      case 'OVERTURNED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: '1px solid',
      }}
      className={getColors()}
    >
      {(status === 'LIVE' || status === 'ONGOING') && (
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          display: 'inline-block',
          boxShadow: '0 0 8px #ef4444'
        }} />
      )}
      {status ? status.replace('_', ' ') : 'N/A'}
    </span>
  );
};
