import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import v1Router from "./api/v1";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// API v1
app.use("/api/v1", v1Router);

// 404
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const PORT = env.APP_PORT;
app.listen(PORT, () => {
  console.log(`🪦 EternalMap server running on http://localhost:${PORT}`);
});

export default app;
