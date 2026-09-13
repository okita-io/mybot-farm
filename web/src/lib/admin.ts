import { requireAppUser } from "@/lib/users";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return adminEmails().includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const user = await requireAppUser();
  if (!user) {
    return { ok: false as const, status: 401 as const, user: null };
  }

  if (!isAdminEmail(user.email)) {
    return { ok: false as const, status: 403 as const, user };
  }

  return { ok: true as const, status: 200 as const, user };
}
