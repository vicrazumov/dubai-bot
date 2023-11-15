import { Telegraf } from "telegraf"

let bot;
const allowedUsernames = [];
let logger;

const isUserAllowed = (ctx) => {
    if (allowedUsernames.indexOf(ctx.from.username) === -1) {
        logger.warn(`user ${ctx.from.username} not allowed`);
        ctx.reply('Your user is not whitelisted');
        return false;
    }
    return true;
}

export function initializeTelegramBot(apiKey, onStart, onMessage, _allowedUsernames, botLogger, isWebhook) {
    if (bot) {
        logger.warn('Telegram bot already connected')
        return
    }

    if (isWebhook) {
        bot = new Telegraf(apiKey, {
            telegram: { webhookReply: true },
        })    
    } else {
        bot = new Telegraf(apiKey)
    }
    
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
            onStart(ctx);
        }
    })    
    bot.on('message', ctx => {
        if (isUserAllowed(ctx)) {
            logger.info(`User ${ctx.from.username ?? ctx.from.id} sent a message`)
            onMessage(ctx);
        }
    })

    bot.launch()
    logger.info('Telegram bot launched')

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    return bot;
}