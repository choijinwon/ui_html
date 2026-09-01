/* Component Catalog — G0~G5 통합 Component 목록 (SDD 16.3). */

export const title = "Component Catalog";

export const css = `
  .comp-filter { margin: 0 0 16px; }
  .comp-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .comp-tabs button.active { background: var(--accent); border-color: var(--accent); color: #06121f; }
  .comp-filter select { width: auto; }
  .comp-filter .comp-search { width: 220px; }
  .comp-actions { display: flex; gap: 6px; white-space: nowrap; }
  .comp-stage-cell { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .comp-name-sub { font-size: 11px; color: var(--text-dim); font-family: var(--mono); margin-top: 2px; }
  .kv { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; margin: 6px 0; font-size: 13px; }
  .kv .k { color: var(--text-dim); }
  .kv .v { word-break: break-all; }
  .detail-sec { font-weight: 700; font-size: 13px; margin: 14px 0 6px; }
  .meta-pre { margin: 0; padding: 10px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; font-family: var(--mono); font-size: 12px; white-space: pre; }
`;

// Package manager inferred from a base image (mirror of dockerfile_gen).
function inferPkgMgr(base) {
  const b = (base || "").toLowerCase();
  if (/ubi|redhat|rhel|fedora|rocky|almalinux|centos/.test(b)) return "dnf";
  if (/debian|ubuntu/.test(b)) return "apt";
  return "apk";
}

// Per-stage metadata guidance data (rendered into the modal's right panel).
const META_STAGE = {
  G0: {
    title: "G0 Foundation",
    desc: "베이스 이미지와 패키지 매니저를 여기서 정하면 G1~G5 전체 체인에 전파됩니다.",
    keys: [
      "dockerfile.base: 체인 베이스 이미지 (예: registry.access.redhat.com/ubi9/ubi:9.4)",
      "dockerfile.packageManager: apk | dnf | microdnf | apt (생략 시 base에서 추론)",
    ],
    example: { dockerfile: { base: "registry.access.redhat.com/ubi9/ubi:9.4", packageManager: "dnf", packages: ["ca-certificates", "tzdata"] } },
  },
  G1: { title: "G1 Accelerator", desc: "CUDA/cuDNN/NCCL 또는 CPU 최적화 런타임.",
    keys: ["dockerfile.packages: GPU 런타임 패키지"], example: { dockerfile: { packages: ["libcudnn9"] }, cuda: "12.4" } },
  G2: { title: "G2 Language", desc: "Python 인터프리터·uv/pip·공통 런타임.",
    keys: ["dockerfile.packages: python3 등"], example: { dockerfile: { packages: ["python3", "python3-pip"] }, python: "3.12" } },
  G3: { title: "G3 Framework", desc: "ML 프레임워크 라이브러리를 pip로 설치.",
    keys: ["dockerfile.pip: 프레임워크 라이브러리"], example: { dockerfile: { pip: ["torch==2.4.0"] }, framework: "pytorch" } },
  G4: { title: "G4 ML Platform", desc: "MLflow·serving 관련.",
    keys: ["dockerfile.pip: mlflow 등"], example: { dockerfile: { pip: ["mlflow==2.16.0"] } } },
  G5: { title: "G5 IDE", desc: "OpenVSCode·extension. env/files/entrypoint 등 전체 명령 사용 가능.",
    keys: ["dockerfile.files/entrypoint/env: 스크립트·엔트리포인트·환경변수"],
    example: { dockerfile: {
      env: { PLATFORM_MODE: "ide" }, workdir: "/workspace",
      files: { "/opt/start.sh": "#!/bin/sh\necho starting IDE\nexec \"$@\"\n" },
      run: ["chmod +x /opt/start.sh"], entrypoint: ["/opt/start.sh"],
    } } },
};
const META_COMMON_KEYS = [
  "dockerfile.packages: OS 패키지 목록",
  "dockerfile.pip: Python 라이브러리 목록",
  "dockerfile.env: {KEY: value} → ENV",
  "dockerfile.workdir: 경로 → WORKDIR",
  "dockerfile.files: {\"/경로\": \"내용\"} → 컨텍스트에 파일 생성 후 COPY (여러 줄 스크립트/설정)",
  "dockerfile.run: 임의 RUN 스텝 (files로 넣은 스크립트 실행 가능)",
  "dockerfile.entrypoint / cmd: [\"...\"] (exec) 또는 문자열 (shell)",
  "dockerfile.user / expose / args: USER / EXPOSE / ARG",
  "cves: [{id, severity, package}] — 보안 게이트 시뮬레이션",
  "simulate_test_failures / simulate_scanner_outage — 파이프라인 테스트용",
];

// Build the right-hand guide panel node for a stage. `fillTarget` (optional)
// is the input name to fill when 예시 채우기 is clicked.
function metadataGuideNode(h, stage, fillTarget) {
  const g = META_STAGE[stage] || { title: stage || "-", desc: "", keys: [], example: {} };
  const exampleText = JSON.stringify(g.example, null, 2);
  return h("div", {},
    h("h4", {}, `${g.title} · Metadata 가이드`),
    h("div", { class: "guide-body" }, g.desc),
    g.keys.length ? h("div", { class: "g-sec" }, "이 Stage 주요 키") : null,
    g.keys.length ? h("ul", {}, ...g.keys.map((k) => h("li", {}, k))) : null,
    h("div", { class: "g-sec" }, "예시"),
    h("pre", {}, exampleText),
    fillTarget ? h("button", {
      class: "sm ghost", type: "button", style: "margin-top:8px;",
      onclick: () => { const t = document.querySelector(`[name="${fillTarget}"]`); if (t) { t.value = exampleText; t.dispatchEvent(new Event("input", { bubbles: true })); } },
    }, "예시 채우기") : null,
    h("div", { class: "g-sec" }, "공통 키 (모든 Stage)"),
    h("ul", {}, ...META_COMMON_KEYS.map((k) => h("li", {}, k))));
}

const STATUSES = ["draft", "candidate", "approved", "blocked", "retired"];

export async function render(el, ctx) {
  const {
    api, h, badge, fmtDate, shortDigest, toast, errText,
    formModal, openModal, navigate, params, STAGES, STAGE_LABELS, refresh,
  } = ctx;

  const stage = params.stage || "";
  const status = params.status || "";
  const name = params.name || "";

  /* Filters live in the hash params so refresh() keeps them. */
  const setFilters = (next) => {
    const merged = { stage, status, name, ...next };
    const clean = {};
    for (const [k, v] of Object.entries(merged)) if (v) clean[k] = v;
    navigate("components", clean);
  };

  const parseMetadata = (text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("metadata는 유효한 JSON이어야 합니다");
    }
  };

  /* ------------------------------------------------------------- mutations */

  function openCreateModal() {
    formModal({
      title: "Component 등록",
      submitLabel: "등록",
      fields: [
        {
          name: "stage", label: "Stage", type: "select", value: stage || "G0",
          options: STAGES.map((s) => ({ value: s, label: `${s} — ${STAGE_LABELS[s]}` })),
        },
        { name: "name", label: "Name", required: true, placeholder: "cuda-runtime" },
        { name: "version", label: "Version", required: true, placeholder: "12.4.1" },
        { name: "ownerTeam", label: "Owner Team", placeholder: "platform-infra" },
        { name: "imageDigest", label: "Image Digest", placeholder: "sha256:…" },
        { name: "sourceRevision", label: "Source Revision", placeholder: "git commit / ref" },
        { name: "metadata", label: "Metadata (JSON)", type: "textarea", placeholder: '{"dockerfile": {"pip": ["mlflow"]}}' },
      ],
      // 오른쪽 가이드 패널 — Stage 선택에 따라 갱신
      guide: (vals) => metadataGuideNode(h, vals.stage, "metadata"),
      async onSubmit(v, close) {
        const metadata = parseMetadata(v.metadata);
        await api.createComponent({
          stage: v.stage,
          name: v.name,
          version: v.version,
          ownerTeam: v.ownerTeam || "",
          imageDigest: v.imageDigest,
          sourceRevision: v.sourceRevision,
          metadata,
        });
        close();
        toast(`Component ${v.name}:${v.version} 등록됨 (draft)`, "ok");
        refresh();
      },
    });
  }

  async function doVerify(c) {
    try {
      const r = await api.verifyComponent(c.id);
      toast(`테스트 ${r.test}: ${r.passed ? "통과" : "실패"}`, r.passed ? "ok" : "err");
      refresh();
    } catch (e) {
      toast(errText(e), "err");
    }
  }

  function openApproveModal(c) {
    formModal({
      title: `승인 — ${c.name}:${c.version}`,
      submitLabel: "승인",
      fields: [
        { name: "approver", label: "승인자", required: true, placeholder: "gjlee" },
        { name: "reason", label: "사유", type: "textarea", placeholder: "승인 근거" },
      ],
      async onSubmit(v, close) {
        await api.approveComponent(c.id, { approver: v.approver, reason: v.reason });
        close();
        toast(`${c.name}:${c.version} 승인됨 (approved)`, "ok");
        refresh();
      },
    });
  }

  function openVersionModal(c) {
    formModal({
      title: `새 버전 — ${c.stage} / ${c.name}`,
      submitLabel: "등록",
      fields: [
        { name: "version", label: "Version", required: true, placeholder: `현재: ${c.version}` },
        { name: "imageDigest", label: "Image Digest", placeholder: "sha256:…" },
        { name: "sourceRevision", label: "Source Revision", placeholder: "git commit / ref" },
        { name: "metadata", label: "Metadata (JSON)", type: "textarea", placeholder: '{"dockerfile": {"pip": ["mlflow"]}}' },
      ],
      guide: () => metadataGuideNode(h, c.stage, "metadata"),  // 새 버전은 Stage 고정
      async onSubmit(v, close) {
        const metadata = parseMetadata(v.metadata);
        const created = await api.addComponentVersion(c.id, {
          version: v.version,
          imageDigest: v.imageDigest,
          sourceRevision: v.sourceRevision,
          metadata,
        });
        close();
        toast(`${c.name}:${created.version} 새 버전 등록됨 (draft)`, "ok");
        refresh();
      },
    });
  }

  /* ------------------------------------------------ impact analysis (SDD 5/11.2) */
  async function openImpactModal(c) {
    let data;
    try { data = await api.componentImpact(c.id); } catch (e) { toast(errText(e), "err"); return; }
    openModal({
      title: `영향 분석 — ${c.stage} · ${c.name}:${c.version}`,
      body(root) {
        const sm = data.summary;
        root.append(
          h("p", { class: "small muted" },
            `이 컴포넌트를 변경하면 `, h("code", {}, data.rebuildFromStage),
            ` 부터 재빌드됩니다 (영향 Stage: ${data.affectedStages.join(" → ")}).`),
          h("div", { class: "row", style: "gap:14px;margin:8px 0 4px;" },
            h("div", { class: "stat" }, h("div", { class: "v" }, String(sm.total)), h("div", { class: "k" }, "참조 이미지")),
            h("div", { class: "stat" }, h("div", { class: "v" }, String(sm.usingThisVersion)), h("div", { class: "k" }, "이 버전 사용")),
            h("div", { class: "stat" }, h("div", { class: "v" }, Object.keys(sm.byState).length ? Object.entries(sm.byState).map(([k, n]) => `${k} ${n}`).join(", ") : "-"), h("div", { class: "k" }, "상태별"))));

        if (!data.images.length) {
          root.append(h("div", { class: "empty" }, "이 컴포넌트를 참조하는 이미지가 없습니다."));
          return;
        }
        root.append(h("div", { class: "detail-sec" }, "영향 받는 이미지"),
          h("div", { class: "table-wrap" }, h("table", {},
            h("thead", {}, h("tr", {},
              h("th", {}, "Family"), h("th", {}, "Runtime"), h("th", {}, "Release"),
              h("th", {}, "Foundation (G0)"),
              h("th", {}, "상태"), h("th", {}, "참조"), h("th", {}, "이 버전"))),
            h("tbody", {}, ...data.images.map((im) => h("tr", {},
              h("td", {}, im.family),
              h("td", { class: "small mono" }, im.runtime),
              h("td", {}, im.releaseName),
              h("td", { class: "small mono", title: im.foundation || "" }, im.foundationBase || im.foundation || "-"),
              h("td", {}, badge(im.state)),
              h("td", { class: "small mono" }, im.usedRef),
              h("td", {}, im.usesThisVersion ? h("span", { style: "color:var(--warn)" }, "● 사용") : h("span", { class: "muted" }, "다른 버전"))))))));
      },
      actions(close) {
        return h("div", { class: "actions" }, h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  /* ------------------------------------------------------- detail viewer */

  const kv = (k, v) => [h("div", { class: "k" }, k), h("div", { class: "v" }, v)];

  function openDetailModal(c) {
    const meta = c.metadata || {};
    const df = meta.dockerfile || {};
    // base/packageManager는 G0 Foundation의 속성으로 체인 전체에 전파된다. 비-G0 stage는
    // 자기 base가 없고 Recipe가 고른 G0에서 상속하므로, 어느 G0인지는 컴포넌트가 아니라
    // 이미지(Recipe) 단위로만 확정된다 (Dashboard 상세 / 영향 분석의 Foundation 컬럼 참고).
    const isG0 = c.stage === "G0";
    const base = isG0
      ? (df.base || "alpine:3.20 (기본)")
      : (df.base ? `${df.base} · 빌드 시 무시 (G0 base 상속)` : "G0에서 상속 · Recipe별로 결정");
    const pkgMgr = isG0 ? (df.packageManager || inferPkgMgr(df.base)) : "G0에서 상속";
    openModal({
      title: `${c.stage} · ${c.name}:${c.version}`,
      body(root) {
        root.append(
          h("div", { class: "kv" },
            ...kv("Stage", `${c.stage} — ${STAGE_LABELS[c.stage] || ""}`),
            ...kv("상태", badge(c.status)),
            ...kv("Owner", c.ownerTeam || "-"),
            ...kv("Image Digest", h("span", { class: "mono" }, c.imageDigest || "-")),
            ...kv("Source Revision", h("span", { class: "mono" }, c.sourceRevision || "-")),
            ...kv("등록일", fmtDate(c.createdAt))));

        // Build configuration (dockerfile_gen inputs).
        root.append(h("div", { class: "detail-sec" }, "빌드 구성 (Dockerfile)"));
        const buildKv = h("div", { class: "kv" },
          ...kv("Base Image", isG0 ? h("span", { class: "mono" }, base) : h("span", { class: "small muted" }, base)),
          ...kv("Package Manager", isG0 ? h("code", {}, pkgMgr) : h("span", { class: "small muted" }, pkgMgr)));
        if (df.packages?.length || df.apk?.length)
          buildKv.append(...kv("Packages", h("span", { class: "mono" }, (df.packages || df.apk).join(" "))));
        if (df.pip?.length) buildKv.append(...kv("pip", h("span", { class: "mono" }, df.pip.join(" "))));
        if (df.run?.length) buildKv.append(...kv("run", h("span", { class: "mono" }, df.run.join(" ; "))));
        root.append(buildKv);
        if (!Object.keys(df).length)
          root.append(h("p", { class: "small muted" }, "커스텀 빌드 구성 없음 — Stage 기본값으로 렌더링됩니다."));

        // Security / simulation hints.
        if (meta.cves?.length) {
          root.append(h("div", { class: "detail-sec" }, "선언된 CVE (시뮬레이션)"));
          root.append(h("div", { class: "table-wrap" }, h("table", {},
            h("thead", {}, h("tr", {}, h("th", {}, "ID"), h("th", {}, "Severity"), h("th", {}, "Package"))),
            h("tbody", {}, ...meta.cves.map((v) => h("tr", {},
              h("td", { class: "mono small" }, v.id || "-"),
              h("td", {}, badge(v.severity || "medium")),
              h("td", { class: "mono small" }, v.package || "-")))))));
        }
        const sims = [];
        if (meta.simulate_test_failures?.length) sims.push(`test 실패: ${meta.simulate_test_failures.join(", ")}`);
        if (meta.simulate_scanner_outage) sims.push("scanner outage");
        if (sims.length) root.append(h("p", { class: "small muted", style: "margin-top:8px;" }, "시뮬레이션 플래그 — " + sims.join(" · ")));

        // Raw metadata.
        root.append(h("div", { class: "detail-sec" }, "원본 metadata"));
        root.append(h("pre", { class: "meta-pre" },
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "{}"));
      },
      actions(close) {
        return h("div", { class: "actions" },
          h("button", { class: "ghost", onclick: close }, "닫기"));
      },
    });
  }

  /* ---------------------------------------------------------------- header */

  el.append(h("div", { class: "spread" },
    h("div", {},
      h("h1", { class: "page-title" }, "Component Catalog"),
      h("p", { class: "page-sub" }, "G0~G5 Component 통합 목록 · Stage 검증과 승인 관리")),
    h("button", { class: "primary", onclick: openCreateModal }, "Component 등록")));

  /* ------------------------------------------------------------ filter bar */

  const tabButton = (value, label) => h("button", {
    class: `sm${stage === value ? " active" : ""}`,
    title: value ? STAGE_LABELS[value] : "모든 Stage",
    onclick: () => setFilters({ stage: value }),
  }, label);

  el.append(h("div", { class: "row comp-filter" },
    h("div", { class: "comp-tabs" },
      tabButton("", "전체"),
      ...STAGES.map((s) => tabButton(s, s))),
    h("select", { onchange: (e) => setFilters({ status: e.target.value }) },
      h("option", { value: "" }, "상태: 전체"),
      ...STATUSES.map((s) => h("option", { value: s, selected: s === status }, s))),
    h("input", {
      class: "comp-search", type: "search", placeholder: "이름 검색…", value: name,
      onchange: (e) => setFilters({ name: e.target.value.trim() }),
    })));

  /* ----------------------------------------------------------------- table */

  const components = await api.listComponents({ stage, status, name });

  if (!components.length) {
    el.append(h("div", { class: "panel" },
      h("div", { class: "empty" },
        stage || status || name
          ? "조건에 맞는 Component가 없습니다"
          : "등록된 Component가 없습니다. Component 등록으로 시작하세요.")));
    return;
  }

  const nameSub = (c) => {
    const df = (c.metadata || {}).dockerfile || {};
    const bits = [];
    if (df.base) bits.push(df.base);
    const mgr = df.packageManager || (df.base ? inferPkgMgr(df.base) : "");
    if (mgr) bits.push(mgr);
    return bits.length ? h("div", { class: "comp-name-sub" }, bits.join(" · ")) : null;
  };

  const row = (c) => h("tr", {},
    h("td", {},
      h("div", { class: "comp-stage-cell" },
        h("span", { class: `badge stage-c-${(c.stage || "").toLowerCase()}` }, c.stage),
        h("span", { class: "small muted" }, STAGE_LABELS[c.stage] || ""))),
    h("td", {}, c.name, nameSub(c)),
    h("td", {}, h("code", {}, c.version)),
    h("td", {}, badge(c.status)),
    h("td", {}, c.ownerTeam || h("span", { class: "muted" }, "-")),
    h("td", {}, h("span", { class: "mono", title: c.imageDigest || "" }, shortDigest(c.imageDigest))),
    h("td", { class: "small muted" }, fmtDate(c.createdAt)),
    h("td", {},
      h("div", { class: "comp-actions" },
        h("button", { class: "sm", onclick: () => openDetailModal(c) }, "상세"),
        h("button", { class: "sm", onclick: () => openImpactModal(c) }, "영향"),
        h("button", { class: "sm", onclick: () => doVerify(c) }, "검증"),
        c.status === "candidate" &&
          h("button", { class: "sm primary", onclick: () => openApproveModal(c) }, "승인"),
        h("button", { class: "sm ghost", onclick: () => openVersionModal(c) }, "새 버전"))));

  el.append(h("div", { class: "panel" },
    h("div", { class: "table-wrap" },
      h("table", {},
        h("thead", {},
          h("tr", {},
            h("th", {}, "Stage"), h("th", {}, "Name"), h("th", {}, "Version"),
            h("th", {}, "Status"), h("th", {}, "Owner"), h("th", {}, "Digest"),
            h("th", {}, "등록일"), h("th", {}, "Actions"))),
        h("tbody", {}, ...components.map(row)))),
    h("p", { class: "small muted", style: "margin: 10px 0 0" }, `${components.length} components`)));
}
