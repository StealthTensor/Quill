# Runtime hook — runs before any user code inside the frozen binary.
# APPEND (not insert) system dist-packages so pywebview can find gi (GTK),
# while the PYZ-bundled packages (typing_extensions, pydantic, etc.)
# remain at the front of sys.path and take priority.
import sys
import os

_system_pkgs = "/usr/lib/python3/dist-packages"
if os.path.isdir(_system_pkgs) and _system_pkgs not in sys.path:
    sys.path.append(_system_pkgs)  # APPEND — never shadow bundled packages

# Set GI_TYPELIB_PATH so GTK typelibs are found at runtime
_typelib = "/usr/lib/x86_64-linux-gnu/girepository-1.0"
if os.path.isdir(_typelib):
    existing = os.environ.get("GI_TYPELIB_PATH", "")
    if _typelib not in existing:
        os.environ["GI_TYPELIB_PATH"] = _typelib + (":" + existing if existing else "")
