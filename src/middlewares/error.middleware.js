import { ApiResponse } from "../utils/ApiResponse.js";

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!statusCode) statusCode = 500;

  // Log error for developers
  console.error(`[ERROR] ${req.method} ${req.url} : ${err.message}`);

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  return res
    .status(statusCode)
    .json(
      new ApiResponse(statusCode, null, message || "Internal Server Error"),
    );
};

export default errorHandler;
