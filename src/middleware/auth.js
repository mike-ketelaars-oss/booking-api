
import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : authorization;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    req.auth = jwt.verify(
      token,
      process.env.AUTH_SECRET_KEY
    );

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
