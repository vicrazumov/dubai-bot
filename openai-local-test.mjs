import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";

dotenv.config();

const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const TAVILY_KEY = process.env.TAVILY_KEY;

initializeOpenApi(OPEN_AI_KEY, console, TAVILY_KEY);

const replies = await sendMessageAndGetAnswer("какие музыкальные фестивали идут сейчас в дубае");
console.log(replies)