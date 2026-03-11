import { app, db } from "../config.ts";
import admin from "firebase-admin";

app.command("/note", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;

  const noteContent = command.text.trim();
  if (noteContent.length === 0) {
    await say(
      "Molimo unesite sadržaj za bilješku. Upotreba: `/note naziv_projekta Ovdje unesite sadržaj svoje bilješke`",
    );
    return;
  }

  const [noteName, ...noteParts] = noteContent.split(" ");
  const noteText = noteParts.join(" ").trim();

  if (noteText.length === 0) {
    await say(
      "Molimo unesite sadržaj za bilješku. Upotreba: `/note naziv_projekta Ovdje unesite sadržaj svoje bilješke`",
    );
    return;
  }

  try {
    const projectRef = db
      .collection("users")
      .doc(user)
      .collection("projects")
      .doc(noteName);

    await projectRef.set(
      {
        notes: admin.firestore.FieldValue.arrayUnion(noteText),
      },
      { merge: true },
    );

    await say(
      `Datoteka uspješno spremljena u *${noteName}* sa sadržajem: *${noteText}*!`,
    );
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    await say("Pogreška prilikom spremanja datoteke");
  }
});

app.command("/read", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;

  const noteName = command.text.trim();

  if (noteName.length === 0) {
    await say(
      "Molimo unesite naziv projekta za čitanje. Upotreba: `/read naziv_projekta`",
    );
    return;
  }

  try {
    const doc = await db
      .collection("users")
      .doc(user)
      .collection("projects")
      .doc(noteName)
      .get();

    if (!doc.exists) {
      await say(`Nije pronađena datoteka s imenom: *${noteName}*`);
      return;
    }

    const projectData = doc.data();

    if (!projectData || !projectData.notes) {
      await say(`Datoteka *${noteName}* postoji, ali nema bilješki.`);
      return;
    }

    const notesArray = projectData.notes || [];

    const formattedNotes = notesArray
      .map((note: string) => `• ${note}`)
      .join("\n\t");

    await say(`*Bilješke za ${noteName}:*\n\t${formattedNotes}`);
  } catch (error) {
    console.error("Error reading from Firebase:", error);
    await say("Pogreška prilikom čitanja datoteke");
  }
});

app.command("/delete", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;

  const noteName = command.text.trim();

  if (noteName.length === 0) {
    await say(
      "Molimo unesite naziv projekta za brisanje. Upotreba: `/delete naziv_projekta`",
    );
    return;
  }

  try {
    const doc = await db
      .collection("users")
      .doc(user)
      .collection("projects")
      .doc(noteName)
      .get();

    if (!doc.exists) {
      await say(`Nije pronađena datoteka s imenom: *${noteName}*`);
      return;
    }

    const projectData = doc.data();

    const notesArray = projectData?.notes || [];

    await db
      .collection("users")
      .doc(user)
      .collection("projects")
      .doc(noteName)
      .delete();

    await say(
      `*Datoteka: ${noteName} uspješno obrisana!*\t\nSadržaj datoteke:\n\t${notesArray.join("\n\t")}`,
    );
  } catch (error) {
    console.error("Error deleting from Firebase:", error);
    await say("Pogreška prilikom brisanja datoteke");
  }
});

app.command("/list", async ({ command, ack, say }) => {
  await ack();

  const user = command.user_id + "__" + command.user_name;

  try {
    const snapshot = await db
      .collection("users")
      .doc(user)
      .collection("projects")
      .get();
    const projectNames = snapshot.docs.map((doc) => doc.id);

    if (projectNames.length === 0) {
      await say("Nema spremljenih datoteka.");
      return;
    }

    const formattedList = projectNames.map((name) => `• ${name}`).join("\n\t");

    await say(`*Spremljene datoteke:*\n\t${formattedList}`);
  } catch (error) {
    console.error("Error listing projects from Firebase:", error);
    await say("Pogreška prilikom dohvaćanja popisa datoteka");
  }
});

app.command("/clear", async ({ command, ack, say, client }) => {
  await ack();

  try {
    const result = await client.conversations.history({
      channel: command.channel_id,
      limit: 100,
    });

    const messages = result.messages || [];
    if (messages.length === 0) {
      await say("Nema poruka za brisanje.");
      return;
    }

    let deletedCount = 0;
    for (const message of messages) {
      await client.chat.delete({
        channel: command.channel_id,
        ts: message.ts ?? "",
      });

      deletedCount++;
    }

    await say(`Uspješno izbrisano ${deletedCount} poruka!`);
  } catch (error) {
    console.error("Error clearing conversation history:", error);
    await say("Pogreška prilikom brisanja razgovora");
  }
});
