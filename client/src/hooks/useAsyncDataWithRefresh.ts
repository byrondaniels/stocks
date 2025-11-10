import { useState, useEffect } from 'react';

/**
 * Custom hook for fetching and refreshing async data with loading and error states.
 *
 * Provides a consistent pattern for components that need to:
 * - Fetch data from an API on mount
 * - Manually refresh the data
 * - Track loading, refreshing, and error states
 *
 * @template T - The type of data being fetched
 * @param fetchUrl - URL to fetch data from (relative or absolute)
 * @param refreshUrl - URL to POST to for refreshing data
 * @param dependencies - Array of dependencies that trigger refetch when changed
 *
 * @returns Object containing data, loading states, error, and refresh function
 *
 * @example
 * ```tsx
 * interface ScoreData {
 *   ticker: string;
 *   score: number;
 * }
 *
 * function ScoreDisplay({ ticker }: { ticker: string }) {
 *   const { data, loading, error, refreshing, refresh } = useAsyncDataWithRefresh<ScoreData>(
 *     `/api/score?ticker=${ticker}`,
 *     `/api/score/refresh?ticker=${ticker}`,
 *     [ticker]
 *   );
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!data) return null;
 *
 *   return (
 *     <div>
 *       <h2>Score: {data.score}</h2>
 *       <button onClick={refresh} disabled={refreshing}>
 *         {refreshing ? 'Refreshing...' : 'Refresh'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAsyncDataWithRefresh<T>(
  fetchUrl: string,
  refreshUrl: string,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(fetchUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch(refreshUrl, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh data');
      }

      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    refetch: fetchData,
  };
}
