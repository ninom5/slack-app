import cron from "node-cron";
import { app, db } from "../config.ts";

cron.schedule(
  "0 9 * * *",
  async () => {
    console.log("Provjera dnevnih podsjetnika...");

    const todayString = getTodayString();

    try {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        const todayReminderDoc = await db
          .collection("users")
          .doc(userId)
          .collection("reminders")
          .doc(todayString)
          .get();

        if (!todayReminderDoc.exists) continue;

        const reminderData = todayReminderDoc.data();
        const tasks = reminderData?.tasks || [];

        if (tasks.length === 0) continue;

        const slackUserId = userId.split("__")[0];
        const formattedTasks = tasks.map((t: string) => `\t• ${t}`).join("\n");

        await app.client.chat.postMessage({
          channel: slackUserId,
          text: `*Imate podsjetnike za danas (${todayString}):*\n${formattedTasks}`,
        });

        await todayReminderDoc.ref.delete();
      }
    } catch (error) {
      console.error("Greška u cron jobu:", error);
    }
  },
  {
    timezone: "Europe/Zagreb",
  },
);

const getTodayString = () => {
  const now = new Date();

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  return `${dd}.${mm}.${yyyy}`;
};
