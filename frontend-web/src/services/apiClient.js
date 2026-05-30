import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT token and tenant header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    const tenantId = localStorage.getItem("tenant_id");
    if (tenantId && tenantId !== "platform") {
      config.headers["X-Tenant-ID"] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and auto-refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers["Authorization"] = `Bearer ${data.access_token}`;
          return apiClient(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  superAdminLogin: (email, password) =>
    apiClient.post("/auth/superadmin/login", { email, password }),
  tenantLogin: (email, password, tenantId, deviceType = "web") =>
    apiClient.post(
      "/auth/tenant/login",
      { email, password, device_type: deviceType },
      { headers: { "X-Tenant-ID": tenantId } }
    ),
  logout: () => apiClient.post("/auth/logout", {}),
};

// ── Tenants — legacy (backward compat, used by SuperAdminPage) ────────────────
export const tenantsApi = {
  list: (params) => apiClient.get("/superadmin/tenants", { params }),
  get: (id) => apiClient.get(`/superadmin/tenants/${id}`),
  create: (data) => apiClient.post("/superadmin/tenants", data),
  update: (id, data) => apiClient.patch(`/superadmin/tenants/${id}`, data),
  activate: (id) => apiClient.post(`/superadmin/tenants/${id}/activate`),
  suspend: (id) => apiClient.post(`/superadmin/tenants/${id}/suspend`),
  configureDb: (id, db_url) => apiClient.post(`/superadmin/tenants/${id}/db-connection`, { db_url }),
};

// ── Tenant Management — full-featured module ──────────────────────────────────
export const tenantMgmtApi = {
  list: (params) =>
    apiClient.get("/superadmin/manage/tenants", { params }),

  getById: (id) =>
    apiClient.get(`/superadmin/manage/tenants/${id}`),

  create: (data) =>
    apiClient.post("/superadmin/manage/tenants", data),

  // Step-by-step wizard save
  createDraft: (data) =>
    apiClient.post("/superadmin/manage/tenants/draft", data),

  updateBasicInfo: (id, data) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/step/basic`, data),

  saveDomainStep: (id, data) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/step/domain`, data),

  saveDatabaseStep: (id, data) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/step/database`, data),

  saveSubscriptionStep: (id, data) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/step/subscription`, data),

  saveModulesStep: (id, data) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/step/modules`, data),

  update: (id, data) =>
    apiClient.put(`/superadmin/manage/tenants/${id}`, data),

  suspend: (id) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/suspend`),

  activate: (id) =>
    apiClient.patch(`/superadmin/manage/tenants/${id}/activate`),

  uploadLogo: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.post(`/superadmin/manage/tenants/${id}/logo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  toggleModule: (tenantId, module, is_enabled) =>
    apiClient.post(`/superadmin/${tenantId}/features`, { module, is_enabled }),
};

// ── Feature Flags ─────────────────────────────────────────────────────────────
export const featureFlagsApi = {
  getForTenant: (tenantId) => apiClient.get(`/superadmin/${tenantId}/features`),
  toggle: (tenantId, module, is_enabled) =>
    apiClient.post(`/superadmin/${tenantId}/features`, { module, is_enabled }),
};

// ── Secrets / Security ────────────────────────────────────────────────────────
export const secretsApi = {
  rotate: () => apiClient.post("/superadmin/rotate-secrets"),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  plans: () => apiClient.get("/superadmin/subscriptions/plans"),
  assign: (tenant_id, plan_id) =>
    apiClient.post("/superadmin/subscriptions/assign", { tenant_id, plan_id }),
};

// ── Superadmin — Rotation Status ──────────────────────────────────────────────
export const rotationStatusApi = {
  get: () => apiClient.get("/superadmin/rotation-status"),
};

// ── Public Enquiries (no auth) ────────────────────────────────────────────────
export const enquiriesApi = {
  submit: (data) => apiClient.post("/public/enquiries", data),
};

// ── Lead Management & Sales Pipeline (superadmin CRM) ─────────────────────────
const LEADS = "/superadmin/leads";
export const leadsApi = {
  options: () => apiClient.get(`${LEADS}/meta/options`),
  dashboard: () => apiClient.get(`${LEADS}/dashboard`),

  list: (params) => apiClient.get(LEADS, { params }),
  get: (id) => apiClient.get(`${LEADS}/${id}`),
  create: (data) => apiClient.post(LEADS, data),
  update: (id, data) => apiClient.patch(`${LEADS}/${id}`, data),
  remove: (id) => apiClient.delete(`${LEADS}/${id}`),
  setStage: (id, stage) => apiClient.post(`${LEADS}/${id}/stage`, { stage }),
  markLost: (id, data) => apiClient.post(`${LEADS}/${id}/lost`, data),

  timeline: (id) => apiClient.get(`${LEADS}/${id}/timeline`),

  activities: (id) => apiClient.get(`${LEADS}/${id}/activities`),
  addActivity: (id, data) => apiClient.post(`${LEADS}/${id}/activities`, data),
  updateActivity: (id, aid, data) => apiClient.patch(`${LEADS}/${id}/activities/${aid}`, data),
  deleteActivity: (id, aid) => apiClient.delete(`${LEADS}/${id}/activities/${aid}`),

  demos: (id) => apiClient.get(`${LEADS}/${id}/demos`),
  addDemo: (id, data) => apiClient.post(`${LEADS}/${id}/demos`, data),
  updateDemo: (id, did, data) => apiClient.patch(`${LEADS}/${id}/demos/${did}`, data),
  deleteDemo: (id, did) => apiClient.delete(`${LEADS}/${id}/demos/${did}`),

  followups: (id) => apiClient.get(`${LEADS}/${id}/followups`),
  addFollowup: (id, data) => apiClient.post(`${LEADS}/${id}/followups`, data),
  updateFollowup: (id, fid, data) => apiClient.patch(`${LEADS}/${id}/followups/${fid}`, data),
  deleteFollowup: (id, fid) => apiClient.delete(`${LEADS}/${id}/followups/${fid}`),

  notes: (id) => apiClient.get(`${LEADS}/${id}/notes`),
  addNote: (id, data) => apiClient.post(`${LEADS}/${id}/notes`, data),
  deleteNote: (id, nid) => apiClient.delete(`${LEADS}/${id}/notes/${nid}`),

  documents: (id) => apiClient.get(`${LEADS}/${id}/documents`),
  uploadDocument: (id, file, documentType) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("document_type", documentType || "Other");
    return apiClient.post(`${LEADS}/${id}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadDocument: (id, docId) =>
    apiClient.get(`${LEADS}/${id}/documents/${docId}/download`, { responseType: "blob" }),
  deleteDocument: (id, docId) => apiClient.delete(`${LEADS}/${id}/documents/${docId}`),

  proposals: (id) => apiClient.get(`${LEADS}/${id}/proposals`),
  addProposal: (id, { proposalDate, quotedAmount, modulesIncluded, status, file }) => {
    const fd = new FormData();
    if (proposalDate) fd.append("proposal_date", proposalDate);
    if (quotedAmount != null && quotedAmount !== "") fd.append("quoted_amount", quotedAmount);
    if (modulesIncluded) fd.append("modules_included", modulesIncluded);
    if (status) fd.append("status", status);
    if (file) fd.append("file", file);
    return apiClient.post(`${LEADS}/${id}/proposals`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadProposal: (id, pid) =>
    apiClient.get(`${LEADS}/${id}/proposals/${pid}/download`, { responseType: "blob" }),
  updateProposal: (id, pid, data) => apiClient.patch(`${LEADS}/${id}/proposals/${pid}`, data),

  negotiations: (id) => apiClient.get(`${LEADS}/${id}/negotiations`),
  addNegotiation: (id, data) => apiClient.post(`${LEADS}/${id}/negotiations`, data),

  conversions: (id) => apiClient.get(`${LEADS}/${id}/conversions`),
  convertToClient: (id, data) => apiClient.post(`${LEADS}/${id}/convert-to-client`, data || {}),
  convertEnquiry: (enquiryId, data) => apiClient.post(`${LEADS}/convert-enquiry/${enquiryId}`, data || {}),
};

// ── Employees (tenant-scoped) ─────────────────────────────────────────────────
export const employeesApi = {
  list: (params) => apiClient.get("/tenant/employees", { params }),
  get: (id) => apiClient.get(`/tenant/employees/${id}`),
  create: (data) => apiClient.post("/tenant/employees", data),
  update: (id, data) => apiClient.patch(`/tenant/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/tenant/employees/${id}`),
};
