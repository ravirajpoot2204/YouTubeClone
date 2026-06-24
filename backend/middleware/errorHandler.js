const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  }

  // Invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found';
  }

  console.error(`[${statusCode}] ${message}`);
  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;