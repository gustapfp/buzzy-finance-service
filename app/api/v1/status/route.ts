import { Router } from "express";
import healthCheckController from "./statusController";
import { catchNotAllowedMethods } from "../utils";

const statusRouter: Router = Router();
statusRouter.route("/status").get(healthCheckController).all(catchNotAllowedMethods);

export default statusRouter;
