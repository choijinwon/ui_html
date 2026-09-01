/* Split-page app shell: DOM/UX helpers shared by every screen (ctx). */
import { api, ApiError } from "./api.js";
import * as dashboard from "./screens/dashboard.js";
import * as families from "./screens/families.js";
import * as components from "./screens/components.js";
import * as matrix from "./screens/matrix.js";
import * as security from "./screens/security.js";
import * as settings from "./screens/settings.js";
import * as register from "./screens/register.js";
import * as edit from "./screens/edit.js";

const SCREENS = { dashboard, families, components, matrix, security, settings, register, edit };
const PAGE_BY_SCREEN = {
  dashboard: "index.html",
  families: "families.html",
  components: "components.html",
  matrix: "matrix.html",
  security: "security.html",
  settings: "settings.html",
  register: "register.html",
  edit: "edit.html",
};
const GOLDEN_IMAGE_SCREENS = new Set(["dashboard", "families", "components", "matrix"]);

export const STAGES = ["G0", "G1", "G2", "G3", "G4", "G5"];
export const STAGE_LABELS = {
  G0: "Foundation", G1: "Accelerator", G2: "Language",
  G3: "Framework", G4: "ML Platform", G5: "IDE",
};

/* ------------------------------------------------------------- DOM helper */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === undefined || c === null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* --------------------------------------------------------------- badges */
const BADGE_KIND = {
  stable: "ok", approved: "ok", succeeded: "ok", supported: "ok", passed: "ok",
  active: "ok", pass: "ok", patched: "ok",
  candidate: "info", building: "info", verifying: "info", running: "info", queued: "info",
  review: "warn", conditional: "warn", draft: "neutral", exception: "warn", deprecated: "warn",
  accepted: "warn", medium: "warn", high: "warn", low: "neutral", policy: "purple",
  blocked: "err", failed: "err", revoked: "err", fail: "err", critical: "err", open: "err",
  retired: "neutral", skipped: "neutral",
};
export function badge(value) {
  const v = String(value ?? "").toLowerCase();
  return h("span", { class: `badge ${BADGE_KIND[v] || "neutral"}` }, value ?? "-");
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("ko-KR", { hour12: false }) : "-");
export const fmtBytes = (n) => {
  if (!n && n !== 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};
export const shortDigest = (d) => (d ? d.slice(0, 19) + "…" : "-");

/* ---------------------------------------------------------------- toast */
export function toast(message, kind = "info") {
  const root = document.getElementById("toast-root");
  const el = h("div", { class: `toast ${kind}` }, message);
  root.append(el);
  setTimeout(() => el.remove(), kind === "err" ? 7000 : 3500);
}

export function errText(e) {
  if (e instanceof ApiError) {
    if (typeof e.detail === "string") return e.detail;
    return JSON.stringify(e.detail);
  }
  return String(e?.message ?? e);
}

/* ---------------------------------------------------------------- modal */
export function openModal({ title, body, actions }) {
  const root = document.getElementById("modal-root");
  const close = () => backdrop.remove();
  const modal = h("div", { class: "modal" }, h("h3", {}, title));
  const backdrop = h("div", { class: "modal-backdrop", onclick: (e) => e.target === backdrop && close() }, modal);
  const content = h("div", {});
  modal.append(content);
  body(content, close);
  if (actions) modal.append(actions(close));
  root.append(backdrop);
  return { close, el: modal };
}

/* Simple declarative form modal.
   fields: [{name, label, type: "text"|"select"|"textarea"|"datetime-local"|"checkbox",
             options: [{value,label}], required, placeholder, value, hint}]
   hint: string | ((values)=>string) — renders an ⓘ tooltip next to the label;
         a function hint is recomputed as the form's other fields change.
   onSubmit(values, close) — throw/reject to keep the modal open. */
export function formModal({ title, submitLabel = "저장", fields, guide, onSubmit }) {
  return openModal({
    title,
    body(el, close) {
      const form = h("form", {});
      const reactiveHints = [];  // {icon, fn} — hints recomputed on form change
      const readValues = () => {
        const v = {};
        for (const f of fields) {
          const input = form.querySelector(`[name="${f.name}"]`);
          if (input) v[f.name] = f.type === "checkbox" ? input.checked : input.value;
        }
        return v;
      };
      for (const f of fields) {
        // Optional per-field guide: an ⓘ icon with a native (never-clipped)
        // tooltip. A function hint recomputes as other fields change.
        const label = h("label", { for: `f-${f.name}` }, f.label + (f.required ? " *" : ""));
        if (f.hint) {
          const icon = h("span", { class: "field-hint", title: typeof f.hint === "string" ? f.hint : "" }, "ⓘ");
          if (typeof f.hint === "function") reactiveHints.push({ icon, fn: f.hint });
          label.append(icon);
        }
        form.append(label);
        let input;
        if (f.type === "select") {
          input = h("select", { id: `f-${f.name}`, name: f.name },
            ...(f.options || []).map((o) => h("option", { value: o.value, selected: o.value === f.value }, o.label)));
        } else if (f.type === "textarea") {
          input = h("textarea", { id: `f-${f.name}`, name: f.name, rows: 3, placeholder: f.placeholder });
          if (f.value) input.value = f.value;
        } else if (f.type === "checkbox") {
          input = h("input", { id: `f-${f.name}`, name: f.name, type: "checkbox", checked: !!f.value, class: "field-inline" });
        } else {
          input = h("input", { id: `f-${f.name}`, name: f.name, type: f.type || "text", placeholder: f.placeholder, required: f.required });
          if (f.value !== undefined) input.value = f.value;
        }
        form.append(input);
      }
      const err = h("div", { class: "small", style: "color: var(--err); margin-top: 10px; white-space: pre-wrap;" });
      form.append(err);
      form.append(h("div", { class: "actions" },
        h("button", { type: "button", class: "ghost", onclick: close }, "취소"),
        h("button", { type: "submit", class: "primary" }, submitLabel)));
      if (reactiveHints.length) {
        const updateHints = () => { const v = readValues(); reactiveHints.forEach(({ icon, fn }) => { icon.title = fn(v); }); };
        form.addEventListener("change", updateHints);
        form.addEventListener("input", updateHints);
        updateHints();
      }
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const values = {};
        for (const f of fields) {
          const input = form.querySelector(`[name="${f.name}"]`);
          values[f.name] = f.type === "checkbox" ? input.checked : input.value.trim();
          if (values[f.name] === "") values[f.name] = undefined;
        }
        try { await onSubmit(values, close); } catch (ex) { err.textContent = errText(ex); }
      });

      // Optional guide panel on the right, reactive to the form's values.
      // guide(values) -> Node | string. Widens the modal into two columns.
      if (guide) {
        const panel = h("div", { class: "guide-panel" });
        const updateGuide = () => {
          const g = guide(readValues());
          panel.replaceChildren(g instanceof Node ? g : h("div", { class: "guide-body" }, g ?? ""));
        };
        form.addEventListener("change", updateGuide);
        form.addEventListener("input", updateGuide);
        updateGuide();
        if (el.parentElement) el.parentElement.classList.add("modal-wide");
        el.append(h("div", { class: "form-guide" }, form, panel));
      } else {
        el.append(form);
      }
    },
  });
}

export async function confirmModal(title, message, { danger = false, label = "확인" } = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      body(el) { el.append(h("p", { class: "muted" }, message)); },
      actions(close) {
        return h("div", { class: "actions" },
          h("button", { class: "ghost", onclick: () => { close(); resolve(false); } }, "취소"),
          h("button", { class: danger ? "danger" : "primary", onclick: () => { close(); resolve(true); } }, label));
      },
    });
  });
}

/* --------------------------------------------------------------- router */
export function navigate(screen, params = {}) {
  const page = PAGE_BY_SCREEN[screen] || PAGE_BY_SCREEN.dashboard;
  const p = new URLSearchParams(params).toString();
  location.href = `${page}${p ? "?" + p : ""}`;
}

function route() {
  const name = document.body.dataset.screen || "dashboard";
  return { name: SCREENS[name] ? name : "dashboard", params: Object.fromEntries(new URLSearchParams(location.search)) };
}

const injectedCss = new Set();
async function renderCurrent() {
  const { name, params } = route();
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === name));
  const menuName = GOLDEN_IMAGE_SCREENS.has(name) ? "golden-image" : name;
  document.querySelectorAll("[data-menu]").forEach((a) => a.classList.toggle("active", a.dataset.menu === menuName));
  const screen = SCREENS[name];
  if (screen.css && !injectedCss.has(name)) {
    document.head.append(h("style", {}, screen.css));
    injectedCss.add(name);
  }
  const main = document.getElementById("main");
  main.replaceChildren();
  const ctx = {
    api, h, badge, fmtDate, fmtBytes, shortDigest, toast, errText,
    openModal, formModal, confirmModal, navigate, params,
    STAGES, STAGE_LABELS, refresh: renderCurrent,
  };
  try {
    await screen.render(main, ctx);
  } catch (e) {
    main.replaceChildren(
      h("div", { class: "panel" },
        h("h3", {}, "화면을 불러오지 못했습니다"),
        h("p", { class: "mono small", style: "color: var(--err); white-space: pre-wrap;" }, errText(e))));
  }
}

renderCurrent();
