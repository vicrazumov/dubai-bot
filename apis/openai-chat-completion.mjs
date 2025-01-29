import OpenAI from "openai";
import PromiseQueue from "../utils/promise-queue.mjs";

let openai;
let logger;

export function initializeOpenApi(apiKey, botLogger) {
    if (openai) {
        return ;
    }

    logger = botLogger;
    openai = new OpenAI({ apiKey });    
    
    logger.info('open ai client launched')
}

const processNewMessages = ({ model, thread, tools, toolNamesToFunctionMap, userId }) => async (newMessages) => {
  try {
    const { messages } = threads[thread];
    messages.push(...newMessages.map(content => ({
      role: "user",
      content
    })));

    const oaiCall = { model, messages }
    if (tools) oaiCall.tools = tools;

    const response = await openai.chat.completions.create(oaiCall);

    const responseMessage = response.choices[0].message;

    const toolCalls = responseMessage.tool_calls;
    if (toolCalls) {           
      logger.info(`[OAI ${thread}] ${toolCalls.length} tool calls received`, toolCalls)        

      messages.push(responseMessage);          

      const functionCalls = [];        

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = toolNamesToFunctionMap[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);

        functionCalls.push(functionToCall(functionArgs, { userId, thread }).catch(err => {            
          logger.warn(`[OAI ${thread}] Error in a function call. AI client will proceed regardless.`, err);
          
          return 'Error. The function call failed.';
        }));          
      }
      
      const functionResponses = await Promise.all(functionCalls);
      logger.info(`[OAI ${thread}] all ${functionResponses.length} functions resolved`, functionResponses)

      for (const [index, toolCall] of toolCalls.entries()) {
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify(functionResponses[index]),
        });
      }
      
      const secondResponse = await openai.chat.completions.create({
        model,
        messages,
      });         

      logger.info(`[OAI ${thread}] post-function response received`, secondResponse?.choices[0]?.message.content);

      messages.push(secondResponse.choices[0].message);

      return secondResponse.choices[0].message.content;
    } else {
      logger.info(`[OAI ${thread}] completion response received`, response?.choices[0]?.message.content);

      messages.push(response.choices[0].message);

      return response.choices[0].message.content
    }    
  } catch(err) {
    logger.error(`[OAI ${thread}]: open ai error`, err);
    throw err;
  }
}

const threads = {};

export async function sendMessageAndGetAnswer({ gpt: { 
  model = "gpt-4o-mini",
  instructions,
  tools,
  toolNamesToFunctionMap,
}, message, userId, thread }) {  
    if (!openai) {
      throw new Error('[OAI] client not initialized')
    }

    if (!message || !userId || !thread) {
      throw new Error('[OAI] call missing parameters')
    }
    
    let threadQueue;

    if (threads[thread]) {
      logger.info(`[OAI ${thread}] new message added to the thread`, message);
      threadQueue = threads[thread].queue;
    } else {
      logger.info(`[OAI ${thread}] new thread created for the message`, message);      

      const messages = instructions ? [
        {
          "role": "system",
          "content": instructions,
        }      
      ] : [];
      threadQueue = new PromiseQueue(processNewMessages({
        model,
        thread,
        toolNamesToFunctionMap,
        tools,
        userId,
      }), logger);

      threads[thread] = { 
        messages, 
        queue: threadQueue };
    }

    return threadQueue.add(message);
}

