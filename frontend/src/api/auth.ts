import api from './client';

export async function register(email: string, username: string, password: string, displayName?: string) {
  const { data } = await api.post('/auth/register', {
    email, username, password, display_name: displayName,
  });
  return data as { access_token: string };
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { access_token: string };
}
