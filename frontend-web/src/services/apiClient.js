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

  // Departments
  listDepts:        (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDept:          (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createDept:       (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateDept:       (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateDept:     (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateDept:   (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deptHierarchy:    (sd, tk, companyId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/hierarchy/${companyId}`, { headers: { Authorization: `Bearer ${tk}` } }),
  getDeptStats:     (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/stats`, { headers: { Authorization: `Bearer ${tk}` } }),
  getDeptEmployees: (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/employees`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDeptDesigs:    (sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/designations`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDeptActivities:(sd, tk, id, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/${id}/activities`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  listActiveEmployees:(sd, tk) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/employees/active`, { headers: { Authorization: `Bearer ${tk}` } }),
  seedDepts:        (sd, tk, companyId) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/departments/seed/${companyId}`, {}, { headers: { Authorization: `Bearer ${tk}` } }),

  // Designations
  listDesigs:    (sd, tk, p) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations`, { headers: { Authorization: `Bearer ${tk}` }, params: p }),
  getDesig:      (sd, tk, id) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}`, { headers: { Authorization: `Bearer ${tk}` } }),
  createDesig:   (sd, tk, data) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  updateDesig:   (sd, tk, id, data) => axios.patch(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}`, data, { headers: { Authorization: `Bearer ${tk}` } }),
  activateDesig: (sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/activate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
  deactivateDesig:(sd, tk, id) => axios.post(`${API_BASE_URL}/api/v1/portal/${sd}/org/designations/${id}/deactivate`, {}, { headers: { Authorization: `Bearer ${tk}` } }),
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

  // Full hierarchy (company + dept tree + designations)
  hierarchy: (sd, tk, companyId) => axios.get(`${API_BASE_URL}/api/v1/portal/${sd}/org/hierarchy/${companyId}`, { headers: { Authorization: `Bearer ${tk}` } }),
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
