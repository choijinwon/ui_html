/* Compatibility Matrix (SDD 16.4)
   Framework × Python/CUDA 조합의 supported/review/blocked 상태를 표시하고,
   셀 선택 시 적용된 Rule과 사유를 보여준다. */

export const title = "Compatibility Matrix";

export const css = `
.matrix-layout { grid-template-columns: 2fr 1fr; align-items: start; }
@media (max-width: 1100px) { .matrix-layout { grid-template-columns: 1fr; } }
.matrix.dim-supported td.cell.supported, .matrix.dim-supported td.cell.unbuilt { opacity: .28; }
.matrix td.cell.unbuilt { background: var(--bg-panel-2); border-color: var(--border); color: var(--text-dim); }
.matrix th.rowhead { white-space: nowrap; }
.rule-item { padding: 8px 0; }
.rule-item + .rule-item { border-top: 1px solid var(--border); }
.matrix-controls { margin-bottom: 10px; }
.matrix-controls select { width: auto; }
.matrix-controls .chk { display: inline-flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; }
.matrix-legend { display: flex; gap: 14px; flex-wrap: wrap; margin: 0 0 12px; font-size: 12px; color: var(--text-dim); }
.matrix-legend .lg { display: inline-flex; align-items: center; gap: 5px; }
.matrix-legend .sw { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--border); }
.matrix-legend .sw.supported { background: rgba(63,185,100,.5); }
.matrix-legend .sw.unbuilt { background: var(--bg-panel-2); }
.matrix-legend .sw.review { background: rgba(224,165,58,.5); }
.matrix-legend .sw.blocked { background: rgba(224,90,78,.6); }
`;

const STATUS_OPTIONS = [
  { value: "supported", label: "supported" },
  { value: "review", label: "review" },
  { value: "blocked", label: "blocked" },
];

export async function render(el, ctx) {
  const { h, api, badge, fmtDate, STAGES, STAGE_LABELS } = ctx;

  const rowStage = STAGES.includes(ctx.params.rowStage) ? ctx.params.rowStage : "G3";
  const colStage = STAGES.includes(ctx.params.colStage) ? ctx.params.colStage : "G2";

  const stageOptions = (withNone) => [
    ...(withNone ? [{ value: "", label: "없음" }] : []),
    ...STAGES.map((s) => ({ value: s, label: `${s} · ${STAGE_LABELS[s]}` })),
  ];

  /* ------------------------------------------------------------ Rule 추가 */
  function openRuleModal() {
    ctx.formModal({
      title: "Rule 추가",
      submitLabel: "저장",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, placeholder: "block-pytorch-python313" },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "blocked" },
        { name: "subjectStage", label: "Subject Stage", type: "select", options: stageOptions(true), value: "" },
        { name: "subjectName", label: "Subject Name", type: "text", required: true, placeholder: "pytorch*" },
        { name: "subjectVersion", label: "Subject Version", type: "text", placeholder: "*" },
        { name: "objectStage", label: "Object Stage", type: "select", options: stageOptions(true), value: "" },
        { name: "objectName", label: "Object Name", type: "text", placeholder: "python*" },
        { name: "objectVersion", label: "Object Version", type: "text", placeholder: "*" },
        { name: "reason", label: "사유", type: "textarea", placeholder: "차단/검토가 필요한 이유" },
      ],
      async onSubmit(values, close) {
        /* formModal이 빈 값을 undefined로 만들므로 그대로 전달하면
           JSON 직렬화 시 생략되어 API 기본값이 적용된다. */
        await api.createRule({
          name: values.name,
          status: values.status,
          subjectStage: values.subjectStage,
          subjectName: values.subjectName,
          subjectVersion: values.subjectVersion,
          objectStage: values.objectStage,
          objectName: values.objectName,
          objectVersion: values.objectVersion,
          reason: values.reason,
        });
        close();
        ctx.toast("Rule이 생성되었습니다", "ok");
        ctx.refresh();
      },
    });
  }

  /* --------------------------------------------------------------- header */
  el.append(
    h("div", { class: "spread" },
      h("div", {},
        h("h1", { class: "page-title" }, "Compatibility Matrix"),
        h("p", { class: "page-sub" }, "Stage 간 Component 조합의 호환성 상태와 적용 Rule을 확인합니다.")),
      h("button", { class: "primary", onclick: openRuleModal }, "Rule 추가")));

  /* -------------------------------------------------------------- controls */
  const changeStage = (next) => ctx.navigate("matrix", { rowStage, colStage, ...next });
  const stageSelect = (current, onPick) =>
    h("select", { onchange: (e) => onPick(e.target.value) },
      ...STAGES.map((s) => h("option", { value: s, selected: s === current }, `${s} · ${STAGE_LABELS[s]}`)));

  const focusChk = h("input", { type: "checkbox", class: "field-inline" });
  el.append(
    h("div", { class: "row matrix-controls" },
      h("span", { class: "small muted" }, "Row Stage"),
      stageSelect(rowStage, (v) => changeStage({ rowStage: v })),
      h("span", { class: "small muted" }, "Col Stage"),
      stageSelect(colStage, (v) => changeStage({ colStage: v })),
      h("label", { class: "chk small muted" }, focusChk, "문제 조합만 강조")));
  const lg = (cls, label) => h("span", { class: "lg" }, h("span", { class: `sw ${cls}` }), label);
  el.append(h("div", { class: "matrix-legend" },
    lg("supported", "supported (빌드 성공)"), lg("unbuilt", "미빌드"),
    lg("review", "review"), lg("blocked", "blocked")));

  /* ----------------------------------------------------------------- data */
  const [matrix, rules] = await Promise.all([api.matrix(rowStage, colStage), api.listRules()]);
  const cellMap = new Map(matrix.cells.map((c) => [`${c.rowId}|${c.colId}`, c]));

  /* ----------------------------------------------------------- detail pane */
  const detailBody = h("div", {},
    h("div", { class: "empty" }, "셀을 선택하면 조합 상세가 표시됩니다."));

  function showDetail(row, col, cell) {
    const ruleList = cell.rules.length
      ? cell.rules.map((r) =>
          h("div", { class: "rule-item" },
            h("div", { class: "spread" }, h("strong", {}, r.name), badge(r.status)),
            r.reason ? h("div", { class: "muted small" }, r.reason) : null))
      : [h("div", { class: "muted small" }, "적용된 Rule 없음")];

    detailBody.replaceChildren(
      h("div", { class: "spread" },
        h("div", { class: "mono" }, `${row.name}:${row.version}`, h("span", { class: "muted" }, " × "),
          `${col.name}:${col.version}`),
        badge(cell.status)),
      h("div", { class: "small", style: "margin: 6px 0 2px;" },
        cell.built
          ? h("span", { style: "color: var(--ok);" }, "✓ 이 조합으로 빌드 성공 이력 있음")
          : h("span", { class: "muted" }, "빌드 성공 이력 없음 — supported가 되려면 이 조합으로 빌드가 성공해야 합니다")),
      h("hr", { class: "sep" }),
      h("div", { class: "small muted", style: "margin-bottom: 6px;" }, "적용된 Rule"),
      ...ruleList);
  }

  /* ---------------------------------------------------------------- matrix */
  let matrixContent;
  if (!matrix.rows.length || !matrix.cols.length) {
    const missing = [
      !matrix.rows.length ? `${rowStage} (${STAGE_LABELS[rowStage]})` : null,
      !matrix.cols.length ? `${colStage} (${STAGE_LABELS[colStage]})` : null,
    ].filter(Boolean).join(", ");
    matrixContent = h("div", { class: "empty" },
      `${missing} Stage에 표시할 Component가 없습니다.`, h("br", {}),
      "approved 또는 candidate 상태의 Component가 있어야 매트릭스가 표시됩니다. ",
      "Component Catalog에서 Component를 등록하고 검증/승인을 진행하세요.");
  } else {
    let selectedTd = null;
    const table = h("table", { class: "matrix" },
      h("thead", {},
        h("tr", {},
          h("th", { class: "mono small muted" }, `${rowStage} \\ ${colStage}`),
          ...matrix.cols.map((c) =>
            h("th", {}, c.name, h("br", {}), h("span", { class: "small muted mono" }, c.version))))),
      h("tbody", {},
        ...matrix.rows.map((row) =>
          h("tr", {},
            h("th", { class: "rowhead" }, row.name, h("br", {}), h("span", { class: "small muted mono" }, row.version)),
            ...matrix.cols.map((col) => {
              const cell = cellMap.get(`${row.id}|${col.id}`);
              if (!cell) return h("td", { class: "cell" }, "-");
              const td = h("td", { class: `cell ${cell.status}` }, cell.status === "unbuilt" ? "미빌드" : cell.status);
              td.addEventListener("click", () => {
                if (selectedTd) selectedTd.classList.remove("selected");
                selectedTd = td;
                td.classList.add("selected");
                showDetail(row, col, cell);
              });
              return td;
            })))));
    focusChk.addEventListener("change", () => table.classList.toggle("dim-supported", focusChk.checked));
    matrixContent = h("div", { class: "matrix-wrap" }, table);
  }

  el.append(
    h("div", { class: "grid matrix-layout" },
      h("div", { class: "panel" },
        h("h3", {}, `Matrix — ${STAGE_LABELS[rowStage]} × ${STAGE_LABELS[colStage]}`),
        matrixContent),
      h("div", { class: "panel" },
        h("h3", {}, "선택 조합 상세"),
        detailBody)));

  /* ------------------------------------------------------------ rule table */
  const pattern = (stage, name, version) =>
    name || stage ? `${stage ?? "*"} ${name ?? "*"}:${version ?? "*"}` : null;

  const rulesTable = rules.length
    ? h("div", { class: "table-wrap" },
        h("table", {},
          h("thead", {},
            h("tr", {},
              h("th", {}, "이름"), h("th", {}, "Subject"), h("th", {}, "Object"),
              h("th", {}, "상태"), h("th", {}, "사유"), h("th", {}, "생성일"))),
          h("tbody", {},
            ...rules.map((r) =>
              h("tr", {},
                h("td", {}, h("strong", {}, r.name)),
                h("td", { class: "mono" }, pattern(r.subjectStage, r.subjectName, r.subjectVersion) ?? "-"),
                h("td", { class: "mono" }, pattern(r.objectStage, r.objectName, r.objectVersion) ?? "-"),
                h("td", {}, badge(r.status)),
                h("td", { class: "muted" }, r.reason || "-"),
                h("td", { class: "small muted" }, fmtDate(r.createdAt)))))))
    : h("div", { class: "empty" }, "등록된 Rule이 없습니다. 상단의 Rule 추가로 첫 Rule을 만드세요.");

  el.append(
    h("div", { class: "panel", style: "margin-top: 14px;" },
      h("h3", {}, "전체 Rule 목록"),
      rulesTable));
}
