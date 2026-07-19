import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { explainFileGrounded } from "../../agents/ai-dispatcher";
import { logger } from "../../core/utils/logger";
import { importGitHubRepository } from "../../core/services/github-importer";
import { StorageService } from "../../core/services/storage.service";
import { toPublicErrorMessage } from "../../core/utils/public-errors";

export class RepositoryController {
  static list(req: AuthenticatedRequest, res: Response): void {
    const repos = Database.getRepositories(req.user.id);
    const optimizedRepos = repos.map((r) => ({
      ...r,
      files: r.files ? r.files.map((f) => ({ path: f.path, size: f.size, content: "" })) : [],
    }));
    res.json({ repositories: optimizedRepos });
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, language, framework, files, sourceType, githubUrl, githubToken } = req.body;

    if (sourceType === "github") {
      if (!githubUrl) {
        res.status(400).json({ error: "GitHub URL is required." });
        return;
      }

      try {
        const imported = await importGitHubRepository(githubUrl, { accessToken: githubToken });
        const repo = Database.createRepository({
          userId: req.user.id,
          name: imported.name,
          sourceType: "github",
          githubUrl: imported.githubUrl,
          localPath: `repositories/${imported.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          branch: imported.branch,
          language: imported.language,
          framework: imported.framework,
          files: imported.files,
        });

        await StorageService.saveFiles(repo.id, imported.files);

        logger.info(`Successfully imported GitHub repository: ${repo.name} for user: ${req.user.username}`);
        res.status(201).json({ repository: repo });
      } catch (error: any) {
        logger.error(`Failed importing GitHub repository for user: ${req.user.username}`, error);
        res.status(400).json({ error: error.message || "Failed to import GitHub repository." });
      }
      return;
    }

    if (!name || !language || !framework) {
      res.status(400).json({ error: "Name, language, and framework are required." });
      return;
    }

    const defaultFiles = files || [
      { path: "README.md", size: 100, content: `# ${name}\nA simple starter project.` },
    ];

    const repo = Database.createRepository({
      userId: req.user.id,
      name,
      sourceType: "zip",
      localPath: `repositories/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      branch: "main",
      language,
      framework,
      files: defaultFiles,
    });

    await StorageService.saveFiles(repo.id, defaultFiles);

    logger.info(`Successfully created ZIP/Starter repository: ${repo.name} for user: ${req.user.username}`);
    res.status(201).json({ repository: repo });
  }

  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }
    repo.files = await StorageService.getFiles(repo.id, repo.files);
    const analyses = Database.getAnalyses(repo.id);
    res.json({ repository: repo, analyses });
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }
    Database.deleteRepository(repo.id);
    await StorageService.deleteRepository(repo.id);
    logger.info(`Successfully deleted repository: ${repo.name} for user: ${req.user.username}`);
    res.json({ success: true, message: "Repository deleted successfully." });
  }

  static async addEditFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }

    const { path: filePath, content } = req.body;
    if (!filePath) {
      res.status(400).json({ error: "File path is required." });
      return;
    }

    const cleanPath = filePath.trim();
    const existingFileIdx = repo.files.findIndex((f) => f.path === cleanPath);

    if (existingFileIdx > -1) {
      repo.files[existingFileIdx] = {
        path: cleanPath,
        content: content || "",
        size: (content || "").length,
      };
    } else {
      repo.files.push({
        path: cleanPath,
        content: content || "",
        size: (content || "").length,
      });
    }

    await StorageService.saveFile(repo.id, cleanPath, content || "");
    Database.updateRepository(repo.id, { files: repo.files });
    
    // Refresh content for response since we only mutated metadata
    repo.files = await StorageService.getFiles(repo.id, repo.files);

    logger.info(`File created/modified: ${cleanPath} in repository: ${repo.name}`);
    res.json({ success: true, files: repo.files });
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }

    const { path: filePath } = req.body;
    if (!filePath) {
      res.status(400).json({ error: "File path is required." });
      return;
    }

    repo.files = repo.files.filter((f) => f.path !== filePath);
    await StorageService.deleteFile(repo.id, filePath);
    Database.updateRepository(repo.id, { files: repo.files });

    // Refresh content for response
    repo.files = await StorageService.getFiles(repo.id, repo.files);

    logger.info(`File deleted: ${filePath} in repository: ${repo.name}`);
    res.json({ success: true, files: repo.files });
  }

  static async explainFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const repo = Database.getRepository(req.params.id);
    if (!repo || repo.userId !== req.user.id) {
      res.status(404).json({ error: "Repository not found." });
      return;
    }

    const { filePath } = req.body;
    if (!filePath) {
      res.status(400).json({ error: "filePath is required." });
      return;
    }

    repo.files = await StorageService.getFiles(repo.id, repo.files);

    // Build unique cache key using MD5/SHA of repo files + filePath
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256");
    const sorted = [...(repo.files || [])].sort((a, b) => a.path.localeCompare(b.path));
    for (const f of sorted) {
      hash.update(f.path);
      hash.update(f.content || "");
    }
    const cacheKey = `${hash.digest("hex")}_${filePath}_groq`;

    // Inline static cache map
    if (!(global as any).explainCache) {
      (global as any).explainCache = new Map<string, string>();
    }

    if ((global as any).explainCache.has(cacheKey)) {
      logger.info(`[Explain Cache] Hit for file explanation: ${filePath}`);
      res.json({ filePath, explanation: (global as any).explainCache.get(cacheKey) });
      return;
    }

    try {
      const explanation = await explainFileGrounded(repo.files, filePath);
      (global as any).explainCache.set(cacheKey, explanation);
      res.json({ filePath, explanation });
    } catch (e: any) {
      logger.error(`Failed explaining file: ${filePath} in repository: ${repo.name}`, e);
      res.status(500).json({ error: toPublicErrorMessage(e, "Failed to explain file.") });
    }
  }
}
