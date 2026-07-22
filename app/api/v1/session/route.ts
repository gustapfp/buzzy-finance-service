import { Router } from "express";

import { catchNotAllowedMethods } from "../utils";

const usersRouter: Router = Router();

usersRouter.route("/session/login").all(catchNotAllowedMethods);
usersRouter.route("/session/logout").all(catchNotAllowedMethods);

export default usersRouter;
