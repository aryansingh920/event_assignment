import { Request, Response } from "express";
import {producer} from "../helper/kafka_producer";


interface request{
    eventId: string;
    userId: string;
}

export const sendClaimCommand = async (eventId: string, userId: string) => {
  await producer.send({
    topic: "event-commands",
    messages: [
      {
        key: eventId, // Use eventId as key to ensure same-event orders go to same partition
        value: JSON.stringify({
          type: "CLAIM_EVENT",
          payload: { eventId, userId, timestamp: new Date().toISOString() },
        }),
      },
    ],
  });
};

export const getClaim = async (req: Request, res: Response) => { 
    try {
      const { eventId, userId }: request = req.body;

      // Basic Validation
      if (!eventId || !userId) {
        res.status(400).json({ error: "Missing eventId or userId" });
        return;
      }

      // 1. Fire and Forget to Kafka
      await sendClaimCommand(eventId, userId);

      // 2. Respond immediately with 202 (Accepted)
      // This keeps the UI snappy even if Kafka or the DB is slow
      res.status(200).json({
        message: "Claim request received and is being processed",
        eventId,
      });
    } catch (error) {
      console.error("Error publishing to Kafka:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }

}
