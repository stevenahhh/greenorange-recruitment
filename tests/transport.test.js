import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

describe("Apps Script transport", () => {
  test("resolves only after the real server success handler responds", async () => {
    let success;
    let received;
    const runner = {
      withSuccessHandler(fn) { success = fn; return this; },
      withFailureHandler() { return this; },
      dispatch(request) { received = request; },
    };
    const context = { window: {}, google: { script: { run: runner } } };
    runInNewContext(readFileSync("web/transport.js", "utf8"), context);
    const request = { action: "lookup", studentId: "00123456" };
    let settled = false;
    const response = context.window.recruitmentApi(request).then(value => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(received).toEqual(request);
    success({ ok: true, exists: false });
    expect(await response).toEqual({ ok: true, exists: false });
  });

  test("propagates server transport failure, not a fake save result", async () => {
    let failure;
    const runner = {
      withSuccessHandler() { return this; },
      withFailureHandler(fn) { failure = fn; return this; },
      dispatch() {},
    };
    const context = { window: {}, google: { script: { run: runner } } };
    runInNewContext(readFileSync("web/transport.js", "utf8"), context);
    const pending = context.window.recruitmentApi({ action: "delete" });
    failure(new Error("Unavailable"));
    await expect(pending).rejects.toThrow("Unavailable");
  });
});
