import {
  catchNotAllowedMethods,
  runDryMigrationsController,
  runLiveRunMigrationsController,
} from "./migrationsController";
import { Router } from "express";

const migrationsRouter: Router = Router();

migrationsRouter
  .route("/migrations")
  .get(runDryMigrationsController)
  .post(runLiveRunMigrationsController)
  .all(catchNotAllowedMethods);

export default migrationsRouter;
