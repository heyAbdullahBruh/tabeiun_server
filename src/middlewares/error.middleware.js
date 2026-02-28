import mongoose from "mongoose";
import { errorResponse } from "../utils/responseFormatter.js";

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error("❌ Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose bad ObjectId
  if (err instanceof mongoose.Error.CastError) {
    const message = "Resource not found";
    return errorResponse(res, message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `Duplicate value for ${field}. Please use another value.`;
    return errorResponse(res, message, 400);
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, "Validation error", 400, errors);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return errorResponse(res, "Token expired", 401);
  }

  // Default error
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  // In production, don't expose internal error details
  const responseMessage =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : message;

  return errorResponse(res, responseMessage, statusCode);
};
