import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postAdminWbSync } from "@/app/api/admin/wb/sync/route";
import { GET as getCronWbSync, POST as postCronWbSync } from "@/app/api/cron/wb-sync/route";
import { runWbProductSync } from "@/lib/wb/sync-products";

vi.mock("@/lib/wb/sync-products", () => ({
  runWbProductSync: vi.fn(),
}));

const baseUrl = "http://localhost:3000";
const cronSecret = "test-cron-secret";

const mockSyncResult = {
  added: 2,
  updated: 1,
  deactivated: 0,
  unchanged: 3,
  errors: 0,
  durationMs: 10,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/admin/wb/sync", () => {
  it("returns 401 without admin cookie", async () => {
    const request = new NextRequest(`${baseUrl}/api/admin/wb/sync`, {
      method: "POST",
    });
    const res = await postAdminWbSync(request);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(runWbProductSync)).not.toHaveBeenCalled();
  });

  it("returns 200 and passes through runWbProductSync result when admin cookie is set", async () => {
    vi.mocked(runWbProductSync).mockResolvedValue(mockSyncResult);
    const request = new NextRequest(`${baseUrl}/api/admin/wb/sync`, {
      method: "POST",
      body: JSON.stringify({ mode: "full" }),
      headers: {
        "Content-Type": "application/json",
        cookie: "admin-auth=authenticated",
      },
    });
    const res = await postAdminWbSync(request);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockSyncResult);
    expect(vi.mocked(runWbProductSync)).toHaveBeenCalledWith({ mode: "full" });
  });
});

describe("/api/cron/wb-sync", () => {
  it("returns 401 when the secret is wrong (Bearer does not match)", async () => {
    vi.stubEnv("WB_SYNC_CRON_SECRET", cronSecret);
    const request = new NextRequest(`${baseUrl}/api/cron/wb-sync`, {
      headers: { Authorization: "Bearer wrong" },
    });
    const res = await getCronWbSync(request);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(runWbProductSync)).not.toHaveBeenCalled();
  });

  it("returns 200 and runs sync when Authorization Bearer matches WB_SYNC_CRON_SECRET", async () => {
    vi.stubEnv("WB_SYNC_CRON_SECRET", cronSecret);
    vi.mocked(runWbProductSync).mockResolvedValue(mockSyncResult);
    const request = new NextRequest(`${baseUrl}/api/cron/wb-sync`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const res = await getCronWbSync(request);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockSyncResult);
    expect(vi.mocked(runWbProductSync)).toHaveBeenCalledWith({
      mode: "incremental",
    });
  });

  it("returns 200 when x-wb-sync-secret matches and runs sync like GET Bearer", async () => {
    vi.stubEnv("WB_SYNC_CRON_SECRET", cronSecret);
    vi.mocked(runWbProductSync).mockResolvedValue(mockSyncResult);
    const request = new NextRequest(`${baseUrl}/api/cron/wb-sync`, {
      method: "POST",
      headers: { "x-wb-sync-secret": cronSecret },
    });
    const res = await postCronWbSync(request);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockSyncResult);
    expect(vi.mocked(runWbProductSync)).toHaveBeenCalledWith({
      mode: "incremental",
    });
  });

  it("returns 401 when x-wb-sync-secret is wrong and does not run sync", async () => {
    vi.stubEnv("WB_SYNC_CRON_SECRET", cronSecret);
    const request = new NextRequest(`${baseUrl}/api/cron/wb-sync`, {
      method: "POST",
      headers: { "x-wb-sync-secret": "wrong" },
    });
    const res = await postCronWbSync(request);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(runWbProductSync)).not.toHaveBeenCalled();
  });

  it("returns 503 when WB_SYNC_CRON_SECRET is not set", async () => {
    vi.stubEnv("WB_SYNC_CRON_SECRET", "");
    const request = new NextRequest(`${baseUrl}/api/cron/wb-sync`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const res = await getCronWbSync(request);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "Cron sync is not configured",
    });
    expect(vi.mocked(runWbProductSync)).not.toHaveBeenCalled();
  });
});
