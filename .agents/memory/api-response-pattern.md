---
name: ApiResponse method is .ok() not .success()
description: The shared ApiResponse helper has no .success() method; several routers were copy-pasted with the wrong name and crashed at request time only when that specific endpoint was hit.
---

`backend/shared/response.py`'s `ApiResponse` class only defines `.ok(data=None, message="Success")`. There is no `.success()`.

**Why:** Multiple router files across different modules (recruitment, expense_management, loan_management, employee_document_management) were written/copy-pasted calling `ApiResponse.success(...)`. Since `ApiResponse` is a Pydantic model, calling a nonexistent classmethod raises `AttributeError` from Pydantic's `__getattr__`, not a normal `NameError` — and it only surfaces when that specific route is actually invoked (imports and static analysis don't catch it). This let the bug hide silently until each endpoint was exercised.

**How to apply:** When adding a new router or module, always use `ApiResponse.ok(data, message?).model_dump()`. If you see an `AttributeError: success` in backend logs, it's this exact bug — grep the whole `backend/` tree for `ApiResponse.success(` (not just the one file you're touching), since it tends to be copy-pasted across sibling modules in one batch.
