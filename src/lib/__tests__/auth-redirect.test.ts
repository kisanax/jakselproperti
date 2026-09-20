import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/auth-redirect";

describe("safeReturnTo", () => {
  it("accepts allowlisted internal destinations", () => {
    expect(safeReturnTo("/properti/abc?ref=favorit")).toBe("/properti/abc?ref=favorit");
    expect(safeReturnTo("/akun")).toBe("/akun");
  });

  it("rejects external and protected destinations", () => {
    expect(safeReturnTo("https://evil.example/akun")).toBeNull();
    expect(safeReturnTo("//evil.example/akun")).toBeNull();
    expect(safeReturnTo("/admin/users")).toBeNull();
  });
});
