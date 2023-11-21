import { Telegraf } from "telegraf"

export default class TelegramBot {
    _checkIsUserAllowedAndWarn = (ctx) => {
        if (this.allowedUsers.indexOf(ctx.from.username) === -1 && this.allowedUsers.indexOf(ctx.from.id.toString()) === -1) {
            logger.warn(`user ${ctx.from.username} (id ${ctx.from.id}) not allowed`);
            ctx.reply('Your user is not whitelisted');
            return false;
        }
        return true;
    }
    
    constructor({
        name, 
        apiKey, 
        greeting, 
        reactToMessage, 
        allowedUsers, 
        logger, 
        webhookDomain, 
        stayWithUsTimeout,
        stayWithUsMessage = "I'm still working on your request. Please stay with me.",
        onlyTextSupportedMessage = "This bot supports text messages only.",
        errorMessage = "An error occurred. Try sending your message once again."
    }) {                
        this.bot = new Telegraf(apiKey)
        this.name = name;
        
        this.logger = logger;
        this.allowedUsernames = [];
        this.webhookDomain = webhookDomain;
    
        this.allowedUsers = allowedUsers;
    
        // error handling
        this.bot.catch((err, ctx) => {
            this.logger.error(`Telegram Error: ${err}`)
            return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err)
        })
    
        // initialize the commands
        this.bot.command('/start', ctx => {
            if (isUserAllowed(ctx)) {
                this.logger.info(`User ${ctx.from.username ?? ctx.from.id} connected`)
                ctx.reply(greeting);
            }
        })

        this.bot.on('message', async ctx => {
            const userId = ctx.from.username || ctx.from.id.toString();
    
            if (this._checkIsUserAllowedAndWarn(ctx)) {
                this.logger.info(`${this.name}: user ${userId} sent a message`)
                
                if (ctx.message.text.length === 0) return ctx.reply(onlyTextSupportedMessage);
                if (ctx.message.text === '/start') return ctx.reply(greeting);            
    
                await ctx.persistentChatAction('typing', async () => {
                    try {
                        // todo: throttle per user
                        const timer = setTimeout(() => ctx.reply(stayWithUsMessage), stayWithUsTimeout);
    
                        const replies = await reactToMessage(ctx.message.text, userId, `${this.name}_${userId}`);
                        clearTimeout(timer);
    
                        try {
                            await ctx.sendMessage(replies, { parse_mode: 'Markdown' });
                        } catch (err) {
                            this.logger.error(`sending markdown failed. sent as plain text`, replies)
    
                            ctx.sendMessage(replies);
                        }
                    } catch (err) {
                        ctx.reply(errorMessage)
                        this.logger.info("User informed about the error", err);
                    }            
                });  
            }
        })   
        
        this.logger.info(`Telegram bot ${this.name} created`)
    }

    async launch() {
        try {
            if (!this.webhookDomain) {
                await this.bot.launch()            
        
                process.once('SIGINT', () => this.bot.stop('SIGINT'))
                process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

                this.logger.info(`Telegram bot ${this.name} launched polling`)
            } else {
                this.webhookHandler = await this.bot.createWebhook({ domain: this.webhookDomain })            
                this.logger.info(`Telegram bot ${this.name} launched webhook on ${this.webhookDomain}`)
            }            
        } catch (err) {            
            this.logger.info(`Telegram bot ${this.name} failed to launch`)
            throw err
        }
    }
}