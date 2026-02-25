import api from './client';

export interface TaskInRoute {
  id: string;
  name: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  task_description?: string;
  verification_type: string;
  verification_hint?: string;
  category: string;
  price_level?: number;
  avg_duration_minutes?: number;
}

export interface GenerateRouteResponse {
  template_id: string;
  title: string;
  description?: string;
  city_id: string;
  city_name: string;
  tasks: TaskInRoute[];
  total_tasks: number;
  estimated_duration_minutes: number;
}

export interface GenerateRouteRequest {
  city_id: string;
  time_available_hours: number;
  budget: 'low' | 'medium' | 'high' | 'any';
  vibe_tags: string[];
  dietary_restrictions: string[];
  group_size: number;
  custom_title?: string;
}

export async function generateRoute(req: GenerateRouteRequest) {
  const { data } = await api.post<GenerateRouteResponse>('/routes/generate', req);
  return data;
}
