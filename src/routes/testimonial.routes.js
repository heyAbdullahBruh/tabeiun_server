import { Router } from "express";
import {
  getAllTestimonials,
  getFeaturedTestimonials,
  getTestimonialStats,
  markTestimonialHelpful,
  getTestimonialById,
} from "../controllers/testimonial.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.get("/all", getAllTestimonials);
router.get("/featured", getFeaturedTestimonials);
router.get("/stats", getTestimonialStats);
router.get("/:id", getTestimonialById);

// Optional auth for helpful votes (track user)
router.post("/:id/helpful", optionalAuth, markTestimonialHelpful);

export default router;
