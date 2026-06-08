import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WbClient, WbClientError } from "@/lib/wb/client";

describe("WbClient ping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns ok, status, durationMs, and bodyTextPreview on HTTP 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("OK", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      )
    );
    const client = new WbClient({ getToken: () => "token" });
    const result = await client.ping();
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.bodyTextPreview).toBe("OK");
  });

  it("returns ok: false with status and preview on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 503 }))
    );
    const client = new WbClient({ getToken: () => "token" });
    const result = await client.ping();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.bodyTextPreview).toBe("nope");
  });
});

describe("WbClient fetch + 429", () => {
  const okCardsBody = {
    data: {
      cards: [] as unknown[],
      cursor: { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1, total: 0 },
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("retries on 429 with Retry-After then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 429,
          headers: { "Retry-After": "0" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(okCardsBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new WbClient({ getToken: () => "token" });
    const p = client.fetchCardsPage({ limit: 10 });
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.cards).toEqual([]);
    expect(result.cursor?.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("parse: cursor with updatedAt/nmID but no total does not set total (no false stop on pagination rule)", async () => {
    const body = {
      data: {
        cards: Array.from({ length: 3 }, (_, i) => i),
        cursor: { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 42 },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new WbClient({ getToken: () => "token" });
    const result = await client.fetchCardsPage({ limit: 10 });
    expect(result.cursor).toEqual({
      updatedAt: "2020-01-01T00:00:00.000Z",
      nmID: 42,
    });
    expect(result.cursor?.total).toBeUndefined();
  });

  it("throws after 429 retries are exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", { status: 429, headers: { "Retry-After": "0" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new WbClient({ getToken: () => "token" });
    const p = client.fetchCardsPage({ limit: 10 });
    const expectReject = expect(p).rejects.toThrow(WbClientError);
    await vi.runAllTimersAsync();
    await expectReject;
    expect(fetchMock.mock.calls.length).toBe(5);
  });

  it("429 without Retry-After uses exponential backoff delay then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(okCardsBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new WbClient({ getToken: () => "token" });
    const p = client.fetchCardsPage({ limit: 10 });
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.cards).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("iterWbCardsByPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches multiple pages and passes next cursor until shouldStop", async () => {
    const page1 = {
      data: {
        cards: Array.from({ length: 100 }, (_, i) => i),
        cursor: {
          updatedAt: "2020-01-01T00:00:00.000Z",
          nmID: 100,
          total: 100,
        },
      },
    };
    const page2 = {
      data: {
        cards: [1],
        cursor: {
          updatedAt: "2020-01-02T00:00:00.000Z",
          nmID: 200,
          total: 1,
        },
      },
    };

    const fetchMock = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) => {
        const n = fetchMock.mock.calls.length;
        if (n === 1) {
          expect(init?.method).toBe("POST");
          const body = JSON.parse(String(init?.body ?? "{}")) as {
            settings: { cursor: Record<string, unknown> };
          };
          expect(body.settings.cursor.limit).toBe(100);
          expect(body.settings.cursor.updatedAt).toBeUndefined();
          expect(body.settings.cursor.nmID).toBeUndefined();
          return new Response(JSON.stringify(page1), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          settings: { cursor: Record<string, unknown> };
        };
        expect(body.settings.cursor).toMatchObject({
          limit: 100,
          updatedAt: "2020-01-01T00:00:00.000Z",
          nmID: 100,
        });
        return new Response(JSON.stringify(page2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { WbClient: FreshWbClient, iterWbCardsByPage: freshIter } =
      await import("@/lib/wb/client");

    const client = new FreshWbClient({ getToken: () => "token" });
    type Page = Awaited<ReturnType<FreshWbClient["fetchCardsPage"]>>;
    const pages: Page[] = [];
    for await (const page of freshIter(client, 100)) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0]?.cards).toHaveLength(100);
    expect(pages[1]?.cards).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
