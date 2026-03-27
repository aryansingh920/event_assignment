import { Request, Response } from "express";
import { producer } from "../helper/kafka_producer";
import { pool } from "../helper/db";
import { checkUserQuery, checkEventQuery } from "../helper/queries";

interface request {
  eventId: string;
  userId: string;
}

const KAFKA_TOPIC_NAME = process.env.KAFKA_TOPIC_NAME || "";
const KAFKA_PRODUCER_TYPE = "ACKNOWLEDGE_EVENT";

export const getKnowledge = async (req: Request, res: Response) => {
  try {
    const { eventId, userId }: request = req.body;

    if (!eventId || !userId) {
      res.status(400).json({ error: "Missing eventId or userId" });
      return;
    }

    const checkEvent = await pool.query(checkEventQuery, [eventId]);
    const checkUser = await pool.query(checkUserQuery, [userId]);

    const resp = {
      message: "Claim request received and is being processed",
      eventId,
    };

    // console.log(checkEvent.rows, checkUser.rows)

    if (checkEvent.rows.length) {
      if (checkEvent.rows[0]["status"] == "available") {
        if (checkUser.rows.length) {
          await sendAcknowledgeCommand(eventId, userId);
        } else {
          resp.message = "User Not available";
        }
      } else {
        resp.message = "Event Not available";
      }
    } else {
      resp.message = "No Event available";
    }
    // console.log("Resp", resp);
    res.status(200).json(resp);
  } catch (error) {
    console.error("Error publishing to Kafka:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const sendAcknowledgeCommand = async (
  eventId: string,
  userId: string,
) => {
  await producer.send({
    topic: KAFKA_TOPIC_NAME,
    messages: [
      {
        key: eventId,
        value: JSON.stringify({
          type: KAFKA_PRODUCER_TYPE,
          payload: { eventId, userId, timestamp: new Date().toISOString() },
        }),
      },
      
    ],
  });
};
