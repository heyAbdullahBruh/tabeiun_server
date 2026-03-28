import helmet from "helmet";
import compression from "compression";
import xss from "xss";

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

// MongoDB injection protection
export const sanitize = (req, res, next) => {
  try {
    // Sanitize function that modifies object in place
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== "object") return;

      // Handle arrays
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            sanitizeObject(item);
          }
        });
        return;
      }

      // Handle objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Remove MongoDB operator keys (keys starting with $)
          if (key.startsWith("$")) {
            delete obj[key];
            continue;
          }

          const value = obj[key];

          if (typeof value === "object" && value !== null) {
            sanitizeObject(value);
          }
        }
      }
    };

    // Sanitize each part of the request (modify in place, don't reassign)
    if (req.body && typeof req.body === "object") {
      sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === "object") {
      sanitizeObject(req.query);
    }

    if (req.params && typeof req.params === "object") {
      sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error("Sanitize middleware error:", error);
    next();
  }
};
