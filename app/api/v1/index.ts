import { Router } from "express";
import statusRouter from "./status/route";

const V1: Router = Router();

V1.use("/v1", statusRouter);

export default V1;
