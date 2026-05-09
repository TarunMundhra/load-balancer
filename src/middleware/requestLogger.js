// Express middleware that logs every incoming request in a structured one-liner.

/**
 * Log method, path, ISO timestamp, and body.ip for each incoming request.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} _res - Outgoing response (unused).
 * @param {import('express').NextFunction} next - Next middleware callback.
 * @returns {void}
 */
function requestLogger(req, _res, next) {
  const ts = new Date().toISOString();
  const ip = (req.body && req.body.ip) || "-";
  console.log(`[${ts}] ${req.method} ${req.path} — IP: ${ip}`);
  next();
}

module.exports = requestLogger;
