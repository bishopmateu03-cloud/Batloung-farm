/** 404 handler for routes that do not exist. */
module.exports = function notFound(req, res) {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
