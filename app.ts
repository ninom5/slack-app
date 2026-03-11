import { app } from "./config.ts";
import "./note-commands.ts";
import "./reminder-commands.ts";
import "./reminder-cron-job.ts";

(async () => {
  await app.start();
  console.log("Slack app is running and connected to Firebase!");
})();
