# DevAssist: Production-Grade Architecture Audit
*Prepared: July 17, 2026*

---

## 1. Project Overview
**DevAssist** (recently refactored from "AI Software Engineering Assistant") is a full-stack developer workspace. It is designed to run in sandboxed container environments (e.g., Cloud Run) and offers a multi-agent hub for deep repository analysis.
- **Main Goals:** Standardize source extraction, secure vulnerabilities, trace dependency risks, generate test suites, build architecture models, and produce comprehensive documentation.
- **Primary Runtime:** Full-stack architecture consisting of a React 19 client (Vite-backed) and an Express.js v4 server running under Node.js/Bun.
- **AI Core:** Built around Groq chat completions using `llama-3.3-70b-versatile`.

---

## 2. Folder Structure
```text
/ (Project Root)
├── .env.example              # Template for secret environmental variables
├── .gitignore                # Restricts system-generated files from being committed
├── metadata.json             # Core applet parameters, iframe permissions, and system declarations
├── package.json              # Node project manifest (scripts, core/dev dependencies)
├── tsconfig.json             # Compiler options for absolute TS type safety
├── vite.config.ts            # Vite configuration, integrated with Tailwind CSS compilation
├── db.json                   # Light physical JSON data store syncing state in real-time
├── server.ts                 # Main Express server entry point (routing, middle-tier, dev/prod serving)
├── server/                   # Backend core logic
│   ├── db.ts                 # Database access class, JSON syncing helpers, and default system seed templates
│   └── groq.ts               # Groq client wrapper and strict multi-agent prompt schemas
└── src/                      # Frontend Application
    ├── main.tsx              # DOM bootstrapper
    ├── index.css             # Tailwind v4 import declarations and global font rules
    ├── types.ts              # Global client-side interface mappings
    ├── App.tsx               # Central application layout, router shell, and state supervisor
    └── components/           # Modularized UI Components
        ├── Auth.tsx          # Login and Register visual panels
        ├── Dashboard.tsx     # Repository directories grid, import wizards, and connection utilities
        ├── RepositoryDetail.tsx # Multi-tab repository analysis dashboard
        ├── CodeViewer.tsx    # Custom file tree visualizer and line-by-line RAG explainer
        └── MermaidRenderer.tsx # Parser-safe, client-side Mermaid graph engine (dark-styled)
```

---

## 3. Frontend Architecture
- **Framework:** React 19 utilizing Vite 6 for lightning-fast bundling.
- **Styling Paradigm:** Tailwind CSS v4 using high-contrast slate grids, indigo highlights, and eye-safe twilight backgrounds.
- **Animations:** Orchestrated via Framer Motion (`motion/react`) to drive fluid transitions between tabs, staggered items loading, and slide-out dashboard panels.
- **Iconography:** Standardized exclusively through `lucide-react`.

---

## 4. Backend Architecture
- **Framework:** Express.js v4 using TypeScript.
- **Execution Modes:**
  - **Development:** Serves through `tsx` on Port 3000. It dynamically mounts the Vite dev server as an Express middleware (`createViteServer({ server: { middlewareMode: true }, appType: "spa" })`) to support instant client-side updates without cross-origin configuration.
  - **Production:** Transpiles `server.ts` into a standalone CommonJS bundle at `dist/server.cjs` using `esbuild`. The server serves the built static files (`dist/`) directly and registers a wildcard fallback handler directing traffic back to `index.html`.

---

## 5. Database Schema
DevAssist utilizes a persistent, file-based JSON store (`db.json`) parsed and structured as a single schema:
- **`User` (Backend record)**
  - `id`: `string`
  - `username`: `string`
  - `email`: `string`
  - `passwordHash`: `string` (Base64 encoding used in local sandbox sandbox)
  - `role`: `"admin" | "developer" | "viewer"`
  - `githubAccessToken`?: `string`
  - `githubUsername`?: `string`
  - `createdAt`: `string`
- **`Repository`**
  - `id`: `string`
  - `userId`: `string`
  - `name`: `string`
  - `sourceType`: `"github" | "zip"`
  - `githubUrl`?: `string`
  - `localPath`: `string`
  - `branch`: `string`
  - `language`: `string`
  - `framework`: `string`
  - `status`: `"pending" | "ready" | "error"`
  - `connectedAt`: `string`
  - `lastAnalyzedAt`?: `string`
  - `files`: `Array<{ path: string; content: string; size: number }>`
- **`Analysis`**
  - `id`: `string`
  - `repositoryId`: `string`
  - `analysisType`: `"repo_understanding" | "planning" | "code_review" | "dependency" | "testing" | "documentation" | "deployment"`
  - `status`: `"queued" | "running" | "completed" | "failed"`
  - `resultSummary`?: `string`
  - `errorMessage`?: `string`
  - `createdAt`: `string`
  - `completedAt`?: `string`
  - `annotations`?: `CodeReviewAnnotation[]`
  - `mermaidDiagram`?: `string` (escaped raw string, safe for parsing)
  - `tasks`?: `Array<{ title: string; complexity: "S" | "M" | "L"; description: string }>`
  - `dependencies`?: `Array<{ name: string; current: string; latest: string; outdated: boolean; vulnerable: boolean; vulnerabilityDetails?: string }>`
  - `testsCode`?: `string`
  - `readmeMarkdown`?: `string`
  - `dockerfileContent`?: `string`
  - `dockerComposeContent`?: `string`
  - `githubActionsContent`?: `string`
- **`Notification`**
  - `id`: `string`
  - `userId`: `string`
  - `message`: `string`
  - `type`: `"info" | "success" | "error"`
  - `link`?: `string`
  - `read`: `boolean`
  - `createdAt`: `string`

---

## 6. API Endpoints
All custom logic is mounted under the `/api` routing boundary:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Registers a new local user developer profile | No |
| `POST` | `/api/auth/login` | Authenticates username credentials | No |
| `GET`  | `/api/auth/me` | Fetches active authenticated session details | Yes |
| `GET`  | `/api/auth/github/url` | Resolves standard stateful GitHub OAuth handshake URL | Yes |
| `POST` | `/api/auth/github/disconnect` | Clears local GitHub tokens | Yes |
| `GET`  | `/api/repositories` | Fetches all repository metadata linked to user | Yes |
| `POST` | `/api/repositories` | Imports standard Github or local templates | Yes |
| `GET`  | `/api/repositories/:id` | Fetches a target repository + associated analyses history | Yes |
| `DELETE` | `/api/repositories/:id` | Purges repository records | Yes |
| `POST` | `/api/repositories/:id/files` | Creates/modifies a specific codebase file | Yes |
| `DELETE` | `/api/repositories/:id/files` | Deletes a file from repository context | Yes |
| `POST` | `/api/repositories/:id/explain-file` | RAG-grounded file explanation | Yes |
| `POST` | `/api/repositories/:id/analyze` | Triggers background agent pipeline run | Yes |
| `GET`  | `/api/notifications` | Returns all dispatch events | Yes |
| `POST` | `/api/notifications/:id/read` | Sets target notification to read state | Yes |

---

## 7. Authentication Flow
1. **Credentials verification:** Upon register or login, the password is encoded to a Base64 string and verified.
2. **Session construction:** Generates a lightweight, secure JSON structure stringified and transformed to a Base64-encoded Bearer Token.
3. **Session handling:** Saved client-side inside `localStorage` under `ais_auth_token`. Added as a header (`Authorization: Bearer <token>`) for all subsequent API calls.
4. **Middleware validation:** `authenticateToken` in `server.ts` intercepts requests, parses the Bearer token, fetches the current user from the Database, and updates `req.user`.

---

## 8. GitHub Integration
- **Redirection / Handshake:**
  - `GET /api/auth/github/url` crafts the redirect path using client scopes `repo,user` and hashes the active user's `id` as the state variable.
  - The frontend launches this in an independent, centered popup window.
  - The endpoint `GET /auth/callback` catches GitHub's token code, exchanges it via `https://github.com/login/oauth/access_token`, retrieves the user details (`https://api.github.com/user`), and maps them back to the active local User.
  - The callback serves a HTML response containing a script that dispatches a cross-window message `OAUTH_AUTH_SUCCESS` to the main window and closes itself.
- **System Standard Connector:**
  - If a user lacks a personal GitHub token or chooses to bypass linking their account, the application can leverage pre-configured developer/admin credentials on the server.
  - Checks environment configuration (`process.env.GITHUB_PAT` or `process.env.GITHUB_SYSTEM_TOKEN`) first. If absent, falls back to using the token of any registered developer or admin in the system database.
- **Tree Retrieval Routine:**
  1. Requests `GET /repos/:owner/:repo` to fetch default branch and language metadata.
  2. Queries `GET /repos/:owner/:repo/git/trees/:branch?recursive=1` to inspect the tree structures.
  3. Filters files (excluding massive modules, media binary files, locks, and individual files exceeding 500KB).
  4. Downloads raw files in concurrent batches of size 8.
  5. Enforces a safety limit of a maximum of 100 source files to preserve token windows and server memory.

---

## 9. AI Integration
- **SDK & Model:** Groq chat completions paired with `llama-3.3-70b-versatile`.
- **Fault Tolerance:** Outfitted with robust **Exponential Backoff Retries (4 attempts)** mapping 429 status codes, rate limits, and quota blocks to retry queues automatically.
- **Enforced JSON Schemas:** Every request enforces deterministic output structure using native `responseMimeType: "application/json"` and strict `responseSchema` objects containing `Type` fields.
- **Specialized Multi-Agent Routines:**
  1. **`runRepoUnderstanding`:** Generates high-level project maps and raw visualizable Mermaid graph strings.
  2. **`runPlanning`:** Maps user requests directly into comprehensive ticket timelines.
  3. **`runCodeReview`:** Generates line-by-line annotations with strict severity levels (`info`, `warning`, `critical`) and category tags (`Security`, `Bug`, `Style`, `Performance`).
  4. **`runDependencyAnalysis`:** Audits lockfiles for outdated version constraints or security vulnerability warnings.
  5. **`runTestGeneration`:** Automatically writes exhaustive Vitest or pytest tests.
  6. **`runDocumentation`:** Generates high-quality, long-form project README documents.
  7. **`runDeployment`:** Builds production-ready Dockerfile, docker-compose, and GitHub Actions configs.
  8. **`explainFileGrounded`:** Grounded RAG explainer providing localized inline commentary for file paths.

---

## 10. Environment Variables
- `GROQ_API_KEY`: Groq client token (required for AI-powered analysis and orchestration).
- `GITHUB_CLIENT_ID`: App ID configured for GitHub OAuth handshakes.
- `GITHUB_CLIENT_SECRET`: Secrets configured for token swapping.
- `APP_URL`: Primary server baseline domain (used to format OAuth redirect URIs).
- `GITHUB_PAT` / `GITHUB_SYSTEM_TOKEN`: Optional global developer token for repository connections.

---

## 11. Routing
- **Backend:** Express routing with route parameter parsing (e.g. `/api/repositories/:id/files`).
- **Frontend:** State-driven routing managed within `src/App.tsx`.
  - The state `selectedRepoId` determines whether the user is shown the active repositories dashboard list or the detailed analysis panel of a specific workspace.
  - Active tabs are indexed inside URL query search strings (`?tab=...`) to preserve navigation state across updates.

---

## 12. Services
- **`Database` (`server/db.ts`):** Single-threaded synchronous IO service loading the `db.json` database into memory, supporting CRUD helpers, and flushing database updates atomically to disk.
- **Groq dispatcher (`server/services/ai-dispatcher.ts` and `server/groq.ts`):** Client service layer managing prompt pipelines.

---

## 13. Hooks
- **Active Agent Polling:** Implements a central `useEffect` interval loop running every 4 seconds. Whenever the active project is in a pending or running analysis state, it silently updates details to transition the UI seamlessly upon task completion.
- **Cross-Window Message Bridge:** Registers a `window.addEventListener("message")` listener to coordinate secure state updates when popup OAuth completes.

---

## 14. Context Providers
State is managed transparently at the top level in `src/App.tsx` and distributed via explicit properties to sub-trees. This avoids context overhead and maintains a clean, understandable data flow.

---

## 15. Middleware
- **`authenticateToken`:**
  - Extracts the authorization Bearer token.
  - Decodes token payloads simply.
  - Enforces active route protection: non-authenticated routes return JSON error structures (`401` or `403`), keeping unauthorized requests from triggering database modifications.

---

## 16. Utilities
- **`fetchGithubRepoFiles`:** Recursive downloader featuring parallel file streaming and automatic configuration detection.
- **Framework Auto-detector:** Infers frameworks (React, Next.js, FastAPI, Express) by scanning manifest entries and codebase imports.

---

## 17. Component Hierarchy
```text
App (Main layout, Session manager, Poller, Notification drawer)
├── Auth (Login and registration tabs)
└── Dashboard (Grid lists, Add Project popup, Global system connector dashboard)
    └── RepositoryDetail (Tab-driven analysis console)
        ├── CodeViewer (Directory walkthrough and RAG explanations)
        ├── MermaidRenderer (Client-side interactive architectural maps compiler)
        └── [Agent Modules] (Roadmaps, security grids, dependencies, testing, and deployment panels)
```

---

## 18. State Management
- Client state is stored in primitive React state variables (`useState`).
- Synced automatically with the browser's `localStorage` for session preservation.
- Long-running server tasks are stored as state indices (`queued` / `running`) in the database, with updates fetched via client-side polling.

---

## 19. Current UI System
- **Theme:** High-contrast slate twilight color scheme.
- **Interactivity:** Fluid transitions driven by Framer Motion, micro-interactions, and visual indicators.
- **Client-Side Rendering:** Uses client-side `mermaid` to render system architectural flowcharts on-the-fly, with built-in parse correction for escaping `\n` sequence characters and handling rendering syntax errors gracefully.

---

## 20. Deployment Configuration
- Fully compatible with automated packaging systems.
- Production bundles compile using `esbuild` to assemble a self-contained Node backend running `dist/server.cjs` that binds to port `3000` and host `0.0.0.0`.

---

## 21. Dependencies
Core libraries registered inside `package.json`:
- **Main dependencies:** `@langchain/langgraph` and Groq API calls (AI orchestration), `mermaid` (flowcharts), `motion` (animations), `lucide-react` (icons), `express` (backend), `react` & `react-dom` (frontend).
- **Tooling:** `tsx` (TypeScript development runtime), `esbuild` (bundling), `typescript` (type safety), and `vite` (bundling/compilation).

---

## 22. Existing Features
- **Code Explorer & RAG Explainers:** Interactive line reviews that fetch grounded explanations from Groq.
- **Multi-Agent Analysis:** Seven dedicated agent analyses covering roadmaps, security, dependencies, and deployment.
- **Mermaid Graphing:** Visual architectural mapping.
- **GitHub OAuth popup & System Connector:** Flexible repository integration.
- **Unified Notification Engine:** Real-time feedback on analysis tasks.

---

## 23. Existing Security
- Base64 security checks on all API endpoints.
- Path sanitization to block malicious relative path traversal during file operations.
- File-size limits (> 500KB) and node counts to defend the server against denial-of-service attempts.

---

## 24. Existing Performance Optimizations
- Groq API key checks before AI execution.
- Concurrency-throttled batch file loading (8 parallel tasks).
- Production bundling via `esbuild` to eliminate Node relative-path lookup overhead.
- Periodic polling intervals (4s) to ensure real-time updates without overloading the server.
