/* Platform Settings (SDD 12.1 package proxy · 4.4/10 Git repo).
   Nexus/PyPI proxy + GitLab repo(주소·계정) 설정. */

export const title = "설정";

export const css = `
.set-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
@media (max-width: 980px) { .set-cols { grid-template-columns: 1fr; } }
.set-form label { display:block; }
.set-actions { display:flex; gap:8px; align-items:center; margin-top:14px; }
.set-msg { font-size:12.5px; }
.set-hint { font-size:11.5px; color:var(--text-dim); margin-top:2px; }
`;

export async function render(el, ctx) {
  const { h, api, toast, errText } = ctx;

  el.append(
    h("h1", { class: "page-title" }, "설정"),
    h("p", { class: "page-sub" }, "패키지 프록시(Nexus)와 Recipe Git 저장소(주소·계정)를 설정합니다."));

  let s;
  try { s = await api.getSettings(); } catch (e) { el.append(h("div", { class: "panel" }, h("div", { class: "small", style: "color:var(--err)" }, errText(e)))); return; }
  const git = s.git, proxy = s.proxy;

  const field = (label, node, hint) => h("div", {}, h("label", {}, label), node, hint ? h("div", { class: "set-hint" }, hint) : null);
  const input = (value, ph, type) => h("input", { type: type || "text", value: value ?? "", placeholder: ph });
  const val = (node) => node.value.trim();

  /* ----------------------------------------------------- Package Proxy (Nexus) */
  const pEnabled = h("input", { type: "checkbox", class: "field-inline", checked: !!proxy.enabled });
  const pIndex = input(proxy.pipIndexUrl, "https://nexus.shiftone.kr/repository/pypi/simple");
  const pHost = input(proxy.pipTrustedHost, "nexus.shiftone.kr");
  const pApt = input(proxy.aptProxy, "http://nexus.shiftone.kr:8081");
  const pMsg = h("span", { class: "set-msg muted" });
  const proxyPanel = h("div", { class: "panel set-form" },
    h("h3", {}, "패키지 프록시 (Nexus)"),
    h("label", { style: "display:flex;gap:8px;align-items:center;" }, pEnabled, h("span", {}, "프록시 사용")),
    field("PyPI Index URL", pIndex, "pip install 시 --index-url 로 사용"),
    field("PyPI Trusted Host", pHost, "https가 아닌 사내 프록시면 지정"),
    field("APT Proxy", pApt, "apt-get 시 Acquire::http::Proxy 로 사용 (Ubuntu/Debian 베이스)"),
    h("div", { class: "set-actions" },
      h("button", {
        class: "primary",
        onclick: async () => {
          try {
            await api.putProxySettings({ enabled: pEnabled.checked, pipIndexUrl: val(pIndex), pipTrustedHost: val(pHost), aptProxy: val(pApt) });
            pMsg.className = "set-msg"; pMsg.style.color = "var(--ok)"; pMsg.textContent = "저장됨";
            toast("프록시 설정 저장됨", "ok");
          } catch (e) { pMsg.style.color = "var(--err)"; pMsg.textContent = errText(e); }
        },
      }, "저장"),
      pMsg));

  /* ------------------------------------------------------------- Git (GitLab) */
  const gBackend = h("select", {},
    h("option", { value: "none", selected: git.gitBackend === "none" }, "none (DB만)"),
    h("option", { value: "gitlab", selected: git.gitBackend === "gitlab" }, "gitlab"));
  const gUrl = input(git.gitlabUrl, "https://gitlab.shiftone.kr");
  const gProject = input(git.gitlabProject, "platform/golden-recipes");
  const gBranch = input(git.gitlabBranch, "main");
  const gDir = input(git.gitlabRecipeDir, "recipes");
  const gToken = h("input", { type: "password", placeholder: git.gitlabTokenSet ? "설정됨 (변경 시에만 입력)" : "write_repository 스코프 토큰" });
  const gMsg = h("span", { class: "set-msg muted" });
  const gitPanel = h("div", { class: "panel set-form" },
    h("h3", {}, "Git 저장소 (GitLab)"),
    field("백엔드", gBackend, "gitlab 이면 Recipe 저장 시 spec을 커밋"),
    field("GitLab URL", gUrl),
    field("프로젝트", gProject, "숫자 id 또는 group/name 경로"),
    field("브랜치", gBranch),
    field("Recipe 경로", gDir),
    field("액세스 토큰", gToken, git.gitlabTokenSet ? "이미 저장됨 — 비워두면 유지" : "토큰은 저장 후 다시 표시되지 않습니다"),
    h("div", { class: "set-actions" },
      h("button", {
        class: "primary",
        onclick: async () => {
          const body = { gitBackend: gBackend.value, gitlabUrl: val(gUrl), gitlabProject: val(gProject), gitlabBranch: val(gBranch), gitlabRecipeDir: val(gDir) };
          if (gToken.value.trim()) body.gitlabToken = gToken.value.trim();  // 변경 시에만 전송
          try {
            const res = await api.putGitSettings(body);
            gMsg.className = "set-msg"; gMsg.style.color = "var(--ok)";
            gMsg.textContent = "저장됨" + (res.gitlabTokenSet ? " (토큰 설정됨)" : "");
            gToken.value = "";
            toast("Git 설정 저장됨", "ok");
          } catch (e) { gMsg.style.color = "var(--err)"; gMsg.textContent = errText(e); }
        },
      }, "저장"),
      h("button", {
        class: "ghost",
        onclick: async () => {
          gMsg.className = "set-msg muted"; gMsg.style.color = ""; gMsg.textContent = "테스트 중…";
          try {
            const r = await api.testGit();
            gMsg.style.color = r.ok ? "var(--ok)" : "var(--err)";
            gMsg.textContent = (r.ok ? "✓ " : "✗ ") + r.message;
          } catch (e) { gMsg.style.color = "var(--err)"; gMsg.textContent = errText(e); }
        },
      }, "연결 테스트"),
      gMsg));

  el.append(h("div", { class: "set-cols" }, proxyPanel, gitPanel));
  el.append(h("p", { class: "small muted", style: "margin-top:12px;" },
    "설정은 DB에 저장되어 즉시 적용됩니다. 토큰을 안전하게 관리하려면 운영에서는 Kubernetes Secret 사용을 권장합니다."));
}
