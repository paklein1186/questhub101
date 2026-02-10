// Admin check — simple email allowlist for now.
// Replace with a proper roles table when backend is connected.
const ADMIN_EMAILS = ["aisha@example.com", "pa@troistiers.space"];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}
