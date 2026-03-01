import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Middlewares
import {
  securityHeaders,
  compress,
  sanitize,
  xssProtect,
} from "./middlewares/security.middleware.js";
import { apiRateLimiter } from "./middlewares/rateLimiter.middleware.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

dotenv.config();

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(xssProtect);
app.use(sanitize);

// Compression
app.use(compress);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// CORS configuration
const allowedOrigins = [
  process.env.DASHBOARD_URL,
  process.env.PUBLIC_URL,
  ...(process.env.CORS_ORIGIN_LOCAL?.split(",") || []),
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Rate limiting
app.use("/api", apiRateLimiter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
