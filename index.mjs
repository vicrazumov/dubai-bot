import dotenv from "dotenv";
import { initializeOpenApi, createThread } from "./openai-client.mjs";
import { initializeTelegramBot } from "./telegram.mjs";

dotenv.config();
const { OPEN_AI_KEY, ASSISTANT_ID, POLLING_INTERVAL, TELEGRAM_KEY } = process.env;

async function main() {
    await initializeOpenApi(OPEN_AI_KEY, ASSISTANT_ID, POLLING_INTERVAL);

    initializeTelegramBot(TELEGRAM_KEY, 
        (ctx) => ctx.reply('Персональный помощник по нашей логистике. А также рекомендации по различным местам. Просто задайте вопрос!'),
        async (ctx) => {
            if (ctx.message.text === '/start') return ctx.reply('Персональный помощник по нашей логистике. А также рекомендации по различным местам. Просто задайте вопрос!');
            const thread = await createThread();            
            const replies = await thread.sendMessageAndGetAnswer(ctx.message.text);

            // console.log('replies received:' + replies.length)

            replies.forEach(r => {
                ctx.sendMessage(r)
            })
        }
    );
}

main();