// Simple client-side auth helper (mock)
export function saveToken(token: string, remember: boolean) {
  try {
    if (remember) {
      localStorage.setItem('authToken', token);
    } else {
      sessionStorage.setItem('authToken', token);
    }
  } catch (e) {
    // storage might be unavailable in some environments
    console.warn('Could not save auth token', e);
  }
}

export function clearToken() {
  try {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  } catch (e) {
    console.warn('Could not clear auth token', e);
  }
}

export function getToken(): string | null {
  return localStorage.getItem('authToken') ?? sessionStorage.getItem('authToken');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
