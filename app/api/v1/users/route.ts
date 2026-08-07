import { Router } from "express";
import { createUserController, getOneUserByUsernameController, updateUserController } from "./controller";
import { catchNotAllowedMethods } from "../utils";

const usersRouter: Router = Router();

usersRouter.route("/user").post(createUserController).all(catchNotAllowedMethods);
usersRouter
  .route("/user/:username")
  .get(getOneUserByUsernameController)
  .put(updateUserController)
  .all(catchNotAllowedMethods);

export default usersRouter;
