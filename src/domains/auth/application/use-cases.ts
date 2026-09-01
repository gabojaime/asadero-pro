import type { SessionProfile } from "../domain/entities";
import type { SessionProfileRepository } from "../domain/repository";

export async function getSessionProfile(
  userId: string,
  email: string,
  repository: SessionProfileRepository,
): Promise<SessionProfile> {
  return repository.getByUserId(userId, email);
}
