import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mount } from "../src/index";
import { requestTo, stubFetch } from "./helpers";

const API = "https://graphrag.test";

beforeAll(() => {
  // jsdom has no layout; the chat scrolls its latest message into view.
  Element.prototype.scrollIntoView = () => {};
});

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  sessionStorage.clear();
});

const root = () => document.getElementById("fdb-widget-root")?.shadowRoot ?? null;
const $ = <T extends Element = HTMLElement>(selector: string) => root()?.querySelector<T>(selector) ?? null;
const byText = (selector: string, text: string) =>
  [...(root()?.querySelectorAll<HTMLElement>(selector) ?? [])].find(el => el.textContent?.includes(text));

function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Preact re-renders asynchronously; let it catch up with typed values before
// submitting, as it would between a user's keystrokes and click.
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

async function submitSupportForm() {
  await settle();
  $<HTMLFormElement>(".fdb-support__form")!.dispatchEvent(new Event("submit", { cancelable: true }));
}

async function openWidget() {
  $<HTMLButtonElement>(".fdb-fab")!.click();
  await vi.waitFor(() => expect($('[role="dialog"]')).not.toBeNull());
}

async function ask(question: string) {
  type($<HTMLInputElement>(".fdb-input--chat")!, question);
  await vi.waitFor(() => expect($<HTMLButtonElement>(".fdb-btn--send")!.disabled).toBe(false));
  $<HTMLButtonElement>(".fdb-btn--send")!.click();
}

describe("mount", () => {
  it("renders the floating button in its own shadow root", async () => {
    stubFetch({});
    unmount = mount({ api: API, graph: "docs" });

    expect(root()).not.toBeNull();
    expect(root()!.querySelector("style")?.textContent).toContain(".fdb-widget");
    expect($(".fdb-fab")?.getAttribute("aria-label")).toBe("Open messaging window");
    expect(window.FalkorDBChat?.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("removes itself on unmount", () => {
    stubFetch({});
    mount({ api: API })();

    expect(document.getElementById("fdb-widget-root")).toBeNull();
  });

  it("mounts a single widget when mounted twice", () => {
    stubFetch({});
    mount({ api: API });
    unmount = mount({ api: API });

    expect(document.querySelectorAll("#fdb-widget-root")).toHaveLength(1);
    expect(root()!.querySelectorAll(".fdb-fab")).toHaveLength(1);
  });

  it("adopts server branding for options the embedder left unset", async () => {
    stubFetch({ config: { body: { graph: "docs", display_name: "Docs Bot", accent: "#112233", position: "bottom-left" } } });
    unmount = mount({ api: API, graph: "docs" });

    await vi.waitFor(() => expect($(".fdb-widget--bottom-left")).not.toBeNull());
    expect($<HTMLElement>(".fdb-widget")!.style.getPropertyValue("--fdb-accent")).toBe("#112233");
    await openWidget();
    expect($(".fdb-panel__title")?.textContent).toBe("Docs Bot");
  });

  it("lets explicit options win over the server and ignores unsafe server values", async () => {
    stubFetch({ config: { body: { graph: "docs", title: "Server title", accent: "red;background:url(x)", description: "From server" } } });
    unmount = mount({ api: API, graph: "docs", title: "Mine" });

    await openWidget();
    await vi.waitFor(() => expect($(".fdb-panel__description")?.textContent).toBe("From server"));
    expect($(".fdb-panel__title")?.textContent).toBe("Mine");
    expect($<HTMLElement>(".fdb-widget")!.style.getPropertyValue("--fdb-accent")).toBe("#7466FF");
  });
});

describe("widget", () => {
  it("opens, closes on Escape and returns focus to the button", async () => {
    stubFetch({});
    unmount = mount({ api: API, graph: "docs", suggestions: false });

    await openWidget();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    await vi.waitFor(() => expect($('[role="dialog"]')).toBeNull());
    await vi.waitFor(() => expect(root()!.activeElement).toBe($(".fdb-fab")));
  });

  it("shows starter questions and hides them once a question is asked", async () => {
    stubFetch({
      suggestions: { body: { suggestions: [{ title: "Indexes", question: "How do I create an index?" }] } },
      query: { body: { answer: "Use CREATE INDEX.", has_context: true } },
    });
    unmount = mount({ api: API, graph: "docs" });
    await openWidget();

    await vi.waitFor(() => expect(byText(".fdb-suggestion-card", "Indexes")).toBeDefined());
    byText(".fdb-suggestion-card", "Indexes")!.click();

    await vi.waitFor(() => expect(byText(".fdb-bubble--assistant", "Use CREATE INDEX.")).toBeDefined());
    expect($(".fdb-suggestion-card")).toBeNull();
  });

  it("answers a question and records feedback once", async () => {
    const fetch = stubFetch({
      query: { body: { answer: "**MATCH** reads the graph.", has_context: true, query_id: "q1" } },
      feedback: { status: 202 },
    });
    unmount = mount({ api: API, graph: "docs", suggestions: false });
    await openWidget();

    await ask("How do I read data?");

    await vi.waitFor(() => expect($(".fdb-markdown strong")?.textContent).toBe("MATCH"));
    expect(byText(".fdb-bubble--user", "How do I read data?")).toBeDefined();

    $<HTMLButtonElement>('[aria-label="Helpful"]')!.click();
    await vi.waitFor(() => expect(byText(".fdb-feedback__thanks", "Thanks!")).toBeDefined());
    $<HTMLButtonElement>('[aria-label="Not helpful"]')!.click();

    expect(requestTo(fetch, "feedback").body).toMatchObject({ query_id: "q1", value: "like" });
    expect(fetch.mock.calls.filter(([url]) => String(url).includes("feedback"))).toHaveLength(1);
  });

  it("offers support for an ungrounded answer, prefilled with the question", async () => {
    const fetch = stubFetch({
      query: { body: { answer: "Not covered.", has_context: false } },
      support: { status: 202 },
    });
    unmount = mount({ api: API, graph: "docs", suggestions: false });
    await openWidget();
    await ask("How much does it cost?");

    await vi.waitFor(() => expect(byText(".fdb-btn--inline", "Contact Support")).toBeDefined());
    byText(".fdb-btn--inline", "Contact Support")!.click();

    await vi.waitFor(() => expect($<HTMLTextAreaElement>("#fdb-message")?.value).toBe("How much does it cost?"));
    type($<HTMLInputElement>("#fdb-name")!, "Ada");
    type($<HTMLInputElement>("#fdb-email")!, "not-an-email");
    await submitSupportForm();
    await vi.waitFor(() => expect($('.fdb-input__error[role="alert"]')).not.toBeNull());
    expect(fetch.mock.calls.some(([url]) => String(url).includes("support"))).toBe(false);

    type($<HTMLInputElement>("#fdb-email")!, "ada@example.com");
    await submitSupportForm();

    await vi.waitFor(() => expect(byText(".fdb-support__success-title", "We'll be in touch!")).toBeDefined());
    const { body } = requestTo(fetch, "support");
    expect(body).toMatchObject({ name: "Ada", email: "ada@example.com", message: "How much does it cost?" });
    expect(body.history).toEqual([
      { role: "user", content: "How much does it cost?" },
      { role: "assistant", content: "Not covered." },
    ]);
  });

  it("tells the user when the support request fails", async () => {
    stubFetch({ support: { status: 500 } });
    unmount = mount({ api: API, graph: "docs", suggestions: false });
    await openWidget();
    byText(".fdb-btn--ghost", "Get Support")!.click();

    await vi.waitFor(() => expect($("#fdb-name")).not.toBeNull());
    type($<HTMLInputElement>("#fdb-name")!, "Ada");
    type($<HTMLInputElement>("#fdb-email")!, "ada@example.com");
    type($<HTMLTextAreaElement>("#fdb-message")!, "Help");
    await submitSupportForm();

    await vi.waitFor(() => expect(byText(".fdb-support__error", "support@falkordb.com")).toBeDefined());
  });

  it("shows an apology when the question fails", async () => {
    stubFetch({ query: { status: 429 } });
    unmount = mount({ api: API, graph: "docs", suggestions: false });
    await openWidget();
    await ask("anything");

    await vi.waitFor(() => expect(byText(".fdb-bubble--assistant", "Something went wrong")).toBeDefined());
  });

  it("hides support escalation for a user-owned graph", async () => {
    stubFetch({ query: { body: { answer: "Not covered.", has_context: false } } });
    unmount = mount({ api: API, token: "wgt_pk_x", title: "Acme", suggestions: false });
    await openWidget();
    await ask("q");

    await vi.waitFor(() => expect(byText(".fdb-bubble--assistant", "Not covered.")).toBeDefined());
    expect(byText(".fdb-btn--inline", "Contact Support")).toBeUndefined();
    expect(byText(".fdb-btn--ghost", "Get Support")).toBeUndefined();
    expect($(".fdb-panel__title")?.textContent).toBe("Acme AI Assistant");
  });
});

describe("ES module build", () => {
  it("does not mount itself when a bundler loads it from a <script> chunk", async () => {
    stubFetch({});
    const chunk = document.createElement("script");
    chunk.src = "https://app.test/_next/static/chunks/widget.js";
    vi.spyOn(document, "currentScript", "get").mockReturnValue(chunk);
    vi.resetModules();

    await import("../src/index");

    expect(document.getElementById("fdb-widget-root")).toBeNull();
  });
});
