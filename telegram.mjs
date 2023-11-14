import { Telegraf } from "telegraf"

let bot;
const allowedUsernames = [];
const isUserAllowed = (ctx) => {
    if (allowedUsernames.indexOf(ctx.from.username) === -1) {
        console.log(`user ${ctx.from.username} not allowed`);
        ctx.reply('Your user is not whitelisted');
        return false;
    }
    return true;
}

export function initializeTelegramBot(apiKey, onStart, onMessage, _allowedUsernames) {
    if (bot) {
        console.warn('Telegram bot already connected')
        return
    }

    bot = new Telegraf(apiKey)

    _allowedUsernames.forEach(u => allowedUsernames.push(u));

    // error handling
    bot.catch((err, ctx) => {
        console.log(`Telegram Error: ${err}`)
        return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err)
    })

    // initialize the commands
    bot.command('/start', ctx => {
        if (isUserAllowed(ctx)) {
            onStart(ctx);
        }
    })    
    bot.on('message', ctx => {
        if (isUserAllowed(ctx)) {
            onMessage(ctx);
        }
    })
    

    bot.launch()

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}