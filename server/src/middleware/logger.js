import crypto from "node:crypto";

/** Request logging with correlation id */
export function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    if (process.env.LOG_LEVEL !== "silent") {
      console.log(
        JSON.stringify({
          request_id: requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms,
        })
      );
    }
  });

  next();
}
