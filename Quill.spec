# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['desktop.py'],
    pathex=['/usr/lib/python3/dist-packages'],
    binaries=[],
    datas=[('web/dist', 'web/dist')],
    hiddenimports=[
        # PyYAML — used in worksheetfiller/config.py
        'yaml',
        # python-dotenv
        'dotenv',
        # python-docx internals PyInstaller misses
        'docx',
        'docx.oxml',
        'docx.oxml.ns',
        'docx.parts',
        'docx.parts.document',
        # uvicorn workers
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
    runtime_hooks=[],
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
