import { Router } from "express";
import { OrchestratorController } from "../controllers/orchestrator.controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.post("/", authenticateToken, OrchestratorController.start);
router.get("/:id", authenticateToken, OrchestratorController.get);
router.post("/:id/cancel", authenticateToken, OrchestratorController.cancel);
router.get("/repo/:repoId", authenticateToken, OrchestratorController.listByRepo);

export const orchestratorRouter = router;
