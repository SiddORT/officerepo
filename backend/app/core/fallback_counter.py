"""
Lightweight in-memory counter for fallback-key token verifications.

Each time a token is accepted via the previous (fallback) secret, a timestamp
is appended here.  The public helpers return how many of those events fall
within the last rolling hour so the rotation-status endpoint can expose it
without a DB dependency.
"""
import threading
from collections import deque
from datetime import datetime, timezone

_lock = threading.Lock()

# deque of datetime (UTC-aware) — one entry per fallback verification event.
# We store raw datetimes so any window size can be queried cheaply.
_events: deque = deque()


def record_fallback_use() -> None:
    """Record a single fallback-key token verification event (thread-safe)."""
    now = datetime.now(tz=timezone.utc)
    with _lock:
        _events.append(now)
        _trim()


def count_last_hour() -> int:
    """Return the number of fallback-key verifications in the last 60 minutes."""
    with _lock:
        _trim()
        return len(_events)


def _trim() -> None:
    """Remove events older than one hour.  Must be called with _lock held."""
    from datetime import timedelta
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=1)
    while _events and _events[0] < cutoff:
        _events.popleft()
