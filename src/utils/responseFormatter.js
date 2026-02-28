export const successResponse = (
  res,
  data,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (
  res,
  message = "Error",
  statusCode = 500,
  errors = null,
) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

export const paginationResponse = (
  res,
  data,
  total,
  page,
  limit,
  message = "Success",
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNextPage: parseInt(page) < Math.ceil(total / limit),
      hasPrevPage: parseInt(page) > 1,
    },
    timestamp: new Date().toISOString(),
  });
};
