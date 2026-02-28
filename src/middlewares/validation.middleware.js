import { validationResult } from "express-validator";
import { errorResponse } from "../utils/responseFormatter.js";

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return errorResponse(res, "Validation failed", 400, formattedErrors);
  };
};

export const mongoIdValidator = (value) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error("Invalid ID format");
  }
  return true;
};
