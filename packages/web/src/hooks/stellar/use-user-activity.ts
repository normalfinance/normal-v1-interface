import type { Activity } from '@/types/activity';

export function useUserActivity(): { recentActivity: Activity[] } {
  return { recentActivity: [] };
}
