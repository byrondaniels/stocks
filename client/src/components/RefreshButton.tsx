/**
 * RefreshButton Component
 * Reusable button for refreshing stock data with loading animation
 */

import React from 'react';
import './RefreshButton.css';

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text';
  children?: React.ReactNode;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  size = 'medium',
  variant = 'icon',
  children,
}) => {
  const handleClick = async () => {
    if (!loading && !disabled) {
      await onClick();
    }
  };

  return (
    <button
      className={`refresh-button refresh-button--${size} refresh-button--${variant}`}
      onClick={handleClick}
      disabled={disabled || loading}
      title={loading ? 'Refreshing...' : 'Refresh'}
    >
      <svg
        className={`refresh-icon ${loading ? 'refresh-icon--spinning' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      {variant === 'text' && <span className="refresh-button__text">{children || 'Refresh'}</span>}
    </button>
  );
};
