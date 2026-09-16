var HEADER = ["studentId", "name", "department", "year", "phone", "interests", "experience", "consent", "pinSalt", "pinHash", "failCount", "lockUntil", "updatedAt"];
var MAX_FAILS = 5;
var LOCK_MS = 15 * 60 * 1000;

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("AI 공동연구 지원 | GreenOrange Lab")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function dispatch(request) {
  try {
    if (!request || typeof request !== "object") return err("INVALID_REQUEST", "요청 형식이 올바르지 않습니다.");
    var action = request.action;
    if (action === "lookup") return lookup_(request);
    if (action === "create") return create_(request);
    if (action === "read") return read_(request);
    if (action === "update") return update_(request);
    if (action === "delete") return remove_(request);
    return err("INVALID_REQUEST", "지원하지 않는 요청입니다.");
  } catch (e) {
    return err("INTERNAL", "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function lookup_(request) {
  var id = checkStudentId_(request.studentId);
  if (!id.ok) return id.res;
  var sheet = sheet_();
  if (!sheet.ok) return sheet.res;
  return ok({ exists: findRow_(sheet.sheet, id.value) >= 0 });
}

function create_(request) {
  var id = checkStudentId_(request.studentId);
  if (!id.ok) return id.res;
  var pin = checkPin_(request.pin);
  if (!pin.ok) return pin.res;
  var data = checkData_(request.data);
  if (!data.ok) return data.res;
  var sheet = sheet_();
  if (!sheet.ok) return sheet.res;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (findRow_(sheet.sheet, id.value) >= 0) return err("ALREADY_EXISTS", "이미 신청서가 있습니다. 비밀번호로 확인해 주세요.");
    var salt = salt_();
    sheet.sheet.appendRow([
      sheetText_(id.value),
      sheetText_(data.value.name),
      sheetText_(data.value.department),
      data.value.year,
      sheetText_(data.value.phone),
      sheetText_(data.value.interests),
      sheetText_(data.value.experience || ""),
      data.value.consent ? "TRUE" : "FALSE",
      salt,
      hash_(pin.value, salt),
      0,
      0,
      new Date().toISOString()
    ]);
  } finally {
    lock.releaseLock();
  }
  return ok({ application: public_(id.value, data.value) });
}

function read_(request) {
  var auth = auth_(request);
  if (!auth.ok) return auth.res;
  return ok({ application: auth.application });
}

function update_(request) {
  var data = checkData_(request.data);
  if (!data.ok) return data.res;
  var auth = auth_(request);
  if (!auth.ok) return auth.res;
  var sheet = sheet_();
  if (!sheet.ok) return sheet.res;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var row = findRow_(sheet.sheet, auth.id);
    if (row < 0) return err("NOT_FOUND", "신청서를 찾을 수 없습니다.");
    var values = sheet.sheet.getDataRange().getValues();
    var line = values[row];
    line[1] = sheetText_(data.value.name);
    line[2] = sheetText_(data.value.department);
    line[3] = data.value.year;
    line[4] = sheetText_(data.value.phone);
    line[5] = sheetText_(data.value.interests);
    line[6] = sheetText_(data.value.experience || "");
    line[7] = data.value.consent ? "TRUE" : "FALSE";
    line[10] = 0;
    line[11] = 0;
    line[12] = new Date().toISOString();
    sheet.sheet.getRange(row + 1, 1, 1, HEADER.length).setValues([line]);
    resetAttempts_(sheet.sheet, row);
  } finally {
    lock.releaseLock();
  }
  return ok({ application: public_(auth.id, data.value) });
}

function remove_(request) {
  var id = checkStudentId_(request.studentId);
  if (!id.ok) return id.res;
  var pin = checkPin_(request.pin);
  if (!pin.ok) return pin.res;
  var sheet = sheet_();
  if (!sheet.ok) return sheet.res;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var row = findRow_(sheet.sheet, id.value);
    if (row < 0) return err("NOT_FOUND", "신청서를 찾을 수 없습니다.");
    var gate = gate_(sheet.sheet, row);
    if (!gate.ok) return gate.res;
    if (hash_(pin.value, gate.salt) !== gate.hash) {
      noteFail_(sheet.sheet, row, gate.fails + 1);
      return err("INVALID_CREDENTIALS", "학번 또는 비밀번호를 확인해 주세요.");
    }
    resetAttempts_(sheet.sheet, row);
    sheet.sheet.deleteRow(row + 1);
  } finally {
    lock.releaseLock();
  }
  return ok({ deleted: true });
}

function auth_(request) {
  var id = checkStudentId_(request.studentId);
  if (!id.ok) return id;
  var pin = checkPin_(request.pin);
  if (!pin.ok) return pin;
  var sheet = sheet_();
  if (!sheet.ok) return sheet;
  var row = findRow_(sheet.sheet, id.value);
  if (row < 0) return { ok: false, res: err("INVALID_CREDENTIALS", "학번 또는 비밀번호를 확인해 주세요.") };
  var gate = gate_(sheet.sheet, row);
  if (!gate.ok) return { ok: false, res: gate.res };
  if (hash_(pin.value, gate.salt) !== gate.hash) {
    noteFail_(sheet.sheet, row, gate.fails + 1);
    return { ok: false, res: err("INVALID_CREDENTIALS", "학번 또는 비밀번호를 확인해 주세요.") };
  }
  resetAttempts_(sheet.sheet, row);
  var values = sheet.sheet.getDataRange().getValues();
  var line = values[row];
  return {
    ok: true,
    id: id.value,
    application: {
      studentId: String(line[0]),
      name: String(line[1]),
      department: String(line[2]),
      year: String(line[3]),
      phone: String(line[4]),
      interests: String(line[5]),
      experience: String(line[6] || ""),
      consent: String(line[7]).toUpperCase() === "TRUE"
    }
  };
}

function gate_(sheet, row) {
  var values = sheet.getDataRange().getValues();
  var line = values[row];
  var fails = Number(line[10]) || 0;
  var locked = Number(line[11]) || 0;
  if (locked && locked > Date.now()) return { ok: false, res: err("RATE_LIMITED", "비밀번호를 여러 번 틀렸습니다. 15분 후 다시 시도해 주세요.") };
  return { ok: true, salt: String(line[8]), hash: String(line[9]), fails: fails };
}

function noteFail_(sheet, row, fails) {
  var locked = fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0;
  sheet.getRange(row + 1, 11, 1, 2).setValues([[fails >= MAX_FAILS ? MAX_FAILS : fails, locked]]);
}

function resetAttempts_(sheet, row) {
  sheet.getRange(row + 1, 11, 1, 2).setValues([[0, 0]]);
}

function findRow_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) return i;
  }
  return -1;
}

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) return { ok: false, res: err("SHEET_NOT_CONFIGURED", "저장소가 아직 연결되지 않았습니다. 담당자에게 문의해 주세요.") };
  var book = SpreadsheetApp.openById(spreadsheetId);
  var sheet = book.getSheets()[0];
  ensureHeader_(sheet);
  return { ok: true, sheet: sheet };
}

function ensureHeader_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    return;
  }
  if (String(values[0][0]) !== HEADER[0]) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
}

function pepper_() {
  var props = PropertiesService.getScriptProperties();
  var pepper = props.getProperty("PIN_PEPPER");
  if (!pepper) {
    var bytes = [];
    for (var i = 0; i < 32; i++) bytes.push(Math.floor(Math.random() * 256).toString(16));
    pepper = bytes.join("");
    props.setProperty("PIN_PEPPER", pepper);
  }
  return pepper;
}

function salt_() {
  var bytes = [];
  for (var i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256).toString(16));
  return bytes.join("");
}

function hash_(pin, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pepper_() + "|" + salt + "|" + pin);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var v = raw[i] < 0 ? raw[i] + 256 : raw[i];
    out.push(("0" + v.toString(16)).slice(-2));
  }
  return out.join("");
}

function checkStudentId_(value) {
  if (typeof value !== "string" || !/^[0-9]{4,20}$/.test(value)) {
    return { ok: false, res: err("INVALID_REQUEST", "학번은 숫자 4~20자리로 입력해 주세요.") };
  }
  return { ok: true, value: value };
}

function checkPin_(value) {
  if (typeof value !== "string" || !/^[0-9]{4}$/.test(value)) {
    return { ok: false, res: err("INVALID_REQUEST", "비밀번호는 숫자 4자리로 입력해 주세요.") };
  }
  return { ok: true, value: value };
}

function checkData_(data) {
  if (!data || typeof data !== "object") return { ok: false, res: err("INVALID_REQUEST", "신청서 내용이 올바르지 않습니다.") };
  var name = String(data.name || "").trim();
  var department = String(data.department || "").trim();
  var phone = String(data.phone || "").trim();
  var interests = String(data.interests || "").trim();
  var experience = data.experience == null ? "" : String(data.experience).trim();
  if (!name || name.length > 40) return { ok: false, res: err("INVALID_REQUEST", "이름을 확인해 주세요.") };
  if (!department || department.length > 80) return { ok: false, res: err("INVALID_REQUEST", "학과(전공)를 확인해 주세요.") };
  if (data.year !== "2" && data.year !== "3") return { ok: false, res: err("INVALID_REQUEST", "학년은 2 또는 3학년으로 선택해 주세요.") };
  if (!/^01[016789]-?[0-9]{3,4}-?[0-9]{4}$/.test(phone)) return { ok: false, res: err("INVALID_REQUEST", "휴대전화 번호를 확인해 주세요.") };
  if (!interests || interests.length > 2000) return { ok: false, res: err("INVALID_REQUEST", "관심 분야를 확인해 주세요.") };
  if (experience.length > 3000) return { ok: false, res: err("INVALID_REQUEST", "경험 내용이 너무 깁니다.") };
  if (data.consent !== true) return { ok: false, res: err("INVALID_REQUEST", "회의 참여와 학회 안내에 동의해야 신청할 수 있습니다.") };
  return { ok: true, value: { name: name, department: department, year: data.year, phone: phone, interests: interests, experience: experience, consent: true } };
}

function public_(studentId, data) {
  return {
    studentId: studentId,
    name: data.name,
    department: data.department,
    year: data.year,
    phone: data.phone,
    interests: data.interests,
    experience: data.experience || "",
    consent: true
  };
}

function sheetText_(value) {
  var text = String(value == null ? "" : value);
  if (/^[=+\-@\t\r]/.test(text)) return "'" + text;
  return text;
}

function ok(data) {
  data.ok = true;
  return data;
}

function err(code, message) {
  return { ok: false, error: { code: code, message: message } };
}
