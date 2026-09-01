/* Security Gate (SDD 16.5): CVE findings, SBOM/서명 evidence, 승인 체인, Stable 승격. */
export const title = "Security Gate";

export const css = `
  .sec-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
  .sec-cols { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .kv { display: grid; grid-template-columns: 128px 1fr; gap: 3px 12px; font-size: 12.5px; margin-top: 8px; }
  .kv .k { color: var(--text-dim); }
  .approval-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .approval-row:last-of-type { border-bottom: none; }
  .approval-kind { min-width: 110px; font-weight: 700; }
  .gate-reasons { margin: 8px 0 0; padding-left: 18px; }
  .gate-reasons li { margin: 3px 0; }
`;

export async function render(el, ctx) {
  const { api, h, badge, fmtDate, shortDigest } = ctx;
  const pill = (text, kind) => h("span", { class: `badge ${kind}` }, text);

  el.append(
    h("h1", { class: "page-title" }, "Security Gate"),
    h("p", { class: "page-sub" },
      "Critical/High CVE, SBOM·서명 evidence, 플랫폼 및 보안 승인 체인 — 모든 Gate 충족 후 Stable 승격이 활성화됩니다."),
  );

  // ------------------------------------------------------- release selector
  const releases = await api.listReleases({});
  if (!releases.length) {
    el.append(h("div", { class: "panel" },
      h("div", { class: "empty" }, "Release가 없습니다. 먼저 Recipe를 빌드해 candidate를 만드세요.")));
    return;
  }

  let selId = ctx.params.releaseId;
  if (!selId || !releases.some((r) => r.id === selId)) {
    const cand = releases.find((r) => r.state === "candidate");
    selId = (cand || releases[0]).id;
  }

  // ------------------------------------------------------------- data load
  const [release, builds] = await Promise.all([api.getRelease(selId), api.listBuilds(selId)]);
  const latest = builds[0] || null;
  const [build, evidence] = await Promise.all([
    latest ? api.getBuild(latest.id).catch(() => null) : Promise.resolve(null),
    api.evidence(selId).catch(() => null), // 404 -> evidence 없음
  ]);
  const findings = (build && build.findings) || [];
  const gate = (build && build.gate) || null;

  el.append(h("div", { class: "panel" },
    h("div", { class: "spread" },
      h("div", { class: "row" },
        h("select", {
          style: "width: 320px",
          onchange: (e) => ctx.navigate("security", { releaseId: e.target.value }),
        }, ...releases.map((r) =>
          h("option", { value: r.id, selected: r.id === selId }, `${r.releaseName} · ${r.state}`))),
        h("span", { class: "mono muted small" }, shortDigest(release.imageDigest)),
        badge(release.channel),
      ),
      h("div", { class: "row" },
        h("span", { class: "muted small" }, `생성 ${fmtDate(release.createdAt)}`),
        h("button", { class: "ghost", onclick: () => ctx.refresh() }, "새로고침"),
      ),
    ),
  ));

  // -------------------------------------------------------------- stat row
  const openCount = (sev) => findings.filter((f) => f.severity === sev && f.resolution === "open").length;
  const critOpen = openCount("critical");
  const highOpen = openCount("high");
  const att = (evidence && evidence.attestation) || {};
  const signed = !!(att.signature && att.signature.signed);
  const stat = (label, value) => h("div", { class: "stat" },
    h("div", { class: "v" }, value), h("div", { class: "k" }, label));

  el.append(h("div", { class: "panel sec-stats" },
    stat("Release 상태", badge(release.state)),
    stat("Gate 상태", gate ? badge(gate.status) : badge("-")),
    stat("Critical open", h("span", { style: critOpen ? "color: var(--err)" : "" }, String(critOpen))),
    stat("High open", h("span", { style: highOpen ? "color: var(--warn)" : "" }, String(highOpen))),
    stat("서명 여부", signed ? pill("서명됨", "ok") : pill("없음", "neutral")),
  ));

  // ------------------------------------------------------------ gate panel
  const gatePanel = h("div", { class: "panel" }, h("h3", {}, "Security Gate 판정"));
  if (!build) {
    gatePanel.append(h("div", { class: "empty" }, "이 release에 대한 빌드 이력이 없습니다."));
  } else {
    gatePanel.append(h("div", { class: "row" },
      h("span", { class: "muted small" }, "빌드"),
      h("code", {}, build.workflowName || build.buildId),
      badge(build.status),
      gate ? badge(gate.status) : null,
    ));
    if (build.status === "queued" || build.status === "running") {
      gatePanel.append(h("p", { class: "muted small" },
        "빌드가 아직 진행 중입니다 (Argo). 새로고침으로 최신 상태를 확인하세요."));
    }
    if (gate && gate.reasons && gate.reasons.length) {
      gatePanel.append(h("ul", { class: "gate-reasons mono small" },
        ...gate.reasons.map((r) => h("li", {}, r))));
    } else {
      gatePanel.append(h("p", { class: "muted small" }, gate ? "차단 사유 없음" : "gate 결과 없음"));
    }
  }
  el.append(gatePanel);

  // -------------------------------------------------------- findings panel
  function exceptionModal(f) {
    ctx.formModal({
      title: `예외 승인 — ${f.findingKey}`,
      submitLabel: "예외 승인",
      fields: [
        { name: "approver", label: "승인자 (approver)", type: "text", required: true, placeholder: "security-lead" },
        { name: "expiresAt", label: "만료일 (expiresAt)", type: "datetime-local", required: true },
        { name: "reason", label: "사유", type: "textarea", placeholder: "예외 승인 사유" },
      ],
      async onSubmit(values, close) {
        if (!values.expiresAt) throw new Error("만료일(expiresAt)은 필수입니다");
        const res = await api.grantException(release.id, f.id, {
          approver: values.approver,
          expiresAt: new Date(values.expiresAt).toISOString(),
          reason: values.reason,
        });
        close();
        ctx.toast(`예외 승인 완료: ${res.findingKey} (만료 ${fmtDate(res.exceptionExpiresAt)})`, "ok");
        ctx.refresh();
      },
    });
  }

  const findingsPanel = h("div", { class: "panel" }, h("h3", {}, "Stage별 Finding 및 예외 상태"));
  if (!findings.length) {
    findingsPanel.append(h("div", { class: "empty" }, "발견된 취약점 없음"));
  } else {
    findingsPanel.append(h("div", { class: "table-wrap" },
      h("table", {},
        h("thead", {}, h("tr", {},
          h("th", {}, "Stage"), h("th", {}, "Severity"), h("th", {}, "Finding"),
          h("th", {}, "Package"), h("th", {}, "Resolution"), h("th", {}, "예외 만료"), h("th", {}, ""))),
        h("tbody", {}, ...findings.map((f) => h("tr", {},
          h("td", { class: "mono" }, f.stage || "-"),
          h("td", {}, badge(f.severity)),
          h("td", {}, h("code", {}, f.findingKey)),
          h("td", {}, f.packageName),
          h("td", {}, badge(f.resolution)),
          h("td", { class: "small" }, fmtDate(f.exceptionExpiresAt)),
          h("td", {}, f.severity === "high"
            ? h("button", { class: "sm", onclick: () => exceptionModal(f) }, "예외 승인")
            : null),
        ))))));
  }
  el.append(findingsPanel);

  // -------------------------------------------------------- evidence panel
  const evPanel = h("div", { class: "panel" }, h("h3", {}, "Evidence (SBOM · Provenance · Signature)"));
  if (!evidence) {
    evPanel.append(h("div", { class: "empty" }, "빌드 evidence 없음"));
  } else {
    const sbom = att.sbom || {};
    const prov = att.provenance || {};
    const sig = att.signature || {};
    const pkgs = sbom.packages || [];
    const shown = pkgs.slice(0, 6);
    const kv = (...pairs) => h("div", { class: "kv" },
      ...pairs.map(([k, v]) => [h("div", { class: "k" }, k), h("div", { class: "mono" }, v)]).flat());

    evPanel.append(h("div", { class: "sec-cols" },
      h("div", {},
        h("div", { class: "small muted" }, "SBOM"),
        h("div", { class: "stat", style: "margin-top: 8px" },
          h("div", { class: "v" }, String(pkgs.length)),
          h("div", { class: "k" }, `패키지 (${sbom.format || "-"})`)),
        h("div", { class: "chip-list" },
          ...shown.map((p) => h("code", {}, p)),
          pkgs.length > shown.length
            ? h("span", { class: "muted small" }, `+${pkgs.length - shown.length}개`)
            : null),
      ),
      h("div", {},
        h("div", { class: "small muted" }, "Provenance"),
        kv(
          ["recipeRevisionId", shortDigest(prov.recipeRevisionId)],
          ["gitRevision", prov.gitRevision || "-"],
          ["specHash", shortDigest(prov.specHash)],
          ["builder", prov.builder || "-"],
        ),
      ),
      h("div", {},
        h("div", { class: "small muted" }, "Signature"),
        kv(["keyRef", sig.keyRef || "-"]),
        h("div", { style: "margin-top: 10px" },
          sig.signed ? pill("서명됨", "ok") : pill("서명 없음", "neutral")),
      ),
    ));
  }
  el.append(evPanel);

  // -------------------------------------------------- approval chain panel
  const approvals = release.approvals || [];
  const latestOf = (kind) => {
    const list = approvals.filter((a) => a.kind === kind);
    return list.length ? list[list.length - 1] : null;
  };
  const canApprove = release.state === "candidate";

  function approvalModal(kind, decision) {
    const kindLabel = kind === "platform" ? "플랫폼" : "보안";
    const actLabel = decision === "approved" ? "승인" : "반려";
    ctx.formModal({
      title: `${kindLabel} ${actLabel} — ${release.releaseName}`,
      submitLabel: actLabel,
      fields: [
        { name: "approver", label: "승인자 (approver)", type: "text", required: true,
          placeholder: kind === "platform" ? "platform-lead" : "security-lead" },
        { name: "reason", label: "사유", type: "textarea" },
      ],
      async onSubmit(values, close) {
        const res = await api.approve(release.id,
          { kind, decision, approver: values.approver, reason: values.reason });
        close();
        const parts = [`상태: ${res.state}`, `gate: ${res.gate ? res.gate.status : "-"}`];
        if (!res.approvalsSatisfied && res.missing && res.missing.length) {
          parts.push(`남은 승인: ${res.missing.join(", ")}`);
        }
        ctx.toast(`${kindLabel} ${actLabel} 기록됨 · ${parts.join(" · ")}`,
          res.state === "approved" ? "ok" : "info");
        ctx.refresh();
      },
    });
  }

  const chainRow = (kind, label) => {
    const last = latestOf(kind);
    return h("div", { class: "approval-row" },
      h("div", { class: "approval-kind" }, label, h("div", { class: "mono small muted" }, kind)),
      last ? pill(last.decision, last.decision === "approved" ? "ok" : "err") : pill("대기", "neutral"),
      last ? h("span", { class: "small muted" }, `${last.approver} · ${fmtDate(last.createdAt)}`) : null,
      h("div", { class: "row", style: "margin-left: auto; gap: 8px" },
        h("button", { class: "sm", disabled: !canApprove, onclick: () => approvalModal(kind, "approved") }, "승인"),
        h("button", { class: "sm danger", disabled: !canApprove, onclick: () => approvalModal(kind, "rejected") }, "반려"),
      ),
    );
  };

  const apPanel = h("div", { class: "panel" },
    h("h3", {}, "플랫폼 및 보안 승인 체인"),
    chainRow("platform", "플랫폼 승인"),
    chainRow("security", "보안 승인"),
  );
  if (!canApprove) {
    apPanel.append(h("p", { class: "muted small" }, "승인/반려는 candidate 상태에서만 기록할 수 있습니다."));
  }
  if (approvals.length) {
    apPanel.append(h("hr", { class: "sep" }),
      h("div", { class: "small muted" },
        ...approvals.map((a) =>
          h("div", {}, `${a.kind} · ${a.decision} · ${a.approver} · ${fmtDate(a.createdAt)}`))));
  }
  el.append(apPanel);

  // ---------------------------------------------------------- action footer
  function deprecateModal() {
    ctx.formModal({
      title: `Deprecated 처리 — ${release.releaseName}`,
      submitLabel: "Deprecated 처리",
      fields: [
        { name: "replacementReleaseId", label: "대체 release (선택)", type: "select",
          options: [{ value: "", label: "(없음)" },
            ...releases.filter((r) => r.id !== release.id)
              .map((r) => ({ value: r.id, label: `${r.releaseName} · ${r.state}` }))] },
        { name: "supportEndAt", label: "지원 종료일 (선택)", type: "datetime-local" },
        { name: "reason", label: "사유", type: "textarea" },
      ],
      async onSubmit(values, close) {
        await api.deprecate(release.id, {
          replacementReleaseId: values.replacementReleaseId || undefined,
          supportEndAt: values.supportEndAt ? new Date(values.supportEndAt).toISOString() : undefined,
          reason: values.reason,
        });
        close();
        ctx.toast(`${release.releaseName} Deprecated 처리 완료`, "ok");
        ctx.refresh();
      },
    });
  }

  function revokeModal() {
    ctx.formModal({
      title: `Revoke — ${release.releaseName}`,
      submitLabel: "Revoke",
      fields: [
        { name: "reason", label: "사유 (필수)", type: "textarea", required: true, placeholder: "revoke 사유" },
      ],
      async onSubmit(values, close) {
        if (!values.reason) throw new Error("사유(reason)는 필수입니다");
        const res = await api.revoke(release.id, { reason: values.reason });
        close();
        ctx.toast(`Revoked · 영향 사용처 ${res.usageCount}건`, "ok");
        ctx.refresh();
      },
    });
  }

  function retireModal() {
    ctx.formModal({
      title: `Retire — ${release.releaseName}`,
      submitLabel: "Retire",
      fields: [
        { name: "force", label: "사용처가 남아 있어도 강제 Retire (force)", type: "checkbox" },
      ],
      async onSubmit(values, close) {
        await api.retire(release.id, { force: !!values.force });
        close();
        ctx.toast(`${release.releaseName} Retire 완료`, "ok");
        ctx.refresh();
      },
    });
  }

  const footRow = h("div", { class: "row" },
    h("button", {
      class: "primary",
      disabled: release.state !== "approved",
      onclick: async () => {
        const ok = await ctx.confirmModal("Stable 승격",
          `${release.releaseName} 을(를) Stable 채널로 승격합니다. 이미지 digest는 변경되지 않습니다.`,
          { label: "승격" });
        if (!ok) return;
        try {
          await api.promote(release.id, { reason: undefined });
          ctx.toast(`${release.releaseName} → Stable 승격 완료`, "ok");
          ctx.refresh();
        } catch (e) {
          ctx.toast(ctx.errText(e), "err");
        }
      },
    }, "승격 (Stable)"),
  );
  if (release.state === "candidate") {
    footRow.append(h("span", { class: "muted small" }, "승인 완료 후 승격 가능"));
  }
  if (release.state === "stable") {
    footRow.append(
      h("button", { onclick: deprecateModal }, "Deprecated 처리"),
      h("button", { class: "danger", onclick: revokeModal }, "Revoke"),
    );
  }
  if (release.state === "deprecated") {
    footRow.append(h("button", { class: "danger", onclick: retireModal }, "Retire"));
  }
  el.append(h("div", { class: "panel" }, h("h3", {}, "Release 작업"), footRow));
}
