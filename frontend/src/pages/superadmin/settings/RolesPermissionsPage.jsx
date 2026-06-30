import React, { useCallback, useEffect, useMemo, useState } from "react";
import { rbacApi } from "../../../services/apiClient";
import { useAuth } from "../../../contexts/AuthContext";
import Table from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import Pagination from "../../../components/ui/Pagination";

const PERM = {
  create: "rbac.role.create",
  update: "rbac.role.update",
  delete: "rbac.role.delete",
  assign: "rbac.role.assign",
  userView: "user.view",
  userInvite: "user.create",
  userUpdate: "user.update",
  userDelete: "user.delete",
};

const unwrap = (res) => res?.data?.data ?? res?.data;

// Action → swatch for the read-only Permissions catalog.
const ACTION_META = {
  view: { label: "View", variant: "pending" },
  create: { label: "Create", variant: "active" },
  update: { label: "Edit", variant: "trial" },
  delete: { label: "Delete", variant: "suspended" },
  download: { label: "Download", variant: "default" },
};
const actionOf = (name) => (name || "").split(".").pop();

const USER_STATUS = {
  active: { variant: "active", label: "Active" },
  inactive: { variant: "inactive", label: "Deactivated" },
  invited: { variant: "pending", label: "Invited" },
  expired: { variant: "suspended", label: "Invite expired" },
};
// "Pending" = never accepted → can resend / remove. active/inactive → can toggle status.
const isPendingStatus = (s) => s === "invited" || s === "expired";

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
      style={
        active
          ? { background: "var(--c-accent)", color: "#fff" }
          : { color: "var(--c-muted)" }
      }
    >
      {children}
    </button>
  );
}

export default function RolesPermissionsPage() {
  const { user, hasPermission, refreshPermissions } = useAuth();
  const [tab, setTab] = useState("users");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold t-heading">Roles &amp; Permissions</h2>
        <p className="text-sm t-muted mt-1">
          Invite users, define roles, and review the full permission catalog.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users</TabButton>
        <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>Roles</TabButton>
        <TabButton active={tab === "permissions"} onClick={() => setTab("permissions")}>Permissions</TabButton>
      </div>

      {tab === "users" && (
        <UsersTab user={user} hasPermission={hasPermission} refreshPermissions={refreshPermissions} />
      )}
      {tab === "roles" && (
        <RolesTab hasPermission={hasPermission} refreshPermissions={refreshPermissions} />
      )}
      {tab === "permissions" && <PermissionsTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Roles tab — list + create/edit/delete with permission toggles
// ════════════════════════════════════════════════════════════════════════════
function RolesTab({ hasPermission, refreshPermissions }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState(null); // role object or {} for new
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    rbacApi
      .listRoles({ page, page_size: pageSize, search: search || undefined })
      .then((res) => {
        const d = unwrap(res);
        setRows(d?.items ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = [
    {
      key: "_sr",
      label: "#",
      width: 48,
      render: (_v, _row, i) => <span className="t-muted text-xs">{(page - 1) * pageSize + i + 1}</span>,
    },
    {
      key: "name",
      label: "Role",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium t-body">{v}</span>
          {row.is_system && <Badge variant="pending" label="Built-in" />}
        </div>
      ),
    },
    { key: "description", label: "Description", render: (v) => v || <span className="t-muted">—</span> },
    { key: "permission_count", label: "Permissions", width: 120 },
    { key: "admin_count", label: "Admins", width: 90 },
    {
      key: "actions",
      label: "",
      width: 140,
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission(PERM.update) && !row.is_system && (
            <button onClick={() => setEditing(row)} className="text-xs px-2 py-1 rounded-lg layout-nav-idle">
              Edit
            </button>
          )}
          {hasPermission(PERM.delete) && !row.is_system && (
            <button
              onClick={() => setConfirmDelete(row)}
              className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
          {row.is_system && <span className="text-xs t-muted">Managed</span>}
        </div>
      ),
    },
  ];

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    setError("");
    try {
      await rbacApi.deleteRole(confirmDelete.id);
      setConfirmDelete(null);
      load();
      refreshPermissions?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete role.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search roles…"
          className="input-field max-w-xs"
        />
        {hasPermission(PERM.create) && (
          <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-2">
            <span className="text-lg leading-none">+</span> New Role
          </button>
        )}
      </div>

      <Table columns={columns} data={rows} loading={loading} emptyMessage="No roles yet." />

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}

      {editing && (
        <RoleEditorModal
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); refreshPermissions?.(); }}
        />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete role"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={executeDelete} disabled={actionLoading} className="btn-danger">
              {actionLoading ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm t-body">
          Delete the role <strong>{confirmDelete?.name}</strong>? Admins holding it will lose the
          permissions it granted immediately. This cannot be undone.
        </p>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </Modal>
    </div>
  );
}

// ── Role create/edit modal with grouped permission toggles ───────────────────
function RoleEditorModal({ role, onClose, onSaved }) {
  const isNew = !role?.id;
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState({});

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [permRes, detailRes] = await Promise.all([
          rbacApi.permissions(),
          isNew ? Promise.resolve(null) : rbacApi.getRole(role.id),
        ]);
        if (!active) return;
        setGroups(unwrap(permRes)?.modules ?? []);
        if (detailRes) {
          const detail = unwrap(detailRes);
          setSelected(new Set(detail?.permission_ids ?? []));
        }
      } catch {
        if (active) setError("Failed to load permissions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => { active = false; };
  }, [role?.id, isNew]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (group, allOn) => {
    setSelected((prev) => {
      const next = new Set(prev);
      group.permissions.forEach((p) => (allOn ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const submit = async () => {
    const errs = {};
    const trimmed = name.trim();
    if (trimmed.length < 2) errs.name = "Role name must be at least 2 characters.";
    setFieldErr(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setError("");
    const payload = {
      name: trimmed,
      description: description.trim() || null,
      permission_ids: Array.from(selected),
    };
    try {
      if (isNew) await rbacApi.createRole(payload);
      else await rbacApi.updateRole(role.id, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={isNew ? "New Role" : `Edit Role — ${role.name}`}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving || loading} className="btn-primary">
            {saving ? "Saving…" : isNew ? "Create Role" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Role name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErr.name}
            placeholder="e.g. Sales Manager"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional summary"
          />
        </div>

        <div>
          <p className="text-sm font-medium t-body mb-2">Permissions</p>
          {loading ? (
            <p className="text-sm t-muted py-6 text-center">Loading permissions…</p>
          ) : groups.length === 0 ? (
            <p className="text-sm t-muted py-6 text-center">No permissions available.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const ids = group.permissions.map((p) => p.id);
                const allOn = ids.every((id) => selected.has(id));
                return (
                  <div
                    key={group.module}
                    className="rounded-xl p-4"
                    style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold t-heading">{group.module_label}</p>
                      <button
                        onClick={() => toggleGroup(group, allOn)}
                        className="text-xs px-2 py-1 rounded-lg layout-nav-idle"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-start gap-2 cursor-pointer select-none p-2 rounded-lg layout-nav-idle"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(perm.id)}
                            onChange={() => toggle(perm.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded cursor-pointer accent-cyan-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm t-body">{perm.description || perm.name}</span>
                            <span className="block text-xs t-muted font-mono">{perm.name}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Users tab — invite users, assign roles, manage account status
// ════════════════════════════════════════════════════════════════════════════
const USER_PAGE_SIZE = 20;

function UsersTab({ user, hasPermission, refreshPermissions }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [assigning, setAssigning] = useState(null); // user object
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // {user, invite_token, email_sent}
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const canInvite = hasPermission(PERM.userInvite);
  const canAssign = hasPermission(PERM.assign);
  const canUpdate = hasPermission(PERM.userUpdate);
  const canDelete = hasPermission(PERM.userDelete);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([rbacApi.listUsers(), rbacApi.listRoles({ page: 1, page_size: 100 })])
      .then(([userRes, roleRes]) => {
        setUsers(unwrap(userRes) ?? []);
        setRoles(unwrap(roleRes)?.items ?? []);
      })
      .catch(() => { setUsers([]); setRoles([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleName = useMemo(() => {
    const map = {};
    roles.forEach((r) => (map[r.id] = r));
    return map;
  }, [roles]);

  const userTotalPages = Math.max(1, Math.ceil(users.length / USER_PAGE_SIZE));
  const safUserPage    = Math.min(userPage, userTotalPages);
  const pageUsers      = users.slice((safUserPage - 1) * USER_PAGE_SIZE, safUserPage * USER_PAGE_SIZE);

  const toggleActive = async (row) => {
    setBusyId(row.id);
    setError("");
    try {
      await rbacApi.setUserStatus(row.id, !row.is_active);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (row) => {
    setBusyId(row.id);
    setError("");
    try {
      const res = await rbacApi.resendInvite(row.id);
      setInviteResult(unwrap(res));
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resend invite.");
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (row) => {
    if (!window.confirm(`Remove pending invite for ${row.email}? This cannot be undone.`)) return;
    setBusyId(row.id);
    setError("");
    try {
      await rbacApi.deleteUser(row.id);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to remove user.");
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: "_sr",
      label: "#",
      width: 48,
      render: (_v, _row, i) => <span className="t-muted text-xs">{(safUserPage - 1) * USER_PAGE_SIZE + i + 1}</span>,
    },
    { key: "email", label: "User", render: (v, row) => (
      <div>
        <span className="block font-medium t-body">{row.name || v}</span>
        {row.name && <span className="block text-xs t-muted">{v}</span>}
      </div>
    ) },
    {
      key: "status",
      label: "Status",
      render: (s) => {
        const meta = USER_STATUS[s] || { variant: "default", label: s || "—" };
        return <Badge variant={meta.variant} label={meta.label} />;
      },
    },
    {
      key: "role_ids",
      label: "Roles",
      render: (ids) =>
        ids && ids.length ? (
          <div className="flex flex-wrap gap-1.5">
            {ids.map((id) => (
              <Badge
                key={id}
                variant={roleName[id]?.is_system ? "pending" : "default"}
                label={roleName[id]?.name || "—"}
              />
            ))}
          </div>
        ) : (
          <span className="t-muted">No roles</span>
        ),
    },
    {
      key: "actions",
      label: "",
      width: 240,
      render: (_v, row) => {
        const isSelf = user?.user_id === row.id;
        const pending = isPendingStatus(row.status);
        return (
          <div className="flex justify-end items-center gap-2 flex-wrap">
            {canAssign && (
              <button
                onClick={() => setAssigning(row)}
                disabled={busyId === row.id}
                className="text-xs px-2 py-1 rounded-lg layout-nav-idle"
              >
                Roles
              </button>
            )}
            {pending && canInvite && (
              <button
                onClick={() => resend(row)}
                disabled={busyId === row.id}
                className="text-xs px-2 py-1 rounded-lg layout-nav-idle"
              >
                Resend
              </button>
            )}
            {!pending && canUpdate && !isSelf && (
              <button
                onClick={() => toggleActive(row)}
                disabled={busyId === row.id}
                className="text-xs px-2 py-1 rounded-lg layout-nav-idle"
                style={{ color: row.is_active ? "#ef4444" : "#10b981" }}
              >
                {row.is_active ? "Deactivate" : "Activate"}
              </button>
            )}
            {pending && canDelete && (
              <button
                onClick={() => removeUser(row)}
                disabled={busyId === row.id}
                className="text-xs px-2 py-1 rounded-lg layout-nav-idle"
                style={{ color: "#ef4444" }}
              >
                Remove
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm t-muted">
          Invite teammates by email, assign their roles, and manage account access.
        </p>
        {canInvite && (
          <button onClick={() => setInviting(true)} className="btn-primary text-sm whitespace-nowrap">
            + Invite User
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <Table columns={columns} data={pageUsers} loading={loading} emptyMessage="No users yet." />

      {userTotalPages > 1 && (
        <Pagination page={safUserPage} totalPages={userTotalPages} onChange={setUserPage} total={users.length} />
      )}

      {inviting && (
        <InviteUserModal
          roles={roles}
          onClose={() => setInviting(false)}
          onInvited={(res) => { setInviting(false); setInviteResult(res); load(); }}
        />
      )}

      {inviteResult && (
        <InviteLinkModal result={inviteResult} onClose={() => setInviteResult(null)} />
      )}

      {assigning && (
        <AssignRolesModal
          admin={assigning}
          roles={roles}
          onClose={() => setAssigning(null)}
          onSaved={() => { setAssigning(null); load(); refreshPermissions?.(); }}
        />
      )}
    </div>
  );
}

// Invite modal — email + name + role checkboxes
function InviteUserModal({ roles, onClose, onInvited }) {
  const assignable = roles.filter((r) => !r.is_system);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await rbacApi.inviteUser({
        email: trimmed,
        name: name.trim() || null,
        role_ids: Array.from(selected),
      });
      onInvited(unwrap(res));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send invite.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite User"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Sending…" : "Send Invite"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@officerepo.com"
        />
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional display name"
        />
        <div>
          <label className="block text-sm font-medium t-body mb-2">Assign roles</label>
          {assignable.length === 0 ? (
            <p className="text-sm t-muted">No assignable roles yet. Create a role first.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {assignable.map((r) => (
                <label
                  key={r.id}
                  className="flex items-start gap-2 cursor-pointer select-none p-2.5 rounded-lg layout-nav-idle"
                  style={{ border: "1px solid var(--c-border)" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded cursor-pointer accent-cyan-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm t-body font-medium">{r.name}</span>
                    {r.description && <span className="block text-xs t-muted">{r.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}

// Shows the copyable invite link after a successful invite / resend.
function InviteLinkModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    if (result?.invite_token) {
      return `${window.location.origin}/accept-invite?token=${result.invite_token}`;
    }
    return result?.invite_link || "";
  }, [result]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Invitation Ready"
      footer={<button onClick={onClose} className="btn-primary">Done</button>}
    >
      <div className="space-y-3">
        <p className="text-sm t-body">
          {result?.email_sent
            ? "An invitation email has been sent. You can also share this link directly:"
            : "Email delivery isn't configured, so share this invite link with the user directly:"}
        </p>
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg"
          style={{ border: "1px solid var(--c-border)", background: "var(--c-surface-2, rgba(0,0,0,0.03))" }}
        >
          <code className="text-xs t-body break-all flex-1">{link}</code>
          <button onClick={copy} className="btn-secondary text-xs whitespace-nowrap">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs t-muted">The link expires after 7 days for security.</p>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Permissions tab — read-only catalog of all system permissions, grouped by module
// ════════════════════════════════════════════════════════════════════════════
function PermissionsTab() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    rbacApi
      .permissions()
      .then((res) => setModules(unwrap(res)?.modules ?? unwrap(res) ?? []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm t-muted py-6">Loading permissions…</p>;
  }
  if (!modules.length) {
    return <p className="text-sm t-muted py-6">No permissions found.</p>;
  }

  return (
    <div>
      <p className="text-sm t-muted mb-4">
        The complete catalog of permissions available across the platform. Assign these to roles in the Roles tab.
      </p>
      <div className="space-y-5">
        {modules.map((m) => (
          <div
            key={m.module}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--c-border)" }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: "var(--c-surface-2, rgba(0,0,0,0.03))", borderBottom: "1px solid var(--c-border)" }}
            >
              <h3 className="text-sm font-semibold t-heading">{m.module_label || m.module}</h3>
              <span className="text-xs t-muted">{(m.permissions || []).length} permissions</span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
              {(m.permissions || []).map((p) => {
                const meta = ACTION_META[actionOf(p.name)] || { label: actionOf(p.name), variant: "default" };
                return (
                  <div key={p.name} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <code className="text-xs t-body">{p.name}</code>
                      {p.description && <span className="block text-xs t-muted mt-0.5">{p.description}</span>}
                    </div>
                    <Badge variant={meta.variant} label={meta.label} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignRolesModal({ admin, roles, onClose, onSaved }) {
  // System roles are platform-managed and not toggleable here.
  const assignable = roles.filter((r) => !r.is_system);
  const [selected, setSelected] = useState(
    new Set((admin.role_ids || []).filter((id) => assignable.some((r) => r.id === id)))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await rbacApi.assignRoles(admin.id, Array.from(selected));
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update roles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Manage Roles — ${admin.email}`}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {assignable.length === 0 ? (
        <p className="text-sm t-muted py-4">No assignable roles yet. Create a role first.</p>
      ) : (
        <div className="space-y-2">
          {assignable.map((r) => (
            <label
              key={r.id}
              className="flex items-start gap-2 cursor-pointer select-none p-2.5 rounded-lg layout-nav-idle"
              style={{ border: "1px solid var(--c-border)" }}
            >
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded cursor-pointer accent-cyan-500"
              />
              <span className="min-w-0">
                <span className="block text-sm t-body font-medium">{r.name}</span>
                {r.description && <span className="block text-xs t-muted">{r.description}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </Modal>
  );
}
