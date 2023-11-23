import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";
import { initializeTavily, search, SEARCH_INTERNET_TOOL_NAME, searchInternetTool } from "../ai-tools/tavily.mjs";
import { 
    initializeRecommendationEngine, 
    queryRecommendationEngine, 
    QUERY_RECOMMENDATION_ENGINE_TOOL_NAME, 
    queryRecommendationEngineTool 
} from "../ai-tools/recommendation-engine.mjs"

dotenv.config();

const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
// const TAVILY_KEY = process.env.TAVILY_KEY;
// const SHEET_DB_KEY = process.env.SHEET_DB_KEY;

initializeOpenApi(OPEN_AI_KEY, console);

// initializeRecommendationEngine(SHEET_DB_KEY, console);

// initializeTavily(TAVILY_KEY, console);    

const test = async (message, userId) => {
    const reply = await sendMessageAndGetAnswer({
        gpt: {
            instructions: "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nНаша валюта: RUB.\n\n",
        },
        message,
        userId,
        thread: userId
    })

    console.log({message, reply})
}

// test("куда пойти со Львом", "user1");
// await test("расскажи про первое место подробнее?", "user1");
setTimeout(() => test("дай сайт", "user1"), 500)
await test("куда пойти со Львом", "user1");
