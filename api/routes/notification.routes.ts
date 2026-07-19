import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.get("/", authenticateToken, NotificationController.list);
router.post("/:id/read", authenticateToken, NotificationController.markRead);

export const notificationRouter = router;
