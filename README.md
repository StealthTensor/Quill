<div align="center">
  <h1>🪶 Quill</h1>
  <p><b>Your coursework, on autopilot.</b></p>
  <p>
    <a href="https://github.com/yourusername/quill/releases/latest">Download for Windows</a> • 
    <a href="https://github.com/yourusername/quill/releases/latest">Download for Mac</a> •
    <a href="#how-it-works">How it works</a>
  </p>
</div>

<br/>

Quill is a zero-configuration desktop app that automates the busywork of university portals. We reverse-engineered the SRM Academia backend to create a unified pipeline that automatically scans for pending work, generates answers using AI, fills `.docx` templates, uploads them to Google Drive, and submits the links—all with a single click.

## ✨ Features
* **Zero Config Desktop App:** Available as a standalone `.exe`, `.dmg`, or AppImage. No terminal required.
* **Intelligent Auto-Solve:** Powered by local LLM gateways (or standard cloud models) to accurately generate short and long answers.
* **Native Google Drive OAuth:** Automatically manages a `/Quill` folder in your personal Drive.
* **Live Telemetry:** Watch the pipeline work in real-time through a beautiful, clean React dashboard.

## 🚀 Quick Start
1. Go to the [Releases](https://github.com/yourusername/quill/releases/latest) page and download the executable for your OS.
2. Open the app and click **Connect Google Drive**.
3. Log in with your university ID.
4. Click **Run All**. The app will do the rest.

## 🛠️ How it Works (Under the Hood)
Quill is built with a modern stack designed for speed and reliability:
* **UI:** Next.js / Vite React app styled with Tailwind.
* **Desktop Wrapper:** `pywebview` bounding a native OS window without electron bloat.
* **Backend:** FastAPI handling concurrent requests and SSE (Server-Sent Events) for live logging.
* **Engine:** Custom Python scraper with HTTPAdapter retries to gracefully handle the university portal's frequent 504 timeouts.

### The Pipeline
`Scan Portal -> Extract Blank Slots -> Query LLM -> Write .docx -> OAuth Drive Upload -> Submit Link`

## 🤝 Contributing
Want to add support for a new university portal? PRs are welcome! 
1. Fork the repo.
2. Run `npm install` in `/web` and `pip install -r requirements.txt` in the root.
3. Submit a PR against the `main` branch.

## ⚠️ Disclaimer
This tool is built for **educational purposes and workflow automation research**. You are responsible for ensuring that your use of this software complies with your institution's academic integrity policies.
