import { Router } from "express";
import { authRouter } from "./auth.routes";
import { repositoryRouter } from "./repository.routes";
import { notificationRouter } from "./notification.routes";
import { orchestratorRouter } from "./orchestrator.routes";
import { healthRouter } from "./health.routes";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/repositories", repositoryRouter);
router.use("/notifications", notificationRouter);
router.use("/orchestrations", orchestratorRouter);

export const apiRouter = router;
export { authRouter, repositoryRouter, notificationRouter, orchestratorRouter, healthRouter };
