import { app, db } from "../config.ts";
import admin from "firebase-admin";

const dateRegex = /^\d{2}\.\d{2}\.\d{4}\.?$/;

app.command("/reminder", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;
  const rawText = command.text.trim();

  if (rawText.length === 0) {
    await say(
      "Molimo unesite podsjetnik. Upotreba: `/reminder DD.MM.YYYY tekst podsjetnika`",
    );
    return;
  }

  const [dateString, ...reminderParts] = rawText.split(" ");
  const reminderText = reminderParts.join(" ").trim();

  if (!dateRegex.test(dateString)) {
    await say("Neispravan format datuma. Molimo koristite format *DD.MM.YYYY*");
    return;
  }

  const cleanDateString = dateString.endsWith(".")
    ? dateString.slice(0, -1)
    : dateString;

  if (reminderText.length === 0) {
    await say("Nedostaje tekst podsjetnika");
    return;
  }

  try {
    const reminderRef = db
      .collection("users")
      .doc(user)
      .collection("reminders")
      .doc(cleanDateString);

    await reminderRef.set(
      { tasks: admin.firestore.FieldValue.arrayUnion(reminderText) },
      { merge: true },
    );

    await say(
      `Podsjetnik uspješno spremljen za *${cleanDateString}*: *${reminderText}*!`,
    );
  } catch (error) {
    console.error("Error saving reminder to Firebase:", error);
    await say("Pogreška prilikom spremanja podsjetnika.");
  }
});

app.command("/reminder-by-hour", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;
  const rawText = command.text.trim();

  const regex = /^(\d{2}\.\d{2}\.\d{4}\.?)\s*\[(.*?)\]\s*(.*)$/;

  const match = rawText.match(regex);

  if (!match) {
    await say(
      "Neispravan format. Koristite: `/reminder-by-hour DD.MM.YYYY [HH:mm, HH:mm] tekst`.",
    );

    return;
  }

  let [_, dateString, timesString, reminderText] = match;

  const cleanDateString = dateString.endsWith(".")
    ? dateString.slice(0, -1)
    : dateString;

  const times = timesString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t));

  if (times.length === 0 || !reminderText) {
    await say(
      "Morate unijeti barem jedno ispravno vrijeme (HH:mm) i tekst podsjetnika.",
    );
    return;
  }

  try {
    const reminderRef = db
      .collection("users")
      .doc(user)
      .collection("reminders")
      .doc(cleanDateString);

    const newEntries = times.map((time) => ({
      time,
      text: reminderText,
      sent: false,
    }));

    await reminderRef.set(
      { scheduled_tasks: admin.firestore.FieldValue.arrayUnion(...newEntries) },
      { merge: true },
    );

    await say(
      `Podsjetnik spremljen za *${cleanDateString}* u terminima: *${times.join(", ")}*`,
    );
  } catch (error) {
    console.error("Greška pri spremanju:", error);
    await say("Pogreška prilikom spremanja u bazu.");
  }
});

app.command("/list-reminders", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;

  try {
    const remindersSnapshot = await db
      .collection("users")
      .doc(user)
      .collection("reminders")
      .get();

    if (remindersSnapshot.empty) {
      await say("Nemate spremljenih podsjetnika.");
      return;
    }

    let response = "*Vaši nadolazeći podsjetnici:*\n";

    remindersSnapshot.forEach((doc) => {
      const reminderData = doc.data();
      const tasks = reminderData.tasks || [];

      response += `\n *${doc.id}*:\n`;
      tasks.forEach((task: string) => {
        response += `\t• ${task}\n`;
      });
    });

    await say(response);
  } catch (error) {
    console.error("Error listing reminders from Firebase:", error);
    await say("Pogreška prilikom dohvaćanja popisa podsjetnika");
  }
});
