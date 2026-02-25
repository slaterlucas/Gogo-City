import api from './client';

export interface InstanceTask {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  task_description?: string;
  verification_type: string;
  verification_hint?: string;
  notes?: string;
  is_completed: boolean;
  xp?: number;
}

export interface Progress {
  completed_tasks: number;
  total_tasks: number;
  percent: number;
  is_complete: boolean;
}

export interface Instance {
  id: string;
  title: string;
  description?: string;
  status: string;
  source_template_id?: string;
  created_at: string;
  progress: Progress;
  tasks: InstanceTask[];
}

export interface InstanceListItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  source_template_id?: string;
  created_at: string;
  progress: Progress;
}

export async function createInstance(templateId: string) {
  const { data } = await api.post<Instance>('/instances/', { template_id: templateId });
  return data;
}

export async function listInstances() {
  const { data } = await api.get<InstanceListItem[]>('/instances/');
  return data;
}

export async function getInstance(id: string) {
  const { data } = await api.get<Instance>(`/instances/${id}`);
  return data;
}

export async function deleteInstance(id: string) {
  await api.delete(`/instances/${id}`);
}
