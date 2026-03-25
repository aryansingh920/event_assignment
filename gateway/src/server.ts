import express, { Application } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import morgan from "morgan"; // 1. Import Morgan
import myRouter from "./router/routes.v1";

const envPath = path.resolve(__dirname, "Config.env");
dotenv.config({ path: envPath });

const app: Application = express();
const PORT = process.env.GATEWAY_PORT;

// --- Middleware ---


// Example using the CLF (Common Log Format) date
app.use(morgan(':method :url :status :res[content-length] - :response-time ms [:date[clf]]'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use("/api", myRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
