---
name: Lead spokesperson primary mirror
description: How a lead's legacy contact_* columns relate to LeadSpokesperson rows, and the sync invariant to preserve.
---

# Lead ↔ Spokesperson primary-mirror design

A lead's legacy `contact_*` columns (contact_name, designation, email_encrypted,
phone_encrypted, country_code, dedupe_hash) are a **mirror of exactly one primary
LeadSpokesperson row**. Additional people on the lead are non-primary rows.

**Invariant:** at most/exactly one active (`is_deleted=False`) spokesperson has
`is_primary=True`, and it always equals the lead's legacy contact fields.

**Why:** the lead form edits the primary inline as the top "contact" fields and the
extra people as a repeatable "Additional Spokespersons" section. Code review
rejected a version where spokespersons were a separate tab disconnected from the
lead create/update contract and the legacy fields drifted out of sync.

**How to apply (sync rules):**
- `LeadCreate/LeadUpdateRequest` accept `spokespersons: List[SpokespersonInput]`
  (each may carry an `id` on update). These are the **non-primary** rows.
- `create_lead`: build a `_primary_mirror` from legacy fields + insert the array as
  non-primary.
- `update_lead`: in `model_dump(exclude_unset=True)` the nested objects become
  **dicts** — pop them and reconcile from `payload.spokespersons` (the parsed
  Pydantic objects), not the dumped dicts. Call `_sync_primary_from_legacy` then
  `_replace_additional_spokespersons` (full-replace: update matched ids, insert new,
  soft-delete the rest).
- Standalone spokesperson add/update/delete must re-sync legacy fields:
  - promoting/editing a primary → `clear_primary_spokesperson` + mirror onto lead.
  - **demoting** the current primary (`is_primary=False`) → promote another active
    contact and mirror; if none remain, keep this row primary.
  - deleting the primary → promote the next remaining contact and mirror.
- `_sync_lead_contact_from_primary` must mirror **all** fields unconditionally
  (including clearing designation to None) — do not guard on truthiness, or legacy
  fields go stale.
- `get_lead_detail` returns only **non-primary** spokespersons (for edit prefill);
  `lead_to_detail` does not include them, so create/update responses omit the array.
