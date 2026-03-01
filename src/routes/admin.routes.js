import { Router } from "express";
import {
  createModerator,
  promoteToAdmin,
  getAllAdmins,
  toggleAdminStatus,
  deleteAdmin,
} from "../controllers/admin.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createModeratorValidator } from "../validators/auth.validator.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateAdmin, isAdmin);

router.post("/moderators", validate(createModeratorValidator), createModerator);
router.patch("/:moderatorId/promote", promoteToAdmin);
router.get("/", getAllAdmins);
router.patch("/:adminId/toggle-status", toggleAdminStatus);
router.delete("/:adminId", deleteAdmin);

export default router;
