import OpenAI from "openai";

let openai;
let assistant;
let pollingInterval;

export async function initiate(apiKey, assistantId, _pollingInterval) {
    if (openai || assistant) {
        console.warn('open ai client already initiated')
        return ;
    }

    pollingInterval = _pollingInterval;

    openai = new OpenAI({ apiKey });
    assistant = await openai.beta.assistants.retrieve(assistantId);
}

export async function createThread() {
    const thread = await openai.beta.threads.create();

    async function sendMessageAndGetAnswer(content) {
        const message = await openai.beta.threads.messages.create(
            thread.id,
            {
              role: "user",
              content,
            }
        );
    
        const run = await openai.beta.threads.runs.create(
            thread.id,
            { 
              assistant_id: assistant.id,
            }
        );

        const checkRun = async () => {
            const runChecked = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );
    
            if (runChecked.status === 'queued' || runChecked.status === 'in_progress') {
                // console.log('...');
                await new Promise(reject => setTimeout(reject, pollingInterval));
                
                return checkRun();
            }
    
            // console.log('run finished ' + runChecked.status)
        }

        await checkRun();

        if (runChecked.status !== 'completed') {
            return [`ответ не получен по причине: ${runChecked.status}`]
        }

        const messages = await openai.beta.threads.messages.list(
            thread.id
        );
    
        return messages.data.map(m => {
            if (m.role === "assistant" && m.run_id === run.id) {
                return m.content[0].text.value
            }
        })
    }

    return ({
        thread,
        sendMessageAndGetAnswer,
    })
}

