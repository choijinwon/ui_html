function setActiveTab() {
  const current = document.body.dataset.page || "dashboard";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === current);
  });
}

function bindDemoForms() {
  document.querySelectorAll("form[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = form.querySelector("[data-form-message]");
      if (message) {
        message.textContent = form.dataset.demoForm === "edit"
          ? "수정 내용이 임시 저장되었습니다."
          : "등록 요청이 임시 저장되었습니다.";
      }
    });
  });
}

setActiveTab();
bindDemoForms();
