import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { logger } from "../../core/utils/logger";

export class NotificationController {
  static list(req: AuthenticatedRequest, res: Response): void {
    const list = Database.getNotifications(req.user.id);
    res.json({ notifications: list });
  }

  static markRead(req: AuthenticatedRequest, res: Response): void {
    const notification = Database.markNotificationAsReadForUser(req.params.id, req.user.id);
    if (!notification) {
      logger.warn(`Notification markRead failed: Notification with ID ${req.params.id} not found for user ${req.user.username}`);
      res.status(404).json({ error: "Notification not found." });
      return;
    }
    res.json({ success: true, notification });
  }
}
