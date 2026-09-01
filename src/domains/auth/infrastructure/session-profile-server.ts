import { redirect } from "next/navigation";
import { getSessionProfile } from "@/domains/auth/application/use-cases";
import { createSessionProfileRepository } from "@/domains/auth/infrastructure/supabase-repo";
import { createClient } from "@/shared/infrastructure/supabase/server";
import type { SessionProfile } from "@/domains/auth/domain/entities";

export async function getServerSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const email = user.email ?? "";
  const repository = createSessionProfileRepository(supabase);

  return getSessionProfile(user.id, email, repository);
}

export async function requireServerSessionProfile(): Promise<SessionProfile> {
  const profile = await getServerSessionProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
