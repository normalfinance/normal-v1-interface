'use client';

import { useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

export type LeaderboardMetric = 'tvl' | 'deposits' | 'netFlow';
export type LeaderboardVisibility = 'all' | 'public' | 'private';

export interface UseLeaderboardParams {
  metric: LeaderboardMetric;
  visibility: LeaderboardVisibility;
  page: number;
  limit: number;
}

export interface LeaderboardRanking {
  rank: number;
  id: string;
  address: string;
  sequence: number;
  managerAddress: string;
  isPublic: boolean;
  tvlUsd: string;
  totalShares: string;
  totalMints: string;
  totalRedemptions: string;
  netFlow: string;
  baseNav: string;
  sharePrice: string;
  tokenAddress: string;
  lastSyncedAt: string;
}

export interface LeaderboardStats {
  totalFunds: number;
  publicFunds: number;
  privateFunds: number;
  totalTvlUsd: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UseLeaderboardReturn {
  rankings: LeaderboardRanking[];
  stats: LeaderboardStats | null;
  pagination: PaginationInfo;
  loading: boolean;
  statsLoading: boolean;
  error: Error | null;
  refetch: () => void;
  refetchStats: () => void;
}

// ----------------------------------------------------------------------

export function useLeaderboard(params: UseLeaderboardParams): UseLeaderboardReturn {
  const { metric, visibility, page, limit } = params;

  const [rankings, setRankings] = useState<LeaderboardRanking[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch leaderboard rankings
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({
        metric,
        visibility,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/leaderboard?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }

      const data = await response.json();

      setRankings(data.rankings || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
      setError(e instanceof Error ? e : new Error('Failed to fetch leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [metric, visibility, page, limit]);

  // Fetch leaderboard stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const response = await fetch('/api/leaderboard/stats');

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats || null);
    } catch (e) {
      console.error('Error fetching leaderboard stats:', e);
      // Don't set error for stats - it's non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    rankings,
    stats,
    pagination,
    loading,
    statsLoading,
    error,
    refetch: fetchLeaderboard,
    refetchStats: fetchStats,
  };
}
