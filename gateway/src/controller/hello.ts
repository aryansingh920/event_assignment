import { Request, Response } from "express";


export const getHello = (req: Request, res: Response): void => {
  try {
    // Sending a JSON response is standard for modern APIs
    res.status(200).json({
      success: true,
      message: "Server Running!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
