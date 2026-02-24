import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import xss from "xss-clean";
import rateLimit from "express-rate-limit";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

// Security Middlewares
app.use(helmet());
app.use(xss());
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(compression());

// Request Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// CORS Configuration
const allowedOrigins = [
  "https://tabeiunmedicine.com",
  "https://dashboard.tabeiunmedicine.com",
  "http://localhost:3000", // For local testing
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use("/api/", limiter);

// API Versioning
// Routes will be imported here in Phase 2
// app.use("/api/v1/auth", authRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
