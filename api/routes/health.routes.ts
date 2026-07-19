import { Router } from "express";
import { config } from "../../core/config/env";
import { Database } from "../../core/services/database";

const router = Router();

router.get("/", (req, res) => {
  try {
    const storage = Database.getStorageInfo();
    res.json({
      ok: true,
      storage,
      ai: {
        groqConfigured: Boolean(config.groqApiKey),
        groqKeyLength: config.groqApiKey ? config.groqApiKey.length : 0,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      ok: false,
      error: error.message || "Database health check failed.",
      checkedAt: new Date().toISOString(),
    });
  }
});

export const healthRouter = router;
