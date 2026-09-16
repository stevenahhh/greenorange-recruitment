import { describe, test, expect, beforeEach } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";

function fakeServices() {
  const rows = [["studentId", "name", "department", "year", "phone", "interests", "experience", "consent", "pinSalt", "pinHash", "failCount", "lockUntil", "updatedAt"]];
  const props = { PIN_PEPPER: "test-pepper-do-not-use" }; // SPREADSHEET_ID intentionally absent: every test covers auto-provision
  const sheet = {
    getDataRange() { return { getValues: () => rows.map(r => [...r]) }; },
    getRange(r, c, nr, nc) {
      return {
        setValues(vals) {
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j];
        },
      };
    },
    appendRow(row) { rows.push([...row]); },
    deleteRow(n) { rows.splice(n - 1, 1); },
  };
  const sandbox = {
    SpreadsheetApp: {
      openById() { return { getSheets: () => [sheet] }; },
      create() { return { getId: () => "test-sheet" }; },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty: k => props[k] ?? null,
          setProperty: (k, v) => { props[k] = v; },
        };
      },
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      computeDigest(_alg, text) {
        const buf = createHash("sha256").update(String(text), "utf8").digest();
        return [...buf].map(b => (b > 127 ? b - 256 : b));
      },
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: "ALLOWALL" },
      createHtmlOutputFromFile() { return { setTitle() { return this; }, setXFrameOptionsMode() { return this; } }; },
    },
    Math,
    Date,
  };
  runInNewContext(readFileSync("apps-script/Code.gs", "utf8"), sandbox);
  return { backend: sandbox.dispatch, rows, props };
}

let backend;
let rows;
beforeEach(() => ({ backend, rows } = fakeServices()) && void (backend = backend, rows = rows));

const data = () => ({
  name: "홍길동",
  department: "컴퓨터공학과",
  year: "2",
  phone: "010-1234-5678",
  interests: "생성 모델의 평가 방법을 연구하고 싶습니다.",
  experience: "파이썬 수업 수강",
  consent: true,
});

describe("모집 백엔드", () => {
  test("없는 학번 조회는 exists:false", () => {
    expect(backend({ action: "lookup", studentId: "00123456" })).toEqual({ ok: true, exists: false });
  });

  test("신규 신청은 앞자리 0을 보존하고 자격정보를 노출하지 않음", () => {
    const res = backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    expect(res.ok).toBe(true);
    expect(res.application.studentId).toBe("00123456");
    expect(JSON.stringify(res)).not.toContain("0042");
    expect(String(rows[1][0])).toBe("00123456");
    expect(rows.flat().map(String).some(v => v === "0042")).toBe(false);
  });

  test("중복 학번 신청 거부", () => {
    backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    const res = backend({ action: "create", studentId: "00123456", pin: "9999", data: data() });
    expect(res).toEqual({ ok: false, error: { code: "ALREADY_EXISTS", message: expect.any(String) } });
  });

  test("잘못된 PIN으로 조회·수정·삭제 불가, 원본 유지", () => {
    backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    expect(backend({ action: "read", studentId: "00123456", pin: "0000" }).ok).toBe(false);
    expect(backend({ action: "update", studentId: "00123456", pin: "0000", data: data() }).ok).toBe(false);
    expect(backend({ action: "delete", studentId: "00123456", pin: "0000" }).ok).toBe(false);
    const res = backend({ action: "read", studentId: "00123456", pin: "0042" });
    expect(res.application.interests).toContain("생성 모델");
  });

  test("5회 실패 후 15분 잠금", () => {
    backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    for (let i = 0; i < 5; i++) backend({ action: "read", studentId: "00123456", pin: "0000" });
    const res = backend({ action: "read", studentId: "00123456", pin: "0042" });
    expect(res).toEqual({ ok: false, error: { code: "RATE_LIMITED", message: expect.any(String) } });
  });

  test("수정 후 같은 PIN으로 조회됨", () => {
    backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    const next = { ...data(), interests: "의료 영상 분할을 연구하고 싶습니다." };
    expect(backend({ action: "update", studentId: "00123456", pin: "0042", data: next }).application.interests).toContain("의료 영상");
  });

  test("삭제 후 조회 불가", () => {
    backend({ action: "create", studentId: "00123456", pin: "0042", data: data() });
    expect(backend({ action: "delete", studentId: "00123456", pin: "0042" })).toEqual({ ok: true, deleted: true });
    expect(backend({ action: "lookup", studentId: "00123456" })).toEqual({ ok: true, exists: false });
  });

  test("SPREADSHEET_ID가 없으면 시트를 자동 생성하고 저장", () => {
    const fresh = fakeServices();
    expect(fresh.props.SPREADSHEET_ID).toBeUndefined();
    expect(fresh.backend({ action: "lookup", studentId: "00123456" })).toEqual({ ok: true, exists: false });
    expect(fresh.props.SPREADSHEET_ID).toBe("test-sheet");
  });

  test("수식 주입 방지와 동의·형식 검증", () => {
    const evil = { ...data(), name: "=cmd|'/c calc'!A0", consent: true };
    backend({ action: "create", studentId: "1007", pin: "1234", data: evil });
    expect(String(rows[1][1]).startsWith("'")).toBe(true);
    expect(backend({ action: "create", studentId: "1008", pin: "1234", data: { ...data(), consent: false } }).ok).toBe(false);
    expect(backend({ action: "create", studentId: "1009", pin: "1234", data: { ...data(), phone: "000" } }).ok).toBe(false);
    expect(backend({ action: "create", studentId: "1010", pin: "12ab", data: data() }).ok).toBe(false);
  });
});
