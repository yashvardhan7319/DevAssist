import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { Orchestrator } from "../../orchestrator/engine";
import { logger } from "../../core/utils/logger";
import { toPublicErrorMessage } from "../../core/utils/public-errors";

export class OrchestratorController {
  /**
   * Starts a new multi-agent orchestration run.
   */
  static async start(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { repositoryId, userInput } = req.body;
      if (!repositoryId) {
        res.status(400).json({ error: "repositoryId is required." });
        return;
      }

      const repo = Database.getRepository(repositoryId);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      if (!Orchestrator.canExecuteAi()) {
        res.status(400).json({
          error: "AI provider is not configured. Set GROQ_API_KEY in .env and restart the server.",
        });
        return;
      }

      // Initialize the run in db
      const orchestration = Orchestrator.initRun(repo.id, req.user.id, userInput);

      // Start execution in background (asynchronous, non-blocking, duplicate-safe)
      Orchestrator.ensureRunExecuting(orchestration.id);

      res.status(201).json({ orchestration, message: "Orchestration run scheduled successfully." });
    } catch (error: any) {
      logger.error("Failed to start orchestration run", error);
      res.status(500).json({ error: toPublicErrorMessage(error, "Internal server error starting orchestrator.") });
    }
  }

  /**
   * Gets details, status, logs, and output history of a specific orchestration.
   */
  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orchestration = Database.getOrchestration(id);

      if (!orchestration || orchestration.userId !== req.user.id) {
        res.status(404).json({ error: "Orchestration run not found." });
        return;
      }

      Orchestrator.ensureRunExecuting(orchestration.id);
      res.json({ orchestration });
    } catch (error: any) {
      logger.error("Failed to fetch orchestration", error);
      res.status(500).json({ error: toPublicErrorMessage(error, "Internal server error retrieving orchestration.") });
    }
  }

  /**
   * Cancels a currently running orchestration.
   */
  static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orchestration = Database.getOrchestration(id);

      if (!orchestration || orchestration.userId !== req.user.id) {
        res.status(404).json({ error: "Orchestration run not found." });
        return;
      }

      Orchestrator.cancelRun(id);
      res.json({ success: true, message: "Orchestration run cancellation command sent." });
    } catch (error: any) {
      logger.error("Failed to cancel orchestration run", error);
      res.status(500).json({ error: toPublicErrorMessage(error, "Internal server error cancelling orchestration.") });
    }
  }

  /**
   * Lists all orchestration runs for a specific repository.
   */
  static async listByRepo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { repoId } = req.params;
      const repo = Database.getRepository(repoId);

      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }
      const orchestrations = Database.getOrchestrations(repoId);
      orchestrations.forEach((orchestration) => Orchestrator.ensureRunExecuting(orchestration.id));
      res.json({ orchestrations: orchestrations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    } catch (error: any) {
      logger.error("Failed to list orchestrations", error);
      res.status(500).json({ error: toPublicErrorMessage(error, "Internal server error listing orchestrations.") });
    }
  }
}
