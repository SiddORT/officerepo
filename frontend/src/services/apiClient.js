import axios from "axios";

const API_BASE_URL = "";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
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

// ── Portal workspace lookup (public — bare axios, no auth header) ──────────────
export const portalLookupApi = {
  lookupWorkspace: (email) =>
    axios.post("/api/v1/portal/lookup-workspace", { email }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  superAdminLogin: (email, password) =>
    apiClient.post("/auth/superadmin/login", { email, password }),
  logout: () => apiClient.post("/auth/logout", {}),
  me: () => apiClient.get("/auth/me"),
  getProfile: () => apiClient.get("/auth/profile"),
  updateProfile: (data) => apiClient.patch("/auth/profile", data),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.post("/auth/avatar", fd, {
      headers: { "Content-Type": undefined },
    });
  },
  removeAvatar: () => apiClient.delete("/auth/avatar"),
  changePassword: (data) => apiClient.post("/auth/change-password", data),
  getPreferences: () => apiClient.get("/auth/preferences"),
  updatePreferences: (data) => apiClient.patch("/auth/preferences", data),
  getPreferencesOptions: () => apiClient.get("/auth/preferences/options"),
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
  assign: (id, ownerId) => apiClient.patch(`${LEADS}/${id}/assign`, { owner_id: ownerId }),
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
  uploadDocument: (id, file, documentTypeId, documentType) => {
    const fd = new FormData();
    fd.append("file", file);
    if (documentTypeId) fd.append("document_type_id", documentTypeId);
    fd.append("document_type", documentType || "Other");
    return apiClient.post(`${LEADS}/${id}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  replaceDocument: (id, docId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.put(`${LEADS}/${id}/documents/${docId}`, fd, {
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
  modulesNested: (id) => apiClient.get(`${CLIENTS}/${id}/modules/nested`),
  toggleModule: (id, moduleName, isEnabled) =>
    apiClient.post(`${CLIENTS}/${id}/modules`, { module_name: moduleName, is_enabled: isEnabled }),

  database: (id) => apiClient.get(`${CLIENTS}/${id}/database`),
  saveDatabase: (id, data) => apiClient.put(`${CLIENTS}/${id}/database`, data),
  provisionDatabase: (id) => apiClient.post(`${CLIENTS}/${id}/database/provision`),
  deprovisionDatabase: (id) => apiClient.delete(`${CLIENTS}/${id}/database/provision`),

  domains: (id) => apiClient.get(`${CLIENTS}/${id}/domains`),
  addDomain: (id, data) => apiClient.post(`${CLIENTS}/${id}/domains`, data),
  activateDomain: (id, did) => apiClient.patch(`${CLIENTS}/${id}/domains/${did}/activate`),
  deleteDomain: (id, did) => apiClient.delete(`${CLIENTS}/${id}/domains/${did}`),

  adminUsers: (id) => apiClient.get(`${CLIENTS}/${id}/admin-users`),
  addAdminUser: (id, data) => apiClient.post(`${CLIENTS}/${id}/admin-users`, data),
  updateAdminUser: (id, aid, data) => apiClient.patch(`${CLIENTS}/${id}/admin-users/${aid}`, data),
  sendAdminUserInvite: (id, aid) => apiClient.post(`${CLIENTS}/${id}/admin-users/${aid}/send-invite`),

  activities: (id) => apiClient.get(`${CLIENTS}/${id}/activities`),

  documents: (id) => apiClient.get(`${CLIENTS}/${id}/documents`),
  uploadDocument: (id, file, documentTypeId, documentType) => {
    const fd = new FormData();
    fd.append("file", file);
    if (documentTypeId) fd.append("document_type_id", documentTypeId);
    fd.append("document_type", documentType || "Other");
    return apiClient.post(`${CLIENTS}/${id}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  replaceDocument: (id, docId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.put(`${CLIENTS}/${id}/documents/${docId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  downloadDocument: (id, docId) =>
    apiClient.get(`${CLIENTS}/${id}/documents/${docId}/download`, { responseType: "blob" }),
  deleteDocument: (id, docId) => apiClient.delete(`${CLIENTS}/${id}/documents/${docId}`),
};

// ── Client Document Types (superadmin settings) ───────────────────────────────
const CLIENT_DOC_TYPES = "/superadmin/settings/document-types";

export const clientDocTypeApi = {
  list: (activeOnly = false) => apiClient.get(CLIENT_DOC_TYPES, { params: { active_only: activeOnly } }),
  create: (data) => apiClient.post(CLIENT_DOC_TYPES, data),
  update: (id, data) => apiClient.patch(`${CLIENT_DOC_TYPES}/${id}`, data),
  delete: (id) => apiClient.delete(`${CLIENT_DOC_TYPES}/${id}`),
};

// ── Notification Management (superadmin) ──────────────────────────────────────
const NOTIF = "/superadmin/notifications";

export const notificationsApi = {
  // Channels
  listChannels: () => apiClient.get(`${NOTIF}/channels`),
  getChannel: (ch) => apiClient.get(`${NOTIF}/channels/${ch}`),
  updateChannel: (ch, data) => apiClient.put(`${NOTIF}/channels/${ch}`, data),
  testChannel: (ch) => apiClient.post(`${NOTIF}/channels/${ch}/test`),

  // Templates
  listTemplates: (params) => apiClient.get(`${NOTIF}/templates`, { params }),
  getTemplate: (id) => apiClient.get(`${NOTIF}/templates/${id}`),
  createTemplate: (data) => apiClient.post(`${NOTIF}/templates`, data),
  updateTemplate: (id, data) => apiClient.put(`${NOTIF}/templates/${id}`, data),
  deleteTemplate: (id) => apiClient.delete(`${NOTIF}/templates/${id}`),

  // Event rules
  listEvents: () => apiClient.get(`${NOTIF}/events`),
  updateEventRule: (event, channel, data) =>
    apiClient.put(`${NOTIF}/events/${event}/${channel}`, data),

  // Logs
  listLogs: (params) => apiClient.get(`${NOTIF}/logs`, { params }),

  // Usage
  usage: () => apiClient.get(`${NOTIF}/usage`),
};

// ── Security Settings (superadmin) ────────────────────────────────────────────
const SEC = "/superadmin/security-settings";

export const securitySettingsApi = {
  getPasswordPolicy:   () => apiClient.get(`${SEC}/password-policy`),
  updatePasswordPolicy: (data) => apiClient.put(`${SEC}/password-policy`, data),

  getLoginPolicy:   () => apiClient.get(`${SEC}/login-policy`),
  updateLoginPolicy: (data) => apiClient.put(`${SEC}/login-policy`, data),

  getSessionPolicy:   () => apiClient.get(`${SEC}/session-policy`),
  updateSessionPolicy: (data) => apiClient.put(`${SEC}/session-policy`, data),

  get2FAPolicy:   () => apiClient.get(`${SEC}/2fa-policy`),
  update2FAPolicy: (data) => apiClient.put(`${SEC}/2fa-policy`, data),

  getNotificationPolicy:   () => apiClient.get(`${SEC}/notification-policy`),
  updateNotificationPolicy: (data) => apiClient.put(`${SEC}/notification-policy`, data),
};

// ── Portal Auth (public — client admin user invite + login) ─────────────────
export const portalAuthApi = {
  validateInvite: (subdomain, token) =>
    axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/invite/${token}`),
  acceptInvite: (subdomain, token, password) =>
    axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/invite/${token}/accept`, { password }),
  login: (subdomain, email, password) =>
    axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/auth/login`, { email, password }),
};

// ── Portal Navigation (portal JWT — returns enabled modules) ─────────────────
export const portalNavigationApi = {
  getNavigation: (subdomain, token) =>
    axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/navigation`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ── Module Registry (superadmin — platform module catalog) ───────────────────
const MODULES = "/superadmin/modules";

export const moduleRegistryApi = {
  list: (params) => apiClient.get(MODULES, { params }),
  get: (code) => apiClient.get(`${MODULES}/${code}`),
  create: (data) => apiClient.post(MODULES, data),
  update: (code, data) => apiClient.patch(`${MODULES}/${code}`, data),
  deactivate: (code) => apiClient.delete(`${MODULES}/${code}`),
};

// ── Portal User Management (portal JWT — workspace users, roles, logs, sessions) ──
export const portalUserMgmtApi = {
  // Users
  listUsers:     (subdomain, token, params) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/users`, { headers: { Authorization: `Bearer ${token}` }, params }),
  getUser:       (subdomain, token, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  inviteUser:    (subdomain, token, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users`, data, { headers: { Authorization: `Bearer ${token}` } }),
  createUser:    (subdomain, token, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users`, data, { headers: { Authorization: `Bearer ${token}` } }),
  updateUser:    (subdomain, token, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}`, data, { headers: { Authorization: `Bearer ${token}` } }),
  removeUser:    (subdomain, token, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  resendInvite:  (subdomain, token, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}/resend-invite`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  activateUser:  (subdomain, token, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}/activate`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  deactivateUser:(subdomain, token, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  resetPassword: (subdomain, token, id, new_password) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}/reset-password`, { new_password }, { headers: { Authorization: `Bearer ${token}` } }),
  forceLogout:   (subdomain, token, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/users/${id}/force-logout`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  // Roles
  listRoles:       (subdomain, token) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles`, { headers: { Authorization: `Bearer ${token}` } }),
  getRole:         (subdomain, token, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  createRole:      (subdomain, token, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles`, data, { headers: { Authorization: `Bearer ${token}` } }),
  updateRole:      (subdomain, token, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${id}`, data, { headers: { Authorization: `Bearer ${token}` } }),
  cloneRole:       (subdomain, token, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${id}/clone`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  setRoleStatus:   (subdomain, token, id, is_active) => axios.post(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${id}/status`, { is_active }, { headers: { Authorization: `Bearer ${token}` } }),
  // Role permissions
  getRolePermissions: (subdomain, token, roleId) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${roleId}/permissions`, { headers: { Authorization: `Bearer ${token}` } }),
  setRolePermissions: (subdomain, token, roleId, permission_ids) => axios.put(`${API_BASE_URL}/api/v1/portal/${subdomain}/roles/${roleId}/permissions`, { permission_ids }, { headers: { Authorization: `Bearer ${token}` } }),
  // Permission catalog
  getPermissions: (subdomain, token) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/permissions`, { headers: { Authorization: `Bearer ${token}` } }),
  // Logs
  loginLogs:     (subdomain, token, params) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/logs/login`, { headers: { Authorization: `Bearer ${token}` }, params }),
  activityLogs:  (subdomain, token, params) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/logs/activity`, { headers: { Authorization: `Bearer ${token}` }, params }),
  // Sessions
  listSessions:  (subdomain, token, params) => axios.get(`${API_BASE_URL}/api/v1/portal/${subdomain}/sessions`, { headers: { Authorization: `Bearer ${token}` }, params }),
  logoutSession: (subdomain, token, sessionId) => axios.delete(`${API_BASE_URL}/api/v1/portal/${subdomain}/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } }),
  logoutAllSessions: (subdomain, token) => axios.delete(`${API_BASE_URL}/api/v1/portal/${subdomain}/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Portal Org Management (portal JWT — companies, departments, designations) ──
export const portalOrgApi = {
  // Companies
  listCompanies:    (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getCompany:       (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createCompany:    (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateCompany:    (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateCompany:  (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateCompany:(sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteCompany:    (sd, tk, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Meta
  getIndustries: (sd, tk) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/meta/industries`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Departments
  listDepts:        (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDept:          (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createDept:       (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateDept:       (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateDept:     (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateDept:   (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteDept:       (sd, tk, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  deptHierarchy:    (sd, tk, companyId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/hierarchy/${companyId}`, { headers: { Authorization: `Bearer ${tk}` } }),
  getDeptStats:     (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/stats`, { headers: { Authorization: `Bearer ${tk}` } }),
  getDeptEmployees: (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/employees`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDeptDesigs:    (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/designations`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDeptActivities:(sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/activities`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  listActiveEmployees:(sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/employees/active`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  seedDepts:        (sd, tk, companyId) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/seed/${companyId}`, {}, { headers: { Authorization: `Bearer ${tk}` } }),

  // Designations
  listDesigs:    (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDesig:      (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createDesig:   (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateDesig:   (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateDesig: (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateDesig:(sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteDesig:   (sd, tk, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  getDesigEmployees: (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/employees`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDesigActivities: (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/activities`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  seedDesigs: (sd, tk, companyId) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/seed/${companyId}`, {}, { headers: { Authorization: `Bearer ${tk}` } }),

  // Branches
  listBranches:    (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getBranch:       (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createBranch:    (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateBranch:    (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateBranch:  (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateBranch:(sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteBranch:    (sd, tk, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/org/branches/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Full hierarchy (company + dept tree + designations)
  hierarchy: (sd, tk, companyId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/hierarchy/${companyId}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Cross-company document expiry summary
  listExpiringDocs:  (sd, tk, days_ahead = 30) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/documents/expiring`, { headers: { Authorization: `Bearer ${tk}` }, params: { days_ahead } }),

  // Company Documents
  listCompanyDocs:   (sd, tk, cid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${cid}/documents`, { headers: { Authorization: `Bearer ${tk}` } }),
  uploadCompanyDoc:  (sd, tk, cid, formData) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${cid}/documents`, formData, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  updateCompanyDoc:  (sd, tk, cid, docId, formData) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${cid}/documents/${docId}`, formData, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  deleteCompanyDoc:  (sd, tk, cid, docId) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${cid}/documents/${docId}`, { headers: { Authorization: `Bearer ${tk}` } }),
  downloadCompanyDoc:(sd, tk, cid, docId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/companies/${cid}/documents/${docId}/download`, { headers: { Authorization: `Bearer ${tk}` }, responseType: "blob" }),
};

// ── Portal Employee Management ────────────────────────────────────────────────
export const portalEmployeeApi = {
  options:  (sd, tk) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/meta/options`, { headers: { Authorization: `Bearer ${tk}` } }),

  list:     (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  get:      (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  profile:  (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${id}/profile`, { headers: { Authorization: `Bearer ${tk}` } }),
  create:   (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  update:   (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activate:   (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivate: (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),

  // Education
  listEducation:   (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/education`, { headers: { Authorization: `Bearer ${tk}` } }),
  addEducation:    (sd, tk, eid, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/education`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateEducation: (sd, tk, eid, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/education/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteEducation: (sd, tk, eid, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/education/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Employment History
  listHistory:   (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/employment-history`, { headers: { Authorization: `Bearer ${tk}` } }),
  addHistory:    (sd, tk, eid, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/employment-history`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateHistory: (sd, tk, eid, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/employment-history/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteHistory: (sd, tk, eid, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/employment-history/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Emergency Contacts
  listContacts:   (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/emergency-contacts`, { headers: { Authorization: `Bearer ${tk}` } }),
  addContact:     (sd, tk, eid, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/emergency-contacts`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateContact:  (sd, tk, eid, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/emergency-contacts/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteContact:  (sd, tk, eid, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/emergency-contacts/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Bank Details
  getBankDetails:    (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/bank-details`, { headers: { Authorization: `Bearer ${tk}` } }),
  upsertBankDetails: (sd, tk, eid, data) => axios.put(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/bank-details`, data, { headers: { Authorization: `Bearer ${tk}` } }),

  // Government IDs
  getGovIds:    (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/government-ids`, { headers: { Authorization: `Bearer ${tk}` } }),
  upsertGovIds: (sd, tk, eid, data) => axios.put(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/government-ids`, data, { headers: { Authorization: `Bearer ${tk}` } }),

  // Family Members
  listFamilyMembers:   (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/family-members`, { headers: { Authorization: `Bearer ${tk}` } }),
  addFamilyMember:     (sd, tk, eid, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/family-members`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateFamilyMember:  (sd, tk, eid, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/family-members/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  deleteFamilyMember:  (sd, tk, eid, id) => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/family-members/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),

  // Activities
  listActivities: (sd, tk, eid) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employees/${eid}/activities`, { headers: { Authorization: `Bearer ${tk}` } }),
};

// ── Organization Settings (superadmin — singleton platform identity) ─────────
const ORG = "/superadmin/organization";

export const orgApi = {
  get: () => apiClient.get(ORG),
  update: (data) => apiClient.patch(ORG, data),
};

// ── Portal Asset Management (portal JWT — categories, sub-cats CRUD + catalog browse) ──
const _ph = (sd, tk) => ({ headers: { Authorization: `Bearer ${tk}` } });
const _php = (sd, tk, p) => ({ headers: { Authorization: `Bearer ${tk}` }, params: p });

export const portalAssetApi = {
  metaOptions:      (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/meta/options`, _ph(sd, tk)),

  // Categories
  listCategories:   (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories`, _php(sd, tk, p)),
  getCategory:      (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories/${id}`, _ph(sd, tk)),
  createCategory:   (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories`, data, _ph(sd, tk)),
  updateCategory:   (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories/${id}`, d, _ph(sd, tk)),
  activateCategory: (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories/${id}/activate`, {}, _ph(sd, tk)),
  deactivateCategory:(sd, tk, id)   => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/categories/${id}/deactivate`, {}, _ph(sd, tk)),

  // Sub-Categories
  listSubCategories:(sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories`, _php(sd, tk, p)),
  getSubCategory:   (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories/${id}`, _ph(sd, tk)),
  createSubCategory:(sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories`, data, _ph(sd, tk)),
  updateSubCategory:(sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories/${id}`, d, _ph(sd, tk)),
  activateSubCategory:(sd, tk, id)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories/${id}/activate`, {}, _ph(sd, tk)),
  deactivateSubCategory:(sd, tk, id)=> axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/sub-categories/${id}/deactivate`, {}, _ph(sd, tk)),

  // Catalog (browse-only)
  listCatalog:      (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/catalog`, _php(sd, tk, p)),
  getCatalogItem:   (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/catalog/${id}`, _ph(sd, tk)),
  createCatalogItem:(sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/catalog`, data, _ph(sd, tk)),

  // Inventory (client-owned assets)
  inventoryMeta:         (sd, tk)          => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/meta/options`, _ph(sd, tk)),
  listInventory:         (sd, tk, p)       => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory`, _php(sd, tk, p)),
  createInventoryItem:   (sd, tk, data)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory`, data, _ph(sd, tk)),
  getInventoryItem:      (sd, tk, id)      => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}`, _ph(sd, tk)),
  updateInventoryItem:   (sd, tk, id, d)   => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}`, d, _ph(sd, tk)),
  deleteInventoryItem:   (sd, tk, id)      => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}`, _ph(sd, tk)),
  assignAsset:           (sd, tk, id, d)   => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}/assign`, d, _ph(sd, tk)),
  returnAsset:           (sd, tk, id, d)   => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}/return`, d, _ph(sd, tk)),
  listInventoryDocs:     (sd, tk, id)      => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}/documents`, _ph(sd, tk)),
  listInventoryActivities:(sd, tk, id)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/inventory/${id}/activities`, _ph(sd, tk)),

  // Assignment module
  assignmentMeta:              (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/meta/options`, _ph(sd, tk)),
  assignmentDashboard:         (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/dashboard`, _ph(sd, tk)),
  // Requests
  listAssignmentRequests:      (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests`, _php(sd, tk, p)),
  createAssignmentRequest:     (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests`, data, _ph(sd, tk)),
  getAssignmentRequest:        (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests/${id}`, _ph(sd, tk)),
  updateAssignmentRequest:     (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests/${id}`, d, _ph(sd, tk)),
  submitAssignmentRequest:     (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests/${id}/submit`, {}, _ph(sd, tk)),
  approveAssignmentRequest:    (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests/${id}/approve`, {}, _ph(sd, tk)),
  rejectAssignmentRequest:     (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/requests/${id}/reject`, d, _ph(sd, tk)),
  // Assignments
  listAssignments:             (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments`, _php(sd, tk, p)),
  createAssignment:            (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments`, data, _ph(sd, tk)),
  getAssignment:               (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}`, _ph(sd, tk)),
  returnAssignment:            (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}/return`, d, _ph(sd, tk)),
  transferAssignment:          (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}/transfer`, d, _ph(sd, tk)),
  reportDamage:                (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}/damage`, d, _ph(sd, tk)),
  markLost:                    (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}/lost`, d, _ph(sd, tk)),
  acknowledgeAssignment:       (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/${id}/acknowledge`, d, _ph(sd, tk)),
  getEmployeeAssets:           (sd, tk, empId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/assignments/employee/${empId}`, _ph(sd, tk)),
};

export const portalAssetInventoryApi = {
  list:   (sd, tk, p)     => portalAssetApi.listInventory(sd, tk, p),
  get:    (sd, tk, id)    => portalAssetApi.getInventoryItem(sd, tk, id),
  create: (sd, tk, data)  => portalAssetApi.createInventoryItem(sd, tk, data),
  update: (sd, tk, id, d) => portalAssetApi.updateInventoryItem(sd, tk, id, d),
  remove: (sd, tk, id)    => portalAssetApi.deleteInventoryItem(sd, tk, id),
  metaOptions: (sd, tk)   => portalAssetApi.inventoryMeta(sd, tk),
};

export const portalAssetAssignmentApi = {
  list:          (sd, tk, p)     => portalAssetApi.listAssignments(sd, tk, p),
  get:           (sd, tk, id)    => portalAssetApi.getAssignment(sd, tk, id),
  create:        (sd, tk, data)  => portalAssetApi.createAssignment(sd, tk, data),
  return:        (sd, tk, id, d) => portalAssetApi.returnAssignment(sd, tk, id, d),
  transfer:      (sd, tk, id, d) => portalAssetApi.transferAssignment(sd, tk, id, d),
  reportDamage:  (sd, tk, id, d) => portalAssetApi.reportDamage(sd, tk, id, d),
  markLost:      (sd, tk, id, d) => portalAssetApi.markLost(sd, tk, id, d),
  acknowledge:   (sd, tk, id, d) => portalAssetApi.acknowledgeAssignment(sd, tk, id, d),
  getEmployee:   (sd, tk, empId) => portalAssetApi.getEmployeeAssets(sd, tk, empId),
  metaOptions:   (sd, tk)        => portalAssetApi.assignmentMeta(sd, tk),
  dashboard:     (sd, tk)        => portalAssetApi.assignmentDashboard(sd, tk),
  listRequests:  (sd, tk, p)     => portalAssetApi.listAssignmentRequests(sd, tk, p),
  createRequest: (sd, tk, data)  => portalAssetApi.createAssignmentRequest(sd, tk, data),
  getRequest:    (sd, tk, id)    => portalAssetApi.getAssignmentRequest(sd, tk, id),
  updateRequest: (sd, tk, id, d) => portalAssetApi.updateAssignmentRequest(sd, tk, id, d),
  submitRequest: (sd, tk, id)    => portalAssetApi.submitAssignmentRequest(sd, tk, id),
  approveRequest:(sd, tk, id)    => portalAssetApi.approveAssignmentRequest(sd, tk, id),
  rejectRequest: (sd, tk, id, d) => portalAssetApi.rejectAssignmentRequest(sd, tk, id, d),
};

export const portalAssetReturnApi = {
  metaOptions:   (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/meta/options`, _ph(sd, tk)),
  dashboard:     (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/dashboard`, _ph(sd, tk)),
  list:          (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns`, _php(sd, tk, p)),
  get:           (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}`, _ph(sd, tk)),
  create:        (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns`, data, _ph(sd, tk)),
  submit:        (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/submit`, {}, _ph(sd, tk)),
  approve:       (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/approve`, {}, _ph(sd, tk)),
  reject:        (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/reject`, d, _ph(sd, tk)),
  complete:      (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/complete`, d, _ph(sd, tk)),
  close:         (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/close`, {}, _ph(sd, tk)),
  saveAssessment:(sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/assessment`, d, _ph(sd, tk)),
  saveRecovery:  (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/returns/${id}/recovery`, d, _ph(sd, tk)),
};

export const portalAssetTransferApi = {
  metaOptions:    (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/meta/options`, _ph(sd, tk)),
  dashboard:      (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/dashboard`, _ph(sd, tk)),
  list:           (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers`, _php(sd, tk, p)),
  get:            (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}`, _ph(sd, tk)),
  create:         (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers`, data, _ph(sd, tk)),
  submit:         (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/submit`, {}, _ph(sd, tk)),
  approve:        (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/approve`, {}, _ph(sd, tk)),
  reject:         (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/reject`, d, _ph(sd, tk)),
  cancel:         (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/cancel`, d, _ph(sd, tk)),
  recordHandover: (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/handover`, d, _ph(sd, tk)),
  complete:       (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/transfers/${id}/complete`, d, _ph(sd, tk)),
};

export const portalAssetMaintenanceApi = {
  metaOptions:    (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/meta/options`, _ph(sd, tk)),
  dashboard:      (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/dashboard`, _ph(sd, tk)),
  list:           (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance`, _php(sd, tk, p)),
  get:            (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}`, _ph(sd, tk)),
  create:         (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance`, data, _ph(sd, tk)),
  assign:         (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/assign`, d, _ph(sd, tk)),
  updateStatus:   (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/status`, d, _ph(sd, tk)),
  complete:       (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/complete`, d, _ph(sd, tk)),
  close:          (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/close`, {}, _ph(sd, tk)),
  cancel:         (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/cancel`, d, _ph(sd, tk)),
  createWorkOrder:(sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/${id}/work-orders`, d, _ph(sd, tk)),
  updateWorkOrder:(sd, tk, wid, d)=> axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/work-orders/${wid}`, d, _ph(sd, tk)),
  listWorkOrders: (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/maintenance/work-orders/list`, _php(sd, tk, p)),
  listWarranties: (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/warranties`, _php(sd, tk, p)),
  getWarranty:    (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/warranties/${id}`, _ph(sd, tk)),
  createWarranty: (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/warranties`, data, _ph(sd, tk)),
  updateWarranty: (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/warranties/${id}`, d, _ph(sd, tk)),
  listAmcs:       (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/amc`, _php(sd, tk, p)),
  getAmc:         (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/amc/${id}`, _ph(sd, tk)),
  createAmc:      (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/amc`, data, _ph(sd, tk)),
  updateAmc:      (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/amc/${id}`, d, _ph(sd, tk)),
};

export const portalAssetRequestApi = {
  metaOptions:  (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/meta/options`, _ph(sd, tk)),
  list:         (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests`, _php(sd, tk, p)),
  create:       (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests`, data, _ph(sd, tk)),
  get:          (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}`, _ph(sd, tk)),
  update:       (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}`, d, _ph(sd, tk)),
  submit:       (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/submit`, {}, _ph(sd, tk)),
  review:       (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/review`, {}, _ph(sd, tk)),
  approve:      (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/approve`, d, _ph(sd, tk)),
  reject:       (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/reject`, d, _ph(sd, tk)),
  cancel:       (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/cancel`, {}, _ph(sd, tk)),
  fulfil:       (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/assets/requests/${id}/fulfil`, d, _ph(sd, tk)),
};

// ── Portal Employee Document Management ───────────────────────────────────────
export const portalEmpDocApi = {
  metaOptions: (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/meta/options`, _ph(sd, tk)),
  dashboard:   (sd, tk)        => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/dashboard`, _ph(sd, tk)),

  // Document Types
  listTypes:   (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/types`, _php(sd, tk, p)),
  createType:  (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/types`, data, _ph(sd, tk)),
  updateType:  (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/types/${id}`, d, _ph(sd, tk)),

  // Employee Documents
  list:        (sd, tk, p)     => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents`, _php(sd, tk, p)),
  get:         (sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}`, _ph(sd, tk)),
  upload:      (sd, tk, data)  => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents`, data, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  update:      (sd, tk, id, d) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}`, d, _ph(sd, tk)),
  remove:      (sd, tk, id)    => axios.delete(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}`, _ph(sd, tk)),
  replace:     (sd, tk, id, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/replace`, data, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  submit:      (sd, tk, id)    => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/submit`, {}, _ph(sd, tk)),
  verify:      (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/verify`, d, _ph(sd, tk)),
  reject:      (sd, tk, id, d) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/reject`, d, _ph(sd, tk)),
  listVersions:(sd, tk, id)    => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/versions`, _ph(sd, tk)),
  listActivities:(sd, tk, id)  => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/activities`, _ph(sd, tk)),
  downloadUrl: (sd, id, v)     => `${API_BASE_URL}/api/v1/portal/${sd}/employee-documents/${id}/download${v != null ? `?version=${v}` : ""}`,
};

// ── Portal Recruitment API ────────────────────────────────────────────────────
const _rh = (sd, tk) => ({ headers: { Authorization: `Bearer ${tk}` } });
const _rurl = (sd, path) => `${API_BASE_URL}/api/v1/portal/${sd}/recruitment${path}`;

export const portalRecruitmentApi = {
  metaOptions:   (sd, tk)           => axios.get(_rurl(sd, "/meta/options"), _rh(sd, tk)),
  dashboard:     (sd, tk)           => axios.get(_rurl(sd, "/dashboard"), _rh(sd, tk)),

  listRequisitions:  (sd, tk, p)    => axios.get(_rurl(sd, "/requisitions"), { ..._rh(sd, tk), params: p }),
  getRequisition:    (sd, tk, id)   => axios.get(_rurl(sd, `/requisitions/${id}`), _rh(sd, tk)),
  createRequisition: (sd, tk, d)    => axios.post(_rurl(sd, "/requisitions"), d, _rh(sd, tk)),
  updateRequisition: (sd, tk, id, d)=> axios.patch(_rurl(sd, `/requisitions/${id}`), d, _rh(sd, tk)),
  deleteRequisition: (sd, tk, id)   => axios.delete(_rurl(sd, `/requisitions/${id}`), _rh(sd, tk)),
  submitRequisition: (sd, tk, id)   => axios.post(_rurl(sd, `/requisitions/${id}/submit`), {}, _rh(sd, tk)),
  approveRequisition:(sd, tk, id)   => axios.post(_rurl(sd, `/requisitions/${id}/approve`), {}, _rh(sd, tk)),
  rejectRequisition: (sd, tk, id, d)=> axios.post(_rurl(sd, `/requisitions/${id}/reject`), d, _rh(sd, tk)),

  listOpenings:  (sd, tk, p)        => axios.get(_rurl(sd, "/openings"), { ..._rh(sd, tk), params: p }),
  getOpening:    (sd, tk, id)       => axios.get(_rurl(sd, `/openings/${id}`), _rh(sd, tk)),
  createOpening: (sd, tk, d)        => axios.post(_rurl(sd, "/openings"), d, _rh(sd, tk)),
  updateOpening: (sd, tk, id, d)    => axios.patch(_rurl(sd, `/openings/${id}`), d, _rh(sd, tk)),
  deleteOpening: (sd, tk, id)       => axios.delete(_rurl(sd, `/openings/${id}`), _rh(sd, tk)),

  listCandidates:  (sd, tk, p)      => axios.get(_rurl(sd, "/candidates"), { ..._rh(sd, tk), params: p }),
  getCandidate:    (sd, tk, id)     => axios.get(_rurl(sd, `/candidates/${id}`), _rh(sd, tk)),
  createCandidate: (sd, tk, d)      => axios.post(_rurl(sd, "/candidates"), d, _rh(sd, tk)),
  updateCandidate: (sd, tk, id, d)  => axios.patch(_rurl(sd, `/candidates/${id}`), d, _rh(sd, tk)),
  deleteCandidate: (sd, tk, id)     => axios.delete(_rurl(sd, `/candidates/${id}`), _rh(sd, tk)),
  changeStatus:    (sd, tk, id, d)  => axios.post(_rurl(sd, `/candidates/${id}/status`), d, _rh(sd, tk)),
  uploadResume:    (sd, tk, id, fd) => axios.post(_rurl(sd, `/candidates/${id}/resume`), fd, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  downloadResume:  (sd, tk, id)     => axios.get(_rurl(sd, `/candidates/${id}/resume/download`), { ..._rh(sd, tk), responseType: "blob" }),
  listCandidateDocs: (sd, tk, id)   => axios.get(_rurl(sd, `/candidates/${id}/documents`), _rh(sd, tk)),
  uploadDoc:       (sd, tk, id, fd) => axios.post(_rurl(sd, `/candidates/${id}/documents`), fd, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  deleteDoc:       (sd, tk, id, did)=> axios.delete(_rurl(sd, `/candidates/${id}/documents/${did}`), _rh(sd, tk)),
  downloadDoc:     (sd, tk, id, did)=> axios.get(_rurl(sd, `/candidates/${id}/documents/${did}/download`), { ..._rh(sd, tk), responseType: "blob" }),
  getCandidateActivities: (sd, tk, id) => axios.get(_rurl(sd, `/candidates/${id}/activities`), _rh(sd, tk)),
  timeline: (sd, tk, limit = 15)       => axios.get(_rurl(sd, "/timeline"), { ..._rh(sd, tk), params: { limit } }),

  listOffers:  (sd, tk, p)          => axios.get(_rurl(sd, "/offers"), { ..._rh(sd, tk), params: p }),
  getOffer:    (sd, tk, id)         => axios.get(_rurl(sd, `/offers/${id}`), _rh(sd, tk)),
  createOffer: (sd, tk, d)          => axios.post(_rurl(sd, "/offers"), d, _rh(sd, tk)),
  updateOffer: (sd, tk, id, d)      => axios.patch(_rurl(sd, `/offers/${id}`), d, _rh(sd, tk)),
  sendOffer:   (sd, tk, id)         => axios.post(_rurl(sd, `/offers/${id}/send`), {}, _rh(sd, tk)),
  acceptOffer: (sd, tk, id)         => axios.post(_rurl(sd, `/offers/${id}/accept`), {}, _rh(sd, tk)),
  rejectOffer: (sd, tk, id, d)      => axios.post(_rurl(sd, `/offers/${id}/reject`), d, _rh(sd, tk)),
  uploadOfferLetter:   (sd, tk, id, fd) => axios.post(_rurl(sd, `/offers/${id}/letter`), fd, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } }),
  downloadOfferLetter: (sd, tk, id)     => axios.get(_rurl(sd, `/offers/${id}/letter/download`), { ..._rh(sd, tk), responseType: "blob" }),
  deleteOfferLetter:   (sd, tk, id)     => axios.delete(_rurl(sd, `/offers/${id}/letter`), _rh(sd, tk)),
};

// ── Interview Management (portal) ─────────────────────────────────────────────
const _iurl = (sd, path) => `${API_BASE_URL}/api/v1/portal/${sd}/hrms/interviews${path}`;

export const portalInterviewApi = {
  // Meta
  metaOptions: (sd, tk)               => axios.get(_iurl(sd, "/meta/options"),    _rh(sd, tk)),
  dashboard:   (sd, tk)               => axios.get(_iurl(sd, "/dashboard"),        _rh(sd, tk)),

  // Calendar
  calendarFilterOptions: (sd, tk) =>
    axios.get(_iurl(sd, "/calendar/filter-options"), _rh(sd, tk)),
  calendarEvents: (sd, tk, start, end, filters = {}) =>
    axios.get(_iurl(sd, "/calendar/events"), { ..._rh(sd, tk), params: { start, end, ...filters } }),

  // Pipelines
  listPipelines:   (sd, tk, p)        => axios.get(_iurl(sd, "/pipelines"),         { ..._rh(sd, tk), params: p }),
  createPipeline:  (sd, tk, d)        => axios.post(_iurl(sd, "/pipelines"),        d, _rh(sd, tk)),
  getPipeline:     (sd, tk, id)       => axios.get(_iurl(sd, `/pipelines/${id}`),    _rh(sd, tk)),
  updatePipeline:  (sd, tk, id, d)    => axios.patch(_iurl(sd, `/pipelines/${id}`), d, _rh(sd, tk)),
  deletePipeline:  (sd, tk, id)       => axios.delete(_iurl(sd, `/pipelines/${id}`),  _rh(sd, tk)),

  // Pipeline stages
  addStage:       (sd, tk, pid, d)    => axios.post(_iurl(sd, `/pipelines/${pid}/stages`),           d, _rh(sd, tk)),
  updateStage:    (sd, tk, pid, sid, d) => axios.patch(_iurl(sd, `/pipelines/${pid}/stages/${sid}`), d, _rh(sd, tk)),
  deleteStage:    (sd, tk, pid, sid)  => axios.delete(_iurl(sd, `/pipelines/${pid}/stages/${sid}`),     _rh(sd, tk)),
  reorderStages:  (sd, tk, pid, ids)  => axios.post(_iurl(sd, `/pipelines/${pid}/stages/reorder`), { stage_ids: ids }, _rh(sd, tk)),

  // Interviews
  list:     (sd, tk, p)               => axios.get(_iurl(sd, "/list"),               { ..._rh(sd, tk), params: p }),
  schedule: (sd, tk, d)               => axios.post(_iurl(sd, "/schedule"),          d, _rh(sd, tk)),
  get:      (sd, tk, id, full)        => axios.get(_iurl(sd, `/${id}`),              { ..._rh(sd, tk), params: { full: full || false } }),
  update:   (sd, tk, id, d)           => axios.patch(_iurl(sd, `/${id}`),            d, _rh(sd, tk)),
  remove:   (sd, tk, id)              => axios.delete(_iurl(sd, `/${id}`),              _rh(sd, tk)),

  // Status transitions
  reschedule: (sd, tk, id, d)         => axios.post(_iurl(sd, `/${id}/reschedule`),  d, _rh(sd, tk)),
  complete:   (sd, tk, id, d)         => axios.post(_iurl(sd, `/${id}/complete`),    d, _rh(sd, tk)),
  cancel:     (sd, tk, id, d)         => axios.post(_iurl(sd, `/${id}/cancel`),      d, _rh(sd, tk)),
  noShow:     (sd, tk, id)            => axios.post(_iurl(sd, `/${id}/no-show`),  {}, _rh(sd, tk)),
  select:     (sd, tk, id, d)         => axios.post(_iurl(sd, `/${id}/select`),      d, _rh(sd, tk)),
  reject:     (sd, tk, id, d)         => axios.post(_iurl(sd, `/${id}/reject`),      d, _rh(sd, tk)),

  // Panel
  listPanel:    (sd, tk, id)          => axios.get(_iurl(sd, `/${id}/panel`),          _rh(sd, tk)),
  addPanel:     (sd, tk, id, d)       => axios.post(_iurl(sd, `/${id}/panel`),       d, _rh(sd, tk)),
  removePanel:  (sd, tk, id, pid)     => axios.delete(_iurl(sd, `/${id}/panel/${pid}`), _rh(sd, tk)),

  // Feedback
  listFeedback:   (sd, tk, id)        => axios.get(_iurl(sd, `/${id}/feedback`),       _rh(sd, tk)),
  submitFeedback: (sd, tk, id, d)     => axios.post(_iurl(sd, `/${id}/feedback`),    d, _rh(sd, tk)),
  updateFeedback: (sd, tk, id, fid, d) => axios.patch(_iurl(sd, `/${id}/feedback/${fid}`), d, _rh(sd, tk)),

  // Activities
  activities: (sd, tk, id)            => axios.get(_iurl(sd, `/${id}/activities`),    _rh(sd, tk)),
};

// ── Asset Management Setup (superadmin — categories, sub-categories, masters) ─
const ASSETS = "/superadmin/assets";

export const assetMgmtApi = {
  metaOptions: () => apiClient.get(`${ASSETS}/meta/options`),

  listCategories: (params) => apiClient.get(`${ASSETS}/categories`, { params }),
  getCategory: (id) => apiClient.get(`${ASSETS}/categories/${id}`),
  createCategory: (data) => apiClient.post(`${ASSETS}/categories`, data),
  updateCategory: (id, data) => apiClient.patch(`${ASSETS}/categories/${id}`, data),
  activateCategory: (id) => apiClient.post(`${ASSETS}/categories/${id}/activate`),
  deactivateCategory: (id) => apiClient.post(`${ASSETS}/categories/${id}/deactivate`),

  listSubCategories: (params) => apiClient.get(`${ASSETS}/sub-categories`, { params }),
  getSubCategory: (id) => apiClient.get(`${ASSETS}/sub-categories/${id}`),
  createSubCategory: (data) => apiClient.post(`${ASSETS}/sub-categories`, data),
  updateSubCategory: (id, data) => apiClient.patch(`${ASSETS}/sub-categories/${id}`, data),
  activateSubCategory: (id) => apiClient.post(`${ASSETS}/sub-categories/${id}/activate`),
  deactivateSubCategory: (id) => apiClient.post(`${ASSETS}/sub-categories/${id}/deactivate`),

  listMasters: (params) => apiClient.get(`${ASSETS}/masters`, { params }),
  getMaster: (id) => apiClient.get(`${ASSETS}/masters/${id}`),
  createMaster: (data) => apiClient.post(`${ASSETS}/masters`, data),
  updateMaster: (id, data) => apiClient.patch(`${ASSETS}/masters/${id}`, data),
  activateMaster: (id) => apiClient.post(`${ASSETS}/masters/${id}/activate`),
  deactivateMaster: (id) => apiClient.post(`${ASSETS}/masters/${id}/deactivate`),
  listMasterActivities: (id, params) => apiClient.get(`${ASSETS}/masters/${id}/activities`, { params }),
};

// ── Portal — Employee Onboarding ─────────────────────────────────────────────
const _oburl = (sd, path) => `${API_BASE_URL}/api/v1/portal/${sd}/hrms/onboarding${path}`;
const _obh   = (sd, tk)   => ({ headers: { Authorization: `Bearer ${tk}` } });
const _obhp  = (sd, tk, params) => ({ headers: { Authorization: `Bearer ${tk}` }, params });

export const portalOnboardingApi = {
  metaOptions: (sd, tk)                => axios.get(_oburl(sd, "/meta/options"), _obh(sd, tk)),
  dashboard:   (sd, tk)                => axios.get(_oburl(sd, "/dashboard"),    _obh(sd, tk)),

  // Templates
  listTemplates:      (sd, tk, activeOnly = false) => axios.get(_oburl(sd, "/templates"),          { ..._obh(sd, tk), params: { active_only: activeOnly } }),
  getTemplate:        (sd, tk, id)     => axios.get(_oburl(sd, `/templates/${id}`),                _obh(sd, tk)),
  createTemplate:     (sd, tk, d)      => axios.post(_oburl(sd, "/templates"),               d, _obh(sd, tk)),
  updateTemplate:     (sd, tk, id, d)  => axios.patch(_oburl(sd, `/templates/${id}`),        d, _obh(sd, tk)),
  deleteTemplate:     (sd, tk, id)     => axios.delete(_oburl(sd, `/templates/${id}`),          _obh(sd, tk)),

  // Template tasks
  addTemplateTask:    (sd, tk, tid, d)         => axios.post(_oburl(sd, `/templates/${tid}/tasks`),                 d, _obh(sd, tk)),
  updateTemplateTask: (sd, tk, tid, tkid, d)   => axios.patch(_oburl(sd, `/templates/${tid}/tasks/${tkid}`),        d, _obh(sd, tk)),
  deleteTemplateTask: (sd, tk, tid, tkid)      => axios.delete(_oburl(sd, `/templates/${tid}/tasks/${tkid}`),          _obh(sd, tk)),

  // Onboarding records
  list:      (sd, tk, p)               => axios.get(_oburl(sd, ""),              _obhp(sd, tk, p)),
  start:     (sd, tk, d)               => axios.post(_oburl(sd, "/start"),  d,   _obh(sd, tk)),
  get:       (sd, tk, id)              => axios.get(_oburl(sd, `/${id}`),        _obh(sd, tk)),
  setStatus: (sd, tk, id, d)           => axios.patch(_oburl(sd, `/${id}/status`), d, _obh(sd, tk)),
  readiness: (sd, tk, id)              => axios.get(_oburl(sd, `/${id}/readiness`), _obh(sd, tk)),
  activate:  (sd, tk, id)              => axios.post(_oburl(sd, `/${id}/activate`), {}, _obh(sd, tk)),

  // Tasks
  listTasks:  (sd, tk, id)             => axios.get(_oburl(sd, `/${id}/tasks`),         _obh(sd, tk)),
  addTask:    (sd, tk, id, d)          => axios.post(_oburl(sd, `/${id}/tasks`),   d,   _obh(sd, tk)),
  updateTask: (sd, tk, id, tid, d)     => axios.patch(_oburl(sd, `/${id}/tasks/${tid}`), d, _obh(sd, tk)),

  // Accounts
  listAccounts:   (sd, tk, id)         => axios.get(_oburl(sd, `/${id}/accounts`),          _obh(sd, tk)),
  createAccount:  (sd, tk, id, d)      => axios.post(_oburl(sd, `/${id}/accounts`),    d,   _obh(sd, tk)),
  updateAccount:  (sd, tk, id, aid, d) => axios.patch(_oburl(sd, `/${id}/accounts/${aid}`), d, _obh(sd, tk)),
  deleteAccount:  (sd, tk, id, aid)    => axios.delete(_oburl(sd, `/${id}/accounts/${aid}`),   _obh(sd, tk)),

  // Training
  listTraining:   (sd, tk, id)         => axios.get(_oburl(sd, `/${id}/training`),          _obh(sd, tk)),
  createTraining: (sd, tk, id, d)      => axios.post(_oburl(sd, `/${id}/training`),    d,   _obh(sd, tk)),
  updateTraining: (sd, tk, id, tid, d) => axios.patch(_oburl(sd, `/${id}/training/${tid}`), d, _obh(sd, tk)),
  deleteTraining: (sd, tk, id, tid)    => axios.delete(_oburl(sd, `/${id}/training/${tid}`),   _obh(sd, tk)),

  // Assets
  getAssets:   (sd, tk, id)            => axios.get(_oburl(sd, `/${id}/assets`),             _obh(sd, tk)),
  assignAsset: (sd, tk, id, d)         => axios.post(_oburl(sd, `/${id}/assets`),       d,   _obh(sd, tk)),

  // Activities
  activities: (sd, tk, id)             => axios.get(_oburl(sd, `/${id}/activities`),         _obh(sd, tk)),
};

// ── Attendance Management (portal — client DB) ────────────────────────────────
const _aturl = (sd, path) => `${API_BASE_URL}/api/v1/portal/${sd}/hrms/attendance${path}`;
const _ath   = (sd, tk)   => ({ headers: { Authorization: `Bearer ${tk}` } });
const _athp  = (sd, tk, params) => ({ headers: { Authorization: `Bearer ${tk}` }, params });

export const portalAttendanceApi = {
  metaOptions: (sd, tk)              => axios.get(_aturl(sd, "/meta/options"),  _ath(sd, tk)),
  dashboard:   (sd, tk)              => axios.get(_aturl(sd, "/dashboard"),     _ath(sd, tk)),

  // Shifts
  listShifts:      (sd, tk, activeOnly = false) => axios.get(_aturl(sd, "/shifts"), { ..._ath(sd, tk), params: { active_only: activeOnly } }),
  getShift:        (sd, tk, id)      => axios.get(_aturl(sd, `/shifts/${id}`),          _ath(sd, tk)),
  createShift:     (sd, tk, d)       => axios.post(_aturl(sd, "/shifts"),          d,   _ath(sd, tk)),
  updateShift:     (sd, tk, id, d)   => axios.patch(_aturl(sd, `/shifts/${id}`),   d,   _ath(sd, tk)),
  deleteShift:     (sd, tk, id)      => axios.delete(_aturl(sd, `/shifts/${id}`),       _ath(sd, tk)),

  // Shift Assignments
  listAssignments:  (sd, tk, p)      => axios.get(_aturl(sd, "/shift-assignments"),     _athp(sd, tk, p)),
  createAssignment: (sd, tk, d)      => axios.post(_aturl(sd, "/shift-assignments"), d, _ath(sd, tk)),
  deleteAssignment: (sd, tk, id)     => axios.delete(_aturl(sd, `/shift-assignments/${id}`), _ath(sd, tk)),

  // Check-In / Check-Out
  checkIn:   (sd, tk, d)             => axios.post(_aturl(sd, "/check-in"),        d,   _ath(sd, tk)),
  checkOut:  (sd, tk, d)             => axios.post(_aturl(sd, "/check-out"),       d,   _ath(sd, tk)),

  // Records
  listRecords:  (sd, tk, p)          => axios.get(_aturl(sd, "/records"),               _athp(sd, tk, p)),
  getRecord:    (sd, tk, id)         => axios.get(_aturl(sd, `/records/${id}`),          _ath(sd, tk)),
  createRecord: (sd, tk, d)          => axios.post(_aturl(sd, "/records"),         d,   _ath(sd, tk)),
  updateRecord: (sd, tk, id, d)      => axios.patch(_aturl(sd, `/records/${id}`),  d,   _ath(sd, tk)),

  // Calendar
  calendar: (sd, tk, employeeId, year, month) =>
    axios.get(_aturl(sd, "/calendar"), { ..._ath(sd, tk), params: { employee_id: employeeId, year, month } }),

  // Regularizations
  listRegularizations:  (sd, tk, p)  => axios.get(_aturl(sd, "/regularizations"),       _athp(sd, tk, p)),
  createRegularization: (sd, tk, d)  => axios.post(_aturl(sd, "/regularizations"), d,   _ath(sd, tk)),
  reviewRegularization: (sd, tk, id, d) => axios.patch(_aturl(sd, `/regularizations/${id}/review`), d, _ath(sd, tk)),

  // Overtime
  listOvertime:   (sd, tk, p)        => axios.get(_aturl(sd, "/overtime"),               _athp(sd, tk, p)),
  createOvertime: (sd, tk, d)        => axios.post(_aturl(sd, "/overtime"),        d,   _ath(sd, tk)),
  reviewOvertime: (sd, tk, id, d)    => axios.patch(_aturl(sd, `/overtime/${id}/review`), d, _ath(sd, tk)),

  // Policies
  listPolicies:  (sd, tk)            => axios.get(_aturl(sd, "/policies"),               _ath(sd, tk)),
  getPolicy:     (sd, tk, id)        => axios.get(_aturl(sd, `/policies/${id}`),          _ath(sd, tk)),
  createPolicy:  (sd, tk, d)         => axios.post(_aturl(sd, "/policies"),        d,   _ath(sd, tk)),
  updatePolicy:  (sd, tk, id, d)     => axios.patch(_aturl(sd, `/policies/${id}`), d,   _ath(sd, tk)),
  deletePolicy:  (sd, tk, id)        => axios.delete(_aturl(sd, `/policies/${id}`),      _ath(sd, tk)),

  // Devices (registry — biometric Coming Soon)
  listDevices:   (sd, tk)            => axios.get(_aturl(sd, "/devices"),                _ath(sd, tk)),
  getDevice:     (sd, tk, id)        => axios.get(_aturl(sd, `/devices/${id}`),           _ath(sd, tk)),
  createDevice:  (sd, tk, d)         => axios.post(_aturl(sd, "/devices"),         d,   _ath(sd, tk)),
  updateDevice:  (sd, tk, id, d)     => axios.patch(_aturl(sd, `/devices/${id}`),  d,   _ath(sd, tk)),
  deleteDevice:  (sd, tk, id)        => axios.delete(_aturl(sd, `/devices/${id}`),       _ath(sd, tk)),
  triggerSync:   (sd, tk, id)        => axios.post(_aturl(sd, `/devices/${id}/sync`), {}, _ath(sd, tk)),

  // Activities
  activities: (sd, tk, p)            => axios.get(_aturl(sd, "/activities"),             _athp(sd, tk, p)),

  // WFH Today
  wfhToday: (sd, tk)                 => axios.get(_aturl(sd, "/wfh/today"),              _ath(sd, tk)),

  // Employee work schedules (hybrid/WFH per-weekday)
  getEmployeeSchedule: (sd, tk, empId)      => axios.get(_aturl(sd, `/employees/${empId}/schedule`),      _ath(sd, tk)),
  setEmployeeSchedule: (sd, tk, empId, data) => axios.put(_aturl(sd, `/employees/${empId}/schedule`), data, _ath(sd, tk)),
};

// ── Leave Management ───────────────────────────────────────────────────────────
const _lvurl = (sd, path) => `${API_BASE_URL}/api/v1/portal/${sd}/hrms/leave${path}`;
const _lvh  = (sd, tk)          => ({ headers: { Authorization: `Bearer ${tk}` } });
const _lvhp = (sd, tk, params)  => ({ headers: { Authorization: `Bearer ${tk}` }, params });

export const portalLeaveApi = {
  metaOptions:  (sd, tk)          => axios.get(_lvurl(sd, "/meta/options"),  _lvh(sd, tk)),
  dashboard:    (sd, tk)          => axios.get(_lvurl(sd, "/dashboard"),      _lvh(sd, tk)),

  // Leave Types
  listLeaveTypes:   (sd, tk)            => axios.get(_lvurl(sd, "/types"),           _lvh(sd, tk)),
  createLeaveType:  (sd, tk, d)         => axios.post(_lvurl(sd, "/types"),   d,     _lvh(sd, tk)),
  updateLeaveType:  (sd, tk, id, d)     => axios.patch(_lvurl(sd, `/types/${id}`), d, _lvh(sd, tk)),
  deleteLeaveType:  (sd, tk, id)        => axios.delete(_lvurl(sd, `/types/${id}`),  _lvh(sd, tk)),

  // Leave Policies
  listPolicies:  (sd, tk)            => axios.get(_lvurl(sd, "/policies"),            _lvh(sd, tk)),
  getPolicy:     (sd, tk, id)        => axios.get(_lvurl(sd, `/policies/${id}`),       _lvh(sd, tk)),
  createPolicy:  (sd, tk, d)         => axios.post(_lvurl(sd, "/policies"),   d,      _lvh(sd, tk)),
  updatePolicy:  (sd, tk, id, d)     => axios.patch(_lvurl(sd, `/policies/${id}`), d, _lvh(sd, tk)),
  deletePolicy:  (sd, tk, id)        => axios.delete(_lvurl(sd, `/policies/${id}`),    _lvh(sd, tk)),

  // Holiday Calendars
  listCalendars:   (sd, tk)           => axios.get(_lvurl(sd, "/holiday-calendars"),            _lvh(sd, tk)),
  createCalendar:  (sd, tk, d)        => axios.post(_lvurl(sd, "/holiday-calendars"),  d,       _lvh(sd, tk)),
  updateCalendar:  (sd, tk, id, d)    => axios.patch(_lvurl(sd, `/holiday-calendars/${id}`), d, _lvh(sd, tk)),
  deleteCalendar:  (sd, tk, id)       => axios.delete(_lvurl(sd, `/holiday-calendars/${id}`),   _lvh(sd, tk)),
  listHolidays:    (sd, tk, calId, p) => axios.get(_lvurl(sd, `/holiday-calendars/${calId}/holidays`), _lvhp(sd, tk, p)),
  addHoliday:      (sd, tk, calId, d) => axios.post(_lvurl(sd, `/holiday-calendars/${calId}/holidays`), d, _lvh(sd, tk)),
  deleteHoliday:   (sd, tk, calId, hId) => axios.delete(_lvurl(sd, `/holiday-calendars/${calId}/holidays/${hId}`), _lvh(sd, tk)),

  // Weekly Off Rules
  listWeeklyOff:   (sd, tk)         => axios.get(_lvurl(sd, "/weekly-off-rules"),              _lvh(sd, tk)),
  createWeeklyOff: (sd, tk, d)      => axios.post(_lvurl(sd, "/weekly-off-rules"),   d,        _lvh(sd, tk)),
  updateWeeklyOff: (sd, tk, id, d)  => axios.patch(_lvurl(sd, `/weekly-off-rules/${id}`), d,   _lvh(sd, tk)),

  // Leave Balances
  getBalances:        (sd, tk, empId, year) => axios.get(_lvurl(sd, "/balances"), _lvhp(sd, tk, { employee_id: empId, year })),
  initializeBalance:  (sd, tk, d)           => axios.post(_lvurl(sd, "/balances/initialize"), d, _lvh(sd, tk)),
  adjustBalance:      (sd, tk, d)           => axios.post(_lvurl(sd, "/balances/adjust"),     d, _lvh(sd, tk)),

  // Leave Requests
  applyLeave:    (sd, tk, d)        => axios.post(_lvurl(sd, "/requests"),               d,   _lvh(sd, tk)),
  listRequests:  (sd, tk, p)        => axios.get(_lvurl(sd, "/requests"),                     _lvhp(sd, tk, p)),
  getRequest:    (sd, tk, id)       => axios.get(_lvurl(sd, `/requests/${id}`),                _lvh(sd, tk)),
  reviewLeave:   (sd, tk, id, d)    => axios.patch(_lvurl(sd, `/requests/${id}/review`), d,   _lvh(sd, tk)),
  cancelLeave:   (sd, tk, id, d)    => axios.patch(_lvurl(sd, `/requests/${id}/cancel`), d,   _lvh(sd, tk)),

  // Calendar
  calendarEvents: (sd, tk, p)       => axios.get(_lvurl(sd, "/calendar"),                     _lvhp(sd, tk, p)),

  // Comp Offs
  listCompOffs:   (sd, tk, p)       => axios.get(_lvurl(sd, "/comp-offs"),                    _lvhp(sd, tk, p)),
  createCompOff:  (sd, tk, d)       => axios.post(_lvurl(sd, "/comp-offs"),          d,       _lvh(sd, tk)),
  reviewCompOff:  (sd, tk, id, d)   => axios.patch(_lvurl(sd, `/comp-offs/${id}/review`), d,  _lvh(sd, tk)),

  // Encashments
  listEncashments:   (sd, tk, p)    => axios.get(_lvurl(sd, "/encashments"),                  _lvhp(sd, tk, p)),
  createEncashment:  (sd, tk, d)    => axios.post(_lvurl(sd, "/encashments"),        d,       _lvh(sd, tk)),
  reviewEncashment:  (sd, tk, id, d) => axios.patch(_lvurl(sd, `/encashments/${id}/review`), d, _lvh(sd, tk)),

  // Payroll summary
  payrollSummary: (sd, tk, empId, year, month) =>
    axios.get(_lvurl(sd, "/payroll-summary"), _lvhp(sd, tk, { employee_id: empId, year, month })),
};

// ── Payroll Management (portal) ───────────────────────────────────────────────
const _prurl = (sd, path) => `/api/v1/portal/${sd}/hrms/payroll${path}`;
const _prh   = (sd, tk)       => ({ headers: { Authorization: `Bearer ${tk}` } });
const _prhp  = (sd, tk, p)    => ({ headers: { Authorization: `Bearer ${tk}` }, params: p });

export const portalPayrollApi = {
  meta:      (sd, tk)      => axios.get(_prurl(sd, "/meta/options"),    _prh(sd, tk)),
  dashboard: (sd, tk)      => axios.get(_prurl(sd, "/dashboard"),       _prh(sd, tk)),

  // Salary Components
  listComponents:   (sd, tk, p)       => axios.get(_prurl(sd, "/components"),           _prhp(sd, tk, p)),
  createComponent:  (sd, tk, d)       => axios.post(_prurl(sd, "/components"),    d,    _prh(sd, tk)),
  updateComponent:  (sd, tk, id, d)   => axios.patch(_prurl(sd, `/components/${id}`), d, _prh(sd, tk)),
  deleteComponent:  (sd, tk, id)      => axios.delete(_prurl(sd, `/components/${id}`),  _prh(sd, tk)),

  // Salary Structures
  listStructures:   (sd, tk, p)       => axios.get(_prurl(sd, "/structures"),           _prhp(sd, tk, p)),
  getStructure:     (sd, tk, id)      => axios.get(_prurl(sd, `/structures/${id}`),     _prh(sd, tk)),
  createStructure:  (sd, tk, d)       => axios.post(_prurl(sd, "/structures"),    d,    _prh(sd, tk)),
  updateStructure:  (sd, tk, id, d)   => axios.patch(_prurl(sd, `/structures/${id}`), d, _prh(sd, tk)),
  deleteStructure:  (sd, tk, id)      => axios.delete(_prurl(sd, `/structures/${id}`),  _prh(sd, tk)),

  // Employee Compensation
  listCompensations:  (sd, tk, p)     => axios.get(_prurl(sd, "/compensations"),            _prhp(sd, tk, p)),
  createCompensation: (sd, tk, d)     => axios.post(_prurl(sd, "/compensations"),   d,      _prh(sd, tk)),
  updateCompensation: (sd, tk, id, d) => axios.patch(_prurl(sd, `/compensations/${id}`), d, _prh(sd, tk)),
  deleteCompensation: (sd, tk, id)    => axios.delete(_prurl(sd, `/compensations/${id}`),   _prh(sd, tk)),

  // Payroll Cycles
  listCycles:   (sd, tk, p)     => axios.get(_prurl(sd, "/cycles"),           _prhp(sd, tk, p)),
  createCycle:  (sd, tk, d)     => axios.post(_prurl(sd, "/cycles"),    d,    _prh(sd, tk)),
  updateCycle:  (sd, tk, id, d) => axios.patch(_prurl(sd, `/cycles/${id}`), d, _prh(sd, tk)),
  deleteCycle:  (sd, tk, id)    => axios.delete(_prurl(sd, `/cycles/${id}`),  _prh(sd, tk)),

  // Payroll Runs
  listRuns:        (sd, tk, p)     => axios.get(_prurl(sd, "/runs"),                    _prhp(sd, tk, p)),
  getRunDetail:    (sd, tk, id)    => axios.get(_prurl(sd, `/runs/${id}`),              _prh(sd, tk)),
  createRun:       (sd, tk, d)     => axios.post(_prurl(sd, "/runs"),           d,      _prh(sd, tk)),
  processRun:      (sd, tk, id, d) => axios.post(_prurl(sd, `/runs/${id}/process`), d,  _prh(sd, tk)),
  approveRun:      (sd, tk, id, d) => axios.post(_prurl(sd, `/runs/${id}/approve`), d,  _prh(sd, tk)),
  lockRun:         (sd, tk, id)    => axios.post(_prurl(sd, `/runs/${id}/lock`),    {},  _prh(sd, tk)),
  markPaid:        (sd, tk, id)    => axios.post(_prurl(sd, `/runs/${id}/mark-paid`), {}, _prh(sd, tk)),
  generatePayslips:(sd, tk, id)    => axios.post(_prurl(sd, `/runs/${id}/generate-payslips`), {}, _prh(sd, tk)),

  // Payslips
  listPayslips: (sd, tk, p)    => axios.get(_prurl(sd, "/payslips"),        _prhp(sd, tk, p)),
  getPayslip:   (sd, tk, id)   => axios.get(_prurl(sd, `/payslips/${id}`),  _prh(sd, tk)),

  // Statutory
  listStatutory:   (sd, tk, p)     => axios.get(_prurl(sd, "/statutory"),           _prhp(sd, tk, p)),
  createStatutory: (sd, tk, d)     => axios.post(_prurl(sd, "/statutory"),   d,     _prh(sd, tk)),
  updateStatutory: (sd, tk, id, d) => axios.patch(_prurl(sd, `/statutory/${id}`), d, _prh(sd, tk)),
  deleteStatutory: (sd, tk, id)    => axios.delete(_prurl(sd, `/statutory/${id}`),  _prh(sd, tk)),
};

// ── Loan Management (portal) ──────────────────────────────────────────────────
const _lnurl = (sd, path) => `/api/v1/portal/${sd}/hrms/loans${path}`;
const _lnh   = (sd, tk)   => ({ headers: { Authorization: `Bearer ${tk}` } });
const _lnhp  = (sd, tk, p) => ({ headers: { Authorization: `Bearer ${tk}` }, params: p });

export const portalLoanApi = {
  meta:      (sd, tk)      => axios.get(_lnurl(sd, "/meta/options"), _lnh(sd, tk)),
  dashboard: (sd, tk)      => axios.get(_lnurl(sd, "/dashboard"),    _lnh(sd, tk)),

  // Loan Types
  listTypes:   (sd, tk)         => axios.get(_lnurl(sd, "/types"),             _lnh(sd, tk)),
  createType:  (sd, tk, d)      => axios.post(_lnurl(sd, "/types"),   d,       _lnh(sd, tk)),
  updateType:  (sd, tk, id, d)  => axios.patch(_lnurl(sd, `/types/${id}`), d,  _lnh(sd, tk)),
  deleteType:  (sd, tk, id)     => axios.delete(_lnurl(sd, `/types/${id}`),    _lnh(sd, tk)),

  // Loan Policies
  listPolicies:   (sd, tk, p)       => axios.get(_lnurl(sd, "/policies"),            _lnhp(sd, tk, p)),
  createPolicy:   (sd, tk, d)       => axios.post(_lnurl(sd, "/policies"),   d,      _lnh(sd, tk)),
  updatePolicy:   (sd, tk, id, d)   => axios.patch(_lnurl(sd, `/policies/${id}`), d, _lnh(sd, tk)),
  deletePolicy:   (sd, tk, id)      => axios.delete(_lnurl(sd, `/policies/${id}`),   _lnh(sd, tk)),

  // Loan Applications
  listApplications:  (sd, tk, p)       => axios.get(_lnurl(sd, "/applications"),              _lnhp(sd, tk, p)),
  createApplication: (sd, tk, d)       => axios.post(_lnurl(sd, "/applications"),     d,      _lnh(sd, tk)),
  getApplication:    (sd, tk, id)      => axios.get(_lnurl(sd, `/applications/${id}`),        _lnh(sd, tk)),
  updateApplication: (sd, tk, id, d)   => axios.patch(_lnurl(sd, `/applications/${id}`), d,  _lnh(sd, tk)),
  submitApplication: (sd, tk, id)      => axios.post(_lnurl(sd, `/applications/${id}/submit`), {}, _lnh(sd, tk)),
  approveApplication:(sd, tk, id, d)   => axios.post(_lnurl(sd, `/applications/${id}/approve`), d, _lnh(sd, tk)),
  rejectApplication: (sd, tk, id, d)   => axios.post(_lnurl(sd, `/applications/${id}/reject`),  d, _lnh(sd, tk)),
  cancelApplication: (sd, tk, id, d)   => axios.post(_lnurl(sd, `/applications/${id}/cancel`),  d, _lnh(sd, tk)),
  disburseApplication:(sd, tk, id, d)  => axios.post(_lnurl(sd, `/applications/${id}/disburse`),d, _lnh(sd, tk)),
  closeApplication:  (sd, tk, id, d)   => axios.post(_lnurl(sd, `/applications/${id}/close`),   d, _lnh(sd, tk)),

  // Repayment Schedule
  getSchedule:       (sd, tk, appId)          => axios.get(_lnurl(sd, `/applications/${appId}/schedule`),              _lnh(sd, tk)),
  updateInstallment: (sd, tk, appId, instId, d) => axios.patch(_lnurl(sd, `/applications/${appId}/schedule/${instId}`), d, _lnh(sd, tk)),

  // Activities
  getActivities: (sd, tk, appId) => axios.get(_lnurl(sd, `/applications/${appId}/activities`), _lnh(sd, tk)),

  // Payroll integration
  getActiveEmis: (sd, tk, empId) => axios.get(_lnurl(sd, "/payroll/active-emis"), _lnhp(sd, tk, { employee_id: empId })),
};

// ── Portal Expense & Reimbursements ───────────────────────────────────────────
const _exurl  = (sd, path) => `/api/v1/portal/${sd}/hrms/expenses${path}`;
const _exh    = (sd)       => ({ headers: { Authorization: `Bearer ${_portalToken(sd)}` } });
const _exhp   = (sd, p)    => ({ headers: { Authorization: `Bearer ${_portalToken(sd)}` }, params: p });

export const portalExpenseApi = {
  meta:      (sd)      => axios.get(_exurl(sd, "/meta/options"), _exh(sd)),
  getDashboard: (sd)   => axios.get(_exurl(sd, "/dashboard"),    _exh(sd)),

  // Categories
  listCategories:  (sd, incInactive = false) => axios.get(_exurl(sd, "/categories"), _exhp(sd, { include_inactive: incInactive })),
  createCategory:  (sd, d)       => axios.post(_exurl(sd, "/categories"),             d, _exh(sd)),
  updateCategory:  (sd, id, d)   => axios.patch(_exurl(sd, `/categories/${id}`),      d, _exh(sd)),

  // Policies
  listPolicies:    (sd, incInactive = false) => axios.get(_exurl(sd, "/policies"), _exhp(sd, { include_inactive: incInactive })),
  createPolicy:    (sd, d)       => axios.post(_exurl(sd, "/policies"),             d, _exh(sd)),
  updatePolicy:    (sd, id, d)   => axios.patch(_exurl(sd, `/policies/${id}`),      d, _exh(sd)),
  deletePolicy:    (sd, id)      => axios.delete(_exurl(sd, `/policies/${id}`),        _exh(sd)),

  // Claims
  listClaims:    (sd, p)       => axios.get(_exurl(sd, "/claims"),            _exhp(sd, p)),
  createClaim:   (sd, d)       => axios.post(_exurl(sd, "/claims"),        d, _exh(sd)),
  getClaim:      (sd, id)      => axios.get(_exurl(sd, `/claims/${id}`),      _exh(sd)),
  updateClaim:   (sd, id, d)   => axios.patch(_exurl(sd, `/claims/${id}`), d, _exh(sd)),
  deleteClaim:   (sd, id)      => axios.delete(_exurl(sd, `/claims/${id}`),   _exh(sd)),
  submitClaim:   (sd, id)      => axios.post(_exurl(sd, `/claims/${id}/submit`),  {}, _exh(sd)),
  approveClaim:  (sd, id, d)   => axios.post(_exurl(sd, `/claims/${id}/approve`), d,  _exh(sd)),
  rejectClaim:   (sd, id, d)   => axios.post(_exurl(sd, `/claims/${id}/reject`),  d,  _exh(sd)),
  cancelClaim:   (sd, id, d)   => axios.post(_exurl(sd, `/claims/${id}/cancel`),  d,  _exh(sd)),
  returnClaim:   (sd, id, d)   => axios.post(_exurl(sd, `/claims/${id}/return`),  d,  _exh(sd)),

  // Reimbursements
  listReimbursements:   (sd, p)       => axios.get(_exurl(sd, "/reimbursements"),           _exhp(sd, p)),
  createReimbursement:  (sd, d)       => axios.post(_exurl(sd, "/reimbursements"),        d, _exh(sd)),
  updateReimbursement:  (sd, id, d)   => axios.patch(_exurl(sd, `/reimbursements/${id}`), d, _exh(sd)),
  getPayrollReimb:      (sd, empId)   => axios.get(_exurl(sd, `/reimbursements/payroll/${empId}`), _exh(sd)),

  // Mileage
  listMileage:    (sd, p)       => axios.get(_exurl(sd, "/mileage"),            _exhp(sd, p)),
  createMileage:  (sd, d)       => axios.post(_exurl(sd, "/mileage"),        d, _exh(sd)),
  updateMileage:  (sd, id, d)   => axios.patch(_exurl(sd, `/mileage/${id}`), d, _exh(sd)),
  deleteMileage:  (sd, id)      => axios.delete(_exurl(sd, `/mileage/${id}`),   _exh(sd)),
};

// ── Portal Exit Management ─────────────────────────────────────────────────────
const _exitUrl  = (sd, path) => `/api/v1/portal/${sd}/hrms/exit${path}`;
const _exith    = (sd)       => ({ headers: { Authorization: `Bearer ${_portalToken(sd)}` } });
const _exithp   = (sd, p)    => ({ headers: { Authorization: `Bearer ${_portalToken(sd)}` }, params: p });

export const portalExitApi = {
  meta:         (sd)      => axios.get(_exitUrl(sd, "/meta/options"), _exith(sd)),
  getDashboard: (sd)      => axios.get(_exitUrl(sd, "/dashboard"),    _exith(sd)),

  // Policies
  listPolicies:   (sd, incInactive = false) => axios.get(_exitUrl(sd, "/policies"), _exithp(sd, { include_inactive: incInactive })),
  createPolicy:   (sd, d)       => axios.post(_exitUrl(sd, "/policies"),             d, _exith(sd)),
  updatePolicy:   (sd, id, d)   => axios.patch(_exitUrl(sd, `/policies/${id}`),      d, _exith(sd)),
  deletePolicy:   (sd, id)      => axios.delete(_exitUrl(sd, `/policies/${id}`),        _exith(sd)),

  // Resignations
  listResignations: (sd, p)       => axios.get(_exitUrl(sd, "/resignations"),              _exithp(sd, p)),
  createResignation:(sd, d)       => axios.post(_exitUrl(sd, "/resignations"),          d, _exith(sd)),
  getResignation:   (sd, id)      => axios.get(_exitUrl(sd, `/resignations/${id}`),        _exith(sd)),
  updateResignation:(sd, id, d)   => axios.patch(_exitUrl(sd, `/resignations/${id}`),   d, _exith(sd)),
  submitResignation:(sd, id)      => axios.post(_exitUrl(sd, `/resignations/${id}/submit`),    {}, _exith(sd)),
  approveResignation:(sd, id, d)  => axios.post(_exitUrl(sd, `/resignations/${id}/approve`),   d,  _exith(sd)),
  rejectResignation: (sd, id, d)  => axios.post(_exitUrl(sd, `/resignations/${id}/reject`),    d,  _exith(sd)),
  withdrawResignation:(sd, id)    => axios.post(_exitUrl(sd, `/resignations/${id}/withdraw`),  {}, _exith(sd)),

  // Notice Period
  getNotice:    (sd, id)    => axios.get(_exitUrl(sd, `/resignations/${id}/notice`),     _exith(sd)),
  updateNotice: (sd, id, d) => axios.patch(_exitUrl(sd, `/resignations/${id}/notice`), d, _exith(sd)),

  // Clearances
  getClearances:      (sd, id)          => axios.get(_exitUrl(sd, `/resignations/${id}/clearances`),              _exith(sd)),
  updateClearanceTask:(sd, id, taskId, d)=> axios.patch(_exitUrl(sd, `/resignations/${id}/clearances/tasks/${taskId}`), d, _exith(sd)),

  // Exit Interview
  getInterviewQuestions: (sd)       => axios.get(_exitUrl(sd, "/interview-questions"),           _exith(sd)),
  getInterview:          (sd, id)   => axios.get(_exitUrl(sd, `/resignations/${id}/interview`),  _exith(sd)),
  updateInterview:       (sd, id, d)=> axios.patch(_exitUrl(sd, `/resignations/${id}/interview`),d, _exith(sd)),
  submitInterviewResponses:(sd, id, d)=> axios.post(_exitUrl(sd, `/resignations/${id}/interview/responses`), d, _exith(sd)),

  // Asset Recovery
  listAssets:    (sd, id)       => axios.get(_exitUrl(sd, `/resignations/${id}/assets`),           _exith(sd)),
  addAsset:      (sd, id, d)    => axios.post(_exitUrl(sd, `/resignations/${id}/assets`),       d, _exith(sd)),
  updateAsset:   (sd, id, rid, d)=> axios.patch(_exitUrl(sd, `/resignations/${id}/assets/${rid}`), d, _exith(sd)),

  // Settlement
  getSettlement:      (sd, id)   => axios.get(_exitUrl(sd, `/resignations/${id}/settlement`),            _exith(sd)),
  calculateSettlement:(sd, id, d)=> axios.post(_exitUrl(sd, `/resignations/${id}/settlement/calculate`), d, _exith(sd)),
  approveSettlement:  (sd, id, d)=> axios.post(_exitUrl(sd, `/resignations/${id}/settlement/approve`),   d, _exith(sd)),
  paySettlement:      (sd, id, d)=> axios.post(_exitUrl(sd, `/resignations/${id}/settlement/pay`),       d, _exith(sd)),

  // Documents
  listDocuments:    (sd, id)   => axios.get(_exitUrl(sd, `/resignations/${id}/documents`),            _exith(sd)),
  generateDocument: (sd, id, d)=> axios.post(_exitUrl(sd, `/resignations/${id}/documents/generate`), d, _exith(sd)),

  // Activities
  listActivities: (sd, id) => axios.get(_exitUrl(sd, `/resignations/${id}/activities`), _exith(sd)),
};

// ── Industry Master (superadmin — platform reference data) ────────────────────
const INDUSTRY_MASTER = "/superadmin/industry-master";

export const industryMasterApi = {
  list:   ()             => apiClient.get(INDUSTRY_MASTER),
  create: (data)         => apiClient.post(INDUSTRY_MASTER, data),
  update: (id, data)     => apiClient.patch(`${INDUSTRY_MASTER}/${id}`, data),
  remove: (id)           => apiClient.delete(`${INDUSTRY_MASTER}/${id}`),
};

// ── Currency Management (superadmin — global platform settings) ───────────────
const CURRENCIES = "/superadmin/currencies";

export const currencyApi = {
  options: () => apiClient.get(`${CURRENCIES}/meta/options`),
  dashboard: () => apiClient.get(`${CURRENCIES}/dashboard`),

  list: (params) => apiClient.get(CURRENCIES, { params }),
  get: (id) => apiClient.get(`${CURRENCIES}/${id}`),
  create: (data) => apiClient.post(CURRENCIES, data),
  update: (id, data) => apiClient.patch(`${CURRENCIES}/${id}`, data),
  remove: (id) => apiClient.delete(`${CURRENCIES}/${id}`),

  setStatus: (id, status) => apiClient.post(`${CURRENCIES}/${id}/status`, { status }),
  setBase: (id, confirm = true) => apiClient.post(`${CURRENCIES}/${id}/base`, { confirm }),
  updateRate: (id, data) => apiClient.put(`${CURRENCIES}/${id}/rate`, data),

  rateHistory: (id, params) => apiClient.get(`${CURRENCIES}/${id}/rate-history`, { params }),
  syncLogs: (params) => apiClient.get(`${CURRENCIES}/sync-logs`, { params }),
  runSync: (syncSource) => apiClient.post(`${CURRENCIES}/sync`, null, { params: { sync_source: syncSource } }),
};
