import { Request, Response } from "express";
import { Pool } from 'pg';
import { getEventsQuery } from "../helper/queries";

const pool = new Pool({ /* connection config */ });


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
