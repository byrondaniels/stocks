/**
 * Rate limiting hook for stock refresh operations
 * Prevents refresh spam with 1 minute cooldown per stock
 */

import { useState, useCallback, useRef } from 'react';
import { RATE_LIMIT_MS } from '../constants';

export const useRefreshRateLimit = () => {
  const lastRefreshTimes = useRef<Record<string, number>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const canRefresh = useCallback((key: string): boolean => {
    const lastRefresh = lastRefreshTimes.current[key];
    if (!lastRefresh) return true;

    const timeSinceRefresh = Date.now() - lastRefresh;
    return timeSinceRefresh >= RATE_LIMIT_MS;
  }, []);

  const getRemainingCooldown = useCallback((key: string): number => {
    const lastRefresh = lastRefreshTimes.current[key];
    if (!lastRefresh) return 0;

    const timeSinceRefresh = Date.now() - lastRefresh;
    const remaining = RATE_LIMIT_MS - timeSinceRefresh;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }, []);

  const recordRefresh = useCallback((key: string) => {
    lastRefreshTimes.current[key] = Date.now();

    // Start cooldown countdown
    const interval = setInterval(() => {
      const remaining = getRemainingCooldown(key);
      if (remaining > 0) {
        setCooldowns(prev => ({ ...prev, [key]: remaining }));
      } else {
        setCooldowns(prev => {
          const newCooldowns = { ...prev };
          delete newCooldowns[key];
          return newCooldowns;
        });
        clearInterval(interval);
      }
    }, 1000);

    // Initial cooldown value
    setCooldowns(prev => ({ ...prev, [key]: 60 }));
  }, [getRemainingCooldown]);

  return {
    canRefresh,
    getRemainingCooldown,
    recordRefresh,
    cooldowns,
  };
};
