import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";
import { initializeTelegramBot } from "./telegram.mjs";

import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";

dotenv.config();
let OPEN_AI_KEY, TELEGRAM_KEY, TELEGRAM_ALLOWED_USERS;
let botLogger;
let IS_GCLOUD = false;

if (!process.env['GCLOUD_PROJECT']) {
    OPEN_AI_KEY = process.env.OPEN_AI_KEY;
    TELEGRAM_KEY = process.env.TELEGRAM_KEY;
    TELEGRAM_ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS;

    botLogger = console;
} else {    
    OPEN_AI_KEY = defineString("OPEN_AI_KEY").value();
    TELEGRAM_KEY = defineString("TELEGRAM_KEY").value();
    TELEGRAM_ALLOWED_USERS = defineString("TELEGRAM_ALLOWED_USERS").value();
    IS_GCLOUD = true;
    
    botLogger = logger;
}

const greeting = 'Персональный помощник по нашей поездке. А также рекомендации по различным местам. Просто задайте вопрос!';


initializeOpenApi(OPEN_AI_KEY, botLogger);

const bot = initializeTelegramBot(TELEGRAM_KEY, 
    (ctx) => ctx.reply(greeting),
    async (ctx) => {
        if (ctx.message.text.length === 0) return ctx.reply("Бот поддерживает только текст");
        if (ctx.message.text === '/start') return ctx.reply(greeting);

        const replies = await sendMessageAndGetAnswer(ctx.message.text);

        ctx.sendMessage(replies);
    },
    TELEGRAM_ALLOWED_USERS.split(','),
    botLogger,
    IS_GCLOUD
);

export const telegramBot = onRequest(async (req, res) => {
    botLogger.info(`Incoming message on webhook: ${req.body}`)

	return await bot.handleUpdate(req.body, res).then((rv) => {        
		// if it's not a request from the telegram, rv will be undefined, but we should respond with 200
        if (!rv) {
            botLogger.info('Not Telegram')
            return res.sendStatus(200)
        }
	})
})