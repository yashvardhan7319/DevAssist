#  DevAssist

> **Autonomous Multi-Agent AI Software Engineering Platform**

> **Note:** This is a production-ready README template. Replace
> placeholder images in `docs/screenshots/`.

------------------------------------------------------------------------

##  Dashboard Preview

![Dashboard](docs/screenshots/dashboard.png)

------------------------------------------------------------------------

##  Feature Highlights

  -----------------------------------------------------------------------
  AI                Repository        Analytics         Productivity
  ----------------- ----------------- ----------------- -----------------
  AI Repository     GitHub Import     Repository        AI Code Review
  Chat                                Analytics         

  Documentation     Repository        Activity Timeline README Generator
  Generator         Explorer                            

  Architecture      Semantic Search   Token Usage       Architecture
  Generator                                             Diagrams

  RAG Search        File Explorer     Processing Status AI Suggestions
  -----------------------------------------------------------------------

------------------------------------------------------------------------

##  Table of Contents

-   About
-   Features
-   Screenshots
-   Architecture
-   Workflows
-   Tech Stack
-   Folder Structure
-   Installation
-   Environment Variables
-   API Documentation
-   Database Design
-   Security
-   Performance
-   Testing
-   Docker
-   CI/CD
-   Deployment
-   Roadmap
-   Contributing
-   License

------------------------------------------------------------------------

#  About

DevAssist is an enterprise-grade AI software engineering assistant that
imports GitHub repositories, indexes code, builds embeddings,
orchestrates multiple AI agents with LangGraph, and provides repository
chat, semantic search, documentation generation, architecture diagrams,
README generation, and AI code reviews.

------------------------------------------------------------------------

#  Overall Application Workflow

``` mermaid
flowchart LR
A[Login]-->B[Dashboard]
B-->C[Import Repository]
C-->D[Clone]
D-->E[Index]
E-->F[Embeddings]
F-->G[AI Agents]
G-->H[Repository Dashboard]
```

#  Repository Import Workflow

``` mermaid
flowchart TD
A[GitHub OAuth]-->B[Select Repository]
B-->C[Clone]
C-->D[Parse]
D-->E[Metadata]
E-->F[Ready]
```

#  Repository Indexing Pipeline

``` mermaid
flowchart LR
Repository-->Parser-->Chunking-->Embeddings-->VectorDB-->Ready
```

#  AI Repository Chat (RAG)

``` mermaid
flowchart TD
Question-->Retriever-->VectorDB-->Context-->Groq-->Answer
```

#  Multi-Agent Workflow

``` mermaid
graph TD
Repository-->Orchestrator
Orchestrator-->Documentation
Orchestrator-->Architecture
Orchestrator-->README
Orchestrator-->Review
Orchestrator-->Security
```

#  Semantic Search

``` mermaid
flowchart LR
Query-->Embedding-->VectorDB-->Similarity-->Results
```

#  Documentation Generation

``` mermaid
flowchart TD
Repository-->Analysis-->Documentation-->Markdown
```

#  README Generation

``` mermaid
flowchart TD
Repository-->FeatureDetection-->Template-->README
```

#  AI Code Review

``` mermaid
flowchart LR
Code-->StaticAnalysis-->Security-->Suggestions
```

#  Architecture Generation

``` mermaid
flowchart TD
Repository-->Dependencies-->Components-->Mermaid-->Diagram
```

#  Authentication Flow

``` mermaid
sequenceDiagram
User->>Frontend: Login
Frontend->>GitHub: OAuth
GitHub-->>Frontend: Token
Frontend->>Backend: JWT
Backend-->>Frontend: Access
```

#  API Request Flow

``` mermaid
sequenceDiagram
User->>Dashboard: Ask
Dashboard->>Backend: Request
Backend->>VectorDB: Search
VectorDB-->>Backend: Context
Backend->>Groq: Prompt
Groq-->>Backend: Response
Backend-->>Dashboard: Answer
```

#  End-to-End AI Pipeline

``` mermaid
flowchart LR
GitHub-->Clone-->Parser-->Chunks-->Embeddings-->VectorDB-->Retriever-->LangGraph-->Groq-->Response
```

#  Dashboard Navigation

``` mermaid
graph TD
Dashboard-->Repositories
Dashboard-->AIChat
Dashboard-->Search
Dashboard-->Documentation
Dashboard-->Architecture
Dashboard-->README
Dashboard-->CodeReview
Dashboard-->Analytics
Dashboard-->Settings
```

#  Tech Stack

  Layer        Technology
  ------------ ---------------------------------
  Frontend     React, TypeScript, Tailwind CSS
  Backend      Node.js, Express
  AI           LangGraph, LangChain, Groq
  Database     SQLite
  Deployment   Docker

#  Folder Structure

``` text
dashboard/
api/
agents/
orchestrator/
core/
docs/
```

#  Installation

``` bash
git clone <repo>
cd devassist
npm install
npm run dev
```

#  Environment Variables

  Variable       Description
  -------------- --------------
  GROQ_API_KEY   Groq API Key
  JWT_SECRET     JWT Secret
  PORT           Server Port

#  API Documentation

  Method   Endpoint
  -------- ----------------
  GET      /repositories
  POST     /repositories
  POST     /chat
  POST     /search
  POST     /documentation
  POST     /review

#  Security

-   JWT Authentication
-   Protected API Routes
-   GitHub OAuth
-   Environment-based secrets

#  Performance

-   Parallel AI agents
-   Incremental indexing
-   Vector search
-   Background processing

# Roadmap

## Completed

-   Repository Import
-   AI Chat
-   Semantic Search
-   Documentation
-   Architecture
-   README
-   Code Review

## Planned

-   VS Code Extension
-   CLI
-   Team Collaboration
-   MCP

# Contributing

Fork → Branch → Commit → PR

# License

MIT

------------------------------------------------------------------------

::: {align="center"}
## ⭐ Star the project if you found it useful!

Built with ❤️ by **Yash Vardhan**
:::
