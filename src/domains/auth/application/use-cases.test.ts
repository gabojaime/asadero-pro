import { describe, expect, it, vi } from "vitest";
import {
  createStaffUser,
  getSessionProfile,
  signIn,
} from "./use-cases";
import { AuthError } from "../domain/errors";
import type {
  AuthRepository,
  SessionProfileRepository,
  StaffUserRepository,
} from "../domain/repository";

describe("getSessionProfile", () => {
  it("returns the repository profile", async () => {
    const profile = {
      userId: "user-1",
      email: "chef@asadero.pro",
      merchantId: "merchant-1",
      merchantName: "Asadero Central",
      fullName: "Maria Lopez",
      role: "admin" as const,
      isOnboarded: true,
    };

    const repository: SessionProfileRepository = {
      getByUserId: vi.fn().mockResolvedValue(profile),
    };

    const result = await getSessionProfile(
      "user-1",
      "chef@asadero.pro",
      repository,
    );

    expect(result).toEqual(profile);
    expect(repository.getByUserId).toHaveBeenCalledWith(
      "user-1",
      "chef@asadero.pro",
    );
  });
});

describe("signIn", () => {
  it("validates credentials before calling the auth repository", async () => {
    const authRepository: AuthRepository = {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    };

    await expect(
      signIn({ email: "", password: "" }, authRepository),
    ).rejects.toMatchObject({
      code: "validation_failed",
    });

    expect(authRepository.signInWithPassword).not.toHaveBeenCalled();
  });

  it("delegates valid credentials to the auth repository", async () => {
    const signInResult = {
      userId: "user-1",
      email: "chef@asadero.pro",
    };

    const authRepository: AuthRepository = {
      signInWithPassword: vi.fn().mockResolvedValue(signInResult),
      signOut: vi.fn(),
    };

    const result = await signIn(
      { email: "chef@asadero.pro", password: "secret123" },
      authRepository,
    );

    expect(result).toEqual(signInResult);
    expect(authRepository.signInWithPassword).toHaveBeenCalledWith({
      email: "chef@asadero.pro",
      password: "secret123",
    });
  });
});

describe("createStaffUser", () => {
  const adminProfile = {
    userId: "admin-1",
    email: "admin@asadero.pro",
    merchantId: "merchant-1",
    merchantName: "Asadero Central",
    fullName: "Maria Lopez",
    role: "admin" as const,
    isOnboarded: true,
  };

  const staffInput = {
    email: "waiter@asadero.pro",
    password: "secret123",
    fullName: "Pedro Mesa",
    role: "waiter" as const,
  };

  it("rejects grill_master actors", async () => {
    const repository: StaffUserRepository = {
      createStaffUser: vi.fn(),
    };

    await expect(
      createStaffUser(staffInput, { ...adminProfile, role: "grill_master" }, repository),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(repository.createStaffUser).not.toHaveBeenCalled();
  });

  it("rejects waiter actors", async () => {
    const repository: StaffUserRepository = {
      createStaffUser: vi.fn(),
    };

    await expect(
      createStaffUser(staffInput, { ...adminProfile, role: "waiter" }, repository),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(repository.createStaffUser).not.toHaveBeenCalled();
  });

  it("delegates to the repository after admin merchant validation", async () => {
    const createResult = {
      userId: "staff-1",
      email: "waiter@asadero.pro",
      role: "waiter" as const,
    };

    const repository: StaffUserRepository = {
      createStaffUser: vi.fn().mockResolvedValue(createResult),
    };

    const result = await createStaffUser(staffInput, adminProfile, repository);

    expect(result).toEqual(createResult);
    expect(repository.createStaffUser).toHaveBeenCalledWith(staffInput);
  });

  it("rejects admin without merchant context", async () => {
    const repository: StaffUserRepository = {
      createStaffUser: vi.fn(),
    };

    await expect(
      createStaffUser(
        staffInput,
        { ...adminProfile, merchantId: null },
        repository,
      ),
    ).rejects.toBeInstanceOf(AuthError);

    expect(repository.createStaffUser).not.toHaveBeenCalled();
  });
});
