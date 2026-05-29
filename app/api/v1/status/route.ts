import { Router } from "express";
import healthCheckController from "./statusController";

const statusRouter: Router = Router();
statusRouter.route("/status").get(healthCheckController);

export default statusRouter;
