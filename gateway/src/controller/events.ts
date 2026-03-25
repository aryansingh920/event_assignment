import { Request, Response } from "express";
import { pool } from "../helper/db";
import { getEventsQuery } from "../helper/queries";



export const getEvents = async (req: Request, res: Response) => {
    try{
        const { region } = req.query;
        if (!region){
            res.status(400).json({ error: "Query not found" });
            return;
        }

        const result = await pool.query(
          getEventsQuery,
          [region],
        );

        res.status(200).json(result.rows);

    } catch (error)
    {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
}
