import { describe, expect, it, vi } from "vitest";
import { api } from "../src/services/api";

describe("API response errors", () => {
  it("preserves a non-JSON 404 and explains that the backend route is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 404,
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      }),
    );

    await expect(api("/admin/customers/")).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining("backend API endpoint was not found"),
    });
  });
});

describe("production API routing", () => {
  it("uses the same-origin Vercel API rewrite", async () => {
    vi.stubEnv("PROD", true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      }),
    );
    vi.resetModules();

    try {
      const { api: productionApi } = await import("../src/services/api");
      await productionApi("/products/");

      expect(fetch).toHaveBeenCalledWith(
        "/api/products/?sort=name",
        expect.objectContaining({ method: "GET" }),
      );
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
