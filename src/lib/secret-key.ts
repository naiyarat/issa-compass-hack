const STORAGE_KEY = "panel_secret_key";

export function getStoredSecretKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredSecretKey(value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value);
}

export function clearStoredSecretKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getSecretKeyHeader(): Record<string, string> {
  const key = getStoredSecretKey();
  if (!key) return {};
  return { "x-secret-key": key };
}
