import { Router } from "express";
import statusRouter from "./status/route";
import migrationsRouter from "./migrations/route";
import usersRouter from "./users/route";

const V1: Router = Router();

V1.use(statusRouter, migrationsRouter, usersRouter);
export default V1;
