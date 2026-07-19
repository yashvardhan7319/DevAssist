import * as groqAgent from "../core/groq";
import { config } from "../core/config/env";
import { RepoFile } from "../core/db";
import {
  answerLocalKnowledgeBaseQuestion,
  explainLocalFile,
  runLocalCodeReview,
  runLocalDependencyAnalysis,
  runLocalDeployment,
  runLocalDocumentation,
  runLocalKnowledgeBaseEngine,
  runLocalLogAnalysis,
  runLocalPlanning,
  runLocalRepoUnderstanding,
  runLocalSecurityAnalysis,
  runLocalTestGeneration,
} from "./local-analysis";

function shouldUseLocalFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("Could not reach Groq") ||
    message.includes("fetch failed") ||
    message.includes("temporarily unavailable") ||
    message.includes("rate limit") ||
    message.includes("Groq request failed") ||
    message.includes("Groq rejected")
  );
}

async function withGroqFallback<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    ensureGroqConfigured();
    return await operation();
  } catch (error) {
    if (!config.groqApiKey || shouldUseLocalFallback(error)) {
      return fallback();
    }
    throw error;
  }
}

export function getActiveProvider(): "groq" {
  return "groq";
}

export function ensureGroqConfigured(): void {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is required. Add it to .env and restart DevAssist.");
  }
}

export async function runRepoUnderstanding(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runRepoUnderstanding(files),
    () => runLocalRepoUnderstanding(files)
  );
}

export async function runPlanning(files: RepoFile[], requestText: string) {
  return withGroqFallback(
    () => groqAgent.runPlanning(files, requestText),
    () => runLocalPlanning(files, requestText)
  );
}

export async function runCodeReview(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runCodeReview(files),
    () => runLocalCodeReview(files)
  );
}

export async function runDependencyAnalysis(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runDependencyAnalysis(files),
    () => runLocalDependencyAnalysis(files)
  );
}

export async function runTestGeneration(files: RepoFile[], filePath: string) {
  return withGroqFallback(
    () => groqAgent.runTestGeneration(files, filePath),
    () => runLocalTestGeneration(files, filePath)
  );
}

export async function runDocumentation(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runDocumentation(files),
    () => runLocalDocumentation(files)
  );
}

export async function runDeployment(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runDeployment(files),
    () => runLocalDeployment(files)
  );
}

export async function runLogAnalysis(files: RepoFile[], logs: string) {
  return withGroqFallback(
    () => groqAgent.runLogAnalysis(files, logs),
    () => runLocalLogAnalysis(logs)
  );
}

export async function runSecurityAnalysis(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runSecurityAnalysis(files),
    () => runLocalSecurityAnalysis(files)
  );
}

export async function runKnowledgeBaseEngine(files: RepoFile[]) {
  return withGroqFallback(
    () => groqAgent.runKnowledgeBaseEngine(files),
    () => runLocalKnowledgeBaseEngine(files)
  );
}

export async function explainFileGrounded(files: RepoFile[], filePath: string) {
  return withGroqFallback(
    () => groqAgent.explainFileGrounded(files, filePath),
    () => explainLocalFile(files, filePath)
  );
}

export async function answerKnowledgeBaseQuestion(query: string, context: string): Promise<string> {
  return withGroqFallback(
    () => groqAgent.answerKnowledgeBaseQuestion(query, context),
    () => answerLocalKnowledgeBaseQuestion(query, context)
  );
}

const embeddingCache = new Map<string, number[]>();

export function getEmbedding(text: string): number[] {
  const cacheKey = text.trim();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const vector = new Array(768).fill(0);
  const words = cacheKey.toLowerCase().split(/\W+/).filter(Boolean);
  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    vector[Math.abs(hash) % vector.length] += 1;
  });

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  const normalized = vector.map((value) => value / norm);
  embeddingCache.set(cacheKey, normalized);
  return normalized;
}
