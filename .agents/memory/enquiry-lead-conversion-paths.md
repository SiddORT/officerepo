---
name: Enquiry→Lead conversion paths
description: Two endpoints convert an enquiry to a lead; both must stamp the reverse link or bidirectional traceability silently breaks.
---

# Enquiry → Lead conversion: keep both paths in lockstep

There are **two** server entry points that turn an enquiry into a lead:
- the Enquiry Inbox endpoint (`enquiry/admin_service.convert_to_lead`)
- the legacy lead route `POST /superadmin/leads/convert-enquiry/{id}`
  (`lead_management/service.convert_enquiry_to_lead`)

**Rule:** every conversion path must set BOTH sides of the link in the same commit —
enquiry `converted_lead_id` + `converted_at` (forward) and lead `source_enquiry_id`
(reverse) — and set enquiry `status="Converted"`.

**Why:** the requirement is full bidirectional traceability (Website Enquiry → Lead →
Client) shown in *both* records. A path that sets only `status="Converted"` and
`source_enquiry_id` (lead side) but forgets `converted_lead_id` (enquiry side) leaves the
enquiry unable to resolve its lead — the "Converted to" link disappears on the enquiry
detail even though the lead shows its source. This was a real gap in the legacy route.

**How to apply:** if you add a third conversion path or refactor either service, assert
both columns are written. The enquiry detail resolves its `lead{}` object from
`converted_lead_id`, so that column is the single point of failure for the reverse view.
