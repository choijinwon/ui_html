export const title = "등록";

export const css = `
.reg-layout { grid-template-columns: 1fr 1fr; align-items: start; }
.reg-form textarea { min-height: 86px; }
.reg-form .full { grid-column: 1 / -1; }
@media (max-width: 980px) { .reg-layout { grid-template-columns: 1fr; } }
`;

const STAGE_KEYS = [
  ["G0", "foundation"], ["G1", "accelerator"], ["G2", "language"],
  ["G3", "framework"], ["G4", "mlPlatform"], ["G5", "ide"],
];

const readForm = (form) => Object.fromEntries(new FormData(form).entries());

function field(h, label, input) {
  return h("div", { class: "field" }, h("label", {}, label), input);
}

function submitMessage(h) {
  return h("div", { class: "small muted", style: "min-height:18px;" });
}

export async function render(el, ctx) {
  const { api, h, toast, errText, STAGES, STAGE_LABELS } = ctx;
  const [families, components] = await Promise.all([
    api.listFamilies().catch(() => []),
    api.listComponents({}).catch(() => []),
  ]);

  const approvedByStage = {};
  for (const [stage] of STAGE_KEYS) {
    approvedByStage[stage] = components.filter((c) => c.stage === stage && ["approved", "candidate"].includes(c.status));
  }

  el.append(h("div", { class: "page-head" },
    h("div", {},
      h("h2", { class: "page-title" }, "등록 화면"),
      h("p", { class: "page-sub" }, "기존 API로 Family, Variant, Component, Rule, Recipe를 등록합니다."))));

  function familyForm() {
    const msg = submitMessage(h);
    const form = h("form", { class: "panel reg-form" },
      h("h3", {}, "Family 등록"),
      h("div", { class: "grid form-grid" },
        field(h, "Name", h("input", { name: "name", required: true, placeholder: "pytorch-gpu" })),
        field(h, "Display Name", h("input", { name: "displayName", required: true, placeholder: "PyTorch GPU" })),
        field(h, "Owner Team", h("input", { name: "ownerTeam", required: true, placeholder: "ml-platform" })),
        field(h, "Description", h("textarea", { name: "description", placeholder: "Family 설명" }))),
      h("div", { class: "form-actions" }, msg, h("button", { class: "primary", type: "submit" }, "Family 등록")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        await api.createFamily(v);
        msg.textContent = "Family 등록 완료";
        toast("Family가 등록되었습니다", "ok");
      } catch (ex) { msg.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function variantForm() {
    const msg = submitMessage(h);
    const form = h("form", { class: "panel reg-form" },
      h("h3", {}, "Variant 등록"),
      h("div", { class: "grid form-grid" },
        field(h, "Family", h("select", { name: "familyId", required: true },
          ...families.map((f) => h("option", { value: f.id }, f.displayName || f.name)))),
        field(h, "Platform", h("input", { name: "platform", required: true, value: "linux/amd64" })),
        field(h, "Runtime Key", h("input", { name: "runtimeKey", required: true, placeholder: "cu124-py312" })),
        field(h, "Support End", h("input", { name: "supportEndAt", type: "datetime-local" }))),
      h("div", { class: "form-actions" }, msg, h("button", { class: "primary", type: "submit", disabled: !families.length }, "Variant 등록")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        await api.createVariant(v.familyId, {
          platform: v.platform,
          runtimeKey: v.runtimeKey,
          supportEndAt: v.supportEndAt ? new Date(v.supportEndAt).toISOString() : undefined,
        });
        msg.textContent = "Variant 등록 완료";
        toast("Variant가 등록되었습니다", "ok");
      } catch (ex) { msg.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function componentForm() {
    const msg = submitMessage(h);
    const form = h("form", { class: "panel reg-form" },
      h("h3", {}, "Component 등록"),
      h("div", { class: "grid form-grid" },
        field(h, "Stage", h("select", { name: "stage" },
          ...STAGES.map((s) => h("option", { value: s }, `${s} · ${STAGE_LABELS[s]}`)))),
        field(h, "Name", h("input", { name: "name", required: true, placeholder: "cuda-runtime" })),
        field(h, "Version", h("input", { name: "version", required: true, placeholder: "12.4.1" })),
        field(h, "Owner Team", h("input", { name: "ownerTeam", placeholder: "platform-infra" })),
        field(h, "Image Digest", h("input", { name: "imageDigest", placeholder: "sha256:..." })),
        field(h, "Source Revision", h("input", { name: "sourceRevision", placeholder: "git commit / ref" })),
        h("div", { class: "field full" },
          h("label", {}, "Metadata JSON"),
          h("textarea", { name: "metadata", placeholder: "{\"dockerfile\":{\"pip\":[\"mlflow\"]}}" }))),
      h("div", { class: "form-actions" }, msg, h("button", { class: "primary", type: "submit" }, "Component 등록")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        await api.createComponent({
          stage: v.stage,
          name: v.name,
          version: v.version,
          ownerTeam: v.ownerTeam || "",
          imageDigest: v.imageDigest || undefined,
          sourceRevision: v.sourceRevision || undefined,
          metadata: v.metadata ? JSON.parse(v.metadata) : {},
        });
        msg.textContent = "Component 등록 완료";
        toast("Component가 등록되었습니다", "ok");
      } catch (ex) { msg.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function ruleForm() {
    const msg = submitMessage(h);
    const stageOpts = [h("option", { value: "" }, "없음"), ...STAGES.map((s) => h("option", { value: s }, `${s} · ${STAGE_LABELS[s]}`))];
    const form = h("form", { class: "panel reg-form" },
      h("h3", {}, "Compatibility Rule 등록"),
      h("div", { class: "grid form-grid" },
        field(h, "Name", h("input", { name: "name", required: true, placeholder: "block-tensorflow-python313" })),
        field(h, "Status", h("select", { name: "status" },
          h("option", { value: "blocked" }, "blocked"),
          h("option", { value: "review" }, "review"),
          h("option", { value: "supported" }, "supported"))),
        field(h, "Subject Stage", h("select", { name: "subjectStage" }, ...stageOpts.map((x) => x.cloneNode(true)))),
        field(h, "Subject Name", h("input", { name: "subjectName", required: true, placeholder: "tensorflow*" })),
        field(h, "Object Stage", h("select", { name: "objectStage" }, ...stageOpts.map((x) => x.cloneNode(true)))),
        field(h, "Object Name", h("input", { name: "objectName", placeholder: "python*" })),
        h("div", { class: "field full" }, h("label", {}, "Reason"), h("textarea", { name: "reason" }))),
      h("div", { class: "form-actions" }, msg, h("button", { class: "primary", type: "submit" }, "Rule 등록")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        await api.createRule(v);
        msg.textContent = "Rule 등록 완료";
        toast("Rule이 등록되었습니다", "ok");
      } catch (ex) { msg.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    return form;
  }

  function recipeForm() {
    const msg = submitMessage(h);
    const familySelect = h("select", { name: "familyId", required: true },
      ...families.map((f) => h("option", { value: f.id }, f.displayName || f.name)));
    const variantSelect = h("select", { name: "variantId", required: true });
    const stageSelects = {};
    for (const [stage, key] of STAGE_KEYS) {
      stageSelects[key] = h("select", { name: key, required: true },
        ...approvedByStage[stage].map((c) => h("option", { value: `${c.name}-${c.version}` }, `${c.name}:${c.version}`)));
    }

    async function refreshVariants() {
      const variants = familySelect.value ? await api.listVariants(familySelect.value).catch(() => []) : [];
      variantSelect.replaceChildren(...variants.map((v) => h("option", { value: v.id, dataset: { platform: v.platform } }, `${v.runtimeKey} (${v.platform})`)));
    }

    const form = h("form", { class: "panel reg-form full" },
      h("h3", {}, "Golden Image Recipe 등록"),
      h("div", { class: "grid form-grid" },
        field(h, "Family", familySelect),
        field(h, "Variant", variantSelect),
        field(h, "Release", h("input", { name: "release", required: true, placeholder: "2026.09" })),
        field(h, "Created By", h("input", { name: "createdBy", value: "operator" })),
        ...STAGE_KEYS.map(([stage, key]) => field(h, `${stage} ${STAGE_LABELS[stage]}`, stageSelects[key]))),
      h("div", { class: "form-actions" },
        msg,
        h("button", { class: "ghost", type: "button", onclick: async () => {
          try {
            const v = readForm(form);
            const spec = buildSpec(v);
            const res = await api.validateRecipe(spec);
            msg.textContent = `검증 결과: ${res.status}`;
          } catch (ex) { msg.textContent = errText(ex); }
        } }, "검증"),
        h("button", { class: "primary", type: "submit", disabled: !families.length }, "Recipe 등록")));

    function buildSpec(v) {
      const fam = families.find((f) => f.id === v.familyId);
      const opt = variantSelect.selectedOptions[0];
      return {
        family: fam?.name || "",
        release: v.release,
        platform: opt?.dataset.platform || "linux/amd64",
        components: Object.fromEntries(STAGE_KEYS.map(([, key]) => [key, v[key]])),
        securityPolicy: "standard",
        capabilities: ["ide", "mlflow-serving"],
      };
    }

    familySelect.addEventListener("change", refreshVariants);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const v = readForm(form);
        const created = await api.createRecipe({ variantId: v.variantId, spec: buildSpec(v), createdBy: v.createdBy, actor: v.createdBy });
        msg.textContent = `Recipe r${created.revision} 등록 완료`;
        toast("Recipe가 등록되었습니다", "ok");
      } catch (ex) { msg.textContent = errText(ex); toast(errText(ex), "err"); }
    });
    refreshVariants();
    return form;
  }

  const sections = [
    ["all", "전체", null],
    ["family", "Family 등록", familyForm()],
    ["variant", "Variant 등록", variantForm()],
    ["component", "Component 등록", componentForm()],
    ["rule", "Compatibility Rule 등록", ruleForm()],
    ["recipe", "Golden Image Recipe 등록", recipeForm()],
  ];
  let selectedType = ctx.params.type && sections.some(([key]) => key === ctx.params.type) ? ctx.params.type : "all";
  const host = h("div", {});
  const typeSelect = h("select", { onchange: (e) => { selectedType = e.target.value; renderSections(); } },
    ...sections.map(([key, label]) => h("option", { value: key, selected: key === selectedType }, `등록 유형: ${label}`)));

  function renderSections() {
    const visible = sections.filter(([key]) => selectedType === "all" ? key !== "all" : key === selectedType);
    host.replaceChildren(h("div", { class: "grid reg-layout" }, ...visible.map(([, , node]) => node)));
  }

  el.append(h("div", { class: "panel", style: "margin-bottom:14px;" },
    h("div", { class: "grid form-grid" }, field(h, "등록 유형 선택", typeSelect))),
    host);
  renderSections();
}
