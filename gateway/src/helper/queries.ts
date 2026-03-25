import * as fs from "fs";
import * as path from "path";

const queryDir = "../../database/queries/";

const getEventsQuery = fs.readFileSync(
  path.join(__dirname, queryDir, "getEvents.sql"),
  "utf-8",
);


export { getEventsQuery };
