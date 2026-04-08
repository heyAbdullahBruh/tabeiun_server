import helmet from "helmet";
import compression from "compression";
import xss from "xss";
import mongoSanitize from "express-mongo-sanitize";
// XSS Protection middleware
export const xssProtect = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = xss(req.query[key]);
      }
    });
  }

  // Sanitize body parameters
  if (req.body) {
    const sanitizeBody = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "string") {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          sanitizeBody(obj[key]);
        }
      });
    };
    sanitizeBody(req.body);
  }

  // Sanitize URL parameters
  if (req.params) {
    Object.keys(req.params).forEach((key) => {
      if (typeof req.params[key] === "string") {
        req.params[key] = xss(req.params[key]);
      }
    });
  }

  next();
};

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
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
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
const sanitizeValue = (value) => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === "string") {
    // Remove dangerous characters for MongoDB
    return value.replace(/[\$\.]/g, "");
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  // Handle plain objects
  if (typeof value === "object" && value.constructor === Object) {
    const sanitized = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeValue(value[key]);
      }
    }
    return sanitized;
  }

  // Return other types as-is (dates, numbers, etc.)
  return value;
};

// Main sanitize middleware - DOES NOT modify req.query or req.params directly
export const sanitize = (req, res, next) => {
  try {
    // Only sanitize req.body (this is safe to modify)
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }

    // For req.query and req.params, we don't modify them directly
    // Instead, we create sanitized versions and attach them to req
    // Routes should use req.sanitizedQuery instead of req.query if needed
    if (req.query && typeof req.query === "object") {
      req.sanitizedQuery = sanitizeValue(req.query);
    }

    if (req.params && typeof req.params === "object") {
      req.sanitizedParams = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    console.error("Sanitize middleware error:", error);
    next();
  }
};

// Alternative: Completely skip sanitization for queries and params
// Only sanitize the request body
export const lightSanitize = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") {
      const cleanBody = (obj) => {
        if (!obj || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) return obj.map(cleanBody);

        const cleaned = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            if (typeof val === "string") {
              cleaned[key] = val.replace(/[\$\.]/g, "");
            } else if (val && typeof val === "object") {
              cleaned[key] = cleanBody(val);
            } else {
              cleaned[key] = val;
            }
          }
        }
        return cleaned;
      };

      req.body = cleanBody(req.body);
    }
    next();
  } catch (error) {
    console.error("Light sanitize error:", error);
    next();
  }
};
