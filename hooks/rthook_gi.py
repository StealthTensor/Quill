# Runtime hook — runs before any user code inside the frozen binary.
# Appends the system Python dist-packages so pywebview can find gi (GTK).
import sys
import os

_system_pkgs = "/usr/lib/python3/dist-packages"
if os.path.isdir(_system_pkgs) and _system_pkgs not in sys.path:
    sys.path.insert(0, _system_pkgs)

# Also set GI_TYPELIB_PATH if not already set
_typelib = "/usr/lib/x86_64-linux-gnu/girepository-1.0"
if os.path.isdir(_typelib):
    existing = os.environ.get("GI_TYPELIB_PATH", "")
    if _typelib not in existing:
        os.environ["GI_TYPELIB_PATH"] = _typelib + (":" + existing if existing else "")
