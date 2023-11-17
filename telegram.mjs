import { Telegraf } from "telegraf"

let bot;
const allowedUsernames = [];
let logger;

const isUserAllowed = (ctx) => {
    if (allowedUsernames.indexOf(ctx.from.username) === -1 && allowedUsernames.indexOf(ctx.from.id.toString()) === -1) {
        logger.warn(`user ${ctx.from.username} (id ${ctx.from.id}) not allowed`);
        ctx.reply('Your user is not whitelisted');
        return false;
    }
    return true;
}

export function initializeTelegramBot(apiKey, greeting, reactToMessage, _allowedUsernames, botLogger, isWebhook, stayWithUsTimeout) {
    if (bot) {
        logger.warn('Telegram bot already connected')
        return
    }
    
    bot = new Telegraf(apiKey)
    
    logger = botLogger;

    _allowedUsernames.forEach(u => allowedUsernames.push(u));

    // error handling
    bot.catch((err, ctx) => {
        logger.error(`Telegram Error: ${err}`)
        return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err)
    })

    // initialize the commands
    bot.command('/start', ctx => {
        if (isUserAllowed(ctx)) {
            logger.info(`User ${ctx.from.username ?? ctx.from.id} connected`)
            ctx.reply(greeting);
        }
    })    
    bot.on('message', async ctx => {
        const userId = ctx.from.username || ctx.from.id.toString();

        if (isUserAllowed(ctx)) {
            logger.info(`User ${userId} sent a message`)
            
            if (ctx.message.text.length === 0) return ctx.reply("Бот поддерживает только текст");
            if (ctx.message.text === '/start') return ctx.reply(greeting);            

            await ctx.persistentChatAction('typing', async () => {
                try {
                    const timer = setTimeout(() => ctx.reply('Я все еще работаю над вашим запросом. Подождите, пожалуйста, еще.'), stayWithUsTimeout);

                    const replies = await reactToMessage(ctx.message.text, userId);
                    clearTimeout(timer);

                    try {
                        await ctx.sendMessage(replies, { parse_mode: 'Markdown' });
                    } catch (err) {
                        logger.error(`sending markdown failed. sent as plain text`, replies)

                        ctx.sendMessage(replies);
                    }
                } catch (err) {
                    ctx.reply("Произошла ошибка. Попробуйте отправить ваш запрос еще раз.")
                    logger.info("User informed about the error", err);
                }            
            });  
        }
    })

    if (!isWebhook) {
        bot.launch()
        logger.info('Telegram bot launched')

        process.once('SIGINT', () => bot.stop('SIGINT'))
        process.once('SIGTERM', () => bot.stop('SIGTERM'))
    }            

    return bot;
}