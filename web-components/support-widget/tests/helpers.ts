import { vi } from "vitest";

type Reply = { status?: number; body?: unknown } | (() => never);

/**
 * Stub `fetch` with replies keyed by `/api/widget/<route>`. A route without a
 * reply answers 404. Returns the mock so tests can inspect the requests.
 */
export function stubFetch(replies: Record<string, Reply>) {
  const mock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = new URL(String(input), "https://page.test");
    const route = url.pathname.replace(/^\/api\/widget\//, "");
    const found = replies[route];
    if (typeof found === "function") found();
    const reply = found as { status?: number; body?: unknown } | undefined;
    const status = reply?.status ?? (reply ? 200 : 404);
    return new Response(JSON.stringify(reply?.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** The URL, parsed body and headers of the nth request to a route. */
export function requestTo(mock: ReturnType<typeof stubFetch>, route: string, nth = 0) {
  const call = mock.mock.calls.filter(([input]) => String(input).includes(`/api/widget/${route}`))[nth];
  if (!call) throw new Error(`no request #${nth} to ${route}`);
  const [input, init] = call;
  return {
    url: new URL(String(input)),
    init: init ?? {},
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    headers: new Headers(init?.headers),
  };
}
