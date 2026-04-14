import api from './client';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  progress: number;
  threshold: number;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  unlocked: number;
  total: number;
}

export async function getAchievements() {
  const { data } = await api.get<AchievementsResponse>('/achievements/');
  return data;
}
