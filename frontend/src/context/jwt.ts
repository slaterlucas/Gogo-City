export function jwtDecode(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || decoded.user_id || null;
  } catch {
    return null;
  }
}
