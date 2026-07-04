import { Request, Response } from "express";

export const catchNotAllowedMethods = async (_request: Request, response: Response) => {
  return response.status(405).json({ message: "Method Not Allowed" });
};
