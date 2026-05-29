import { Router } from "express";
import { runDryMigrationsController, runLiveRunMigrationsController } from "./migrationsController";

const migrationsRouter: Router = Router();

migrationsRouter.route("/migrations").get(runDryMigrationsController).post(runLiveRunMigrationsController);

export default migrationsRouter;
