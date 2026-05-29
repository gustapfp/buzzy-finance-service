import { Router } from "express";
import statusRouter from "./status/route";
import migrationsRouter from "./migrations/route";

const V1: Router = Router();

V1.use("/v1", statusRouter);
V1.use("/v1", migrationsRouter);
export default V1;
