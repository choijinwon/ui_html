export const title = "수정";

export const css = `
.edit-layout { grid-template-columns: 1fr 1fr; align-items: start; }
.edit-form textarea { min-height: 86px; }
.edit-form .full { grid-column: 1 / -1; }
@media (max-width: 980px) { .edit-layout { grid-template-columns: 1fr; } }
`;

const readForm = (form) => Object.fromEntries(new FormData(form).entries());

function field(h, label, input) {
  return h("div", { class: "field" }, h("label", {}, label), input);
}

function msg(h) {
  return h("div", { class: "small muted", style: "min-height:18px;" });
}

export async function render(el, ctx) {
  const { api, h, toast, errText, badge } = ctx;
  const [components, releases, settings] = await Promise.all([
    api.listComponents({}).catch(() => []),
    api.listReleases({}).catch(() => []),
    api.getSettings().catch(() => ({})),
  ]);

  el.append(h("div", { class: "page-head" },
    h("div", {},
      h("h2", { class: "page-title" }, "수정 화면"),
      h("p", { class: "page-sub" }, "기존 API가 지원하는 변경 작업을 실행합니다."))));

  function componentVersionForm() {
    const out = msg(h);
    const selected = ctx.params.component || "";
    const form = h("form", { class: "panel edit-form" },
      h("h3", {}, "Component 새 버전"),
      h("div", { class: "grid form-grid" },
        field(h, "Component", h("select", { name: "componentId", required: true },
          ...components.map((c) => h("option", { value: c.id, selected: c.name === selected }, `${c.stage} · ${c.name}:${c.version} · ${c.status}`)))),
        field(h, "New Version", h("input", { name: "version", required: true, placeholder: "12.4.2" })),
        field(h, "Image Digest", h("input", { name: "imageDigest", placeholder: "sha256:..." })),
        field(h, "Source Revision", h("input", { name: "sourceRevision", placeholder: "git commit / ref" })),
        h("div", { class: "field full" }, h("label", {}, "Metadata JSON"), h("textarea", { name: "metadata", placeholder: "{\"dockerfile\":{\"packages\":[\"ca-certificates\"]}}" }))),
      h("div", { class: "form-actions" }, out, h("button", { class: "primary", type: "submit", disabled: !components.length }, "새 버전 등록")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        const res = await api.addComponentVersion(v.componentId, {
          version: v.version,
          imageDigest: v.imageDigest || undefined,
          sourceRevision: v.sourceRevision || undefined,
          metadata: v.metadata ? JSON.parse(v.metadata) : {},
        });
        out.textContent = `${res.name}:${res.version} 등록 완료`;
        toast("새 Component 버전이 등록되었습니다", "ok");
      } catch (ex) { out.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function componentActionForm() {
    const out = msg(h);
    const form = h("form", { class: "panel edit-form" },
      h("h3", {}, "Component 검증/승인"),
      h("div", { class: "grid form-grid" },
        field(h, "Component", h("select", { name: "componentId", required: true },
          ...components.map((c) => h("option", { value: c.id }, `${c.stage} · ${c.name}:${c.version} · ${c.status}`)))),
        field(h, "Approver", h("input", { name: "approver", value: "operator" })),
        h("div", { class: "field full" }, h("label", {}, "Reason"), h("textarea", { name: "reason" }))),
      h("div", { class: "form-actions" },
        out,
        h("button", { class: "ghost", type: "button", disabled: !components.length, onclick: async () => {
          try {
            const v = readForm(form);
            const res = await api.verifyComponent(v.componentId);
            out.replaceChildren("검증 결과: ", badge(res.status), ` · ${res.passed ? "passed" : "failed"}`);
            toast("Component 검증이 완료되었습니다", res.passed ? "ok" : "err");
          } catch (ex) { out.textContent = errText(ex); toast(errText(ex), "err"); }
        } }, "검증"),
        h("button", { class: "primary", type: "submit", disabled: !components.length }, "승인")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        const res = await api.approveComponent(v.componentId, { approver: v.approver, reason: v.reason });
        out.replaceChildren(`${res.name}:${res.version} `, badge(res.status));
        toast("Component가 승인되었습니다", "ok");
      } catch (ex) { out.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function releaseActionForm() {
    const out = msg(h);
    const form = h("form", { class: "panel edit-form" },
      h("h3", {}, "Release 상태 변경"),
      h("div", { class: "grid form-grid" },
        field(h, "Release", h("select", { name: "releaseId", required: true },
          ...releases.map((r) => h("option", { value: r.id }, `${r.releaseName} · ${r.state} · ${r.channel}`)))),
        field(h, "Action", h("select", { name: "action" },
          h("option", { value: "promote" }, "promote stable"),
          h("option", { value: "deprecate" }, "deprecate"),
          h("option", { value: "revoke" }, "revoke"),
          h("option", { value: "retire" }, "retire"))),
        field(h, "Actor", h("input", { name: "actor", value: "operator" })),
        h("div", { class: "field full" }, h("label", {}, "Reason"), h("textarea", { name: "reason", required: true }))),
      h("div", { class: "form-actions" }, out, h("button", { class: "primary", type: "submit", disabled: !releases.length }, "상태 변경")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        let res;
        if (v.action === "promote") res = await api.promote(v.releaseId, { actor: v.actor, reason: v.reason });
        if (v.action === "deprecate") res = await api.deprecate(v.releaseId, { actor: v.actor, reason: v.reason });
        if (v.action === "revoke") res = await api.revoke(v.releaseId, { actor: v.actor, reason: v.reason });
        if (v.action === "retire") res = await api.retire(v.releaseId, { actor: v.actor, force: true });
        out.replaceChildren("변경 결과: ", badge(res.state));
        toast("Release 상태가 변경되었습니다", "ok");
      } catch (ex) { out.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function settingsForm() {
    const out = msg(h);
    const form = h("form", { class: "panel edit-form" },
      h("h3", {}, "설정 수정"),
      h("div", { class: "grid form-grid" },
        field(h, "GitLab URL", h("input", { name: "gitlabUrl", value: settings.git?.gitlabUrl || settings.gitlabUrl || "" })),
        field(h, "GitLab Project", h("input", { name: "gitlabProject", value: settings.git?.gitlabProject || settings.gitlabProject || "" })),
        field(h, "Branch", h("input", { name: "gitlabBranch", value: settings.git?.gitlabBranch || settings.gitlabBranch || "main" })),
        field(h, "Recipe Dir", h("input", { name: "gitlabRecipeDir", value: settings.git?.gitlabRecipeDir || settings.gitlabRecipeDir || "recipes" })),
        field(h, "PIP Index URL", h("input", { name: "pipIndexUrl", value: settings.proxy?.pipIndexUrl || "" })),
        field(h, "PIP Trusted Host", h("input", { name: "pipTrustedHost", value: settings.proxy?.pipTrustedHost || "" })),
        field(h, "APT Proxy", h("input", { name: "aptProxy", value: settings.proxy?.aptProxy || "" }))),
      h("div", { class: "form-actions" },
        out,
        h("button", { class: "ghost", type: "button", onclick: async () => {
          try {
            const res = await api.testGit();
            out.textContent = `Git 연결 테스트: ${res.ok ? "ok" : "failed"}`;
          } catch (ex) { out.textContent = errText(ex); }
        } }, "Git 테스트"),
        h("button", { class: "primary", type: "submit" }, "설정 저장")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        await api.putGitSettings({
          gitlabUrl: v.gitlabUrl,
          gitlabProject: v.gitlabProject,
          gitlabBranch: v.gitlabBranch,
          gitlabRecipeDir: v.gitlabRecipeDir,
        });
        await api.putProxySettings({
          enabled: Boolean(v.pipIndexUrl || v.pipTrustedHost || v.aptProxy),
          pipIndexUrl: v.pipIndexUrl,
          pipTrustedHost: v.pipTrustedHost,
          aptProxy: v.aptProxy,
        });
        out.textContent = "설정 저장 완료";
        toast("설정이 저장되었습니다", "ok");
      } catch (ex) { out.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  const sections = [
    ["all", "전체", null],
    ["component-version", "Component 새 버전", componentVersionForm()],
    ["component-action", "Component 검증/승인", componentActionForm()],
    ["release-action", "Release 상태 변경", releaseActionForm()],
    ["settings", "설정 수정", settingsForm()],
  ];
  let selectedType = ctx.params.type && sections.some(([key]) => key === ctx.params.type) ? ctx.params.type : "all";
  const host = h("div", {});
  const typeSelect = h("select", { onchange: (e) => { selectedType = e.target.value; renderSections(); } },
    ...sections.map(([key, label]) => h("option", { value: key, selected: key === selectedType }, `수정 작업: ${label}`)));

  function renderSections() {
    const visible = sections.filter(([key]) => selectedType === "all" ? key !== "all" : key === selectedType);
    host.replaceChildren(h("div", { class: "grid edit-layout" }, ...visible.map(([, , node]) => node)));
  }

  el.append(h("div", { class: "panel", style: "margin-bottom:14px;" },
    h("div", { class: "grid form-grid" }, field(h, "수정 작업 선택", typeSelect))),
    host);
  renderSections();
}
