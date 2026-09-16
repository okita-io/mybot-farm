import { readApiKeyFromRequest } from "@/lib/api-key-crypto";
import { resolveApiKeyUser } from "@/lib/api-keys";
import { requireAppUser, type AppUser } from "@/lib/users";

export async function requireSeller(request: Request): Promise<AppUser | null> {
  const presented = readApiKeyFromRequest(request);
  if (presented) {
    return resolveApiKeyUser(presented);
  }

  return requireAppUser();
}
