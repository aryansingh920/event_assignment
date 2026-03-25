import * as fs from "fs";
import * as path from "path";


const queriesPath = path.join(process.cwd(), "database", "query");

const getEventsQuery = fs.readFileSync(
  path.join(queriesPath, "getEvents.sql"),
  "utf-8",
);

export { getEventsQuery };
