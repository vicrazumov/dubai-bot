import { Telegraf } from "telegraf"
import uuid from '../utils/uuid.mjs';

export default class TelegramBot {
    _checkIsUserAllowedAndWarn = (ctx) => {
        if (this.allowedUsers.indexOf(ctx.from.username) === -1 && this.allowedUsers.indexOf(ctx.from.id.toString()) === -1) {
            this.logger.warn(`[Telegram ${this.name}] user ${ctx.from.username} (id ${ctx.from.id}) not allowed`);
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
            this.logger.error(`[Telegram ${this.name}] Error occurred`, err)

            return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err)
        })
    
        // initialize the commands
        this.bot.command('/start', ctx => {
            if (isUserAllowed(ctx)) {
                this.logger.info(`[Telegram ${this.name}] User ${ctx.from.username ?? ctx.from.id} connected`)
                ctx.reply(greeting);
            }
        })

        const timeoutsPerUser = {}
        const messagesPerUser = {}
        const stayWithUsTimeoutPerUser = {}

        this.bot.on('message', ctx => {
            const userId = ctx.from.username || ctx.from.id.toString();
    
            if (this._checkIsUserAllowedAndWarn(ctx)) {                
                if (ctx.message.text.length === 0) { 
                    this.logger.info(`[Telegram ${this.name}] user ${userId} sent unsupported message`)
                    return ctx.reply(onlyTextSupportedMessage);
                }
                if (ctx.message.text === '/start') {
                    this.logger.info(`[Telegram ${this.name}] user ${userId} joined the bot with /start`)
                    return ctx.reply(greeting);
                }

                this.logger.info(`[Telegram ${this.name}] user ${userId} sent a message`, ctx.message.text)
    
                const existingTimeout = timeoutsPerUser[userId]
                clearTimeout(existingTimeout)

                const messages = messagesPerUser[userId] || [];
                messages.push(ctx.message.text);
                messagesPerUser[userId] = messages;

                const thread = `${this.name}_${userId}`

                const newTimeout = setTimeout(async () => {
                    this.logger.info(`[Telegram ${this.name}] ${thread}: requesting reactions for ${messages.length} user messages`)                    
                    delete timeoutsPerUser[userId];
                    delete messagesPerUser[userId];

                    await ctx.persistentChatAction('typing', async () => {                        
                        try {            
                            const callUUID = uuid();

                            clearTimeout(stayWithUsTimeoutPerUser[userId])                            
                            stayWithUsTimeoutPerUser[userId] = setTimeout(() => {
                                ctx.reply(stayWithUsMessage);
                                this.logger.info(`[Telegram ${this.name}] ${thread} ${callUUID}: stayWithUs message sent`)
                            }, stayWithUsTimeout);
                            
                            this.logger.info(`[Telegram ${this.name}] ${thread} ${callUUID}: telegram calls reactToMessage ${messages.length} times`)

                            const reactionPromises = messages.map(msg => reactToMessage(msg, userId, thread));
                            const replies = await Promise.all(reactionPromises)

                            this.logger.info(`[Telegram ${this.name}] ${thread} ${callUUID}: telegram received ${replies.length} replies from reactToMessage`)

                            clearTimeout(stayWithUsTimeoutPerUser[userId]);
        
                            try {
                                const sendPromises = replies.filter(r => !!r).map(r => ctx.sendMessage(r, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id }))
                                await Promise.all(sendPromises);
                            } catch (err) {
                                this.logger.error(`[Telegram ${this.name}] ${thread}: sending markdown failed. sent as plain text`, replies)
        
                                ctx.sendMessage(replies);
                            }
                        } catch (err) {
                            ctx.reply(errorMessage)
                            this.logger.info(`[Telegram ${this.name}] ${thread}: User informed about the error`, err);
                        }            
                    }).catch(err => {
                        this.logger.warn(`[Telegram ${this.name}] ${thread}: persistentChatAction error`, err);
                    });                    
                }, 1000);

                timeoutsPerUser[userId] = newTimeout
            }
        })   
        
        this.logger.info(`[Telegram ${this.name}] bot created`)
    }

    async launch() {
        try {
            if (!this.webhookDomain) {
                await this.bot.launch()            
        
                process.once('SIGINT', () => this.bot.stop('SIGINT'))
                process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

                this.logger.info(`[Telegram ${this.name}] launched polling`)
            } else {
                this.webhookHandler = await this.bot.createWebhook({ domain: this.webhookDomain })            
                this.logger.info(`[Telegram ${this.name}] launched webhook on ${this.webhookDomain}`)
            }            
        } catch (err) {            
            this.logger.error(`[Telegram ${this.name}] failed to launch`)
            
            throw err
        }
    }
}