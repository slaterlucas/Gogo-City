import api from './client';

export interface City {
  id: string;
  name: string;
  state: string | null;
  country: string;
}

export async function listCities() {
  const { data } = await api.get<City[]>('/cities/');
  return data;
}
