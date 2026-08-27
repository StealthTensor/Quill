# Contributing to Quill

Thanks for considering contributing! Quill is built to automate the painful parts of university coursework portals — and we'd love your help making it better.

## Quick Setup

```bash
# Clone
git clone https://github.com/StealthTensor/Quill.git
cd Quill

# Backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp config.example.yaml config.yaml   # ← fill in your details

# Frontend
cd web
npm install
npm run dev   # starts dev server on :5173
```

## Project Structure

```
Quill/
├── core/               # Python backend
│   ├── srm_client.py   # SRM portal API wrapper
│   ├── gdrive.py       # Google Drive OAuth + upload
│   ├── orchestrator.py # Master pipeline loop
│   └── stargate.py     # Star-gate mechanism
├── api/
│   └── main.py         # FastAPI routes
├── worksheetfiller/    # LLM answer generation engine
├── web/                # React + Tailwind dashboard
│   └── src/
│       ├── pages/      # Dashboard, Pipeline, Login, Settings, etc.
│       ├── components/ # Reusable UI components
│       └── contexts/   # QuillContext (state management)
├── desktop.py          # PyWebView desktop wrapper
├── config.example.yaml # Example configuration (copy to config.yaml)
└── config.yaml         # Your configuration (gitignored — contains your reg no)
```

## What Can You Contribute?

- **🏫 New university portals** — Abstract the SRM client and add support for other universities
- **🎨 UI improvements** — Better animations, mobile responsiveness, accessibility
- **🧠 Smarter LLM prompts** — Improve answer quality in `worksheetfiller/prompts.py`
- **🪟 Windows/Mac testing** — Test PyInstaller builds on different OS versions
- **📖 Documentation** — Usage guides, video tutorials, translated READMEs

## Guidelines

1. Fork → Branch → PR against `main`
2. Keep PRs focused — one feature or fix per PR
3. Test your changes locally before submitting
4. Be respectful in discussions

## Reporting Bugs

Open an issue with:
- Your OS and Python version
- Steps to reproduce
- Expected vs actual behavior
- Any error logs
