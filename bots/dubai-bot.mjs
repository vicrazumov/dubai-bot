import TelegramBot from "../apis/telegram.mjs";
import { sendMessageAndGetAnswer, initializeOpenApi } from "../apis/openai-chat-completion.mjs";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { initializeTavily, search, SEARCH_INTERNET_TOOL_NAME, searchInternetTool } from "../ai-tools/tavily.mjs";
import { 
    initializeRecommendationEngine, 
    queryRecommendationEngine, 
    QUERY_RECOMMENDATION_ENGINE_TOOL_NAME, 
    queryRecommendationEngineTool 
} from "../ai-tools/recommendation-engine.mjs"
import Schedule, {
    CREATE_EVENT_TOOL_NAME,
    REMOVE_EVENT_TOOL_NAME,
    createEventTool,
    removeEventTool,
} from "../ai-tools/schedule.mjs"
import crypto from "crypto"

const 
    IS_GCLOUD = !!process.env.GCLOUD_PROJECT,
    SCHEDULE_DOC_ID = 'SCHEDULE',
    MODEL_INSTRUCTIONS = "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nНаша валюта: RUB.\n\n";

let isInitialized = false;
let webhookHandler;

export default async function initializeDubaiBot(logger) {
    if (isInitialized) {
        if (!webhookHandler) {
            logger.warn('[dubai-bot] incoming request, but bot not yet initialized')
        }

        return webhookHandler;
    } else {
        logger.info('[dubai-bot] initializing')
    }

    const firebaseApp = initializeApp();
    const db = getFirestore(firebaseApp);

    const schedule = new Schedule(logger);

    let 
        telegramBotKey,
        webhookDomain,
        stayWithUsTimeout,
        allowedUsers = [],
        sheetDbKey,
        tavilyKey,
        openAiKey,
        instructions = MODEL_INSTRUCTIONS,
        settingsCollection;

    if (!IS_GCLOUD) {
        telegramBotKey = process.env.DUBAI_BOT_TELEGRAM_KEY;
        webhookDomain = process.env.DUBAI_BOT_WEBHOOK_DOMAIN;
        sheetDbKey = process.env.SHEET_DB_KEY;
        tavilyKey = process.env.TAVILY_KEY;
        openAiKey = process.env.OPEN_AI_KEY;
        allowedUsers = process.env.DUBAI_BOT_ALLOWED_USERS.split(',')
        settingsCollection = process.env.DUBAI_BOT_SETTINGS_COLLECTION
        
        stayWithUsTimeout = process.env.TELEGRAM_STAY_WITH_US_TIMEOUT;        
    } else {    
        telegramBotKey = defineString("DUBAI_BOT_TELEGRAM_KEY").value();
        webhookDomain = defineString("DUBAI_BOT_WEBHOOK_DOMAIN").value();
        sheetDbKey = defineString("SHEET_DB_KEY").value();
        tavilyKey = defineString("TAVILY_KEY").value();
        openAiKey = defineString("OPEN_AI_KEY").value();
        stayWithUsTimeout = defineString("TELEGRAM_STAY_WITH_US_TIMEOUT").value();
        allowedUsers = defineString("DUBAI_BOT_ALLOWED_USERS").value().split(',')
        settingsCollection = defineString("DUBAI_BOT_SETTINGS_COLLECTION").value();
        
        try {
            const settingsFromDbRef = await db.collection(settingsCollection).get();
            settingsFromDbRef.docs.forEach(doc => { 
                switch (doc.id) {
                    case 'TELEGRAM_ALLOWED_USERS': allowedUsers = doc.data().value; break;
                    case 'MODEL_INSTRUCTIONS': instructions = doc.data().value; break;
                    case SCHEDULE_DOC_ID: schedule.restoreEvents(doc.data().value); break;
                }
            });
    
            logger.info("[dubai-bot] successfully read settings from the db");
        } catch (err) {
            logger.error("[dubai-bot] couldn't read settings from the db. will continue with default settings", err);
        }
        
    }    

    initializeOpenApi(openAiKey, logger);

    initializeRecommendationEngine(sheetDbKey, logger);

    initializeTavily(tavilyKey, logger);    

    const createEvent = async (event, context) => {
        const newEvent = { 
            ...event, 
            id: crypto.randomUUID(),
            createdBy: context.userId 
        };

        const scheduleRef = db.collection(settingsCollection).doc(SCHEDULE_DOC_ID);

        try {
            await scheduleRef.update({
                value: FieldValue.arrayUnion(newEvent)
            });
        } catch (err) {
            logger.error('[dubai-bot] Failed creating a new event in the db', err)
            throw err;
        }

        return schedule.createEvent(newEvent)
    }

    const removeEvent = async ({ id }) => {
        const event = schedule.getEvent(id);
        if (!event) {
            logger.warn(`[dubai-bot] Attempt removing the event ${id} that doesn't exist`)
            return []
        }

        const scheduleRef = db.collection(settingsCollection).doc(SCHEDULE_DOC_ID);

        try {
            await scheduleRef.update({
                value: FieldValue.arrayRemove(event)
            });
        } catch (err) {
            logger.error('[dubai-bot] Failed removing the event in the db', err)
            throw err;
        }

        return schedule.removeEvent(id)
    }
      
    const toolNamesToFunctionMap = {
        [SEARCH_INTERNET_TOOL_NAME]: search,
        [QUERY_RECOMMENDATION_ENGINE_TOOL_NAME]: queryRecommendationEngine,
        [CREATE_EVENT_TOOL_NAME]: createEvent,
        [REMOVE_EVENT_TOOL_NAME]: removeEvent
    }
    
    const tools = [
        searchInternetTool,
        queryRecommendationEngineTool,
        createEventTool,
        removeEventTool
    ];
    
    const bot = new TelegramBot({
        apiKey: telegramBotKey,
        name: "dubai-bot", 
        greeting: "Персональный помощник по нашей поездке. А также рекомендации по различным местам. Просто задайте вопрос!", 
        reactToMessage: (message, userId, thread) => sendMessageAndGetAnswer({
            gpt: {
                instructions: instructions + 'расписание: ' + JSON.stringify(schedule.getEvents()),
                tools,
                toolNamesToFunctionMap,
            },
            message,
            userId,
            thread
        }), 
        allowedUsers,
        logger,
        webhookDomain,
        stayWithUsTimeout,
        stayWithUsMessage: "Я все еще работаю над вашим запросом. Подождите, пожалуйста, еще.",
        onlyTextSupportedMessage: "Бот поддерживает только текст",
        errorMessage: "Произошла ошибка. Попробуйте отправить ваш запрос еще раз."
    });

    await bot.launch();

    isInitialized = true
    webhookHandler = bot.webhookHandler

    return webhookHandler;
}