import crypto from "crypto"

export default class Schedule {
    constructor(logger) {
        this.events = {};
        this.logger = logger;

        this.logger.info('[Schedule] initialized')
    }

    createEvent({ id, name, date, createdBy }) {
        if (!name || !date || !createdBy) {
            this.logger.error('[Schedule] Missing info when creating an event')

            throw new Error('Missing info when creating an event')
        }

        const _id = id ?? crypto.randomUUID();
        const event = {
            id: _id,
            name,
            date,
            createdBy
        }

        this.events[id] = event

        this.logger.info(`[Schedule] New event ${id} "${name.slice(0, 10)}..." created`)

        return event;
    }

    restoreEvents(events) {
        events.forEach(e => {
            this.events[e.id] = e;
        })

        this.logger.info(`[Schedule] ${events.length} events successfully restored`)
    }

    getEvents() {
        return Object.values(this.events)
    }

    getEvent(id) {
        return this.events[id]
    }

    removeEvent(id) {
        const event = this.events[id];
        if (!event) {
            this.logger.warn(`[Schedule] Event ${id} couldn't be removed as it doesn't exist`)
            return
        }

        delete this.events[id];

        this.logger.info(`[Schedule] Event ${id} "${event.name.slice(0, 10)}..." removed`)

        return id;
    }
}

export const CREATE_EVENT_TOOL_NAME = 'create_event';
export const REMOVE_EVENT_TOOL_NAME = 'remove_event';

export const createEventTool = {
    type: "function",
    function: {
        name: CREATE_EVENT_TOOL_NAME,
        description: "When asked to plan, schedule or create an event, always use this function. If error occured, report it to the user and ignore this call.",
        parameters: {
            type: "object",
            properties: {                          
                name: {
                    type: "string",
                    description: "Event name.",            
                },
                date: {
                    type: "string",
                    description: "Event date and time in ISO format.",
                },
            },
        },
        required: ["name", "date"],
    },
}

export const removeEventTool = {
    type: "function",
    function: {
        name: REMOVE_EVENT_TOOL_NAME,
        description: "When asked about removing an event, always use this function.",
        parameters: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Event id.",
                },                      
            }
        },
        required: ["id"],
    },
}