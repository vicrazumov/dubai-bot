import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";
import { initializeTelegramBot } from "./telegram.mjs";

import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore,  } from "firebase-admin/firestore";

initializeApp();

dotenv.config();
let OPEN_AI_KEY, TELEGRAM_KEY, TELEGRAM_ALLOWED_USERS, WEBHOOK_DOMAIN, TAVILY_KEY, SHEET_DB_KEY, TELEGRAM_STAY_WITH_US_TIMEOUT, MODEL_INSTRUCTIONS;
let botLogger;
let IS_GCLOUD = false;

if (!process.env['GCLOUD_PROJECT']) {
    OPEN_AI_KEY = process.env.OPEN_AI_KEY;
    TELEGRAM_KEY = process.env.TELEGRAM_KEY;
    TELEGRAM_ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS.split(',');
    WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
    TAVILY_KEY = process.env.TAVILY_KEY;
    SHEET_DB_KEY = process.env.SHEET_DB_KEY;
    TELEGRAM_STAY_WITH_US_TIMEOUT = process.env.TELEGRAM_STAY_WITH_US_TIMEOUT;        

    botLogger = console;
} else {    
    botLogger = logger;

    OPEN_AI_KEY = defineString("OPEN_AI_KEY").value();
    TELEGRAM_KEY = defineString("TELEGRAM_KEY").value();
    TELEGRAM_ALLOWED_USERS = defineString("TELEGRAM_ALLOWED_USERS").value().split(',');
    WEBHOOK_DOMAIN = defineString("WEBHOOK_DOMAIN").value();
    TAVILY_KEY = defineString("TAVILY_KEY").value();
    SHEET_DB_KEY = defineString("SHEET_DB_KEY").value();
    TELEGRAM_STAY_WITH_US_TIMEOUT = defineString("TELEGRAM_STAY_WITH_US_TIMEOUT").value();

    const SETTINGS_COLLECTION = defineString("SETTINGS_COLLECTION").value();
    IS_GCLOUD = true;
    
    try {
        const settingsFromDbRef = await getFirestore().collection(SETTINGS_COLLECTION).get();
        settingsFromDbRef.docs.forEach(doc => { 
            switch (doc.id) {
                case 'TELEGRAM_STAY_WITH_US_TIMEOUT': TELEGRAM_STAY_WITH_US_TIMEOUT = doc.data().value; break;
                case 'TELEGRAM_ALLOWED_USERS': TELEGRAM_ALLOWED_USERS = doc.data().value; break;
                case 'MODEL_INSTRUCTIONS': MODEL_INSTRUCTIONS = doc.data().value; break;
            }
        });

        botLogger.info("successdully read settings from the db.");
    } catch (err) {
        botLogger.error("couldn't read settings from the db. will continue with default settings");
    }
    
}

const greeting = 'Персональный помощник по нашей поездке. А также рекомендации по различным местам. Просто задайте вопрос!';


initializeOpenApi(OPEN_AI_KEY, botLogger, TAVILY_KEY, SHEET_DB_KEY, MODEL_INSTRUCTIONS);

const bot = initializeTelegramBot(TELEGRAM_KEY, 
    (ctx) => ctx.reply(greeting),
    async (ctx) => {
        if (ctx.message.text.length === 0) return ctx.reply("Бот поддерживает только текст");
        if (ctx.message.text === '/start') return ctx.reply(greeting);

        const userId = ctx.from.username || ctx.from.id.toString();

        await ctx.persistentChatAction('typing', async () => {
            try {
                const timer = setTimeout(() => ctx.reply('Я все еще работаю над вашим запросом. Подождите, пожалуйста, еще.'), TELEGRAM_STAY_WITH_US_TIMEOUT);

                const replies = await sendMessageAndGetAnswer(ctx.message.text, userId);
                clearTimeout(timer);

                try {
                    await ctx.sendMessage(replies, { parse_mode: 'Markdown' });
                } catch (err) {
                    botLogger.error(`sending markdown failed. sent as plain text`, replies)

                    ctx.sendMessage(replies);
                }
            } catch (err) {
                ctx.reply("Произошла ошибка. Попробуйте отправить ваш запрос еще раз.")
                botLogger.info("User informed about the error", err);
            }            
        });        
    },
    TELEGRAM_ALLOWED_USERS,
    botLogger,
    IS_GCLOUD,
);

let webhookHandler;
if (IS_GCLOUD) {
    webhookHandler = await bot.createWebhook({ domain: WEBHOOK_DOMAIN })
    botLogger.info('Telegram bot launched')

    process.once('SIGINT', () => botLogger.info('Function stopped SIGINT'))
    process.once('SIGTERM', () => botLogger.info('Function stopped SIGTERM'))
}

export const telegramBot = IS_GCLOUD ? onRequest(async (req, res) => {
    botLogger.info('Incoming message on webhook', req.body)

	return await webhookHandler(req, res)
}) : () => {};