import express, { NextFunction, Request, Response } from "express";
import { PORT } from "./config/consts";
import { logger } from "../utils/logger";
import V1Router from "./v1";

const app = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path }, "incoming request");
  next();
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use(`/api`, V1Router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
