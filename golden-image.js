const STORE_KEY = "golden-image-static-crud-v2";

const defaults = {
  releases: [
    {
      id: "rel-1",
      image: "mlflow-pytorch-gpu",
      family: "PyTorch GPU",
      runtime: "cu124-py312",
      version: "2026.09.01",
      status: "stable",
      registry: "registry/golden/pytorch:2026.09.01"
    },
    {
      id: "rel-2",
      image: "mlflow-sklearn-cpu",
      family: "Scikit-learn CPU",
      runtime: "py312",
      version: "2026.08.28",
      status: "candidate",
      registry: "registry/golden/sklearn:2026.08.28"
    },
    {
      id: "rel-3",
      image: "mlflow-tensorflow-gpu",
      family: "TensorFlow GPU",
      runtime: "cu121-py311",
      version: "2026.08.20",
      status: "blocked",
      registry: "registry/golden/tensorflow:2026.08.20"
    }
  ],
  families: [
    {
      id: "fam-1",
      name: "PyTorch GPU",
      status: "active",
      description: "CUDA 기반 PyTorch 학습/서빙 Golden Image Family",
      variant: "cu124-py312",
      platform: "linux/amd64",
      stable: "3",
      support: "2027.12"
    },
    {
      id: "fam-2",
      name: "TensorFlow GPU",
      status: "review",
      description: "TensorFlow GPU 런타임과 MLflow 통합 Family",
      variant: "cu121-py311",
      platform: "linux/amd64",
      stable: "1",
      support: "2027.03"
    },
    {
      id: "fam-3",
      name: "Scikit-learn CPU",
      status: "active",
      description: "CPU 전용 Python ML 워크로드 Family",
      variant: "py312",
      platform: "linux/amd64",
      stable: "5",
      support: "2028.01"
    }
  ],
  components: [
    { id: "comp-1", stage: "G0", name: "ubi9-foundation", version: "9.4", status: "approved", owner: "platform-infra", source: "main@f021ab1" },
    { id: "comp-2", stage: "G1", name: "cuda-runtime", version: "12.4.1", status: "approved", owner: "gpu-platform", source: "main@91c3e28" },
    { id: "comp-3", stage: "G2", name: "python", version: "3.12", status: "approved", owner: "runtime", source: "main@33bc927" },
    { id: "comp-4", stage: "G3", name: "pytorch", version: "2.4.0", status: "candidate", owner: "ml-platform", source: "release@a57b0e1" },
    { id: "comp-5", stage: "G4", name: "mlflow", version: "2.16.0", status: "approved", owner: "ml-platform", source: "main@9c81a22" },
    { id: "comp-6", stage: "G5", name: "openvscode", version: "1.92.2", status: "draft", owner: "developer-platform", source: "feature@72f19d0" }
  ],
  matrix: [
    { id: "mat-1", framework: "pytorch 2.4", py311cu121: "supported", py312cu124: "supported", py313cu124: "review", py312cpu: "supported" },
    { id: "mat-2", framework: "tensorflow 2.16", py311cu121: "supported", py312cu124: "review", py313cu124: "blocked", py312cpu: "review" },
    { id: "mat-3", framework: "sklearn 1.5", py311cu121: "supported", py312cu124: "supported", py313cu124: "supported", py312cpu: "supported" },
    { id: "mat-4", framework: "xgboost 2.1", py311cu121: "review", py312cu124: "supported", py313cu124: "blocked", py312cpu: "supported" }
  ]
};

const schemas = {
  releases: {
    title: "Release",
    fields: [
      { name: "image", label: "Image", required: true },
      { name: "family", label: "Family", required: true },
      { name: "runtime", label: "Runtime", required: true },
      { name: "version", label: "Version", required: true },
      { name: "status", label: "Status", type: "select", options: ["stable", "candidate", "blocked"], required: true },
      { name: "registry", label: "Registry", required: true }
    ]
  },
  families: {
    title: "Golden Family",
    fields: [
      { name: "name", label: "Family", required: true },
      { name: "status", label: "Status", type: "select", options: ["active", "review", "retired"], required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "variant", label: "Variant", required: true },
      { name: "platform", label: "Platform", required: true },
      { name: "stable", label: "Stable", required: true },
      { name: "support", label: "Support", required: true }
    ]
  },
  components: {
    title: "Component",
    fields: [
      { name: "stage", label: "Stage", type: "select", options: ["G0", "G1", "G2", "G3", "G4", "G5"], required: true },
      { name: "name", label: "Name", required: true },
      { name: "version", label: "Version", required: true },
      { name: "status", label: "Status", type: "select", options: ["approved", "candidate", "draft", "blocked", "retired"], required: true },
      { name: "owner", label: "Owner", required: true },
      { name: "source", label: "Source", required: true }
    ]
  },
  matrix: {
    title: "Compatibility Row",
    fields: [
      { name: "framework", label: "Framework", required: true },
      { name: "py311cu121", label: "py311-cu121", type: "select", options: ["supported", "review", "blocked"], required: true },
      { name: "py312cu124", label: "py312-cu124", type: "select", options: ["supported", "review", "blocked"], required: true },
      { name: "py313cu124", label: "py313-cu124", type: "select", options: ["supported", "review", "blocked"], required: true },
      { name: "py312cpu", label: "py312-cpu", type: "select", options: ["supported", "review", "blocked"], required: true }
    ]
  }
};

let state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  renderPage();

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    if (add) {
      openForm(add.dataset.add);
      return;
    }

    const edit = event.target.closest("[data-edit]");
    if (edit) {
      openForm(edit.dataset.type, edit.dataset.edit);
      return;
    }

    const remove = event.target.closest("[data-delete]");
    if (remove) {
      removeItem(remove.dataset.type, remove.dataset.delete);
      return;
    }

    if (event.target.matches("[data-close-modal]")) {
      closeModal();
    }
  });
});

function loadState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY));
  } catch {
    saved = null;
  }

  if (saved && typeof saved === "object") {
    return { ...cloneDefaults(), ...saved };
  }

  return cloneDefaults();
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    toast("저장소 접근이 제한되어 현재 화면에서만 반영됩니다.");
  }
}

function renderPage() {
  const page = document.body.dataset.page;
  if (page === "releases") renderReleases();
  if (page === "families") renderFamilies();
  if (page === "components") renderComponents();
  if (page === "matrix") renderMatrix();
}

function renderReleases() {
  const rows = document.querySelector("#releaseRows");
  if (!rows) return;

  const releases = state.releases;
  setText("#releaseTotal", releases.length);
  setText("#releaseStable", releases.filter((item) => item.status === "stable").length);
  setText("#releaseCandidate", releases.filter((item) => item.status === "candidate").length);
  setText("#releaseBlocked", releases.filter((item) => item.status === "blocked").length);

  rows.innerHTML = releases.length
    ? releases.map((item) => `
      <tr>
        <td class="mono">${escapeHtml(item.image)}</td>
        <td>${escapeHtml(item.family)}</td>
        <td class="mono">${escapeHtml(item.runtime)}</td>
        <td>${escapeHtml(item.version)}</td>
        <td>${badge(item.status)}</td>
        <td>${actions("releases", item.id)}</td>
        <td class="mono">${escapeHtml(item.registry)}</td>
      </tr>
    `).join("")
    : emptyRow(7);
}

function renderFamilies() {
  const cards = document.querySelector("#familyCards");
  if (!cards) return;

  cards.innerHTML = state.families.length
    ? state.families.map((item) => `
      <article class="panel">
        <div class="spread"><strong>${escapeHtml(item.name)}</strong>${badge(item.status)}</div>
        <p class="muted small">${escapeHtml(item.description || "-")}</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Variant</th><th>Platform</th><th>Stable</th><th>Support</th></tr></thead>
            <tbody>
              <tr>
                <td class="mono">${escapeHtml(item.variant)}</td>
                <td>${escapeHtml(item.platform)}</td>
                <td>${escapeHtml(item.stable)}</td>
                <td>${escapeHtml(item.support)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="crud-actions">${actions("families", item.id)}</div>
      </article>
    `).join("")
    : `<div class="panel empty">등록된 Golden Family가 없습니다.</div>`;
}

function renderComponents() {
  const rows = document.querySelector("#componentRows");
  if (!rows) return;

  rows.innerHTML = state.components.length
    ? state.components.map((item) => `
      <tr>
        <td class="mono">${escapeHtml(item.stage)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.version)}</td>
        <td>${badge(item.status)}</td>
        <td>${escapeHtml(item.owner)}</td>
        <td class="mono">${escapeHtml(item.source)}</td>
        <td>${actions("components", item.id)}</td>
      </tr>
    `).join("")
    : emptyRow(7);
}

function renderMatrix() {
  const rows = document.querySelector("#matrixRows");
  if (!rows) return;

  rows.innerHTML = state.matrix.length
    ? state.matrix.map((item) => `
      <tr>
        <th>${escapeHtml(item.framework)}</th>
        <td class="${escapeHtml(item.py311cu121)}">${escapeHtml(item.py311cu121)}</td>
        <td class="${escapeHtml(item.py312cu124)}">${escapeHtml(item.py312cu124)}</td>
        <td class="${escapeHtml(item.py313cu124)}">${escapeHtml(item.py313cu124)}</td>
        <td class="${escapeHtml(item.py312cpu)}">${escapeHtml(item.py312cpu)}</td>
        <td>${actions("matrix", item.id)}</td>
      </tr>
    `).join("")
    : emptyRow(6);
}

function openForm(type, id = "") {
  const schema = schemas[type];
  const item = id ? state[type].find((entry) => entry.id === id) : {};
  if (!schema || !item) return;

  const title = `${schema.title} ${id ? "수정" : "등록"}`;
  const fields = schema.fields.map((field) => fieldMarkup(field, item[field.name])).join("");
  const modalRoot = document.querySelector("#modal-root");

  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="crud-title">
        <h3 id="crud-title">${title}</h3>
        <p class="muted small">저장한 내용은 이 브라우저에 보관됩니다.</p>
        <form id="crud-form" class="grid form-grid">
          ${fields}
          <div class="form-actions full">
            <button class="ghost" type="button" data-close-modal>취소</button>
            <button class="primary" type="submit">저장</button>
          </div>
        </form>
      </section>
    </div>
  `;

  document.querySelector("#crud-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveItem(type, id, new FormData(event.currentTarget));
  });
}

function fieldMarkup(field, value = "") {
  const required = field.required ? " required" : "";
  const safeValue = escapeAttr(value);

  if (field.type === "select") {
    const options = field.options.map((option) => {
      const selected = option === value ? " selected" : "";
      return `<option value="${escapeAttr(option)}"${selected}>${escapeHtml(option)}</option>`;
    }).join("");

    return `
      <div class="field">
        <label for="${field.name}">${field.label}</label>
        <select id="${field.name}" name="${field.name}"${required}>${options}</select>
      </div>
    `;
  }

  if (field.type === "textarea") {
    return `
      <div class="field full">
        <label for="${field.name}">${field.label}</label>
        <textarea id="${field.name}" name="${field.name}"${required}>${escapeHtml(value)}</textarea>
      </div>
    `;
  }

  return `
    <div class="field">
      <label for="${field.name}">${field.label}</label>
      <input id="${field.name}" name="${field.name}" value="${safeValue}"${required}>
    </div>
  `;
}

function saveItem(type, id, formData) {
  const values = Object.fromEntries(formData.entries());
  if (id) {
    state[type] = state[type].map((item) => item.id === id ? { ...item, ...values } : item);
    toast("수정되었습니다.");
  } else {
    state[type] = [{ id: createId(type), ...values }, ...state[type]];
    toast("등록되었습니다.");
  }

  saveState();
  closeModal();
  renderPage();
}

function removeItem(type, id) {
  const item = state[type].find((entry) => entry.id === id);
  if (!item) return;
  const label = item.image || item.name || item.framework || "항목";
  if (!confirm(`${label} 항목을 삭제할까요?`)) return;

  state[type] = state[type].filter((entry) => entry.id !== id);
  saveState();
  renderPage();
  toast("삭제되었습니다.");
}

function closeModal() {
  const modalRoot = document.querySelector("#modal-root");
  if (modalRoot) modalRoot.innerHTML = "";
}

function actions(type, id) {
  return `
    <div class="row row-actions">
      <button class="small" type="button" data-type="${type}" data-edit="${id}">수정</button>
      <button class="small danger" type="button" data-type="${type}" data-delete="${id}">삭제</button>
    </div>
  `;
}

function badge(status) {
  const normalized = String(status || "").toLowerCase();
  const badgeClass = {
    stable: "ok",
    active: "ok",
    approved: "ok",
    supported: "ok",
    candidate: "info",
    review: "warn",
    draft: "warn",
    blocked: "err",
    retired: "neutral"
  }[normalized] || "neutral";

  return `<span class="badge ${badgeClass}">${escapeHtml(status)}</span>`;
}

function emptyRow(colspan) {
  return `<tr><td class="empty" colspan="${colspan}">등록된 데이터가 없습니다.</td></tr>`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function toast(message) {
  const root = document.querySelector("#toast-root");
  if (!root) return;
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  setTimeout(() => {
    root.innerHTML = "";
  }, 1800);
}

function createId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaults));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
