(() => {
  const byId = (id) => document.getElementById(id);
  let studentId = "";
  let pin = "";
  let editing = false;
  let busy = false;
  const feedback = byId("feedback");
  const form = byId("application-form");
  const fieldNames = ["name", "department", "phone", "interests", "experience"];

  function message(text, error = false) {
    feedback.textContent = text;
    feedback.className = error ? "notice error" : "notice";
    feedback.hidden = !text;
  }

  function show(step, label, focus) {
    for (const name of ["lookup", "auth", "application", "success"]) {
      byId(`${name}-step`).hidden = name !== step;
    }
    byId("step-label").textContent = label;
    document.querySelectorAll(".current-id").forEach(el => { el.textContent = studentId; });
    if (focus) byId(focus).focus();
  }

  async function request(payload) {
    if (busy) return null;
    busy = true;
    message("");
    const fieldsets = [...document.querySelectorAll("form > fieldset")];
    const buttons = [...document.querySelectorAll("button")];
    fieldsets.forEach(el => { el.disabled = true; });
    buttons.forEach(el => { el.disabled = true; });
    byId("step-label").setAttribute("aria-busy", "true");
    try {
      const result = await window.recruitmentApi(payload);
      if (!result.ok) {
        message(result.error.message, true);
        return null;
      }
      return result;
    } catch {
      message("서버에 연결하지 못했습니다. 입력 내용은 유지됩니다. 저장 여부가 불확실하면 학번으로 다시 확인해 주세요.", true);
      return null;
    } finally {
      busy = false;
      fieldsets.forEach(el => { el.disabled = false; });
      buttons.forEach(el => { el.disabled = false; });
      byId("step-label").removeAttribute("aria-busy");
    }
  }

  function reset() {
    studentId = ""; pin = ""; editing = false;
    document.querySelectorAll("form").forEach(el => el.reset());
    byId("confirm-pin").setCustomValidity("");
    message("");
    show("lookup", "01 / 학번 확인", "student-id");
  }

  function application(data) {
    form.reset();
    for (const name of fieldNames) byId(name).value = data?.[name] ?? "";
    if (data) {
      form.elements.namedItem("year").value = data.year;
      byId("consent").checked = data.consent === true;
    }
    byId("new-pin-fields").hidden = editing;
    for (const id of ["new-pin", "confirm-pin"]) {
      byId(id).required = !editing;
      byId(id).disabled = editing;
    }
    byId("confirm-pin").setCustomValidity("");
    byId("delete-button").hidden = !editing;
    byId("application-title").textContent = editing ? "신청서를 수정하세요" : "지원서를 작성해 주세요";
    byId("save-button").textContent = editing ? "수정 내용 저장" : "신청서 제출";
    show("application", editing ? "02 / 신청서 수정" : "02 / 신청서 작성", "name");
  }

  function success(deleted = false) {
    pin = "";
    form.reset();
    byId("existing-pin").value = "";
    byId("success-title").textContent = deleted ? "신청서를 삭제했습니다" : "신청서를 저장했습니다";
    byId("success-detail").textContent = deleted
      ? "저장된 신청 정보가 삭제되었습니다. 다시 참여하려면 처음부터 신청해 주세요."
      : "학번과 비밀번호로 다시 접속하면 신청서를 확인·수정·삭제할 수 있습니다.";
    show("success", "완료", "success-title");
  }

  byId("success-title").tabIndex = -1;
  byId("lookup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const requestedId = byId("student-id").value.trim();
    const result = await request({ action: "lookup", studentId: requestedId });
    if (!result) return;
    studentId = requestedId;
    editing = result.exists;
    if (editing) show("auth", "02 / 비밀번호 확인", "existing-pin");
    else application();
  });

  byId("auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const suppliedPin = byId("existing-pin").value;
    const result = await request({ action: "read", studentId, pin: suppliedPin });
    byId("existing-pin").value = "";
    if (!result) { byId("existing-pin").focus(); return; }
    pin = suppliedPin;
    application(result.application);
  });

  for (const id of ["new-pin", "confirm-pin"]) {
    byId(id).addEventListener("input", () => {
      byId("confirm-pin").setCustomValidity(
        byId("confirm-pin").value && byId("new-pin").value !== byId("confirm-pin").value
          ? "비밀번호가 일치하지 않습니다." : ""
      );
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(fieldNames.map(name => [name, byId(name).value.trim()]));
    data.year = form.elements.namedItem("year").value;
    data.consent = byId("consent").checked;
    const result = await request({
      action: editing ? "update" : "create", studentId,
      pin: editing ? pin : byId("new-pin").value, data,
    });
    if (result) success();
  });

  document.querySelectorAll(".restart").forEach(button => button.addEventListener("click", () => {
    if (!form.closest("#application-step").hidden &&
      !window.confirm("저장하지 않은 변경 내용은 사라집니다. 나갈까요?")) return;
    reset();
  }));
  byId("delete-button").addEventListener("click", () => byId("delete-dialog").showModal());
  byId("cancel-delete").addEventListener("click", () => byId("delete-dialog").close());
  byId("confirm-delete").addEventListener("click", async () => {
    byId("delete-dialog").close();
    const result = await request({ action: "delete", studentId, pin });
    if (result) success(true);
  });
})();
