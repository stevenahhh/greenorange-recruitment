# 배포 안내 (GreenOrange Lab 모집 페이지)

코드는 완성됐고, 아래 2단계는 실제 Google·GitHub 계정에서 직접 해야 합니다.
(에이전트가 계정에 접근하지 않았으므로 미연동 상태입니다.)

## 1. Google Sheets + Apps Script (약 10분)

1. Google Drive에서 새 스프레드시트 생성 (예: `GreenOrange 지원서`)
   - 시트는 비공개 유지. 첫 번째 시트만 사용합니다.
2. [script.google.com](https://script.google.com) → 새 프로젝트
   - `apps-script/Code.gs` 내용을 `Code.gs`에 복사
   - `apps-script/appsscript.json` 내용을 매니페스트에 복사
     (프로젝트 설정 → `appsscript.json` 표시 활성화)
   - 본 레포의 `Index.html` 추가 → `dist/apps-script/Index.html` 내용 붙여넣기
     (`bun scripts/build.mjs` 실행 후 생성됨)
3. 최초 1회 실행: `pepper_` 함수가 `PIN_PEPPER`를 자동 생성합니다.
   (스크립트 속성 `SPREADSHEET_ID`에 1단계 시트 ID 입력)
   - 시트 URL `.../d/<SPREADSHEET_ID>/edit` 에서 복사
4. 배포 → 새 배포 → 웹 앱
   - 실행: **나**, 액세스: **익명 사용자 포함**
   - 발급된 `/exec` URL 복사
5. 테스트: 시트에 행이 쌓이는지 1건 직접 신청해 확인

## 2. GitHub Pages (약 5분)

1. 새 레포에 `dist/pages/index.html` 업로드
   - 파일 안의 `__APPS_SCRIPT_URL__` 2곳을 1단계 `/exec` URL로 교체
2. Settings → Pages → Deploy from branch → `main` / root
3. 모집 공고의 `웹 페이지(링크)` 자리에 Pages URL 기입

## 보안 메모

- PIN은 서버 비밀값+행별 솔트 해시로만 저장, 원문은 시트·로그·응답 어디에도 없음
- PIN 5회 실패 시 15분 잠금. 존재하지 않는 학번 조회는 `exists:false`만 반환
- 응답 시트는 담당자만 공유. 마감 후 폼 배포를 내리면 접수 종료
- 학교 계정에서 '익명 웹 앱'이 막혀 있으면 개인 Gmail로 1단계를 진행
