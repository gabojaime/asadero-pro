import type {
  CreateStaffUserInput,
  CreateStaffUserResult,
  SessionProfile,
  SignInCredentials,
  SignInResult,
} from "./entities";

export interface SessionProfileRepository {
  getByUserId(userId: string, email: string): Promise<SessionProfile>;
}

export interface AuthRepository {
  signInWithPassword(credentials: SignInCredentials): Promise<SignInResult>;
  signOut(): Promise<void>;
}

export interface StaffUserRepository {
  createStaffUser(
    input: CreateStaffUserInput,
  ): Promise<CreateStaffUserResult>;
}
