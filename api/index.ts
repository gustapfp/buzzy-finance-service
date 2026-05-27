import express from "express";
import { PORT } from "./config/consts";
import { logger } from "../utils/logger";

const app = express();

app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, "incoming request");
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
