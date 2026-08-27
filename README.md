<div align="center">

# 🪶 Quill

### Your university coursework, on autopilot.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub stars](https://img.shields.io/github/stars/StealthTensor/Quill?style=social)](https://github.com/StealthTensor/Quill/stargazers)
[![Downloads](https://img.shields.io/github/downloads/StealthTensor/Quill/total)](https://github.com/StealthTensor/Quill/releases)

**Quill reverse-engineers your university portal, generates answers with AI, fills your worksheets, uploads them to Google Drive, and submits everything — automatically.**

[⬇ Download](#-quick-start) · [📖 How it Works](#-how-it-works) · [🤝 Contributing](CONTRIBUTING.md)

---

<!-- Replace this with an actual demo GIF once you record one -->
<!-- ![Quill Demo](assets/demo.gif) -->

</div>

## The Problem

Every week, you log into your university portal, download worksheet templates, manually type answers into Word documents, upload them to Google Drive, copy the link, paste it back into the portal, and click submit. **For every single session. For every single course.**

That's 50+ hours of busywork per semester.

## The Solution

Quill does all of it in one click.

```
You click "Run All" → Quill handles the rest → You go touch grass 🌿
```

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Auto-Scan** | Detects all pending worksheets and MCQs across every course |
| 🧠 **AI Answers** | Generates contextual, high-quality answers using local or cloud LLMs |
| 📝 **Doc Filler** | Fills `.docx` templates with proper formatting — not copy-paste slop |
| ☁️ **Drive Upload** | OAuth into your Google account, auto-creates `/Quill` folder, uploads with share links |
| 📮 **Auto-Submit** | Submits the Drive link directly to the university portal |
| ✅ **MCQ Solver** | Fetches MCQs, solves them with AI, submits scores |
| 📊 **Live Dashboard** | Watch the pipeline work in real-time through a clean React UI |
| 🖥️ **Desktop App** | Native window — no browser tabs, no terminal required |

## 🚀 Quick Start

### Option 1: Download the App (Recommended)
Go to [**Releases**](https://github.com/StealthTensor/Quill/releases/latest) and download for your OS:
- **Windows** → `Quill-windows.exe`
- **macOS** → `Quill-macos.dmg`
- **Linux** → `Quill-linux.AppImage`

Open. Login. Click Run All. Done.

### Option 2: Run from Source
```bash
# Clone
git clone https://github.com/StealthTensor/Quill.git && cd Quill

# Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your LLM API key

# Frontend
cd web && npm install && npm run build && cd ..

# Launch
python3 desktop.py
```

## 🛠 How it Works

```mermaid
graph LR
    A[📋 Scan Portal] --> B[🧠 Generate Answers]
    B --> C[📝 Fill .docx]
    C --> D[☁️ Upload to Drive]
    D --> E[📮 Submit to Portal]
    E --> F[✅ Done]

    style A fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style B fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style C fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style D fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style E fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style F fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
```

### Architecture

```
Quill/
├── core/                   # The engine
│   ├── srm_client.py       # Portal API (reverse-engineered, retry-hardened)
│   ├── gdrive.py           # Google Drive OAuth + upload
│   ├── orchestrator.py     # Master pipeline: scan → fill → upload → submit
│   └── stargate.py         # Star verification
├── api/
│   └── main.py             # FastAPI backend (SSE streaming)
├── worksheetfiller/        # LLM answer generation
│   ├── runner.py           # Job orchestration with caching
│   ├── prompts.py          # Prompt engineering
│   ├── llm.py              # LLM client with retry + quota management
│   └── writer.py           # .docx template writer
├── web/                    # React + Tailwind dashboard
│   └── src/
│       ├── pages/          # Dashboard, Pipeline, Login, MCQ Solver, Settings
│       ├── components/     # UI components + StarGateModal
│       └── contexts/       # QuillContext (real-time state via SSE)
├── desktop.py              # PyWebView native wrapper
└── config.yaml             # Student profiles + LLM settings
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Desktop** | PyWebView (native OS window, zero Electron bloat) |
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite |
| **Backend** | FastAPI + Server-Sent Events for real-time streaming |
| **AI Engine** | Any OpenAI-compatible LLM (local or cloud) |
| **Portal** | Reverse-engineered REST API with retry adapters for 504s |
| **Storage** | Google Drive OAuth2 (user's own Drive, infinite scaling) |
| **Build** | PyInstaller + GitHub Actions CI/CD (auto-builds for Win/Mac/Linux) |

## 🔧 Configuration

Edit `config.yaml` to set up students:
```yaml
students:
  - name: "Your Name"
    reg_no: "RA2511003XXXXXX"
    department: "CSE"
    section: "A"
    semester: 4

api:
  model: "fusion"
  temperature: 0.4

answers:
  language: "English"
  tone: "plain-technical"
  short_answer_words: "60-90"
  long_answer_words: "220-320"
```

## 🗺 Roadmap

- [x] SRM portal automation
- [x] AI worksheet filler
- [x] Google Drive OAuth upload
- [x] Desktop app (Windows/Mac/Linux)
- [x] Live streaming dashboard
- [x] MCQ auto-solver
- [ ] Multi-university support (VIT, Anna Univ, etc.)
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Telegram bot integration
- [ ] Grade prediction analytics

## 🤝 Contributing

We'd love your help! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions.

**Ideas that would make this blow up:**
- Add support for your own university's portal
- Improve LLM prompt quality for specific subjects
- Build the Telegram bot integration
- Record a demo video for the README

## ⚠️ Disclaimer

This tool is built for **educational purposes and workflow automation research.** You are responsible for ensuring that your use complies with your institution's academic integrity policies. The developers are not responsible for any misuse or consequences arising from the use of this software.

## 📄 License

[AGPL-3.0](LICENSE) — free to use, modify, and distribute under the same license. No commercial use without permission.

---

<div align="center">

**If Quill saved you time, consider giving it a ⭐**

Built with frustration and too many 504 Gateway Timeouts.

</div>
