<div align="center">

<img src="assets/logo.jpg" alt="Quill Logo" width="120" />

# Quill

**One click to finish your entire semester's coursework.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub stars](https://img.shields.io/github/stars/StealthTensor/Quill?style=social)](https://github.com/StealthTensor/Quill/stargazers)
[![Downloads](https://img.shields.io/github/downloads/StealthTensor/Quill/total?color=brightgreen)](https://github.com/StealthTensor/Quill/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/StealthTensor/Quill/build.yml?label=build)](https://github.com/StealthTensor/Quill/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB.svg)](https://python.org)
[![Node 20+](https://img.shields.io/badge/node-20+-339933.svg)](https://nodejs.org)

Quill reverse-engineers your university portal, generates answers with AI,<br/>
fills your worksheets, uploads them to Google Drive, and submits everything — automatically.

[Download](#quickstart) · [How it Works](#how-it-works) · [Why?](#the-problem) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

</div>

---

> **Demo coming soon.** Until then, see [How it Works](#how-it-works) for the full pipeline.

## The Problem

Every week, the same ritual:

1. Log into the university portal
2. Check which worksheets are pending
3. Open each Word template
4. Google the answers, type them in
5. Save, upload to Google Drive
6. Copy the Drive link
7. Paste it back into the portal
8. Click submit
9. Repeat for every course, every session, every SLO

That's **50+ hours of pure busywork** per semester. Multiply by 4 years.

## The Solution

Quill handles all of it. You click one button.

```
Run All → Quill handles the rest
```

## Backstory

This started when we realized we were spending more time navigating a broken university portal than actually learning. The portal throws `504 Gateway Timeout` errors every other click. The upload flow requires 7 separate page loads per worksheet. And the worksheets themselves are generic Word templates that ask the same textbook questions every semester.

So we reverse-engineered the portal's entire API — every endpoint, every payload quirk. We built a scraper that survives the 504s, an AI engine that generates contextual answers, and a pipeline that fills, uploads, and submits everything end-to-end.

Then we wrapped it in a desktop app so non-technical students could use it too.

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Scan** | Detects all pending worksheets and MCQs across every course |
| **AI Answers** | Generates contextual answers using any OpenAI-compatible LLM |
| **Doc Filler** | Fills `.docx` templates with proper formatting |
| **Drive Upload** | OAuth into your Google account, auto-creates `/Quill` folder, sets sharing |
| **Auto-Submit** | Submits the Drive link directly back to the portal |
| **MCQ Solver** | Fetches MCQs, solves them with AI, submits scores |
| **Live Dashboard** | Watch every step in real-time through a React UI |
| **Desktop App** | Native window — no browser tabs, no terminal needed |
| **Retry Logic** | Built-in HTTP retry adapters to survive portal 504 timeouts |
| **Smart Cache** | Skips worksheets already generated — saves LLM tokens |

## Quickstart

### Option 1: Download the App *(recommended)*

Head to [**Releases**](https://github.com/StealthTensor/Quill/releases/latest) and grab the build for your OS:

| OS | Download |
|----|----------|
| Windows | `Quill-windows.zip` |
| macOS | `Quill-macos.zip` |
| Linux | `Quill-linux.zip` |

Open → Login → Click **Run All** → Done.

### Option 2: Run from Source

```bash
# 1. Clone
git clone https://github.com/StealthTensor/Quill.git && cd Quill

# 2. Backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp config.example.yaml config.yaml   # ← fill in your details
cp .env.example .env                 # ← add your LLM API key

# 3. Frontend
cd web && npm install && npm run build && cd ..

# 4. Launch
python3 desktop.py
```

> **Google Drive setup:** On first run, click "Connect Google Drive" in the app. Your browser opens, you authorize, and Quill creates a `/Quill` folder in your Drive automatically. No API keys to configure.

## How it Works

```mermaid
graph LR
    A["Scan Portal"] --> B["AI Generates Answers"]
    B --> C["Fill .docx Template"]
    C --> D["Upload to Google Drive"]
    D --> E["Submit Link to Portal"]
    E --> F["Verified"]

    style A fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style B fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style C fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style D fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style E fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
    style F fill:#1a1a2e,stroke:#4ade80,color:#e8ebef
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Desktop** | PyWebView | Native OS window, zero Electron bloat (< 30 MB) |
| **Frontend** | React 18 + Tailwind + Vite | Fast, ships as static files |
| **Backend** | FastAPI + SSE | Real-time streaming logs to the dashboard |
| **AI Engine** | Any OpenAI-compatible API | Works with local LLMs, cloud providers, anything |
| **Portal** | Reverse-engineered REST | HTTPAdapter retries to survive constant 504s |
| **Storage** | Google Drive OAuth2 | User's own Drive — infinite scaling, zero hosting cost |
| **CI/CD** | GitHub Actions + PyInstaller | Auto-builds for Win/Mac/Linux on every release |

### Project Structure

```
Quill/
├── core/                   # Python backend engine
│   ├── srm_client.py       # Portal API wrapper (reverse-engineered)
│   ├── gdrive.py           # Google Drive OAuth + upload
│   └── orchestrator.py     # Master pipeline: scan → fill → upload → submit
├── api/
│   └── main.py             # FastAPI routes + SSE streaming
├── worksheetfiller/        # LLM answer generation engine
│   ├── runner.py           # Job orchestration with caching
│   ├── prompts.py          # Prompt engineering
│   ├── llm.py              # LLM client with retry + quota management
│   └── writer.py           # .docx template filler
├── web/                    # React + Tailwind dashboard
│   └── src/
│       ├── pages/          # Dashboard, Pipeline, Login, MCQ Solver, Settings
│       ├── components/     # Reusable UI components
│       └── contexts/       # QuillContext (global state via SSE)
├── desktop.py              # PyWebView native wrapper
├── config.example.yaml     # Example configuration (copy to config.yaml)
└── config.yaml             # Your configuration (gitignored — contains your reg no)
```

## Configuration

Copy `config.example.yaml` to `config.yaml` and fill in your details:

```yaml
students:
  - name: "Your Name"
    reg_no: "RA2511003XXXXXX"
    department: "CSE"
    section: "A"
    semester: 4

api:
  model: "gpt-4o-mini"
  temperature: 0.4

answers:
  language: "English"
  tone: "plain-technical"
  short_answer_words: "60-90"
  long_answer_words: "220-320"
```

## Roadmap

- [ ] Multi-university support (VIT, Anna University, etc.)
- [ ] Browser extension
- [ ] Telegram bot integration
- [ ] Mobile companion app
- [ ] Grade prediction analytics

## Contributing

We'd love your help. See [**CONTRIBUTING.md**](CONTRIBUTING.md) for the full setup guide.

High-impact contributions:
- Add support for your university's portal
- Improve LLM prompt quality for specific subjects
- Test builds on different OS versions
- Record a demo video for this README

## Security

Found a vulnerability? **Don't open a public issue.** See [**SECURITY.md**](SECURITY.md) for responsible disclosure instructions.

## Code of Conduct

We follow the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful.

## Support

- **Bug?** → [Open an issue](https://github.com/StealthTensor/Quill/issues/new?template=bug_report.md)
- **Feature idea?** → [Request it](https://github.com/StealthTensor/Quill/issues/new?template=feature_request.md)
- **Questions?** → [Start a discussion](https://github.com/StealthTensor/Quill/discussions)

## Disclaimer

This tool is built for **educational purposes and workflow automation research.** You are responsible for ensuring your use complies with your institution's academic integrity policies.

## License

[**AGPL-3.0**](LICENSE) — Free to use, modify, and distribute under the same license. Commercial use requires written permission.

---

<div align="center">

Built with frustration and too many 504 Gateway Timeouts.

</div>
