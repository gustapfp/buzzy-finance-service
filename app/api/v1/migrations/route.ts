import { catchNotAllowedMethods } from "../utils";
import { runDryMigrationsController, runLiveRunMigrationsController } from "./controller";
import { Router } from "express";

const migrationsRouter: Router = Router();

migrationsRouter
  .route("/migrations")
  .get(runDryMigrationsController)
  .post(runLiveRunMigrationsController)
  .all(catchNotAllowedMethods);

export default migrationsRouter;
