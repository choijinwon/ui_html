/* Thin client for the Golden Image API (SDD 15.2). */
// Derive the API base from the mount path so the console works whether it is
// served at "/" or under an ingress sub-path (e.g. /dockerbuild/ui/ -> /dockerbuild/api/v1).
const BASE = (() => {
  const override = new URLSearchParams(window.location.search).get("api") || window.GIF_API_BASE;
  if (override) return override.replace(/\/$/, "");
  const m = window.location.pathname.match(/^(.*?)\/ui(\/|$)/);
  if (m) return m[1] + "/api/v1";
  return "/api/v1";
})();

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function req(method, path, body) {
  const resp = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) throw new ApiError(resp.status, data?.detail ?? data ?? resp.statusText);
  return data;
}

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return p.length ? "?" + new URLSearchParams(p).toString() : "";
};

export const api = {
  // families / variants
  listFamilies: () => req("GET", "/families"),
  createFamily: (data) => req("POST", "/families", data),
  listVariants: (familyId) => req("GET", `/families/${familyId}/variants`),
  createVariant: (familyId, data) => req("POST", `/families/${familyId}/variants`, data),

  // components
  listComponents: (params) => req("GET", "/components" + qs(params)),
  createComponent: (data) => req("POST", "/components", data),
  addComponentVersion: (id, data) => req("POST", `/components/${id}/versions`, data),
  verifyComponent: (id) => req("POST", `/components/${id}/verify`, {}),
  approveComponent: (id, data) => req("POST", `/components/${id}/approve`, data),
  componentImpact: (id) => req("GET", `/components/${id}/impact`),

  // compatibility
  listRules: () => req("GET", "/compatibility/rules"),
  createRule: (data) => req("POST", "/compatibility/rules", data),
  matrix: (rowStage, colStage) => req("GET", "/compatibility/matrix" + qs({ rowStage, colStage })),

  // recipes
  validateRecipe: (spec) => req("POST", "/recipes/validate", { spec }),
  createRecipe: (data) => req("POST", "/recipes", data),
  listRecipes: (variantId) => req("GET", "/recipes" + qs({ variantId })),
  getRecipe: (id) => req("GET", `/recipes/${id}`),
  recipeDockerfiles: (id) => req("GET", `/recipes/${id}/dockerfiles`),

  // builds
  requestBuild: (data) => req("POST", "/builds", data),
  getBuild: (id) => req("GET", `/builds/${id}`),
  buildDockerfiles: (id) => req("GET", `/builds/${id}/dockerfiles`),
  listBuilds: (releaseId) => req("GET", "/builds" + qs({ releaseId })),

  // global image list (release joined with variant + family)
  images: () => req("GET", "/images"),

  // platform settings (repo / proxy)
  getSettings: () => req("GET", "/settings"),
  putGitSettings: (data) => req("PUT", "/settings/git", data),
  putProxySettings: (data) => req("PUT", "/settings/proxy", data),
  testGit: () => req("POST", "/settings/git/test", {}),

  // releases
  listReleases: (params) => req("GET", "/releases" + qs(params)),
  getRelease: (id) => req("GET", `/releases/${id}`),
  approve: (id, data) => req("POST", `/releases/${id}/approvals`, data),
  grantException: (releaseId, findingId, data) =>
    req("POST", `/releases/${releaseId}/findings/${findingId}/exception`, data),
  promote: (id, data = {}) => req("POST", `/releases/${id}/promote`, data),
  deprecate: (id, data = {}) => req("POST", `/releases/${id}/deprecate`, data),
  revoke: (id, data) => req("POST", `/releases/${id}/revoke`, data),
  retire: (id, data = {}) => req("POST", `/releases/${id}/retire`, data),
  listUsage: (id) => req("GET", `/releases/${id}/usage`),
  reportUsage: (id, data) => req("POST", `/releases/${id}/usage`, data),
  evidence: (id) => req("GET", `/releases/${id}/evidence`),
};
