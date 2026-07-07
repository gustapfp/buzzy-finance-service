import { Router } from "express";
import { createUserController } from "./controller";
import { catchNotAllowedMethods } from "../utils";

const usersRouter: Router = Router();

usersRouter.route("/users").post(createUserController).all(catchNotAllowedMethods);

export default usersRouter;
