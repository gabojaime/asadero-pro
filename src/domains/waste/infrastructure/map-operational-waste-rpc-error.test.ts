import { describe, expect, it } from "vitest";
import { WasteError } from "../domain/errors";
import { mapOperationalWasteRpcError } from "./map-operational-waste-rpc-error";

describe("mapOperationalWasteRpcError", () => {
  it("maps forbidden and not_found", () => {
    expect(() => mapOperationalWasteRpcError({ message: "forbidden" })).toThrow(
      WasteError,
    );
    try {
      mapOperationalWasteRpcError({ message: "not_found" });
      expect.fail("expected throw");
    } catch (error) {
      expect(error).toMatchObject({ code: "not_found" });
    }
  });
});
