import { Router } from "express";
import {
  activateUserController,
  createUserController,
  getCurrentUserController,
  getOneUserByUsernameController,
  resendActivationController,
  updateUserController,
} from "./controller";
import { catchNotAllowedMethods } from "../utils";

const usersRouter: Router = Router();

usersRouter.route("/user").get(getCurrentUserController).post(createUserController).all(catchNotAllowedMethods);
usersRouter
  .route("/user/activate")
  .patch(activateUserController)
  .post(resendActivationController)
  .all(catchNotAllowedMethods);
usersRouter
  .route("/user/:username")
  .get(getOneUserByUsernameController)
  .put(updateUserController)
  .all(catchNotAllowedMethods);

export default usersRouter;
