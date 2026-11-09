
import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import * as Sentry from "@sentry/node";

import resourcesRouter from "./routes/resources.js";
import { prisma } from "./services/resources.js";

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
  });

  app.use(Sentry.Handlers.requestHandler());
}

app.use(express.json());

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration =
      Number(process.hrtime.bigint() - start) / 1_000_000;

    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`
    );
  });

  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Booking API is running!",
  });
});

app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username ||
      !password
    ) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    const host = user
      ? null
      : await prisma.host.findUnique({
          where: { username },
        });

    const account = user || host;

    if (!account || account.password !== password) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: account.id,
        username: account.username,
      },
      process.env.AUTH_SECRET_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
});

app.use(resourcesRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((error, req, res, next) => {
  if (error.status) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  if (
    ["P2002", "P2003", "P2011"].includes(error.code) ||
    error.name === "PrismaClientValidationError"
  ) {
    return res.status(400).json({
      message: "Invalid or conflicting data",
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      message: "Resource not found",
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "An error occurred on the server",
  });
});

app.listen(PORT, () => {
  console.log(
    `Booking API running at http://localhost:${PORT}`
  );
});
