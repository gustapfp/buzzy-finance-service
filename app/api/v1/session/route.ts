import { Router } from "express";

import { catchNotAllowedMethods } from "../utils";
import { loginController, logoutController } from "./controller";

const usersRouter: Router = Router();

usersRouter.route("/session/login").post(loginController).all(catchNotAllowedMethods);
usersRouter.route("/session/logout").delete(logoutController).all(catchNotAllowedMethods);

export default usersRouter;
