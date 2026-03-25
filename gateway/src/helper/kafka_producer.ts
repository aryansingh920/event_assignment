import { Kafka, Producer, KafkaConfig } from "kafkajs";

interface AppConfig {
  brokers: string[];
  clientId: string;
}

const getConfig = (): AppConfig => {
  const brokers = process.env.KAFKA_BROKERS;
  const clientId = process.env.KAFKA_CLIENT_ID;

  if (!brokers) {
    throw new Error("Missing KAFKA_BROKERS in environment variables");
  }

  return {
    // Splits comma-separated strings into an array for KafkaJS
    brokers: brokers.split(","),
    clientId: clientId ?? "default-client-id",
  };
};

const config = getConfig();

// Define Kafka configuration with strict typing
const kafkaConfig: KafkaConfig = {
  clientId: config.clientId,
  brokers: config.brokers,
};

const kafka = new Kafka(kafkaConfig);
const producer: Producer = kafka.producer();


async function start(): Promise<void> {
  try {
    await producer.connect();
    console.log(
      `Successfully connected to Kafka at ${config.brokers.join(", ")}`,
    );
  } catch (error) {
    console.error(
      "Failed to connect to Kafka:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}


start().catch((err) => {
  console.error("Fatal startup error:", err);
});



export {producer};
