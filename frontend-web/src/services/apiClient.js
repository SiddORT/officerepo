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

// ── Employees (tenant-scoped) ─────────────────────────────────────────────────
export const employeesApi = {
  list: (params) => apiClient.get("/tenant/employees", { params }),
  get: (id) => apiClient.get(`/tenant/employees/${id}`),
  create: (data) => apiClient.post("/tenant/employees", data),
  update: (id, data) => apiClient.patch(`/tenant/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/tenant/employees/${id}`),
};
