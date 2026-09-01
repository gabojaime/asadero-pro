import type { SessionProfile } from "./entities";

export interface SessionProfileRepository {
  getByUserId(userId: string, email: string): Promise<SessionProfile>;
}
