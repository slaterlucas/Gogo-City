import api from './client';

export interface CheckInRequest {
  instance_task_id: string;
  user_lat?: number;
  user_lng?: number;
  accuracy_meters?: number;
  photo_base64?: string;
  notes?: string;
  rating?: number;
}

export interface CheckInResponse {
  id: string;
  instance_task_id: string;
  verified: boolean;
  verified_by: string;
  reason: string;
  lat?: number;
  lng?: number;
  task_name: string;
  xp_earned: number;
  total_xp: number;
  level: number;
}

export interface ProgressDetail {
  instance_id: string;
  status: string;
  completed: number;
  total: number;
  progress_pct: number;
  xp_earned: number;
  xp_possible: number;
  tasks: {
    task_id: string;
    name: string;
    verification_type: string;
    xp: number;
    completed: boolean;
    verified_by?: string;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  total_xp: number;
  level: number;
}

export async function createCheckIn(req: CheckInRequest) {
  const { data } = await api.post<CheckInResponse>('/check-ins/', req);
  return data;
}

export async function getProgress(instanceId: string) {
  const { data } = await api.get<ProgressDetail>(`/check-ins/instance/${instanceId}/progress`);
  return data;
}

export async function getLeaderboard(limit = 20) {
  const { data } = await api.get<LeaderboardEntry[]>('/check-ins/leaderboard', { params: { limit } });
  return data;
}
