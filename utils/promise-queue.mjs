import uuid from './uuid.mjs';

const STATUSES = {
    IDLE: 'IDLE',
    PLANNED: 'PLANNED',
    WORKING: 'WORKING'
}

class PromiseQueue {
    constructor(processor, logger) {
        this.queue = [];
        this.logger = logger;
        this.processor = processor;
        this.status = STATUSES.IDLE;
        this.nextCallId = null;
    }

    add(item) {
        this.logger.info(`[Queue] Item added`, item);

        const queueItem = {
            item,
        }        

        const p = new Promise((resolve, reject) => {
            queueItem.resolve = resolve;
            queueItem.reject = reject;            
        })

        this.queue.push(queueItem);

        this.planWork();

        return p;
    }

    planWork() {
        if (this.status === STATUSES.IDLE) {
            this.nextCallId = uuid();
            this.logger.info(`[Queue ${this.nextCallId}] Work planned`);

            this.status = STATUSES.PLANNED;

            setTimeout(() => {
                this.work();
            })
        }
    }

    async work() {        
        const workingQueue = [...this.queue];
        this.queue = [];

        try {
            this.logger.info(`[Queue ${this.nextCallId}] Starting processing ${workingQueue.length} items. Queue locked.`)
            this.status = STATUSES.WORKING;
            
            const results = await this.processor(workingQueue.map(wq => wq.item));
            this.logger.info(`[Queue ${this.nextCallId}] Finished processing ${workingQueue.length} items.`)

            const lastItem = workingQueue.pop();
            lastItem.resolve(results);
            workingQueue.forEach(wq => wq.resolve());

            // if failed, retry with other items?
        } catch (err) {
            this.logger.error(`[Queue ${this.nextCallId}] Error occurred while processing ${workingQueue.length} items. The error is propagated to all callers.`, err)
            workingQueue.forEach(wq => wq.reject(err));
        } finally {            
            this.status = STATUSES.IDLE;
            const currentCallId = this.nextCallId;
            this.nextCallId = null;            

            if (this.queue.length) {
                this.logger.info(`[Queue ${currentCallId}] ${this.queue.length} more items in the queue. Planning another cycle.`)
                this.planWork();
            } else {
                this.logger.info(`[Queue ${currentCallId}] Queue unlocked.`)
            }            
        }        
    }
}

export default PromiseQueue