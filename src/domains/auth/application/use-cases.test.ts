import { describe, expect, it, vi } from "vitest";
import { getSessionProfile } from "./use-cases";
import type { SessionProfileRepository } from "../domain/repository";

describe("getSessionProfile", () => {
  it("returns the repository profile", async () => {
    const profile = {
      userId: "user-1",
      email: "chef@asadero.pro",
      merchantId: "merchant-1",
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
