import OpenAI from "openai";

let openai;
let logger;

const threads = {};

export function initializeOpenApi(apiKey, botLogger) {
    if (openai) {
        return ;
    }

    logger = botLogger;
    openai = new OpenAI({ apiKey });    
    
    logger.info('open ai client launched')
}

export async function sendMessageAndGetAnswer({ gpt: { 
  model = "gpt-4-1106-preview",
  instructions,
  tools,
  toolNamesToFunctionMap,
}, message, thread }) {  
    if (!openai) {
      throw new Error('OpenAI Client not initialized')
    }
  
    let messages = instructions ? [
      {
        "role": "system",
        "content": instructions,
      }      
    ] : [];

    if (thread) {
      if (threads[thread]) {
        logger.info(`${thread} - new message in thread: ${message}`);
        messages = threads[thread];       
      } else {
        logger.info(`${thread} - new thread created for message: ${message}`);
        threads[thread] = messages;
      }
    } else {
      logger.info(`message sent w/o a thread: ${message}`);
    }

    const logPointer = thread ? `${thread}`: `msg ${message.slice(0, 10)}`;

    messages.push({
      "role": "user",
      "content": message
    })

    try {
      const response = await openai.chat.completions.create({
          model,
          messages,
          tools,        
      });

      const responseMessage = response.choices[0].message;

      const toolCalls = responseMessage.tool_calls;
      if (toolCalls) {           
        logger.info(`${logPointer} - ${toolCalls.length} tool calls received`, toolCalls)        

        messages.push(responseMessage);          

        const functionCalls = [];        

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionToCall = toolNamesToFunctionMap[functionName];
          const functionArgs = JSON.parse(toolCall.function.arguments);

          functionCalls.push(functionToCall(functionArgs).catch(err => {            
            logger.warn(`${logPointer} - Error in a function call. AI client will proceed regardless.`, err);
            return [];
          }));          
        }
        
        const functionResponses = await Promise.all(functionCalls);
        logger.info(`${logPointer} - all functions resolved`, functionResponses)

        for (const [index, toolCall] of toolCalls.entries()) {
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(functionResponses[index]),
          });
        }
        
        const secondResponse = await openai.chat.completions.create({
          model: model,
          messages: messages,
        });         

        logger.info(`${logPointer} - post-function response received`, secondResponse?.choices[0]?.message.content);

        messages.push(secondResponse.choices[0].message);

        return secondResponse.choices[0].message.content;
      } else {
        logger.info(`${logPointer} - completion response received`, response?.choices[0]?.message.content);

        messages.push(response.choices[0].message);

        return response.choices[0].message.content
      }    
    } catch(err) {
      logger.error('open ai error', err);
      throw err;
    }
}

