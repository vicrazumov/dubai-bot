import Bot from "../apis/telegram.mjs";
import { sendMessageAndGetAnswer } from "../apis/openai-chat-completion.mjs";
import { getFirestore } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { initializeTavily, search, SEARCH_INTERNET_TOOL_NAME, searchInternetTool } from "../ai-tools/tavily.mjs";
import { initializeRecommendationEngine, queryRecommendationEngine, QUERY_RECOMMENDATION_ENGINE_TOOL_NAME, queryRecommendationEngineTool } from "../ai-tools/recommendation-engine.mjs"

const 
    IS_GCLOUD = !!process.env.GCLOUD_PROJECT,
    TELEGRAM_ALLOWED_USERS = ["annie_razumova","rrzmv","5145169130","6973528294"],     
    MODEL_INSTRUCTIONS = "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nНаша валюта: RUB.\n\n";

export default async function initializeDubaiBot(logger) {
    let 
        telegramBotKey,
        webhookDomain,
        stayWithUsTimeout,
        allowedUsers = TELEGRAM_ALLOWED_USERS,
        sheetDbKey,
        tavilyKey,
        instructions = MODEL_INSTRUCTIONS;

    if (!IS_GCLOUD) {
        telegramBotKey = process.env.DUBAI_BOT_TELEGRAM_KEY;
        webhookDomain = process.env.DUBAI_BOT_WEBHOOK_DOMAIN;
        sheetDbKey = process.env.SHEET_DB_KEY;
        tavilyKey = process.env.TAVILY_KEY;
        
        stayWithUsTimeout = process.env.TELEGRAM_STAY_WITH_US_TIMEOUT;        
    } else {    
        telegramBotKey = defineString("DUBAI_BOT_TELEGRAM_KEY").value();
        webhookDomain = defineString("DUBAI_BOT_WEBHOOK_DOMAIN").value();
        sheetDbKey = defineString("SHEET_DB_KEY").value();
        tavilyKey = defineString("TAVILY_KEY").value();
        stayWithUsTimeout = defineString("TELEGRAM_STAY_WITH_US_TIMEOUT").value();
        const SETTINGS_COLLECTION = defineString("DUBAI_BOT_SETTINGS_COLLECTION").value();
        
        try {
            const settingsFromDbRef = await getFirestore().collection(SETTINGS_COLLECTION).get();
            settingsFromDbRef.docs.forEach(doc => { 
                switch (doc.id) {
                    case 'TELEGRAM_ALLOWED_USERS': allowedUsers = doc.data().value; break;
                    case 'MODEL_INSTRUCTIONS': instructions = doc.data().value; break;
                }
            });
    
            logger.info("dubai-bot - successfully read settings from the db");
        } catch (err) {
            logger.error("dubai-bot - couldn't read settings from the db. will continue with default settings");
        }
        
    }

    initializeRecommendationEngine(sheetDbKey, logger);

    initializeTavily(tavilyKey, logger);
      
    const toolNamesToFunctionMap = {
        [SEARCH_INTERNET_TOOL_NAME]: search,
        [QUERY_RECOMMENDATION_ENGINE_TOOL_NAME]: queryRecommendationEngine,
    }
    
    const tools = [
        searchInternetTool,
        queryRecommendationEngineTool,
    ];
    
    const bot = new Bot({
        apiKey: telegramBotKey,
        name: "dubai-bot", 
        greeting: "Персональный помощник по нашей поездке. А также рекомендации по различным местам. Просто задайте вопрос!", 
        reactToMessage: (message, thread) => sendMessageAndGetAnswer({
            gpt: {
                instructions,
                tools,
                toolNamesToFunctionMap,
            },
            message,
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

    return bot.webhookHandler;
}