import express from "express";
import { PORT } from "./config/consts";
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log("Running express server");
});
