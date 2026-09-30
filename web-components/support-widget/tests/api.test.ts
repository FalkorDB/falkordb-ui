import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configure,
  fetchSuggestions,
  fetchWidgetConfig,
  sendMessage,
  submitFeedback,
  submitSupport,
} from "../src/api";
import { requestTo, stubFetch } from "./helpers";

const API = "https://graphrag.test";

beforeEach(() => configure(`${API}/`, "docs"));
afterEach(() => sessionStorage.clear());

describe("sendMessage", () => {
  it("posts the question to the graph's query endpoint without cookies", async () => {
    const fetch = stubFetch({ query: { body: { answer: "Hi", has_context: true, query_id: "q1" } } });

    const res = await sendMessage("What is FalkorDB?", []);

    const req = requestTo(fetch, "query");
    expect(req.url.href).toBe(`${API}/api/widget/query?graph_id=docs`);
    expect(req.init.method).toBe("POST");
    expect(req.init.credentials).toBe("omit");
    expect(req.body).toMatchObject({ question: "What is FalkorDB?", return_context: false, history: [] });
    expect(res).toEqual({ answer: "Hi", has_context: true, query_id: "q1", sources: undefined });
  });

  it("sends only the last 10 history turns", async () => {
    const fetch = stubFetch({ query: { body: { answer: "ok" } } });
    const history = Array.from({ length: 14 }, (_, i) => ({ role: "user", content: String(i) }));

    await sendMessage("q", history);

    expect(requestTo(fetch, "query").body.history.map((m: { content: string }) => m.content)).toEqual(
      ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
    );
  });

  it("keeps one session id per tab", async () => {
    const fetch = stubFetch({ query: { body: { answer: "ok" } } });

    await sendMessage("one", []);
    await sendMessage("two", []);

    const first = requestTo(fetch, "query", 0).body.session_id;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestTo(fetch, "query", 1).body.session_id).toBe(first);
    expect(sessionStorage.getItem("fdb-widget-session")).toBe(first);
  });

  it("routes through the graph token header when one is configured", async () => {
    configure(API, "", "wgt_pk_secret");
    const fetch = stubFetch({ query: { body: { answer: "ok" } } });

    await sendMessage("q", []);

    const req = requestTo(fetch, "query");
    expect(req.headers.get("X-Widget-Token")).toBe("wgt_pk_secret");
    // The token is a credential: it never goes in the URL.
    expect(req.url.search).toBe("");
  });

  it("strips citation markers and a trailing SOURCES line", async () => {
    stubFetch({ query: { body: { answer: "Use MATCH [1, 2] for reads [3] .\nSOURCES: a.md, b.md", has_context: true } } });

    expect((await sendMessage("q", [])).answer).toBe("Use MATCH for reads.");
  });

  it("infers grounding from the answer only when the server leaves it out", async () => {
    stubFetch({ query: { body: { answer: "text" } } });
    expect((await sendMessage("q", [])).has_context).toBe(true);

    stubFetch({ query: { body: { answer: "text", has_context: false } } });
    expect((await sendMessage("q", [])).has_context).toBe(false);
  });

  it("accepts both source shapes and drops unsafe or malformed entries", async () => {
    stubFetch({
      query: {
        body: {
          answer: "a",
          sources: [
            "cypher/match.md",
            { name: "Indexes", url: "https://docs.falkordb.com/indexes" },
            { name: "Evil", url: "javascript:alert(1)" },
            { name: "   " },
            42,
          ],
        },
      },
    });

    expect((await sendMessage("q", [])).sources).toEqual([
      { name: "cypher/match.md", url: null },
      { name: "Indexes", url: "https://docs.falkordb.com/indexes" },
      { name: "Evil", url: null },
    ]);
  });

  it("throws when the server refuses the question", async () => {
    stubFetch({ query: { status: 403 } });

    await expect(sendMessage("q", [])).rejects.toThrow("Query API error: 403");
  });
});

describe("fetchSuggestions", () => {
  it("fills in missing fields", async () => {
    stubFetch({ suggestions: { body: { suggestions: [{ question: "How do I index?" }] } } });

    expect(await fetchSuggestions()).toEqual([
      { title: "How do I index?", question: "How do I index?", category: "overview" },
    ]);
  });

  it("returns no suggestions when the request fails", async () => {
    stubFetch({ suggestions: { status: 403 } });
    expect(await fetchSuggestions()).toEqual([]);

    stubFetch({ suggestions: () => { throw new TypeError("offline"); } });
    expect(await fetchSuggestions()).toEqual([]);
  });
});

describe("fetchWidgetConfig", () => {
  it("returns the server branding", async () => {
    stubFetch({ config: { body: { graph: "docs", title: "Docs" } } });
    expect(await fetchWidgetConfig()).toEqual({ graph: "docs", title: "Docs" });
  });

  it("returns null without an API base or when the graph is unknown", async () => {
    stubFetch({ config: { status: 404 } });
    expect(await fetchWidgetConfig()).toBeNull();

    configure("", "docs");
    expect(await fetchWidgetConfig()).toBeNull();
  });
});

describe("submitFeedback", () => {
  it("records the rating against the query", async () => {
    const fetch = stubFetch({ feedback: { status: 202 } });

    expect(await submitFeedback("q1", "like")).toBe(true);
    expect(requestTo(fetch, "feedback").body).toMatchObject({ query_id: "q1", value: "like" });
  });

  it("never throws", async () => {
    stubFetch({ feedback: () => { throw new TypeError("offline"); } });
    expect(await submitFeedback("q1", "dislike")).toBe(false);
  });
});

describe("submitSupport", () => {
  it("sends the form with a trimmed transcript", async () => {
    const fetch = stubFetch({ support: { status: 202 } });
    const history = Array.from({ length: 25 }, (_, i) => ({ role: "user", content: `${i}`.padEnd(1500, "x") }));

    const ok = await submitSupport({ name: "Ada", email: "ada@example.com", message: "Help", history });

    expect(ok).toBe(true);
    const { body } = requestTo(fetch, "support");
    expect(body).toMatchObject({ name: "Ada", email: "ada@example.com", message: "Help" });
    expect(body.history).toHaveLength(20);
    expect(body.history[0].content).toHaveLength(1000);
    expect(body.history[0].content.startsWith("5")).toBe(true);
  });

  it("reports a failed request", async () => {
    stubFetch({ support: { status: 500 } });
    expect(await submitSupport({ name: "a", email: "a@b.co", message: "m", history: [] })).toBe(false);
  });
});
