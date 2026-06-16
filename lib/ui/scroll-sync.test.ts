import { describe, expect, it } from "vitest";
import { syncedScrollTop } from "./scroll-sync";

describe("syncedScrollTop", () => {
  it("maps the source scroll progress onto the target", () => {
    expect(
      syncedScrollTop(
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 200 },
        { scrollTop: 0, scrollHeight: 2200, clientHeight: 200 }
      )
    ).toBe(1000);
  });

  it("clamps source positions outside the scroll range", () => {
    expect(
      syncedScrollTop(
        { scrollTop: 1200, scrollHeight: 1000, clientHeight: 200 },
        { scrollTop: 0, scrollHeight: 1200, clientHeight: 200 }
      )
    ).toBe(1000);
  });

  it("returns zero when either side cannot scroll", () => {
    expect(
      syncedScrollTop(
        { scrollTop: 0, scrollHeight: 200, clientHeight: 200 },
        { scrollTop: 0, scrollHeight: 1200, clientHeight: 200 }
      )
    ).toBe(0);
    expect(
      syncedScrollTop(
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 200 },
        { scrollTop: 0, scrollHeight: 200, clientHeight: 200 }
      )
    ).toBe(0);
  });
});
