export interface AdminSession { authenticated: true; expiresAt: number; csrfToken: string }

export async function readAdminSession(): Promise<AdminSession> {
  const response = await fetch("/api/session.php", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (response.status === 401) { window.location.replace("/login"); throw new Error("Your session has ended."); }
  if (!response.ok) throw new Error("The secure sign-in service is unavailable. Please try again.");
  const value = await response.json();
  if (value.authenticated !== true || typeof value.csrfToken !== "string" || !Number.isFinite(value.expiresAt)) throw new Error("The secure sign-in service is not configured correctly.");
  return value;
}

export async function signOutAdmin(): Promise<void> {
  const session = await readAdminSession();
  const response = await fetch("/api/session.php", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "X-ILAW-CSRF": session.csrfToken }, signal: AbortSignal.timeout(10000) });
  if (!response.ok && response.status !== 401) throw new Error("Sign out could not be completed. Please try again.");
  window.location.replace("/login");
}
