import { Telegraf } from "telegraf"

let bot;

export function initializeTelegramBot(apiKey, onStart, onMessage) {
    if (bot) {
        console.warn('Telegram bot already connected')
        return
    }

    bot = new Telegraf(apiKey)

    // error handling
    bot.catch((err, ctx) => {
        console.log(`Telegram Error: ${err}`)
        return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err)
    })

    // initialize the commands
    bot.command('/start', onStart)    
    bot.on('message', onMessage)

    bot.launch()

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}