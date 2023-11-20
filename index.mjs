import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import dotenv from "dotenv";
import initializeDubaiBot from "./bots/dubai-bot.mjs";

dotenv.config();

const IS_GCLOUD = !!process.env.GCLOUD_PROJECT;
const botLogger = IS_GCLOUD ? logger : console;

if (!IS_GCLOUD) {
  await initializeDubaiBot(botLogger)
}

process.once('SIGINT', () => botLogger.info('Function stopped SIGINT'))
process.once('SIGTERM', () => botLogger.info('Function stopped SIGTERM'))

export const telegramBot = onRequest(async (req, res) => {
  botLogger.info('dubai-bot: Incoming message on webhook')

  const dubaiBotWebhookHandler = await initializeDubaiBot(botLogger);  

  return await dubaiBotWebhookHandler(req, res)
})    

botLogger.info('Function started')