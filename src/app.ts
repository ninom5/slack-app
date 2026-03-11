import { app } from "./config.ts";
import "./commands/note-commands.ts";
import "./commands/reminder-commands.ts";
import "./jobs/reminder-cron-job.ts";

(async () => {
  await app.start();
  console.log("Slack app is running and connected to Firebase!");
})();
