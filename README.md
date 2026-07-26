# ChatEval

A Mac desktop app for evaluating student housing chatbot transcripts. Built for prompt engineers and QA teams who need structured, repeatable scoring — and actionable analysis across many chats.

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite) ![Claude](https://img.shields.io/badge/Claude-API-D97757)

---

## What it does

**Individual evaluation**
- Score chatbot conversations across 8 quality dimensions using 1–5 star ratings
- Mark dimensions as N/A when they weren't triggered in a given chat
- AI auto-scoring via Claude API — reasons pre-filled into evaluator note fields for review and override
- Attach screenshots per dimension to annotate specific moments in the transcript
- Import transcripts via paste or Excel template

**Batch mode**
- Upload an Excel file with multiple transcripts
- Score manually or run AI scoring across all chats in one pass
- Review scores before saving

**Eval Dashboard**
- Full history of all evaluations, filterable by brand and evaluator
- Edit any eval — update scores, notes, screenshots, brand, bot persona
- Export to Excel, CSV, or PDF snapshot per eval

**Bulk Analysis** *(for prompt engineers)*
- Select a client and date range → Claude analyses all matching evals as a batch
- Returns structured failure pattern analysis: root causes, pattern codes (PARTIAL_CAPTURE, CONTEXT_LOSS, PERSONA_SLIP, etc.), and specific prompt fix suggestions with copyable instruction text
- Regression comparison: each new analysis is compared against the previous run for the same client, showing which dimensions improved or regressed after a prompt change

---

## Scoring dimensions

| Dimension | What it measures |
|---|---|
| Lead Capture Completeness | Were all required lead fields collected? |
| Lead Qualification Quality | Did the bot qualify the lead appropriately? |
| Clarification & Edge Cases | Did the bot handle ambiguous or unusual inputs? |
| Consistency / Memory | Did the bot stay consistent within the conversation? |
| Persona & Transparency | Did the bot maintain its persona correctly? |
| Escalation & Handoff | Were escalation requests handled properly? |
| Out-of-Scope Handling | Did the bot deflect out-of-scope questions appropriately? |
| Overall UX & Tone | Was the interaction warm, clear, and on-brand? |

---

## Tech stack

- **Electron 31** — Mac desktop shell, native traffic light window
- **React 18 + Vite 5** — renderer UI
- **better-sqlite3** — local SQLite database, WAL mode, no server
- **electron-store** — settings persistence (API key, default evaluator)
- **@anthropic-ai/sdk** — Claude API calls, main process only (API key never touches renderer)
- **SheetJS (xlsx)** — Excel template import/export
- **lucide-react** — icons

---

## Setup

**Prerequisites:** Node.js LTS, npm

```bash
git clone https://github.com/ishitasinha30/chateval.git
cd chateval
npm install
npm run rebuild   # compiles better-sqlite3 native module for Electron
npm run dev
```

`npm run rebuild` must be re-run any time you run `npm install` — `better-sqlite3` is a native addon that needs to be compiled for Electron's specific Node version.

---

## Configuration

On first launch, go to **Settings**:

1. **Anthropic API key** — needed for AI auto-scoring and bulk analysis. Stored locally via electron-store, never transmitted anywhere except the Anthropic API.
2. **Default evaluator name** — pre-fills the evaluator field on new evals.
3. **Client profiles** — define required lead fields, escalation channels, and out-of-scope policy per brand. Used to contextualise AI scoring and display evaluation criteria in the view modal.

AI features are optional — manual scoring works without an API key.

---

## Data

All data is stored locally in a SQLite database at:
```
~/Library/Application Support/chateval/chateval.db
```

Nothing is sent to any server. The only external call is to the Anthropic API when AI scoring or bulk analysis is explicitly triggered.

---

## Project structure

```
chateval/
├── electron/
│   ├── main.js          # BrowserWindow, IPC handlers
│   ├── preload.js       # contextBridge API surface
│   ├── db.js            # SQLite schema + queries
│   ├── ai.js            # Claude API calls (scoreTranscript, runBulkAnalysis)
│   ├── excel.js         # SheetJS import/export
│   ├── pdfExport.js     # Per-eval PDF generation
│   └── settings.js      # electron-store wrapper
└── src/
    ├── App.jsx           # Nav + view routing
    ├── components/
    │   ├── SingleEval/   # Single transcript scoring flow
    │   ├── BatchMode/    # Excel batch import + scoring
    │   ├── Dashboard/    # Eval history, filters, actions
    │   ├── Analysis/     # Bulk analysis + report rendering
    │   └── Settings/     # API key, profiles, evaluator name
    └── lib/
        └── constants.js  # Dimension definitions, lead fields, sample data
```

---

## License

MIT
