# Changelog

All notable changes to Quill are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Planned
- Multi-university support (VIT, Anna University, etc.)
- Browser extension
- Telegram bot integration
- Mobile companion app

## [1.0.0] — 2026-08-27

### Added
- University portal automation (SRM) — full reverse-engineered API client
- AI worksheet filler with smart caching — generates contextual answers via any OpenAI-compatible LLM
- Google Drive OAuth2 upload — auto-creates `/Quill` folder, sets public sharing
- Desktop app (Windows / macOS / Linux) — PyWebView native wrapper, < 30 MB
- Real-time streaming dashboard — React 18 + Tailwind + Vite frontend with SSE log stream
- MCQ auto-solver — fetches questions, solves with AI, submits scores
- Retry logic — HTTPAdapter with exponential backoff to survive portal 504s
- Cross-platform CI/CD — GitHub Actions + PyInstaller for all three platforms
