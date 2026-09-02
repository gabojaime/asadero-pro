import { AuthError } from "../domain/errors";
import type {
  CreateStaffUserInput,
  CreateStaffUserResult,
  SessionProfile,
  SignInCredentials,
  SignInResult,
} from "../domain/entities";
import type {
  AuthRepository,
  SessionProfileRepository,
  StaffUserRepository,
} from "../domain/repository";
import {
  parseCreateStaffUserInput,
  parseSignInCredentials,
} from "../domain/validations";

export async function getSessionProfile(
  userId: string,
  email: string,
  repository: SessionProfileRepository,
): Promise<SessionProfile> {
  return repository.getByUserId(userId, email);
}

export async function signIn(
  credentials: SignInCredentials,
  authRepository: AuthRepository,
): Promise<SignInResult> {
  const validation = parseSignInCredentials(credentials);

  if (!validation.success) {
    throw new AuthError(
      "validation_failed",
      "Invalid sign-in credentials.",
      validation.fieldErrors,
    );
  }

  return authRepository.signInWithPassword(validation.data);
}

export async function signOut(authRepository: AuthRepository): Promise<void> {
  await authRepository.signOut();
}

export async function createStaffUser(
  input: CreateStaffUserInput,
  actorProfile: SessionProfile,
  repository: StaffUserRepository,
): Promise<CreateStaffUserResult> {
  if (actorProfile.role !== "admin") {
    throw new AuthError(
      "forbidden",
      "Solo los administradores pueden crear usuarios del personal.",
    );
  }

  if (!actorProfile.merchantId) {
    throw new AuthError(
      "forbidden",
      "Se requiere el contexto del negocio del administrador.",
    );
  }

  const validation = parseCreateStaffUserInput(input);

  if (!validation.success) {
    throw new AuthError(
      "validation_failed",
      "Invalid staff user input.",
      validation.fieldErrors,
    );
  }

  return repository.createStaffUser(validation.data);
}
