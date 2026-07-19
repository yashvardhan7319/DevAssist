import { Request, Response, NextFunction } from "express";
import { Database } from "../../core/services/database";
import { verifyAuthToken } from "../../core/services/auth-security";
import { logger } from "../../core/utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const match = typeof authHeader === "string" ? authHeader.match(/^Bearer\s+(.+)$/i) : null;
  const token = match?.[1];

  if (!token) {
    logger.warn("Token validation failed: Header missing or incorrect");
    res.status(401).json({ error: "Access token missing. Please log in." });
    return;
  }

  try {
    const decoded = verifyAuthToken(token);
    const user = Database.findUserById(decoded.id);

    if (!user) {
      logger.warn(`Token validation failed: User with ID ${decoded.id} not found`);
      res.status(403).json({ error: "Invalid user session." });
      return;
    }

    req.user = user;
    next();
  } catch (e) {
    logger.error("Token parsing exception encountered", e);
    res.status(403).json({ error: "Invalid token signature or format." });
  }
}

