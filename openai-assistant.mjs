import OpenAI from "openai";

let openai;
let assistant;
let pollingInterval;

export async function initializeOpenApi(apiKey, assistantId, _pollingInterval) {
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
        console.log('sending a request to open ai: ' + content) 

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
                console.log('...');
                await new Promise(reject => setTimeout(reject, pollingInterval));
                
                return checkRun();
            }
    
            return runChecked.status;
            console.log('run finished ' + runChecked.status)
        }

        const result = await checkRun();

        if (result !== 'completed') {
            return [`ответ не получен по причине: ${result}`]
        }

        const messages = await openai.beta.threads.messages.list(
            thread.id
        );
    
        return messages.data
            .filter(m => m.role === "assistant" && m.run_id === run.id)
            .map(m => m.content[0].text.value)
            .reverse()     
    }

    return ({
        thread,
        sendMessageAndGetAnswer,
    })
}

