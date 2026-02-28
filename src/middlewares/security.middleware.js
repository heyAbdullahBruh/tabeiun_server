import xss from "xss-clean";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";

// XSS Protection
export const xssProtect = xss();

// Helmet configuration for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https://ik.imagekit.io"],
      connectSrc: ["'self'", process.env.API_URL],
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
});

// Compression middleware
export const compress = compression({
  level: 6,
  threshold: 100 * 1024, // 100kb
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// MongoDB injection protection
export const sanitize = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    console.warn(`Potential MongoDB injection detected in ${key}`);
  },
});
