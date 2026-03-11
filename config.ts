import { App } from "@slack/bolt";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

let serviceAccount;

if (process.env.NODE_ENV === "dev") {
  serviceAccount = JSON.parse(
    fs.readFileSync(new URL("./firebase-key.json", import.meta.url), "utf-8"),
  );
} else {
  if (!process.env.FIREBASE_CREDENTIALS) {
    throw new Error("FIREBASE_CREDENTIALS environment variable is not set");
  }

  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: Number(process.env.PORT) || 3000,
});
