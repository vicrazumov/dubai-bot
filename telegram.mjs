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

export function initializeTelegramBot(apiKey, onStart, onMessage, _allowedUsernames, botLogger, isWebhook) {
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
            onStart(ctx);
        }
    })    
    bot.on('message', ctx => {
        if (isUserAllowed(ctx)) {
            logger.info(`User ${ctx.from.username ?? ctx.from.id} sent a message`)
            onMessage(ctx);
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