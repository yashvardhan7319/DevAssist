import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/github/status", AuthController.githubStatus);
router.get("/github", AuthController.githubStart);
router.get("/github/callback", AuthController.githubCallback);
router.get("/me", authenticateToken, AuthController.me);

export const authRouter = router;
