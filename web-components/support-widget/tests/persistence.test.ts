import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearConversationStorage,
  conversationStorageKeys,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  shouldClearOnMount,
} from "../src/persistence";

afterEach(() => sessionStorage.clear());

describe("conversationStorageKeys", () => {
  it("keeps the legacy key shape for predefined graphs", () => {
    expect(conversationStorageKeys("docs")).toEqual({
      history: "fdb-widget-history:docs",
      messages: "fdb-widget-messages:docs",
    });
  });

  it("keeps graphs that differ only in punctuation apart", () => {
    expect(conversationStorageKeys("foo.bar").history).not.toBe(conversationStorageKeys("foo:bar").history);
  });

  it("scopes user-owned graphs by token", () => {
    expect(conversationStorageKeys("g", "t1").history).not.toBe(conversationStorageKeys("g", "t2").history);
  });
});

describe("safe storage", () => {
  it("round-trips and clears a conversation", () => {
    const { history, messages } = conversationStorageKeys("docs");
    safeSetItem(history, "[1]");
    safeSetItem(messages, "[2]");
    expect(safeGetItem(history)).toBe("[1]");

    clearConversationStorage("docs");

    expect(safeGetItem(history)).toBeNull();
    expect(safeGetItem(messages)).toBeNull();
  });

  it("swallows storage that throws", () => {
    const denied = () => { throw new DOMException("denied", "SecurityError"); };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(denied);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(denied);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(denied);

    expect(safeGetItem("k")).toBeNull();
    expect(() => safeSetItem("k", "v")).not.toThrow();
    expect(() => safeRemoveItem("k")).not.toThrow();
  });
});

describe("shouldClearOnMount", () => {
  it("clears on a reload only", () => {
    const entries = vi.spyOn(performance, "getEntriesByType");

    entries.mockReturnValue([{ type: "reload" }] as unknown as PerformanceEntryList);
    expect(shouldClearOnMount()).toBe(true);

    entries.mockReturnValue([{ type: "navigate" }] as unknown as PerformanceEntryList);
    expect(shouldClearOnMount()).toBe(false);
  });
});
