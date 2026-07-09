import { Router } from "express";
import { createUserController, getOneUserByUsernameController } from "./controller";
import { catchNotAllowedMethods } from "../utils";

const usersRouter: Router = Router();

usersRouter.route("/users").post(createUserController).all(catchNotAllowedMethods);
usersRouter.route("/users/:username").get(getOneUserByUsernameController).all(catchNotAllowedMethods);

export default usersRouter;
