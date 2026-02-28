import { errorResponse } from "../utils/responseFormatter.js";
import { AdminRole } from "../models/Admin.model.js";

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (!roles.includes(req.admin.role)) {
      return errorResponse(
        res,
        "You do not have permission to perform this action",
        403,
      );
    }

    next();
  };
};

export const isAdmin = authorize(AdminRole.ADMIN);
export const isAdminOrModerator = authorize(
  AdminRole.ADMIN,
  AdminRole.MODERATOR,
);
