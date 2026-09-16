import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const web = p => readFileSync(`web/${p}`, "utf8").replace(/<\/(script|style)>/g, "<\\/$1>");

const css = web("styles.css");
const transport = web("transport.js");
const app = web("app.js");
const body = web("index.html")
  .replace(/[\s\S]*<body[^>]*>/, "")
  .replace(/<\/body>[\s\S]*/, "")
  .replace(/<script src="transport\.js"><\/script>\s*<script src="app\.js"><\/script>/, "");

// Apps Script HtmlService single-file app (Index.html)
const appsScript = `<base target="_top">
<style>${css}</style>
${body}
<script>${transport}\n${app}</script>`;

mkdirSync("dist/apps-script", { recursive: true });
writeFileSync("dist/apps-script/Index.html", appsScript);

// GitHub Pages thin shell: iframe embed + direct link fallback.
// Deploy URL is injected at deploy time: replace __APPS_SCRIPT_URL__.
const shell = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="GreenOrange Lab 학부 2·3학년 AI 공동연구 팀원 모집 및 지원서 작성">
<title>AI 공동연구 지원 | GreenOrange Lab</title>
<style>
html,body{margin:0;height:100%;background:#f6f5f0}
.wrap{max-width:1064px;margin:0 auto;padding:24px 16px}
iframe{width:100%;height:calc(100vh - 120px);min-height:640px;border:1px solid #d8ddd5;border-radius:12px;background:#fff}
p{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#5d675f}
a{color:#245c3b}
</style>
</head>
<body>
<div class="wrap">
<iframe src="__APPS_SCRIPT_URL__" title="GreenOrange Lab AI 공동연구 지원서"></iframe>
<p>화면이 보이지 않으면 <a href="__APPS_SCRIPT_URL__" target="_blank" rel="noopener">지원서 바로 열기</a></p>
</div>
</body>
</html>
`;

mkdirSync("dist/pages", { recursive: true });
writeFileSync("dist/pages/index.html", shell);
console.log("built dist/apps-script/Index.html and dist/pages/index.html");
