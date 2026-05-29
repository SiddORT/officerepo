"""
pytest configuration for backend/tests/.

Problem: The workspace root contains an `app/` directory that shadows
`backend/app/` when pytest is invoked from the workspace root.

Root cause: `backend/__init__.py` causes pytest to use the workspace root as
the import root in "prepend" mode, inserting it at sys.path[0] *after* any
module-level sys.path fixes run.  Tests calling
`importlib.import_module("app.config.settings")` therefore find the wrong
`app` package (the one at the workspace root) and fail with
`ModuleNotFoundError: No module named 'app.config'`.

Fix: Register a pytest hook that fires immediately before each test item is
set up and guarantees that `backend/` is at sys.path[0], overriding whatever
pytest's import machinery placed there.  We also evict any stale `app.*`
entries from sys.modules so that the corrected path is actually consulted.
"""
import sys
import os

import pytest

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _fix_sys_path() -> None:
    """Move backend/ to sys.path[0] and purge stale app.* module cache."""
    if _BACKEND_DIR in sys.path:
        sys.path.remove(_BACKEND_DIR)
    sys.path.insert(0, _BACKEND_DIR)

    stale = [k for k in sys.modules if k == "app" or k.startswith("app.")]
    for key in stale:
        del sys.modules[key]


_fix_sys_path()


@pytest.fixture(autouse=True)
def _ensure_backend_on_path():
    """Re-apply the path fix before every test.

    pytest's 'prepend' import mode inserts the workspace root at sys.path[0]
    when it imports test modules.  This fixture runs immediately before each
    test function and restores `backend/` to the front of sys.path so that
    `importlib.import_module('app.config.settings')` finds the correct module.
    """
    _fix_sys_path()
    yield
