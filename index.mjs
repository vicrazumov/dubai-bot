import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import dotenv from "dotenv";
import { initializeOpenApi } from "./apis/openai-chat-completion.mjs";
import initializeDubaiBot from "./bots/dubai-bot.mjs";

initializeApp();
dotenv.config();

let dubaiBotHandler;

async function main() {
  let OPEN_AI_KEY;
  let botLogger;
  const IS_GCLOUD = !!process.env.GCLOUD_PROJECT;

  if (!IS_GCLOUD) {
    botLogger = console;
    OPEN_AI_KEY = process.env.OPEN_AI_KEY; 
  } else {    
    botLogger = logger;
    OPEN_AI_KEY = defineString("OPEN_AI_KEY").value();       
  }

  initializeOpenApi(OPEN_AI_KEY, botLogger);
  const dubaiBotWebhookHandler = await initializeDubaiBot(logger);

  if (IS_GCLOUD) {        
    dubaiBotHandler = onRequest(async (req, res) => {
      botLogger.info('dubai-bot - Incoming message on webhook')
  
      return await dubaiBotWebhookHandler(req, res)
    })    
  }

  process.once('SIGINT', () => botLogger.info('Function stopped SIGINT'))
  process.once('SIGTERM', () => botLogger.info('Function stopped SIGTERM'))
}

await main()

export const telegramBot = dubaiBotHandler