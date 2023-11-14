import dotenv from "dotenv";
import { initializeOpenApi, sendMessageAndGetAnswer } from "./openai-chat-completion.mjs";
import { initializeTelegramBot } from "./telegram.mjs";

dotenv.config();
const { OPEN_AI_KEY, TELEGRAM_KEY, TELEGRAM_ALLOWED_USERS } = process.env;

async function main() {
    await initializeOpenApi(OPEN_AI_KEY);

    initializeTelegramBot(TELEGRAM_KEY, 
        (ctx) => ctx.reply('Персональный помощник по нашей поездке. А также рекомендации по различным местам. Просто задайте вопрос!'),
        async (ctx) => {
            if (ctx.message.text === '/start') return ctx.reply('Персональный помощник по нашей логистике. А также рекомендации по различным местам. Просто задайте вопрос!');         
            const replies = await sendMessageAndGetAnswer(ctx.message.text);

            // console.log('replies received:' + replies.length)


            ctx.sendMessage(replies);
        },
        TELEGRAM_ALLOWED_USERS.split(',')
    );
}

main();