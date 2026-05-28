import { Router } from "express";
import healthCheck from "./statusController";

const statusRouter = Router();
statusRouter.route("/status").get(healthCheck);

export default statusRouter;
