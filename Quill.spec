# -*- mode: python ; coding: utf-8 -*-
#
# gi (GTK) is a system library — do NOT bundle it.
# The binary requires system GTK at runtime: libgtk-3, python3-gi, gir1.2-webkit2-4.0
# Install with: sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.0
#
# pathex is empty — adding system dist-packages there causes old system
# typing_extensions to shadow the venv's version, breaking pydantic_core.

a = Analysis(
    ['desktop.py'],
    pathex=[],
    binaries=[],
    datas=[('web/dist', 'web/dist')],
    hiddenimports=[
        # PyYAML
        'yaml',
        # python-dotenv
        'dotenv',
        # python-docx
        'docx',
        # uvicorn workers (dynamic imports PyInstaller misses)
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        # google API dynamic discovery
        'googleapiclient._helpers',
        'googleapiclient.discovery_cache',
        'googleapiclient.discovery_cache.file_cache',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['hooks/rthook_gi.py'],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Quill',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Quill',
)
