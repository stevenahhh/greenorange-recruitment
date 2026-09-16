import { readFileSync, mkdirSync } from "node:fs";

// Local-only QA fixture: in-memory recruitmentApi with the same contract.
// NOT real storage. Drives UI states for screenshots only. ES5 style.
const fixture = [
  "window.recruitmentApi = (function () {",
  "  var store = {};",
  "  function ok(d) { d.ok = true; return d; }",
  "  function err(code, message) { return { ok: false, error: { code: code, message: message } }; }",
  "  function pub(id, d) { return { studentId: id, name: d.name, department: d.department, year: d.year, phone: d.phone, interests: d.interests, experience: d.experience || '', consent: true }; }",
  "  return function (req) {",
  "    if (req.action === 'lookup') return Promise.resolve(ok({ exists: !!store[req.studentId] }));",
  "    if (req.action === 'create') {",
  "      if (store[req.studentId]) return Promise.resolve(err('ALREADY_EXISTS', 'exists'));",
  "      store[req.studentId] = { data: req.data, pin: req.pin };",
  "      return Promise.resolve(ok({ application: pub(req.studentId, req.data) }));",
  "    }",
  "    var a = store[req.studentId];",
  "    if (!a || a.pin !== req.pin) return Promise.resolve(err('INVALID_CREDENTIALS', 'bad pin'));",
  "    if (req.action === 'read') return Promise.resolve(ok({ application: pub(req.studentId, a.data) }));",
  "    if (req.action === 'update') { a.data = req.data; return Promise.resolve(ok({ application: pub(req.studentId, a.data) })); }",
  "    if (req.action === 'delete') { delete store[req.studentId]; return Promise.resolve(ok({ deleted: true })); }",
  "    return Promise.resolve(err('INVALID_REQUEST', 'bad action'));",
  "  };",
  "})();"
].join("\n");

const css = readFileSync("web/styles.css", "utf8");
const app = readFileSync("web/app.js", "utf8");
const body = readFileSync("web/index.html", "utf8")
  .replace(/[\s\S]*<body[^>]*>/, "")
  .replace(/<\/body>[\s\S]*/, "")
  .replace(/<script src="transport\.js"><\/script>\s*<script src="app\.js"><\/script>/, "");
const page = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">"
  + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>QA</title><style>"
  + css + "</style></head><body>" + body
  + "<script>" + fixture + "\n" + app + "</scr" + "ipt></body></html>";

const server = Bun.serve({ port: 8471, fetch: () => new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } }) });
mkdirSync("evidence", { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function capture(width) {
  console.log("capture", width);
  const view = new Bun.WebView({ width, height: 900 });
  try {
    await view.navigate("http://127.0.0.1:8471/");
    await sleep(1200);
    const metrics = await view.evaluate("JSON.stringify({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })");
    console.log(width, "metrics", metrics);
    await Bun.write("evidence/lookup-" + width + ".png", await view.screenshot());
    // New application flow: unknown ID -> form
    await view.evaluate("(() => { document.getElementById('student-id').value = '00123456'; document.getElementById('lookup-form').requestSubmit(); })()");
    await sleep(800);
    const formState = await view.evaluate("JSON.stringify({ form: !document.getElementById('application-step').hidden, save: document.getElementById('save-button').textContent })");
    console.log(width, "after lookup", formState);
    await Bun.write("evidence/form-" + width + ".png", await view.screenshot());
    // Fill and submit
    await view.evaluate("(() => {" + [
      "document.getElementById('name').value = 'QA 지원자';",
      "document.getElementById('department').value = '컴퓨터공학과';",
      "document.querySelector('input[name=year][value=\"2\"]').checked = true;",
      "document.getElementById('phone').value = '010-1234-5678';",
      "document.getElementById('interests').value = '생성 모델 평가 방법 연구';",
      "document.getElementById('new-pin').value = '1234';",
      "document.getElementById('confirm-pin').value = '1234';",
      "document.getElementById('consent').checked = true;",
      "document.getElementById('application-form').requestSubmit();",
      ""
    ].join("\n") + "})()");
    await sleep(800);
    const doneState = await view.evaluate("JSON.stringify({ success: !document.getElementById('success-step').hidden, title: document.getElementById('success-title').textContent })");
    console.log(width, "after submit", doneState);
    await Bun.write("evidence/success-" + width + ".png", await view.screenshot());
  } finally {
    await view.close();
  }
}

for (const width of [375, 768, 1280]) await capture(width);
server.stop();
console.log("QA done");
