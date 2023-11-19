import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";

dotenv.config();

const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const TAVILY_KEY = process.env.TAVILY_KEY;
const SHEET_DB_KEY = process.env.SHEET_DB_KEY;

initializeOpenApi(OPEN_AI_KEY, console, TAVILY_KEY, SHEET_DB_KEY);

await sendMessageAndGetAnswer("куда пойти со Львом", "user1");
await sendMessageAndGetAnswer("расскажи про первое место подробнее?", "user1");
await sendMessageAndGetAnswer("дай сайт", "user1");
await sendMessageAndGetAnswer("этот не работает. найди другой", "user1");
