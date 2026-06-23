// Handles all errors in one place
const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Logs error in console for debugging

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
