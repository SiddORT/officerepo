---
name: Private file downloads (sensitive uploads)
description: How to store and serve sensitive user-uploaded files so they aren't publicly reachable.
---

# Private file downloads

Sensitive uploads (lead documents, proposals, anything with PII/confidential content)
must NOT go under the public static mount (`/uploads`). Store them under a separate
private root and serve only through authenticated endpoints.

**The rule:**
- Write files to a private storage root (separate from the public `uploads/` mount),
  with randomized filenames. Gitignore both `uploads/` and the private root.
- Serve via an authenticated endpoint that returns `FileResponse` behind the same
  auth/role guard as the rest of the module (e.g. superadmin).
- API list/detail responses should expose a boolean like `has_file` plus a download
  `url` pointing at the authenticated endpoint — never a directly fetchable static path.
- Frontend must fetch the file as a **blob with the JWT attached** (axios
  `responseType: "blob"`) and trigger the download via an object URL. A plain
  `<a href>` will NOT carry the Authorization header, so it cannot hit a protected
  endpoint.

**Why:** files placed under a public static mount are reachable by anyone who can
guess/obtain the path — no auth is enforced. Confidential documents leaked this way
defeat the encryption/PII protections applied elsewhere.

**How to apply:** any time a module accepts file uploads that shouldn't be world-readable,
use the private-root + authenticated-FileResponse + blob-download pattern instead of the
public storage helper.
