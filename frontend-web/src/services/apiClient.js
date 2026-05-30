import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
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
  logout: () => apiClient.post("/auth/logout", {}),
  me: () => apiClient.get("/auth/me"),
  getProfile: () => apiClient.get("/auth/profile"),
  updateProfile: (data) => apiClient.patch("/auth/profile", data),
  changePassword: (data) => apiClient.post("/auth/change-password", data),
};

// ── RBAC — Roles & Permissions (superadmin) ───────────────────────────────────
const RBAC = "/superadmin/rbac";
export const rbacApi = {
  permissions: () => apiClient.get(`${RBAC}/permissions`),

  listRoles: (params) => apiClient.get(`${RBAC}/roles`, { params }),
  getRole: (id) => apiClient.get(`${RBAC}/roles/${id}`),
  createRole: (data) => apiClient.post(`${RBAC}/roles`, data),
  updateRole: (id, data) => apiClient.patch(`${RBAC}/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`${RBAC}/roles/${id}`),

  listAdmins: () => apiClient.get(`${RBAC}/admins`),
  assignRoles: (adminId, roleIds) =>
    apiClient.put(`${RBAC}/admins/${adminId}/roles`, { role_ids: roleIds }),

  // Users (invitations + account status)
  listUsers: () => apiClient.get(`${RBAC}/users`),
  inviteUser: (data) => apiClient.post(`${RBAC}/users`, data),
  resendInvite: (adminId) => apiClient.post(`${RBAC}/users/${adminId}/resend-invite`),
  setUserStatus: (adminId, isActive) =>
    apiClient.patch(`${RBAC}/users/${adminId}/status`, { is_active: isActive }),
  deleteUser: (adminId) => apiClient.delete(`${RBAC}/users/${adminId}`),
};

// ── Public — Invitation acceptance (no auth) ──────────────────────────────────
export const invitationApi = {
  get: (token) => apiClient.get(`/auth/invitations/${token}`),
  accept: (token, password) =>
    apiClient.post(`/auth/invitations/${token}/accept`, { password }),
};

// ── Secrets / Security ────────────────────────────────────────────────────────
export const secretsApi = {
  rotate: () => apiClient.post("/superadmin/rotate-secrets"),
};

// ── Superadmin — Rotation Status ──────────────────────────────────────────────
export const rotationStatusApi = {
  get: () => apiClient.get("/superadmin/rotation-status"),
};

// ── Superadmin — CORS Rejections (blocked origins) ────────────────────────────
export const corsRejectionsApi = {
  list: (limit = 100) =>
    apiClient.get("/superadmin/cors-rejections", { params: { limit } }),
};

// ── Public Enquiries (no auth) ────────────────────────────────────────────────
export const enquiriesApi = {
  submit: (data) => apiClient.post("/public/enquiries", data),
};

// ── Enquiry Inbox (superadmin CRM) ────────────────────────────────────────────
const ENQUIRIES = "/superadmin/enquiries";
export const enquiryInboxApi = {
  options: () => apiClient.get(`${ENQUIRIES}/meta/options`),
  dashboard: () => apiClient.get(`${ENQUIRIES}/dashboard`),

  list: (params) => apiClient.get(ENQUIRIES, { params }),
  get: (id) => apiClient.get(`${ENQUIRIES}/${id}`),

  setStatus: (id, status) => apiClient.patch(`${ENQUIRIES}/${id}/status`, { status }),
  assign: (id, assignedTo) => apiClient.patch(`${ENQUIRIES}/${id}/assign`, { assigned_to: assignedTo }),
  setSpam: (id, isSpam) => apiClient.patch(`${ENQUIRIES}/${id}/spam`, { is_spam: isSpam }),

  addNote: (id, note) => apiClient.post(`${ENQUIRIES}/${id}/notes`, { note }),
  deleteNote: (id, noteId) => apiClient.delete(`${ENQUIRIES}/${id}/notes/${noteId}`),

  timeline: (id) => apiClient.get(`${ENQUIRIES}/${id}/timeline`),

  convertToLead: (id, data) => apiClient.post(`${ENQUIRIES}/${id}/convert-to-lead`, data || {}),
};

// ── Lead Management & Sales Pipeline (superadmin CRM) ─────────────────────────
const LEADS = "/superadmin/leads";
export const leadsApi = {
  options: () => apiClient.get(`${LEADS}/meta/options`),
  dashboard: () => apiClient.get(`${LEADS}/dashboard`),

  calendar: (params) => apiClient.get(`${LEADS}/calendar/events`, { params }),

  list: (params) => apiClient.get(LEADS, { params }),
  get: (id) => apiClient.get(`${LEADS}/${id}`),
  create: (data) => apiClient.post(LEADS, data),
  update: (id, data) => apiClient.patch(`${LEADS}/${id}`, data),
  remove: (id) => apiClient.delete(`${LEADS}/${id}`),
  setStage: (id, stage) => apiClient.post(`${LEADS}/${id}/stage`, { stage }),
  markLost: (id, data) => apiClient.post(`${LEADS}/${id}/lost`, data),
  setScoreLabel: (id, label) => apiClient.post(`${LEADS}/${id}/score-label`, { label }),

  spokespersons: (id) => apiClient.get(`${LEADS}/${id}/spokespersons`),
  addSpokesperson: (id, data) => apiClient.post(`${LEADS}/${id}/spokespersons`, data),
  updateSpokesperson: (id, sid, data) => apiClient.patch(`${LEADS}/${id}/spokespersons/${sid}`, data),
  deleteSpokesperson: (id, sid) => apiClient.delete(`${LEADS}/${id}/spokespersons/${sid}`),

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

// ── Client Management (Client = tenant) ─────────────────────────────────────────
const CLIENTS = "/superadmin/clients";

export const clientsApi = {
  options: () => apiClient.get(`${CLIENTS}/meta/options`),
  dashboard: () => apiClient.get(`${CLIENTS}/dashboard`),

  list: (params) => apiClient.get(CLIENTS, { params }),
  get: (id) => apiClient.get(`${CLIENTS}/${id}`),
  create: (data) => apiClient.post(CLIENTS, data),
  update: (id, data) => apiClient.patch(`${CLIENTS}/${id}`, data),
  setStatus: (id, status) => apiClient.post(`${CLIENTS}/${id}/status`, { status }),
  remove: (id) => apiClient.delete(`${CLIENTS}/${id}`),

  contacts: (id) => apiClient.get(`${CLIENTS}/${id}/contacts`),
  addContact: (id, data) => apiClient.post(`${CLIENTS}/${id}/contacts`, data),
  updateContact: (id, cid, data) => apiClient.patch(`${CLIENTS}/${id}/contacts/${cid}`, data),
  deleteContact: (id, cid) => apiClient.delete(`${CLIENTS}/${id}/contacts/${cid}`),

  billing: (id) => apiClient.get(`${CLIENTS}/${id}/billing`),
  saveBilling: (id, data) => apiClient.put(`${CLIENTS}/${id}/billing`, data),

  subscription: (id) => apiClient.get(`${CLIENTS}/${id}/subscription`),
  saveSubscription: (id, data) => apiClient.put(`${CLIENTS}/${id}/subscription`, data),

  modules: (id) => apiClient.get(`${CLIENTS}/${id}/modules`),
  toggleModule: (id, moduleName, isEnabled) =>
    apiClient.post(`${CLIENTS}/${id}/modules`, { module_name: moduleName, is_enabled: isEnabled }),

  database: (id) => apiClient.get(`${CLIENTS}/${id}/database`),
  saveDatabase: (id, data) => apiClient.put(`${CLIENTS}/${id}/database`, data),

  domains: (id) => apiClient.get(`${CLIENTS}/${id}/domains`),
  addDomain: (id, data) => apiClient.post(`${CLIENTS}/${id}/domains`, data),
  deleteDomain: (id, did) => apiClient.delete(`${CLIENTS}/${id}/domains/${did}`),

  adminUsers: (id) => apiClient.get(`${CLIENTS}/${id}/admin-users`),
  addAdminUser: (id, data) => apiClient.post(`${CLIENTS}/${id}/admin-users`, data),
  updateAdminUser: (id, aid, data) => apiClient.patch(`${CLIENTS}/${id}/admin-users/${aid}`, data),

  activities: (id) => apiClient.get(`${CLIENTS}/${id}/activities`),

  documents: (id) => apiClient.get(`${CLIENTS}/${id}/documents`),
  uploadDocument: (id, file, documentType) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("document_type", documentType || "Other");
    return apiClient.post(`${CLIENTS}/${id}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadDocument: (id, docId) =>
    apiClient.get(`${CLIENTS}/${id}/documents/${docId}/download`, { responseType: "blob" }),
  deleteDocument: (id, docId) => apiClient.delete(`${CLIENTS}/${id}/documents/${docId}`),
};
