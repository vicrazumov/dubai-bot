import dotenv from "dotenv";
import { initiate, createThread } from "./openai-client.mjs";

dotenv.config();
const { OPEN_AI_KEY, ASSISTANT_ID, POLLING_INTERVAL } = process.env;

async function main() {
    await initiate(OPEN_AI_KEY, ASSISTANT_ID, POLLING_INTERVAL);

    const thread = await createThread();

    await thread.sendMessageAndGetAnswer('куда собираетс лев?');

    await thread.sendMessageAndGetAnswer('а что еще есть в дубае для детей?');
}

main();