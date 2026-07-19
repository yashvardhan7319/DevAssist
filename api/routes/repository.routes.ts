import { Router } from "express";
import { RepositoryController } from "../controllers/repository.controller";
import { AnalysisController } from "../controllers/analysis.controller";
import { KnowledgeBaseController } from "../controllers/knowledge-base.controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/", authenticateToken, RepositoryController.list);
router.post("/", authenticateToken, RepositoryController.create);
router.get("/:id", authenticateToken, RepositoryController.get);
router.delete("/:id", authenticateToken, RepositoryController.delete);
router.post("/:id/files", authenticateToken, RepositoryController.addEditFile);
router.delete("/:id/files", authenticateToken, RepositoryController.deleteFile);
router.post("/:id/explain-file", authenticateToken, RepositoryController.explainFile);
router.post("/:id/analyze", authenticateToken, AnalysisController.analyze);
router.post("/:id/analyze-logs", authenticateToken, AnalysisController.analyzeLogs);

// Knowledge Base routes
router.get("/:id/knowledge-base", authenticateToken, KnowledgeBaseController.get);
router.post("/:id/knowledge-base/generate", authenticateToken, KnowledgeBaseController.generate);
router.post("/:id/knowledge-base/notes", authenticateToken, KnowledgeBaseController.addNote);
router.put("/:id/knowledge-base/notes/:noteId", authenticateToken, KnowledgeBaseController.updateNote);
router.delete("/:id/knowledge-base/notes/:noteId", authenticateToken, KnowledgeBaseController.deleteNote);
router.post("/:id/knowledge-base/search", authenticateToken, KnowledgeBaseController.search);

export const repositoryRouter = router;
