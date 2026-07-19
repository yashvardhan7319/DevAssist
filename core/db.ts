import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import { StorageService } from "./services/storage.service";

const LEGACY_JSON_DB_FILE = path.join(process.cwd(), "db.json");
const DEFAULT_SQLITE_DB_FILE = path.join(process.cwd(), "devassist.sqlite");
const SQLITE_DB_FILE = path.resolve(process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_DB_FILE);

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "developer" | "viewer";
  createdAt: string;
  githubAccessToken?: string;
  githubUsername?: string;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface Repository {
  id: string;
  userId: string;
  name: string;
  sourceType: "github" | "zip";
  githubUrl?: string;
  localPath: string;
  branch: string;
  language: string;
  framework: string;
  status: "pending" | "ready" | "error";
  connectedAt: string;
  lastAnalyzedAt?: string;
  files: RepoFile[];
}

export interface CodeReviewAnnotation {
  filePath: string;
  lineNumber?: number;
  severity: "info" | "warning" | "critical";
  category: string;
  comment: string;
}

export interface SecurityFinding {
  id: string;
  category: "secrets" | "api_keys" | "jwt" | "authentication" | "authorization" | "sql_injection" | "xss" | "csrf" | "ssrf" | "dependency" | "env_vars" | "cors" | "headers";
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  filePath?: string;
  lineNumber?: number;
  snippet?: string;
  remediation: string;
}

export interface SecurityReport {
  overallRiskScore: number;
  summary: string;
  findings: SecurityFinding[];
  scannedAt: string;
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface Analysis {
  id: string;
  repositoryId: string;
  analysisType: "repo_understanding" | "planning" | "code_review" | "dependency" | "testing" | "documentation" | "deployment" | "security";
  status: "queued" | "running" | "completed" | "failed";
  resultSummary?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  // Specific results parsed and stored
  annotations?: CodeReviewAnnotation[];
  mermaidDiagram?: string;
  tasks?: Array<{ title: string; complexity: "S" | "M" | "L"; description: string }>;
  dependencies?: Array<{ name: string; current: string; latest: string; outdated: boolean; vulnerable: boolean; vulnerabilityDetails?: string }>;
  testsCode?: string;
  readmeMarkdown?: string;
  dockerfileContent?: string;
  dockerComposeContent?: string;
  githubActionsContent?: string;
  vercelConfig?: string;
  renderConfig?: string;
  detectedEnvVars?: Array<{ name: string; description: string; isSensitive: boolean; category: string; recommendedValuePlaceholder?: string }>;
  compatibilityReport?: {
    render: { compatible: boolean; issues: string[]; tips: string[] };
    vercel: { compatible: boolean; issues: string[]; tips: string[] };
  };
  productionReadinessScore?: number;
  productionReadinessChecklist?: Array<{ category: string; item: string; passed: boolean; recommendation: string }>;
  securityReport?: SecurityReport;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: "info" | "success" | "error";
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  name: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  dependencies: string[];
  input?: any;
  output?: any;
  error?: string;
  logs: string[];
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
}

export interface OrchestrationRun {
  id: string;
  repositoryId: string;
  userId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  tasks: AgentTask[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  userInput?: string;
}

export interface DbSchema {
  users: User[];
  repositories: Repository[];
  analyses: Analysis[];
  notifications: Notification[];
  orchestrations: OrchestrationRun[];
  knowledgeBases?: KnowledgeBase[];
}

export interface KnowledgeBaseNote {
  id: string;
  author: "user" | "agent";
  content: string;
  createdAt: string;
}

export interface KnowledgeBase {
  repositoryId: string;
  createdAt: string;
  updatedAt: string;
  folderTree: string;
  dependencyGraph: {
    nodes: Array<{ id: string; label: string; type: string }>;
    links: Array<{ source: string; target: string }>;
  };
  importGraph: {
    nodes: Array<{ id: string; label: string }>;
    links: Array<{ source: string; target: string }>;
  };
  callGraph: {
    nodes: Array<{ id: string; label: string }>;
    links: Array<{ source: string; target: string }>;
  };
  architectureGraph: string;
  serviceGraph: {
    nodes: Array<{ id: string; label: string; type: string }>;
    links: Array<{ source: string; target: string }>;
  };
  frameworkDetection: {
    framework: string;
    confidence: number;
    filesDetected: string[];
  };
  languageDetection: Array<{
    language: string;
    percentage: number;
    filesDetected: string[];
  }>;
  apiDetection: Array<{
    path: string;
    method: string;
    description: string;
    handlerFile: string;
  }>;
  configurationDetection: Array<{
    file: string;
    type: string;
    purpose: string;
  }>;
  databaseDetection: {
    dbType: string;
    orm?: string;
    detectedFiles: string[];
  };
  projectSummary: string;
  technologyStackSummary: string;
  architectureSummary: string;
  notes: KnowledgeBaseNote[];
}

const DEFAULT_DB: DbSchema = {
  users: [],
  repositories: [],
  analyses: [],
  notifications: [],
  orchestrations: [],
  knowledgeBases: []
};

// High-quality sample repositories content to seed
const SAMPLE_REPOS: Omit<Repository, "userId">[] = [
  {
    id: "sample-fastapi-todo",
    name: "FastAPI Task Manager",
    sourceType: "github",
    githubUrl: "https://github.com/sample/fastapi-task-manager",
    localPath: "repositories/sample-fastapi-todo",
    branch: "main",
    language: "Python",
    framework: "FastAPI",
    status: "ready",
    connectedAt: new Date().toISOString(),
    files: [
      {
        path: "main.py",
        size: 1450,
        content: `from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import database, models, schemas

app = FastAPI(title="Task Manager API")

JWT_SECRET = os.getenv("JWT_SECRET", "")

@app.get("/")
def read_root():
    return {"message": "Welcome to Task Manager API"}

@app.post("/tasks/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(database.get_db)):
    db_task = db.query(models.Task).filter(models.Task.title == task.title).first()
    if db_task:
        raise HTTPException(status_code=400, detail="Task with this title already exists")
    
    new_task = models.Task(title=task.title, description=task.description, completed=False)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(database.get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task
`
      },
      {
        path: "requirements.txt",
        size: 150,
        content: `fastapi==0.85.0
uvicorn==0.18.3
sqlalchemy==1.4.41
pydantic==1.10.2
requests==2.25.1
`
      },
      {
        path: "database.py",
        size: 450,
        content: `from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`
      }
    ]
  },
  {
    id: "sample-react-cart",
    name: "React E-Commerce Cart",
    sourceType: "zip",
    localPath: "repositories/sample-react-cart",
    branch: "master",
    language: "TypeScript",
    framework: "React",
    status: "ready",
    connectedAt: new Date().toISOString(),
    files: [
      {
        path: "src/App.tsx",
        size: 2100,
        content: `import React, { useState, useEffect } from "react";
import { ProductList } from "./components/ProductList";
import { CartSummary } from "./components/CartSummary";
import { Product, CartItem } from "./types";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // Missing error handling - Code Review Agent can suggest improvements
    fetch("https://api.escuelajs.co/api/v1/products?limit=8")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Shopper Dashboard</h1>
      </header>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <ProductList products={products} onAddToCart={addToCart} />
        </div>
        <div>
          <CartSummary items={cart} />
        </div>
      </div>
    </div>
  );
}
`
      },
      {
        path: "package.json",
        size: 400,
        content: `{
  "name": "react-ecommerce-cart",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.244.0"
  },
  "devDependencies": {
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
`
      },
      {
        path: "src/types.ts",
        size: 250,
        content: `export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
`
      }
    ]
  }
];

export class Database {
  private static sqlite: DatabaseSync | null = null;

  private static getConnection(): DatabaseSync {
    if (this.sqlite) {
      return this.sqlite;
    }

    fs.mkdirSync(path.dirname(SQLITE_DB_FILE), { recursive: true });

    const db = new DatabaseSync(SQLITE_DB_FILE);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = FULL;

      CREATE TABLE IF NOT EXISTS records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        user_id TEXT,
        repository_id TEXT,
        created_at TEXT,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      );

      CREATE INDEX IF NOT EXISTS idx_records_collection_user
        ON records (collection, user_id);

      CREATE INDEX IF NOT EXISTS idx_records_collection_repository
        ON records (collection, repository_id);

      CREATE INDEX IF NOT EXISTS idx_records_collection_created
        ON records (collection, created_at);
    `);

    this.sqlite = db;
    this.migrateLegacyJsonIfNeeded();
    return db;
  }

  public static initialize(): void {
    this.getConnection();
    StorageService.init();
  }

  public static getStorageInfo(): {
    engine: "sqlite";
    path: string;
    configuredPath: boolean;
    recordCount: number;
    writable: boolean;
  } {
    const db = this.getConnection();
    const row = db.prepare("SELECT COUNT(*) AS count FROM records").get() as { count: number };

    return {
      engine: "sqlite",
      path: SQLITE_DB_FILE,
      configuredPath: Boolean(process.env.SQLITE_DB_PATH),
      recordCount: row.count,
      writable: this.verifyWritable(),
    };
  }

  public static verifyWritable(): boolean {
    const db = this.getConnection();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO records (collection, id, user_id, repository_id, created_at, data)
      VALUES ('system_health', 'latest', NULL, NULL, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        created_at = excluded.created_at,
        data = excluded.data
    `).run(now, JSON.stringify({ checkedAt: now }));
    return true;
  }

  private static migrateLegacyJsonIfNeeded(): void {
    const db = this.sqlite;
    if (!db) return;

    const row = db.prepare("SELECT COUNT(*) AS count FROM records").get() as { count: number };
    if (row.count > 0 || !fs.existsSync(LEGACY_JSON_DB_FILE)) {
      return;
    }

    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_DB_FILE, "utf-8")) as DbSchema;
      db.exec("BEGIN IMMEDIATE");
      try {
        (legacy.users || []).forEach((user) => this.upsertRecord("users", user.id, user, { userId: user.id, createdAt: user.createdAt }));
        (legacy.repositories || []).forEach((repo) => this.upsertRecord("repositories", repo.id, repo, { userId: repo.userId, repositoryId: repo.id, createdAt: repo.connectedAt }));
        (legacy.analyses || []).forEach((analysis) => this.upsertRecord("analyses", analysis.id, analysis, { repositoryId: analysis.repositoryId, createdAt: analysis.createdAt }));
        (legacy.notifications || []).forEach((notification) => this.upsertRecord("notifications", notification.id, notification, { userId: notification.userId, createdAt: notification.createdAt }));
        (legacy.orchestrations || []).forEach((run) => this.upsertRecord("orchestrations", run.id, run, { userId: run.userId, repositoryId: run.repositoryId, createdAt: run.createdAt }));
        (legacy.knowledgeBases || []).forEach((kb) => this.upsertRecord("knowledge_bases", kb.repositoryId, kb, { repositoryId: kb.repositoryId, createdAt: kb.createdAt }));
        db.exec("COMMIT");
        console.info(`Migrated legacy JSON database into SQLite: ${SQLITE_DB_FILE}`);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Failed to migrate legacy db.json into SQLite", error);
    }
  }

  private static allRecords<T>(collection: string): T[] {
    const db = this.getConnection();
    const rows = db.prepare("SELECT data FROM records WHERE collection = ?").all(collection) as Array<{ data: string }>;
    return rows.map((row) => JSON.parse(row.data) as T);
  }

  private static findRecord<T>(collection: string, id: string): T | undefined {
    const db = this.getConnection();
    const row = db.prepare("SELECT data FROM records WHERE collection = ? AND id = ?").get(collection, id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) as T : undefined;
  }

  private static upsertRecord(
    collection: string,
    id: string,
    data: unknown,
    indexes: { userId?: string; repositoryId?: string; createdAt?: string } = {}
  ): void {
    const db = this.getConnection();
    let dataToSave = data;

    if (collection === "repositories") {
      const repo = data as Repository;
      dataToSave = {
        ...repo,
        files: repo.files?.map(f => ({ path: f.path, size: f.size, content: "" })) || []
      };
    }

    db.prepare(`
      INSERT INTO records (collection, id, user_id, repository_id, created_at, data)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        user_id = excluded.user_id,
        repository_id = excluded.repository_id,
        created_at = excluded.created_at,
        data = excluded.data
    `).run(
      collection,
      id,
      indexes.userId || null,
      indexes.repositoryId || null,
      indexes.createdAt || null,
      JSON.stringify(dataToSave)
    );
  }

  private static deleteRecord(collection: string, id: string): boolean {
    const db = this.getConnection();
    const result = db.prepare("DELETE FROM records WHERE collection = ? AND id = ?").run(collection, id);
    return result.changes > 0;
  }

  private static deleteRecordsForRepository(collection: string, repositoryId: string): void {
    const db = this.getConnection();
    db.prepare("DELETE FROM records WHERE collection = ? AND repository_id = ?").run(collection, repositoryId);
  }

  // --- Auth operations ---
  public static getUsers(): User[] {
    return this.allRecords<User>("users");
  }

  public static createUser(username: string, email: string, passwordHash: string, role: "developer" | "viewer" = "developer"): User {
    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };

    this.getConnection().exec("BEGIN IMMEDIATE");
    try {
      this.upsertRecord("users", newUser.id, newUser, { userId: newUser.id, createdAt: newUser.createdAt });

      // Auto-seed this new user with sample repositories
      SAMPLE_REPOS.forEach((sample) => {
        const newRepo: Repository = {
          ...sample,
          id: `${sample.id}-${newUser.id.substring(0, 8)}`,
          userId: newUser.id,
          connectedAt: new Date().toISOString()
        };
        this.upsertRecord("repositories", newRepo.id, newRepo, { userId: newRepo.userId, repositoryId: newRepo.id, createdAt: newRepo.connectedAt });
        StorageService.saveFilesSync(newRepo.id, newRepo.files);
      });
      this.getConnection().exec("COMMIT");
    } catch (error) {
      this.getConnection().exec("ROLLBACK");
      throw error;
    }

    return newUser;
  }

  public static findUserByUsername(username: string): User | undefined {
    return this.getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public static findUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public static findUserByGithubUsername(username: string): User | undefined {
    return this.getUsers().find((u) => u.githubUsername?.toLowerCase() === username.toLowerCase());
  }

  public static findUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public static updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...updates
    };
    this.upsertRecord("users", updatedUser.id, updatedUser, { userId: updatedUser.id, createdAt: updatedUser.createdAt });
    return updatedUser;
  }

  // --- Repository operations ---
  public static getRepositories(userId: string): Repository[] {
    return this.allRecords<Repository>("repositories").filter((r) => r.userId === userId);
  }

  public static getAllRepositories(): Repository[] {
    return this.allRecords<Repository>("repositories");
  }

  public static getRepository(id: string): Repository | undefined {
    return this.findRecord<Repository>("repositories", id);
  }

  public static createRepository(repo: Omit<Repository, "id" | "connectedAt" | "status">): Repository {
    const newRepo: Repository = {
      ...repo,
      id: crypto.randomUUID(),
      status: "ready",
      connectedAt: new Date().toISOString(),
      files: repo.files || []
    };
    this.upsertRecord("repositories", newRepo.id, newRepo, { userId: newRepo.userId, repositoryId: newRepo.id, createdAt: newRepo.connectedAt });
    return newRepo;
  }

  public static updateRepository(id: string, updates: Partial<Repository>): Repository | undefined {
    const repo = this.getRepository(id);
    if (!repo) return undefined;

    const updatedRepo = {
      ...repo,
      ...updates
    };
    this.upsertRecord("repositories", updatedRepo.id, updatedRepo, { userId: updatedRepo.userId, repositoryId: updatedRepo.id, createdAt: updatedRepo.connectedAt });
    return updatedRepo;
  }

  public static deleteRepository(id: string): boolean {
    const db = this.getConnection();
    db.exec("BEGIN IMMEDIATE");
    try {
      const deleted = this.deleteRecord("repositories", id);
      this.deleteRecordsForRepository("analyses", id);
      this.deleteRecordsForRepository("orchestrations", id);
      this.deleteRecordsForRepository("knowledge_bases", id);
      db.exec("COMMIT");
      return deleted;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  // --- Orchestrations operations ---
  public static getOrchestrations(repositoryId: string): OrchestrationRun[] {
    return this.allRecords<OrchestrationRun>("orchestrations").filter((o) => o.repositoryId === repositoryId);
  }

  public static getAllOrchestrations(): OrchestrationRun[] {
    return this.allRecords<OrchestrationRun>("orchestrations");
  }

  public static getOrchestration(id: string): OrchestrationRun | undefined {
    return this.findRecord<OrchestrationRun>("orchestrations", id);
  }

  public static createOrchestration(repositoryId: string, userId: string, tasks: AgentTask[], userInput?: string): OrchestrationRun {
    const newOrchestration: OrchestrationRun = {
      id: crypto.randomUUID(),
      repositoryId,
      userId,
      status: "queued",
      progress: 0,
      tasks,
      createdAt: new Date().toISOString(),
      userInput
    };
    this.upsertRecord("orchestrations", newOrchestration.id, newOrchestration, { userId, repositoryId, createdAt: newOrchestration.createdAt });
    return newOrchestration;
  }

  public static updateOrchestration(id: string, updates: Partial<OrchestrationRun>): OrchestrationRun | undefined {
    const orchestration = this.getOrchestration(id);
    if (!orchestration) return undefined;

    const updatedOrchestration = {
      ...orchestration,
      ...updates
    };
    this.upsertRecord("orchestrations", updatedOrchestration.id, updatedOrchestration, {
      userId: updatedOrchestration.userId,
      repositoryId: updatedOrchestration.repositoryId,
      createdAt: updatedOrchestration.createdAt,
    });
    return updatedOrchestration;
  }

  // --- Analyses operations ---
  public static getAnalyses(repositoryId: string): Analysis[] {
    return this.allRecords<Analysis>("analyses").filter((a) => a.repositoryId === repositoryId);
  }

  public static getAllAnalyses(): Analysis[] {
    return this.allRecords<Analysis>("analyses");
  }

  public static getAnalysis(id: string): Analysis | undefined {
    return this.findRecord<Analysis>("analyses", id);
  }

  public static createAnalysis(repositoryId: string, analysisType: Analysis["analysisType"]): Analysis {
    const newAnalysis: Analysis = {
      id: crypto.randomUUID(),
      repositoryId,
      analysisType,
      status: "queued",
      createdAt: new Date().toISOString()
    };
    this.upsertRecord("analyses", newAnalysis.id, newAnalysis, { repositoryId, createdAt: newAnalysis.createdAt });
    return newAnalysis;
  }

  public static updateAnalysis(id: string, updates: Partial<Analysis>): Analysis | undefined {
    const analysis = this.getAnalysis(id);
    if (!analysis) return undefined;

    const updatedAnalysis = {
      ...analysis,
      ...updates
    };
    this.upsertRecord("analyses", updatedAnalysis.id, updatedAnalysis, { repositoryId: updatedAnalysis.repositoryId, createdAt: updatedAnalysis.createdAt });
    return updatedAnalysis;
  }

  // --- Notifications operations ---
  public static getNotifications(userId: string): Notification[] {
    return this.allRecords<Notification>("notifications").filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static getAllNotifications(): Notification[] {
    return this.allRecords<Notification>("notifications").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static createNotification(userId: string, message: string, type: Notification["type"], link?: string): Notification {
    const newNotification: Notification = {
      id: crypto.randomUUID(),
      userId,
      message,
      type,
      link,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.upsertRecord("notifications", newNotification.id, newNotification, { userId, createdAt: newNotification.createdAt });
    return newNotification;
  }

  public static markNotificationAsRead(id: string): Notification | undefined {
    const notification = this.findRecord<Notification>("notifications", id);
    if (!notification) return undefined;

    const updatedNotification = { ...notification, read: true };
    this.upsertRecord("notifications", updatedNotification.id, updatedNotification, { userId: updatedNotification.userId, createdAt: updatedNotification.createdAt });
    return updatedNotification;
  }

  public static markNotificationAsReadForUser(id: string, userId: string): Notification | undefined {
    const notification = this.findRecord<Notification>("notifications", id);
    if (!notification || notification.userId !== userId) return undefined;

    const updatedNotification = { ...notification, read: true };
    this.upsertRecord("notifications", updatedNotification.id, updatedNotification, { userId: updatedNotification.userId, createdAt: updatedNotification.createdAt });
    return updatedNotification;
  }

  // --- KnowledgeBase operations ---
  public static getKnowledgeBase(repositoryId: string): KnowledgeBase | undefined {
    return this.findRecord<KnowledgeBase>("knowledge_bases", repositoryId);
  }

  public static saveKnowledgeBase(
    repositoryId: string,
    data: Omit<KnowledgeBase, "repositoryId" | "createdAt" | "updatedAt" | "notes">
  ): KnowledgeBase {
    const existing = this.getKnowledgeBase(repositoryId);
    const now = new Date().toISOString();
    
    if (!existing) {
      const newKb: KnowledgeBase = {
        ...data,
        repositoryId,
        createdAt: now,
        updatedAt: now,
        notes: []
      };
      this.upsertRecord("knowledge_bases", repositoryId, newKb, { repositoryId, createdAt: newKb.createdAt });
      return newKb;
    } else {
      const updatedKb: KnowledgeBase = {
        ...existing,
        ...data,
        updatedAt: now
      };
      this.upsertRecord("knowledge_bases", repositoryId, updatedKb, { repositoryId, createdAt: updatedKb.createdAt });
      return updatedKb;
    }
  }

  public static addKnowledgeBaseNote(
    repositoryId: string,
    author: "user" | "agent",
    content: string
  ): KnowledgeBaseNote | undefined {
    const kb = this.getKnowledgeBase(repositoryId);
    if (!kb) return undefined;

    const newNote: KnowledgeBaseNote = {
      id: crypto.randomUUID(),
      author,
      content,
      createdAt: new Date().toISOString()
    };

    kb.notes.push(newNote);
    kb.updatedAt = new Date().toISOString();
    this.upsertRecord("knowledge_bases", repositoryId, kb, { repositoryId, createdAt: kb.createdAt });
    return newNote;
  }

  public static updateKnowledgeBaseNote(
    repositoryId: string,
    noteId: string,
    content: string
  ): KnowledgeBaseNote | undefined {
    const kb = this.getKnowledgeBase(repositoryId);
    if (!kb) return undefined;

    const noteIdx = kb.notes.findIndex((n) => n.id === noteId);
    if (noteIdx === -1) return undefined;

    kb.notes[noteIdx].content = content;
    kb.updatedAt = new Date().toISOString();
    this.upsertRecord("knowledge_bases", repositoryId, kb, { repositoryId, createdAt: kb.createdAt });
    return kb.notes[noteIdx];
  }

  public static deleteKnowledgeBaseNote(repositoryId: string, noteId: string): boolean {
    const kb = this.getKnowledgeBase(repositoryId);
    if (!kb) return false;

    const initialLen = kb.notes.length;
    kb.notes = kb.notes.filter((n) => n.id !== noteId);
    kb.updatedAt = new Date().toISOString();
    this.upsertRecord("knowledge_bases", repositoryId, kb, { repositoryId, createdAt: kb.createdAt });
    return kb.notes.length < initialLen;
  }
}
