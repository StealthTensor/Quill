#!/usr/bin/env python3
"""Start the worksheet filler web UI.

    python serve.py                 http://127.0.0.1:5001
    python serve.py --port 8080
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from webui.app import main

if __name__ == "__main__":
    main()
