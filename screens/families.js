/* Golden Families screen (SDD 16.2).
   Family cards with status filter, expandable variants table, 새 Family / 새 Variant. */

export const title = "Golden Families";

export const css = `
  .fam-card { cursor: pointer; }
  .fam-card .fam-name { font-weight: 700; font-size: 15px; }
  .fam-card .fam-stats { margin-top: 12px; gap: 22px; }
  .fam-card .fam-stats .v { font-size: 18px; }
  .fam-variants { cursor: default; }
`;

export async function render(el, ctx) {
  const { api, h, badge, fmtDate } = ctx;

  const families = await api.listFamilies();
  let filter = "all";

  const shortId = (id) => (id && id.length > 14 ? id.slice(0, 14) + "…" : id);
  const stat = (v, k) =>
    h("div", { class: "stat" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));

  /* ---------------------------------------------------------------- header */
  el.append(
    h("div", { class: "spread" },
      h("div", {},
        h("h1", { class: "page-title" }, "Golden Families"),
        h("p", { class: "page-sub" }, "Golden Image Family / Variant 카탈로그")),
      h("button", { class: "primary", onclick: openCreateFamily }, "새 Family")));

  /* ------------------------------------------------------------ filter row */
  const FILTERS = [["all", "전체"], ["active", "active"], ["deprecated", "deprecated"], ["retired", "retired"]];
  const filterRow = h("div", { class: "row", style: "margin-bottom: 16px;" });
  const cardsHost = h("div", {});
  el.append(filterRow, cardsHost);

  function renderFilters() {
    filterRow.replaceChildren(...FILTERS.map(([value, label]) =>
      h("button", {
        class: "sm" + (filter === value ? " primary" : ""),
        onclick: () => { filter = value; renderFilters(); renderCards(); },
      }, label)));
  }

  function renderCards() {
    const list = filter === "all" ? families : families.filter((f) => f.status === filter);
    if (!list.length) {
      cardsHost.replaceChildren(
        h("div", { class: "panel" },
          h("div", { class: "empty" },
            families.length
              ? "해당 상태의 Family가 없습니다."
              : "등록된 Family가 없습니다. 새 Family 버튼으로 시작하세요.")));
      return;
    }
    cardsHost.replaceChildren(h("div", { class: "cards" }, ...list.map(familyCard)));
  }

  /* ----------------------------------------------------------- family card */
  function familyCard(f) {
    const variantsHost = h("div", { class: "fam-variants" });
    let expanded = false;

    async function toggle() {
      expanded = !expanded;
      if (!expanded) { variantsHost.replaceChildren(); return; }
      variantsHost.replaceChildren(
        h("hr", { class: "sep" }),
        h("div", { class: "muted small" }, "Variant 불러오는 중…"));
      try {
        const variants = await api.listVariants(f.id);
        if (!expanded) return;
        variantsHost.replaceChildren(h("hr", { class: "sep" }), variantsSection(f, variants));
      } catch (e) {
        variantsHost.replaceChildren(
          h("hr", { class: "sep" }),
          h("div", { class: "small", style: "color: var(--err); white-space: pre-wrap;" }, ctx.errText(e)));
      }
    }

    return h("div", {
      class: "panel fam-card",
      title: "클릭하여 Variant 목록 열기/닫기",
      onclick: (e) => { if (e.target.closest("button, a, .fam-variants")) return; toggle(); },
    },
      h("div", { class: "spread" },
        h("div", { class: "fam-name" }, f.displayName),
        badge(f.status)),
      h("div", { class: "small", style: "margin-top: 4px;" },
        h("code", {}, f.name),
        h("span", { class: "muted" }, " · ", f.ownerTeam)),
      f.description
        ? h("p", { class: "muted small", style: "margin: 8px 0 0;" }, f.description)
        : null,
      h("div", { class: "row fam-stats" },
        stat(f.variantCount, "Variants"),
        stat(f.stableReleases, "Stable"),
        stat(f.candidateReleases, "Candidate")),
      variantsHost);
  }

  /* ------------------------------------------------------ variants section */
  function variantsSection(f, variants) {
    const head = h("div", { class: "spread" },
      h("div", { class: "small muted", style: "font-weight: 600;" }, `Variants (${variants.length})`),
      h("button", { class: "sm", onclick: () => openCreateVariant(f) }, "새 Variant"));

    if (!variants.length) {
      return h("div", {}, head, h("div", { class: "empty" }, "Variant가 없습니다."));
    }

    const table = h("div", { class: "table-wrap" },
      h("table", {},
        h("thead", {},
          h("tr", {},
            h("th", {}, "Platform"),
            h("th", {}, "Runtime Key"),
            h("th", {}, "지원 종료"),
            h("th", {}, "Stable Release"),
            h("th", {}, ""))),
        h("tbody", {}, ...variants.map((v) =>
          h("tr", {},
            h("td", { class: "mono" }, v.platform),
            h("td", { class: "mono" }, v.runtimeKey),
            h("td", {}, fmtDate(v.supportEndAt)),
            h("td", {},
              v.currentStableReleaseId
                ? h("code", { title: v.currentStableReleaseId }, shortId(v.currentStableReleaseId))
                : h("span", { class: "muted" }, "없음")),
            h("td", {},
              h("button", {
                class: "sm",
                onclick: () => ctx.navigate("dashboard", { familyId: f.id, variantId: v.id }),
              }, "대시보드")))))));

    return h("div", {}, head, table);
  }

  /* ----------------------------------------------------------- new family */
  function openCreateFamily() {
    ctx.formModal({
      title: "새 Family",
      submitLabel: "저장",
      fields: [
        { name: "name", label: "이름 (name)", type: "text", required: true, placeholder: "pytorch-gpu" },
        { name: "displayName", label: "표시 이름 (displayName)", type: "text", required: true, placeholder: "PyTorch GPU" },
        { name: "ownerTeam", label: "Owner 팀 (ownerTeam)", type: "text", required: true, placeholder: "ml-platform" },
        { name: "description", label: "설명", type: "textarea", placeholder: "Family 설명 (선택)" },
      ],
      async onSubmit(values, close) {
        if (!values.name || !values.displayName || !values.ownerTeam) {
          throw new Error("필수 항목(name, displayName, ownerTeam)을 입력하세요.");
        }
        await api.createFamily({
          name: values.name,
          displayName: values.displayName,
          ownerTeam: values.ownerTeam,
          description: values.description,
        });
        close();
        ctx.toast(`Family '${values.name}' 생성 완료`, "ok");
        ctx.refresh();
      },
    });
  }

  /* ---------------------------------------------------------- new variant */
  function openCreateVariant(f) {
    ctx.formModal({
      title: `새 Variant — ${f.displayName}`,
      submitLabel: "저장",
      fields: [
        { name: "platform", label: "Platform", type: "text", required: true, value: "linux/amd64" },
        { name: "runtimeKey", label: "Runtime Key", type: "text", required: true, placeholder: "cu121-py311" },
        { name: "supportEndAt", label: "지원 종료일 (선택)", type: "datetime-local" },
      ],
      async onSubmit(values, close) {
        if (!values.platform || !values.runtimeKey) {
          throw new Error("필수 항목(platform, runtimeKey)을 입력하세요.");
        }
        await api.createVariant(f.id, {
          platform: values.platform,
          runtimeKey: values.runtimeKey,
          supportEndAt: values.supportEndAt ? new Date(values.supportEndAt).toISOString() : undefined,
        });
        close();
        ctx.toast(`Variant '${values.runtimeKey}' 생성 완료`, "ok");
        ctx.refresh();
      },
    });
  }

  renderFilters();
  renderCards();
}
