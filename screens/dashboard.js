/* Release Dashboard (SDD 16.1): global Golden Image list — every release across
   all families/variants in one table; click a row for full detail (stage
   composition, latest build/gate, approvals, usage, build actions). */

export const title = "Release Dashboard";

export const css = `
.dash-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
@media (max-width: 1180px) { .dash-cols { grid-template-columns: 1fr; } }
.row-click { cursor: pointer; }
.plan-line { display: flex; gap: 10px; align-items: baseline; margin: 4px 0; }
.plan-line .plan-k { flex: none; width: 48px; color: var(--text-dim); font-size: 12px; font-weight: 600; }
.plan-line .plan-v { display: flex; flex-wrap: wrap; gap: 4px; }
.modal-sec { font-weight: 700; font-size: 13px; margin: 14px 0 6px; }
.kv2 { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; margin: 6px 0 4px; font-size: 13px; }
.kv2 .k { color: var(--text-dim); }
.kv2 .v { word-break: break-all; }
.df-stage { border: 1px solid var(--border); border-radius: 8px; margin: 8px 0; overflow: hidden; }
.df-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--bg-panel-2); font-size: 12.5px; }
.df-head .df-ref { font-family: var(--mono); color: var(--text-dim); word-break: break-all; }
.df-body { margin: 0; padding: 10px 12px; background: var(--bg); overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.5; white-space: pre; }
.gi-filter { margin: 0 0 14px; gap: 10px; }
.gi-filter select, .gi-filter .gi-search { width: auto; }
.gi-filter .gi-search { min-width: 220px; }
.cmp-grid { display: grid; grid-template-columns: 140px 1fr; gap: 8px 12px; align-items: center; margin: 6px 0; }
.cmp-grid label { margin: 0; }
.cmp-stage { display: grid; grid-template-columns: 150px 1fr; gap: 8px 12px; align-items: center; margin: 6px 0; }
.cmp-stage .st-k { font-size: 12.5px; }
.cmp-stage .st-k .mono { color: var(--text-dim); }
.cmp-val { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-top: 10px; background: var(--bg-panel-2); }
.cmp-val ul { margin: 6px 0 0; padding-left: 18px; }
/* list: registry image cell wraps instead of forcing horizontal scroll */
td.reg-cell { max-width: 340px; }
td.reg-cell .reg-ref { font-family: var(--mono); font-size: 11.5px; word-break: break-all; color: var(--text-dim); }
/* detail drill-down (resembles the old per-image dashboard) */
.det-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 4px 0 12px; }
.det-stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.det-stats .stat { flex: 1 1 160px; }
.stage-dag.wrap { flex-wrap: wrap; overflow: visible; gap: 4px 0; }
.stage-node.clickable { cursor: pointer; transition: transform .08s, box-shadow .08s; }
.stage-node.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.stage-node .stage-ref { font-family: var(--mono); font-size: 11px; word-break: break-all; }
.stage-node .stage-old { text-decoration: line-through; }
.reg-box { display: grid; grid-template-columns: 70px 1fr auto; gap: 6px 10px; align-items: center; }
.reg-box .reg-k { color: var(--text-dim); font-size: 12px; }
.reg-box .reg-v { font-family: var(--mono); font-size: 12px; word-break: break-all; }
/* recipe(spec) viewer */
.rev-layout { display: flex; gap: 14px; }
.rev-list { display: flex; flex-direction: column; gap: 4px; flex: none; }
.rev-btn { text-align: left; white-space: nowrap; }
.rev-btn.active { background: var(--accent); border-color: var(--accent); color: #06121f; }
`;

const STAGE_KEYS = [
  ["G0", "foundation"], ["G1", "accelerator"], ["G2", "language"],
  ["G3", "framework"], ["G4", "mlPlatform"], ["G5", "ide"],
];

// States offered in the filter (SDD 13 release states).
const STATE_FILTERS = [
  "stable", "candidate", "approved", "building", "verifying",
  "blocked", "deprecated", "revoked", "failed", "retired", "draft",
];

export async function render(el, ctx) {
  const { api, h, badge, fmtDate, fmtBytes, shortDigest, toast, errText } = ctx;

  /* --------------------------------------------------------- shared helpers */
  const sectionTitle = (t) => h("div", { class: "modal-sec" }, t);
  const table = (heads, rows) => h("div", { class: "table-wrap" },
    h("table", {},
      h("thead", {}, h("tr", {}, heads.map((x) => h("th", {}, x)))),
      h("tbody", {}, rows)));
  const planLine = (label, items) => h("div", { class: "plan-line" },
    h("span", { class: "plan-k" }, label),
    h("span", { class: "plan-v" },
      items && items.length ? items.map((x) => badge(x)) : h("span", { class: "muted small" }, "-")));
  const kvline = (k, v) => [h("div", { class: "k" }, k), h("div", { class: "v" }, v)];

  async function buildRecipe(recipeId, mode, extra = {}) {
    try {
      const r = await api.requestBuild({ recipeRevisionId: recipeId, mode, ...extra });
      toast(`빌드 ${r.status} · ${r.workflowName || r.buildId.slice(0, 8)}` +
        (r.deduplicated ? " · 중복 빌드 재사용" : ""), r.status === "failed" ? "err" : "ok");
      ctx.refresh();
    } catch (e) { toast(errText(e), "err"); }
  }

  /* ----------------------------------------------- Dockerfile viewer modal */
  function openDockerfilesModal(title, loader) {
    ctx.openModal({
      title,
      body(root) {
        const box = h("div", {}, h("div", { class: "muted small" }, "불러오는 중…"));
        root.append(box);
        loader().then((data) => {
          box.replaceChildren(
            h("div", { class: "small muted", style: "margin-bottom:6px;" },
              `${data.family} · ${data.releaseName} · ${data.platform}`),
            ...data.stages.map((s) =>
              h("div", { class: "df-stage" },
                h("div", { class: "df-head" },
                  h("span", { class: "mono" }, s.stage),
                  badge(s.action),
                  h("span", { class: "df-ref" }, (s.images && s.images[0]) || ""),
                  h("button", {
                    class: "sm ghost", style: "margin-left:auto;",
                    onclick: () => { navigator.clipboard?.writeText(s.dockerfile); toast(`${s.stage} Dockerfile 복사됨`, "ok"); },
                  }, "복사")),
                h("pre", { class: "df-body" }, s.dockerfile))));
        }).catch((e) => box.replaceChildren(
          h("div", { class: "small", style: "color:var(--err);white-space:pre-wrap;" }, errText(e))));
      },
      actions(close) {
        return h("div", { class: "actions" }, h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  /* -------------------------------------------------------- build detail modal */
  async function openBuildModal(buildId) {
    let d;
    try { d = await api.getBuild(buildId); } catch (e) { toast(errText(e), "err"); return; }
    const pct = d.totalLayerBytes ? ` (${Math.round((d.cacheHitBytes / d.totalLayerBytes) * 100)}%)` : "";
    ctx.openModal({
      title: `Build ${d.buildId.slice(0, 8)} · ${d.mode}`,
      body(root) {
        root.append(
          h("div", { class: "row", style: "margin:8px 0 10px;" },
            badge(d.status),
            d.workflowName ? h("span", { class: "mono small muted" }, d.workflowName) : null,
            d.startStage ? h("span", { class: "small muted" }, `startStage: ${d.startStage}`) : null,
            d.imageDigest ? h("code", {}, shortDigest(d.imageDigest)) : null),
          sectionTitle("Plan"),
          planLine("Build", d.plan?.build),
          planLine("Reuse", d.plan?.reuse),
          planLine("Tests", d.plan?.tests),
          h("hr", { class: "sep" }),
          h("div", { class: "row", style: "gap:8px;" },
            sectionTitle("Gate"),
            d.gate ? badge(d.gate.status) : h("span", { class: "muted small" }, "결과 없음")),
          d.gate?.reasons?.length
            ? h("ul", { class: "small muted", style: "margin:4px 0 0;padding-left:18px;" }, d.gate.reasons.map((r) => h("li", {}, r)))
            : "",
          h("div", { class: "small muted", style: "margin-top:8px;" },
            `Cache: ${fmtBytes(d.cacheHitBytes)} / ${fmtBytes(d.totalLayerBytes)}${pct}`,
            h("span", { class: "small", style: "margin-left:6px;", title: d.layerBytesMeasured ? "레지스트리 실제 레이어 크기" : "명목 추정치 (레지스트리 미측정)" },
              d.layerBytesMeasured ? "· 실측" : "· 추정")));

        if (d.stageResults?.length) {
          root.append(sectionTitle("Stage Results"),
            table(["Stage", "Action", "Component", "Digest"],
              d.stageResults.map((s) => h("tr", {},
                h("td", { class: "mono" }, s.stage),
                h("td", {}, badge(s.action)),
                h("td", { class: "mono small" }, s.component ?? "-"),
                h("td", {}, h("code", {}, shortDigest(s.digest)))))));
        }
        if (d.testResults?.length) {
          root.append(sectionTitle("Test Results"),
            table(["Test", "Stage", "상태"],
              d.testResults.map((t) => h("tr", {},
                h("td", { class: "mono small" }, t.testName),
                h("td", { class: "mono small muted" }, t.stage ?? "-"),
                h("td", {}, badge(t.status))))));
        }
        if (d.findings?.length) {
          root.append(sectionTitle("Findings"),
            table(["Severity", "Finding", "Package"],
              d.findings.map((f) => h("tr", {},
                h("td", {}, badge(f.severity)),
                h("td", {}, h("code", {}, f.findingKey)),
                h("td", { class: "mono small" }, f.packageName)))));
        }
      },
      actions(close) {
        return h("div", { class: "actions" },
          h("button", { onclick: () => openDockerfilesModal(`Dockerfile · Build ${d.buildId.slice(0, 8)}`, () => api.buildDockerfiles(d.buildId)) }, "Dockerfile 보기"),
          h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  /* --------------------------------------------------- golden image detail */
  const copyBtn = (text, label) => h("button", {
    class: "sm ghost", onclick: () => { navigator.clipboard?.writeText(text); toast(`${label} 복사됨`, "ok"); },
  }, "복사");

  function openFromStageModal(recipeId) {
    ctx.formModal({
      title: "선택 Stage부터 재빌드",
      submitLabel: "빌드",
      fields: [
        { name: "startStage", label: "시작 Stage", type: "select", value: "G0",
          options: STAGE_KEYS.map(([s]) => ({ value: s, label: `${s} · ${ctx.STAGE_LABELS[s]}` })) },
        { name: "reason", label: "사유", type: "textarea", placeholder: "재빌드 사유 (선택)" },
      ],
      async onSubmit(v, close) {
        await buildRecipe(recipeId, "from_stage", { startStage: v.startStage, reason: v.reason });
        close();
      },
    });
  }

  // Recipe(spec) viewer: revision list for the variant + raw spec JSON + Git.
  async function openRecipeModal(variantId, initialRecipeId) {
    let recipes;
    try { recipes = await api.listRecipes(variantId); } catch (e) { toast(errText(e), "err"); return; }
    if (!recipes.length) { toast("이 Variant에는 Recipe가 없습니다", "err"); return; }
    let current = recipes.find((r) => r.id === initialRecipeId) || recipes[0];

    ctx.openModal({
      title: "Recipe (spec)",
      body(root) {
        const listBox = h("div", { class: "rev-list" });
        const detailBox = h("div", { style: "flex:1;min-width:0;" });

        const renderDetailBox = () => {
          const gitLine = current.gitRevision
            ? h("span", {}, "git ",
                current.gitUrl
                  ? h("a", { href: current.gitUrl, target: "_blank", class: "mono" }, current.gitRevision.slice(0, 10))
                  : h("span", { class: "mono" }, current.gitRevision.slice(0, 10)))
            : h("span", { class: "muted" }, "git 미연동");
          detailBox.replaceChildren(
            h("div", { class: "kv2" },
              ...kvline("Revision", `r${current.revision}`),
              ...kvline("Spec Hash", h("span", { class: "mono" }, current.specHash)),
              ...kvline("작성자", current.createdBy || "-"),
              ...kvline("생성일", fmtDate(current.createdAt)),
              ...kvline("Git", gitLine)),
            h("div", { class: "modal-sec" }, "spec"),
            h("pre", { class: "df-body" }, JSON.stringify(current.spec, null, 2)));
        };

        const renderList = () => {
          listBox.replaceChildren(...recipes.map((r) =>
            h("button", {
              class: "rev-btn" + (r.id === current.id ? " active" : ""),
              onclick: () => { current = r; renderList(); renderDetailBox(); },
            }, `r${r.revision}`, h("span", { class: "muted small" }, " " + (r.specHash || "").slice(0, 8)))));
        };

        root.append(h("div", { class: "rev-layout" }, listBox, detailBox));
        renderList();
        renderDetailBox();
      },
      actions(close) {
        return h("div", { class: "actions" }, h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  // Stage DAG node click -> component detail popup (resolves the recipe ref to
  // the actual Component and shows its build config / metadata).
  async function openStageComponent(stage, ref) {
    if (!ref) { toast("이 Stage에 지정된 컴포넌트가 없습니다", "err"); return; }
    let comps;
    try { comps = await api.listComponents({ stage }); } catch (e) { toast(errText(e), "err"); return; }
    const comp = comps.find((c) => c.name === ref || `${c.name}-${c.version}` === ref);
    if (!comp) { toast(`컴포넌트를 찾을 수 없음: ${ref}`, "err"); return; }
    const meta = comp.metadata || {};
    const df = meta.dockerfile || {};
    ctx.openModal({
      title: `${comp.stage} · ${comp.name}:${comp.version}`,
      body(root) {
        root.append(h("div", { class: "kv2" },
          ...kvline("Stage", `${comp.stage} · ${ctx.STAGE_LABELS[comp.stage] || ""}`),
          ...kvline("상태", badge(comp.status)),
          ...kvline("Owner", comp.ownerTeam || "-"),
          ...kvline("Image Digest", h("span", { class: "mono" }, comp.imageDigest || "-")),
          ...kvline("Source Revision", h("span", { class: "mono" }, comp.sourceRevision || "-"))));

        root.append(sectionTitle("빌드 구성 (Dockerfile)"));
        const kv = h("div", { class: "kv2" });
        const add = (k, v) => kv.append(...kvline(k, v));
        if (df.base) add("Base", h("span", { class: "mono" }, df.base));
        add("Package Manager", h("code", {}, df.packageManager || "(기본/추론)"));
        if (df.packages || df.apk) add("packages", h("span", { class: "mono" }, (df.packages || df.apk).join(" ")));
        if (df.pip) add("pip", h("span", { class: "mono" }, df.pip.join(" ")));
        if (df.env) add("env", h("span", { class: "mono" }, Object.entries(df.env).map(([k, v]) => `${k}=${v}`).join("  ")));
        if (df.workdir) add("workdir", h("span", { class: "mono" }, df.workdir));
        if (df.files) add("files", h("span", { class: "mono" }, Object.keys(df.files).join(", ")));
        if (df.run) add("run", h("span", { class: "mono small" }, df.run.join("  ;  ")));
        if (df.entrypoint) add("entrypoint", h("span", { class: "mono" }, JSON.stringify(df.entrypoint)));
        if (df.cmd) add("cmd", h("span", { class: "mono" }, JSON.stringify(df.cmd)));
        if (df.user) add("user", h("span", { class: "mono" }, df.user));
        root.append(kv);
        if (!Object.keys(df).length) root.append(h("p", { class: "small muted" }, "커스텀 빌드 구성 없음 — Stage 기본값으로 렌더링됩니다."));

        if (meta.cves?.length) {
          root.append(sectionTitle("선언된 CVE (시뮬레이션)"),
            table(["ID", "Severity", "Package"], meta.cves.map((v) => h("tr", {},
              h("td", { class: "mono small" }, v.id || "-"), h("td", {}, badge(v.severity || "medium")),
              h("td", { class: "mono small" }, v.package || "-")))));
        }
        root.append(sectionTitle("원본 metadata"),
          h("pre", { class: "df-body" }, Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "{}"));
      },
      actions(close) {
        return h("div", { class: "actions" },
          h("button", { class: "sm ghost", onclick: () => { close(); ctx.navigate("components", { stage: comp.stage, name: comp.name }); } }, "Component Catalog에서 보기"),
          h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  // Row-click detail: a full-page drill-down resembling the old per-image
  // dashboard (Stage DAG, registry refs, latest build, actions). Rendered in
  // place (not a modal) so it never needs its own scroll region.
  async function renderDetail(img) {
    const relId = img.releaseId;
    let detail, recipe = null, builds = [], latestBuild = null, stableRecipe = null, usage = [];
    try {
      detail = await api.getRelease(relId);
      if (detail.recipeRevisionId) recipe = await api.getRecipe(detail.recipeRevisionId).catch(() => null);
      builds = await api.listBuilds(relId).catch(() => []);
      if (builds[0]) latestBuild = await api.getBuild(builds[0].id).catch(() => null);
      usage = await api.listUsage(relId).catch(() => []);
    } catch (e) { toast(errText(e), "err"); ctx.navigate("dashboard", {}); return; }
    const recipeId = detail.recipeRevisionId;
    const comps = recipe?.spec?.components || {};
    const buildSet = new Set(latestBuild?.plan?.build || []);

    // Back + header.
    el.append(h("div", { class: "det-head" },
      h("button", { class: "ghost", onclick: () => ctx.navigate("dashboard", {}) }, "← 전체 목록"),
      h("h2", { class: "page-title", style: "margin:0;" }, `${img.family} · ${img.releaseName}`),
      // 두 배지는 서로 다른 필드다: state(생명주기) vs channel(배포 채널). 승격 전에는
      // 둘 다 "candidate"라 라벨 없이는 같은 배지가 두 번 뜬 것처럼 보인다.
      h("span", { class: "row", style: "gap:5px;align-items:center;" },
        h("span", { class: "small muted" }, "상태"), badge(detail.state),
        h("span", { class: "small muted", style: "margin-left:6px;" }, "채널"), badge(detail.channel)),
      h("span", { style: "margin-left:auto;" },
        recipeId ? h("button", { class: "sm", onclick: () => buildRecipe(recipeId, "changed") }, "변경 사항 빌드") : null,
        " ",
        recipeId ? h("button", { class: "sm", onclick: () => openFromStageModal(recipeId) }, "선택 Stage부터") : null,
        " ",
        recipeId ? h("button", { class: "sm", onclick: () => buildRecipe(recipeId, "verify") }, "Stage 검증") : null,
        " ",
        h("button", { class: "sm ghost", onclick: () => openRecipeModal(img.variantId, recipeId) }, "Recipe(spec) 보기"),
        " ",
        h("button", { class: "sm ghost", onclick: () => ctx.navigate("security", { releaseId: relId }) }, "Security Gate"))));

    // Registry references (SDD 8.2): mutable tag + immutable digest pin.
    el.append(h("div", { class: "panel", style: "margin-bottom:14px;" },
      h("h3", { style: "margin:0 0 8px;" }, "Docker Registry 주소"),
      h("div", { class: "reg-box" },
        h("span", { class: "reg-k" }, "Tag"),
        h("span", { class: "reg-v" }, img.imageRef || "-"),
        img.imageRef ? copyBtn(img.imageRef, "Tag ref") : h("span", {}),
        h("span", { class: "reg-k" }, "Digest"),
        h("span", { class: "reg-v" }, img.imageRefDigest || "빌드 전"),
        img.imageRefDigest ? copyBtn(img.imageRefDigest, "Digest ref") : h("span", {}))));

    // Stats.
    const pct = latestBuild && latestBuild.totalLayerBytes
      ? Math.round((latestBuild.cacheHitBytes / latestBuild.totalLayerBytes) * 100) + "%" : "-";
    const cacheLabel = latestBuild ? (latestBuild.layerBytesMeasured ? "cache hit · 실측" : "cache hit · 추정") : "cache hit";
    const stat = (v, k) => h("div", { class: "panel stat" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));
    el.append(h("div", { class: "det-stats" },
      stat(recipe ? `r${recipe.revision}` : "-", "Recipe revision"),
      stat(latestBuild ? badge(latestBuild.status) : "없음", "최근 빌드"),
      stat(latestBuild?.gate ? badge(latestBuild.gate.status) : "-", "Gate"),
      stat(pct, cacheLabel),
      stat(detail.supportEndAt ? fmtDate(detail.supportEndAt) : "-", "지원 종료")));

    // Stage DAG (wraps — no horizontal scroll). Nodes are clickable -> component detail.
    const dag = h("div", { class: "stage-dag wrap" });
    STAGE_KEYS.forEach(([stage, key], i) => {
      if (i) dag.append(h("div", { class: "stage-arrow" }, "→"));
      dag.append(h("div", {
        class: `stage-node clickable stage-c-${stage.toLowerCase()} ` + (latestBuild && buildSet.has(stage) ? "build" : "reuse"),
        title: "컴포넌트 상세 보기",
        onclick: () => openStageComponent(stage, comps[key]),
      },
        h("div", { class: "stage-key" }, `${stage} · ${key}`),
        h("div", { class: "stage-name" }, ctx.STAGE_LABELS[stage]),
        h("div", { class: "stage-ref" }, comps[key] || "-")));
    });
    el.append(h("div", { class: "panel", style: "margin-bottom:14px;" },
      h("div", { class: "spread", style: "margin-bottom:8px;" },
        h("h3", { style: "margin:0;" }, "Stage DAG (G0~G5)"),
        h("span", { class: "small muted" }, "노드 클릭 → 컴포넌트 상세"),
        latestBuild ? h("span", { class: "row small muted", style: "gap:6px;" }, "최근 빌드 plan 기준", badge(latestBuild.status)) : h("span", { class: "small muted" }, "빌드 이력 없음 · 전체 reuse")),
      recipe ? dag : h("div", { class: "empty" }, "Recipe가 없습니다.")));

    // Two columns: latest build + (approvals/usage).
    const leftCol = h("div", { class: "panel" }, h("h3", {}, "최근 빌드"));
    if (latestBuild) {
      leftCol.append(
        h("div", { class: "row", style: "gap:8px;margin-bottom:4px;" },
          badge(latestBuild.status),
          latestBuild.workflowName ? h("span", { class: "mono small muted" }, latestBuild.workflowName) : null),
        planLine("Build", latestBuild.plan?.build),
        planLine("Reuse", latestBuild.plan?.reuse),
        planLine("Tests", latestBuild.plan?.tests),
        latestBuild.gate?.reasons?.length
          ? h("ul", { class: "small muted", style: "margin:4px 0 0;padding-left:18px;" }, latestBuild.gate.reasons.map((r) => h("li", {}, r)))
          : "",
        h("div", { class: "small muted", style: "margin-top:6px;" },
          `Cache: ${fmtBytes(latestBuild.cacheHitBytes)} / ${fmtBytes(latestBuild.totalLayerBytes)} (${pct})`,
          h("span", { style: "margin-left:6px;", title: latestBuild.layerBytesMeasured ? "레지스트리 실제 레이어 크기" : "명목 추정치 (레지스트리 미측정)" },
            latestBuild.layerBytesMeasured ? "· 실측" : "· 추정")),
        h("div", { class: "row", style: "gap:6px;margin-top:8px;" },
          h("button", { class: "sm", onclick: () => openBuildModal(latestBuild.buildId) }, "빌드 상세"),
          h("button", { class: "sm ghost", onclick: () => openDockerfilesModal(`Dockerfile · ${img.releaseName}`, () => api.buildDockerfiles(latestBuild.buildId)) }, "Dockerfile 보기")));
    } else {
      leftCol.append(h("div", { class: "small muted" }, "빌드 이력이 없습니다."),
        recipeId ? h("button", { class: "sm ghost", style: "margin-top:8px;", onclick: () => openDockerfilesModal(`Dockerfile · ${img.releaseName}`, () => api.recipeDockerfiles(recipeId)) }, "Dockerfile 미리보기") : "");
    }

    const rightCol = h("div", { class: "panel" }, h("h3", {}, "승인 · 사용처"));
    rightCol.append(sectionTitle("승인 현황"),
      detail.approvals?.length
        ? table(["종류", "결정", "승인자", "시각"], detail.approvals.map((a) => h("tr", {},
            h("td", {}, a.kind), h("td", {}, badge(a.decision)),
            h("td", { class: "small" }, a.approver), h("td", { class: "small muted" }, fmtDate(a.createdAt)))))
        : h("div", { class: "small muted" }, "승인 이력 없음"));
    rightCol.append(sectionTitle("사용처"),
      usage.length
        ? table(["Type", "Namespace", "Resource"], usage.map((u) => h("tr", {},
            h("td", {}, u.resourceType), h("td", { class: "small" }, u.namespace), h("td", { class: "small mono" }, u.resourceName))))
        : h("div", { class: "small muted" }, "사용 중인 리소스 없음"));

    el.append(h("div", { class: "dash-cols" }, leftCol, rightCol));
  }

  /* --------------------------------------------------- new golden image composer */
  async function openComposer(preFamilyId, preVariantId) {
    let fams, allComps;
    try {
      [fams, allComps] = await Promise.all([api.listFamilies(), api.listComponents({})]);
    } catch (e) { toast(errText(e), "err"); return; }
    if (!fams.length) { toast("먼저 Golden Families에서 Family를 만드세요", "err"); return; }

    const byStage = {};
    for (const [s] of STAGE_KEYS)
      byStage[s] = allComps.filter((c) => c.stage === s && (c.status === "approved" || c.status === "candidate"));

    const st = {
      familyId: fams.some((f) => f.id === preFamilyId) ? preFamilyId : fams[0].id,
      variants: [], variantId: null,
      release: "", policy: "standard", createdBy: "operator",
      sel: {}, building: true,
    };
    for (const [s, k] of STAGE_KEYS) { const o = byStage[s][0]; if (o) st.sel[k] = `${o.name}-${o.version}`; }

    ctx.openModal({
      title: "새 Golden Image",
      body(root, close) {
        const container = h("div", {});
        const valBox = h("div", { class: "cmp-val" });
        let saveBtn, lastValid = null;

        const family = () => fams.find((f) => f.id === st.familyId);
        const variant = () => st.variants.find((v) => v.id === st.variantId);
        const allSelected = () => STAGE_KEYS.every(([, k]) => st.sel[k]);

        function buildSpec() {
          const v = variant();
          return {
            family: family().name,
            release: st.release || "0000.00",
            platform: v ? v.platform : "linux/amd64",
            components: Object.fromEntries(STAGE_KEYS.map(([, k]) => [k, st.sel[k]])),
            securityPolicy: st.policy || "standard",
            capabilities: ["ide", "mlflow-serving"],
          };
        }

        async function loadVariants() {
          try { st.variants = await api.listVariants(st.familyId); } catch { st.variants = []; }
          if (!st.variants.some((v) => v.id === st.variantId))
            st.variantId = st.variants.some((v) => v.id === preVariantId) ? preVariantId : st.variants[0]?.id;
        }

        function updateSave() { if (saveBtn) saveBtn.disabled = !allSelected() || (lastValid && !lastValid.allowed); }

        async function validate() {
          if (!allSelected()) { valBox.replaceChildren(h("span", { class: "muted small" }, "모든 Stage를 선택하세요.")); lastValid = null; updateSave(); return; }
          valBox.replaceChildren(h("span", { class: "muted small" }, "검증 중…"));
          try {
            const r = await api.validateRecipe(buildSpec());
            lastValid = r;
            valBox.replaceChildren(
              h("div", { class: "row", style: "gap:8px;" }, h("strong", {}, "호환성"), badge(r.status),
                r.specHash ? h("code", {}, r.specHash.slice(0, 12)) : null),
              r.problems?.length ? h("ul", { class: "small" }, ...r.problems.map((p) => h("li", {}, p))) : "",
              r.matches?.length ? h("ul", { class: "small muted" }, ...r.matches.map((m) => h("li", {}, `${m.ruleName}: ${m.status}${m.reason ? " — " + m.reason : ""}`))) : "",
              !r.problems?.length && !r.matches?.length ? h("div", { class: "small muted" }, "차단 규칙 없음") : "");
          } catch (e) { lastValid = null; valBox.replaceChildren(h("div", { class: "small", style: "color:var(--err)" }, errText(e))); }
          updateSave();
        }

        function rerender() {
          container.replaceChildren();
          const famSel = h("select", { onchange: async (e) => { st.familyId = e.target.value; await loadVariants(); rerender(); validate(); } },
            ...fams.map((f) => h("option", { value: f.id, selected: f.id === st.familyId }, f.displayName || f.name)));
          const varSel = h("select", { onchange: (e) => { st.variantId = e.target.value; validate(); } },
            ...st.variants.map((v) => h("option", { value: v.id, selected: v.id === st.variantId }, `${v.runtimeKey} (${v.platform})`)));
          const relInp = h("input", { value: st.release, placeholder: "2026.09", oninput: (e) => { st.release = e.target.value.trim(); } });
          const polInp = h("input", { value: st.policy, placeholder: "standard", oninput: (e) => { st.policy = e.target.value.trim(); } });
          container.append(h("div", { class: "cmp-grid" },
            h("label", {}, "Family"), famSel,
            h("label", {}, "Variant"), st.variants.length ? varSel : h("span", { class: "small muted" }, "Variant 없음 — Golden Families에서 생성"),
            h("label", {}, "Release"), relInp,
            h("label", {}, "Security Policy"), polInp));

          container.append(h("hr", { class: "sep" }), h("div", { class: "modal-sec" }, "Stage 컴포넌트 (G0~G5)"));
          for (const [s, k] of STAGE_KEYS) {
            const opts = byStage[s];
            const sel = opts.length
              ? h("select", { onchange: (e) => { st.sel[k] = e.target.value; validate(); } },
                  ...opts.map((o) => {
                    const ref = `${o.name}-${o.version}`;
                    return h("option", { value: ref, selected: ref === st.sel[k] }, `${o.name}:${o.version}${o.status === "candidate" ? " (candidate)" : ""}`);
                  }))
              : h("span", { class: "small", style: "color:var(--err)" }, "승인/후보 컴포넌트 없음 — Component Catalog에서 등록·승인");
            container.append(h("div", { class: "cmp-stage" },
              h("div", { class: "st-k" }, h("span", { class: "mono" }, s), " ", ctx.STAGE_LABELS[s]), sel));
          }
          container.append(valBox);
          container.append(h("label", { style: "display:flex;gap:8px;align-items:center;margin-top:12px;" },
            h("input", { type: "checkbox", checked: st.building, class: "field-inline", style: "width:auto;", onchange: (e) => { st.building = e.target.checked; } }),
            h("span", {}, "저장 후 바로 빌드")));
          updateSave();
        }

        async function doSave() {
          if (!allSelected()) { toast("모든 Stage를 선택하세요", "err"); return; }
          if (!st.variantId) { toast("Variant를 선택하세요", "err"); return; }
          saveBtn.disabled = true;
          try {
            const rec = await api.createRecipe({ variantId: st.variantId, spec: buildSpec(), createdBy: st.createdBy });
            toast(`Recipe r${rec.revision} 저장됨 (${rec.status})`, "ok");
            if (st.building) {
              const b = await api.requestBuild({ recipeRevisionId: rec.id, mode: "changed", reason: "composer" });
              toast(`빌드 ${b.status} · ${b.workflowName || b.buildId.slice(0, 8)}`, b.status === "failed" ? "err" : "ok");
            }
            close();
            ctx.navigate("dashboard", {});
            ctx.refresh();
          } catch (e) { saveBtn.disabled = false; toast(errText(e), "err"); }
        }

        root.append(container,
          h("div", { class: "actions" },
            h("button", { class: "ghost", onclick: close }, "취소"),
            h("button", { onclick: validate }, "검증"),
            saveBtn = h("button", { class: "primary", onclick: doSave }, "저장")));

        loadVariants().then(() => { rerender(); validate(); });
      },
    });
  }

  /* ===================================================================== view */
  const families = await api.listFamilies();

  if (!families.length) {
    el.append(h("h1", { class: "page-title" }, "Release Dashboard"));
    el.append(h("div", { class: "panel" },
      h("div", { class: "empty" },
        "등록된 Family가 없습니다. ",
        h("a", { href: "#/families" }, "Golden Families"), "에서 먼저 만드세요.")));
    return;
  }

  // One joined call (release + variant + family) instead of an N+1 fan-out.
  const images = await api.images();

  // Drill-down: a specific image (row click) -> full detail page.
  if (ctx.params.release) {
    const row = images.find((r) => r.releaseId === ctx.params.release);
    if (!row) { ctx.navigate("dashboard", {}); return; }
    await renderDetail(row);
    return;
  }

  // Otherwise: the global list.
  el.append(h("h1", { class: "page-title" }, "Release Dashboard"));
  el.append(h("div", { class: "spread", style: "margin-bottom:12px;" },
    h("p", { class: "page-sub", style: "margin:0;" }, "전체 Golden Image 목록 · 행을 클릭하면 상세가 열립니다"),
    h("button", { class: "primary", onclick: () => openComposer(families[0]?.id) }, "＋ 새 Golden Image")));

  // Filters (persisted in hash params so refresh keeps them).
  const stateF = ctx.params.state || "";
  const familyF = ctx.params.family || "";
  const q = (ctx.params.q || "").toLowerCase();
  const setFilters = (next) => {
    const merged = { state: stateF, family: familyF, q, ...next };
    const clean = {};
    for (const [k, v] of Object.entries(merged)) if (v) clean[k] = v;
    ctx.navigate("dashboard", clean);
  };

  el.append(h("div", { class: "row gi-filter" },
    h("select", { onchange: (e) => setFilters({ state: e.target.value }) },
      h("option", { value: "" }, "상태: 전체"),
      ...STATE_FILTERS.map((s) => h("option", { value: s, selected: s === stateF }, s))),
    h("select", { onchange: (e) => setFilters({ family: e.target.value }) },
      h("option", { value: "" }, "Family: 전체"),
      ...families.map((f) => h("option", { value: f.id, selected: f.id === familyF }, f.displayName || f.name))),
    h("input", {
      class: "gi-search", type: "search", placeholder: "Release · digest · family 검색…", value: ctx.params.q || "",
      onchange: (e) => setFilters({ q: e.target.value.trim() }),
    }),
    h("button", { class: "ghost", onclick: () => ctx.refresh() }, "새로고침")));

  const rows = images.filter((r) => {
    if (stateF && r.state !== stateF) return false;
    if (familyF && r.familyId !== familyF) return false;
    if (q && !(
      (r.releaseName || "").toLowerCase().includes(q) ||
      (r.imageDigest || "").toLowerCase().includes(q) ||
      (r.family || "").toLowerCase().includes(q)
    )) return false;
    return true;
  });

  const stableN = images.filter((r) => r.state === "stable").length;
  const candN = images.filter((r) => r.state === "candidate").length;

  el.append(h("div", { class: "panel" },
    h("div", { class: "spread", style: "margin-bottom:8px;" },
      h("h3", { style: "margin:0;" }, "Golden Images"),
      h("span", { class: "small muted" },
        `총 ${images.length} · Stable ${stableN} · Candidate ${candN}${rows.length !== images.length ? ` · 필터 ${rows.length}` : ""}`)),
    rows.length
      ? h("div", { class: "table-wrap" },
          h("table", {},
            h("thead", {}, h("tr", {},
              h("th", {}, "Family"), h("th", {}, "Runtime"), h("th", {}, "Release"),
              h("th", {}, "상태"), h("th", {}, "Registry 이미지"), h("th", {}, "생성일"))),
            h("tbody", {}, ...rows.map((r) =>
              h("tr", { class: "row-click", title: "상세 보기", onclick: () => ctx.navigate("dashboard", { release: r.releaseId }) },
                h("td", {}, r.family || "-"),
                h("td", { class: "small mono" }, r.runtime || "-"),
                h("td", {}, r.releaseName),
                h("td", {}, badge(r.state)),
                h("td", { class: "reg-cell" },
                  h("span", { class: "reg-ref", title: r.imageRefDigest || r.imageRef || "" }, r.imageRef || "-")),
                h("td", { class: "small muted" }, fmtDate(r.createdAt)))))))
      : h("div", { class: "empty" },
          images.length ? "필터 조건에 맞는 이미지가 없습니다." : "아직 생성된 Golden Image가 없습니다. ＋ 새 Golden Image로 시작하세요.")));
}
