import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";

dotenv.config();

const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const TAVILY_KEY = process.env.TAVILY_KEY;
const SHEET_DB_KEY = process.env.SHEET_DB_KEY;

initializeOpenApi(OPEN_AI_KEY, console, TAVILY_KEY, SHEET_DB_KEY);

const replies = await sendMessageAndGetAnswer("где поесть пельменей");
console.log(replies)