import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { StorageService } from "../../core/services/storage.service";
import crypto from "crypto";
import {
  runRepoUnderstanding,
  runPlanning,
  runCodeReview,
  runDependencyAnalysis,
  runTestGeneration,
  runDocumentation,
  runDeployment,
  runLogAnalysis,
  runSecurityAnalysis,
} from "../../agents/ai-dispatcher";
import { logger } from "../../core/utils/logger";
import { toPublicErrorMessage } from "../../core/utils/public-errors";

const analysisCache = new Map<string, any>();

function getRepoHash(files: any[], salt = ""): string {
  const hash = crypto.createHash("sha256");
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  for (const f of sorted) {
    hash.update(f.path);
    hash.update(f.content || "");
  }
  if (salt) {
    hash.update(salt);
  }
  return hash.digest("hex");
}

export class AnalysisController {
  static async analyze(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }

    repo.files = await StorageService.getFiles(repo.id, repo.files);

    const { analysisType, requestText } = req.body;
    if (!analysisType) {
      res.status(400).json({ error: "analysisType is required." });
      return;
    }

    const targetPath = req.body.targetPath || "";
    const extraSalt = analysisType === "planning" ? requestText : (analysisType === "testing" ? targetPath : "");
    const cacheKey = `${repo.id}_${analysisType}_groq_${getRepoHash(repo.files, extraSalt)}`;

    if (analysisCache.has(cacheKey)) {
      const cachedUpdates = analysisCache.get(cacheKey);
      const analysis = Database.createAnalysis(repo.id, analysisType);
      
      const fullUpdates = {
        ...cachedUpdates,
        status: "completed" as const,
        completedAt: new Date().toISOString()
      };
      
      Database.updateAnalysis(analysis.id, fullUpdates);

      // Auto update repository metadata!
      if (analysisType === "repo_understanding" && cachedUpdates.resultSummary) {
        const parsedLang = cachedUpdates.resultSummary.match(/language:\s*([^,]+)/)?.[1] || repo.language;
        const parsedFw = cachedUpdates.resultSummary.match(/framework:\s*([^.]+)/)?.[1] || repo.framework;
        Database.updateRepository(repo.id, {
          language: parsedLang,
          framework: parsedFw,
          lastAnalyzedAt: new Date().toISOString(),
        });
      }

      Database.createNotification(
        repo.userId,
        `Agent Analysis Completed (from Cache): ${analysisType.replace(/_/g, " ").toUpperCase()} is ready for repository "${repo.name}"`,
        "success",
        `/repository/${repo.id}?tab=${analysisType}`
      );

      res.json({ 
        analysis: Database.getAnalysis(analysis.id), 
        message: "Analysis retrieved instantly from performance cache." 
      });
      logger.info(`Analysis [${analysisType}] served instantly from cache for repo: ${repo.name}`);
      return;
    }

    // Create queued analysis entry
    const analysis = Database.createAnalysis(repo.id, analysisType);

    // Run asynchronously to allow non-blocking UI polling
    res.json({ analysis, message: "Analysis started in background." });

    // Set status to running in the database
    Database.updateAnalysis(analysis.id, { status: "running" });
    logger.info(`Started agent analysis [${analysisType}] for repo: ${repo.name}`);

    // Execute background pipeline asynchronously
    (async () => {
      try {
        let resultSummary = "";
        const updates: any = { status: "completed", completedAt: new Date().toISOString() };

        if (analysisType === "repo_understanding") {
          const result = await runRepoUnderstanding(repo.files);
          resultSummary = `Detected primary language: ${result.language}, framework: ${result.framework}. Created overview.`;
          updates.resultSummary = resultSummary;
          updates.mermaidDiagram = result.mermaidDiagram;
          
          // Auto update repository metadata!
          Database.updateRepository(repo.id, {
            language: result.language,
            framework: result.framework,
            lastAnalyzedAt: new Date().toISOString(),
          });
        } else if (analysisType === "planning") {
          if (!requestText) {
            throw new Error("Feature/ticket description is required for Planning Agent.");
          }
          const result = await runPlanning(repo.files, requestText);
          resultSummary = `Created feature roadmap with ${result.tasks.length} subtasks.`;
          updates.resultSummary = resultSummary;
          updates.tasks = result.tasks;
        } else if (analysisType === "code_review") {
          const result = await runCodeReview(repo.files);
          resultSummary = result.resultSummary;
          updates.resultSummary = resultSummary;
          updates.annotations = result.annotations;
        } else if (analysisType === "dependency") {
          const result = await runDependencyAnalysis(repo.files);
          resultSummary = `Audited direct manifests. Found ${result.dependencies.length} packages.`;
          updates.resultSummary = resultSummary;
          updates.dependencies = result.dependencies;
        } else if (analysisType === "testing") {
          if (!targetPath) {
            throw new Error("Target file path is required to generate unit tests.");
          }
          const result = await runTestGeneration(repo.files, targetPath);
          resultSummary = `Generated professional unit/integration tests for ${targetPath}.`;
          updates.resultSummary = resultSummary;
          updates.testsCode = result.testsCode;
        } else if (analysisType === "documentation") {
          const result = await runDocumentation(repo.files);
          resultSummary = "Generated fully comprehensive README.md documentation.";
          updates.resultSummary = resultSummary;
          updates.readmeMarkdown = result.readmeMarkdown;
        } else if (analysisType === "deployment") {
          const result = await runDeployment(repo.files);
          resultSummary = "Generated full Docker, Compose, GHA, Render, and Vercel configs with readiness scores.";
          updates.resultSummary = resultSummary;
          updates.dockerfileContent = result.dockerfileContent;
          updates.dockerComposeContent = result.dockerComposeContent;
          updates.githubActionsContent = result.githubActionsContent;
          updates.vercelConfig = result.vercelConfig;
          updates.renderConfig = result.renderConfig;
          updates.detectedEnvVars = result.detectedEnvVars;
          updates.compatibilityReport = result.compatibilityReport;
          updates.productionReadinessScore = result.productionReadinessScore;
          updates.productionReadinessChecklist = result.productionReadinessChecklist;
        } else if (analysisType === "security") {
          const result = await runSecurityAnalysis(repo.files);
          resultSummary = `Audit complete. Risk score: ${result.overallRiskScore}/100. Identified ${result.findings.length} security findings.`;
          updates.resultSummary = resultSummary;
          updates.securityReport = result;
        }

        // Save to cache before updating DB to preserve updates fields
        analysisCache.set(cacheKey, updates);

        Database.updateAnalysis(analysis.id, updates);
        Database.createNotification(
          repo.userId,
          `Agent Analysis Completed: ${analysisType.replace(/_/g, " ").toUpperCase()} is ready for repository "${repo.name}"`,
          "success",
          `/repository/${repo.id}?tab=${analysisType}`
        );
        logger.info(`Completed agent analysis [${analysisType}] for repo: ${repo.name}`);
      } catch (e: any) {
        logger.error(`Agent run failed for repo: ${repo.name} with analysis: ${analysisType}`, e);
        const publicMessage = toPublicErrorMessage(e, "Failed due to an AI configuration or provider error.");
        Database.updateAnalysis(analysis.id, {
          status: "failed",
          errorMessage: publicMessage,
          completedAt: new Date().toISOString(),
        });
        Database.createNotification(
          repo.userId,
          `Agent Analysis Failed: ${analysisType.replace(/_/g, " ").toUpperCase()} failed on "${repo.name}". Error: ${publicMessage}`,
          "error",
          `/repository/${repo.id}`
        );
      }
    })();
  }

  static async analyzeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const repo = Database.getRepository(req.params.id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      repo.files = await StorageService.getFiles(repo.id, repo.files);

      const { logs } = req.body;
      if (!logs) {
        res.status(400).json({ error: "Logs are required for troubleshooting." });
        return;
      }

      const result = await runLogAnalysis(repo.files, logs);
      res.json({ result });
    } catch (e: any) {
      logger.error(`Deployment diagnostics failed for repo: ${req.params.id}`, e);
      res.status(500).json({ error: toPublicErrorMessage(e, "Failed to analyze deployment logs.") });
    }
  }
}
