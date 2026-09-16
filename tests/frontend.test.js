import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";

describe("모집 클라이언트 초기화", () => {
  test("DOM이 준비된 뒤 초기화하고 오래된 배포본에서도 부팅하지 못하지 않음", () => {
    const app = readFileSync("web/app.js", "utf8");
    expect(app).toContain('if (document.readyState === "loading")');
    expect(app).toContain('document.addEventListener("DOMContentLoaded", __greenorange_init)');
    expect(app).toContain("if (bootNote) bootNote.hidden = true;");
  });

  test("Apps Script 산출물은 외부 스크립트 태그를 남기지 않음", () => {
    const html = readFileSync("dist/apps-script/Index.html", "utf8");
    expect(html).not.toContain("<\\/script>");
    expect(html).not.toMatch(/<script\b[^>]*\bsrc=/);
  });
});
