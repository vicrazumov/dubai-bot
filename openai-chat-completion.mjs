import OpenAI from "openai";
import { initializeTavily, search } from "./tavily.mjs";
import { initializeRecommendationEngine, querySheetDb, enums } from "./recommendation-engine.mjs"

let openai;
let logger;

let modelInstructions = "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nНаша валюта: RUB.\n\n"

const threads = {

};

export function initializeOpenApi(apiKey, botLogger, tavilyKey, sheetDbKey, _modelInstructions) {
    if (openai) {
        logger.warn('open ai client already initiated')
        return ;
    }

    logger = botLogger;
    openai = new OpenAI({ apiKey });

    initializeTavily(tavilyKey, botLogger);

    initializeRecommendationEngine(sheetDbKey, botLogger);

    modelInstructions = _modelInstructions;
    
    logger.info('open ai client launched')
}

const functionNames = {
  searchInternet: 'search_internet',
  getDeals: 'get_deals_with_reviews',
}

const functions = {
  [functionNames.searchInternet]: search,
  [functionNames.getDeals]: querySheetDb,
}

const tools = [
  {
    type: "function",
    function: {
      name: functionNames.searchInternet,
      description: "Use this function to search internet for the newest information. Always use this when you are asked to look for something",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "User request formatted as a search query",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: functionNames.getDeals,
      description: "When asked about food recommendations, always use this function to get deals for the best rated restaurants, cafes and entertainment. Don't ask for clarifications, infer all the parameters from the user request. Also search internet in parallel.",
      parameters: {
        type: "object",
        properties: {
          cuisine: {
            type: "string",
            description: "Cuisine preference.",
            enum: enums.cuisine,
          },          
          tag: {
            type: "string",
            description: "Additional preference.",
            enum: enums.tag
          },
          minrating: {
            type: "number",
            description: "Minimal acceptable rating.",
          },
          address: {
            type: "string",
            description: "Address of the venue. If asked JBR or Dubai Marina, just use 'JBR'. If downtown or Burj khalifa, use 'downtown'. If mall of emirates, use 'mall of emirates'",
          },
          limit: {
            type: "integer",
            description: "Number of options returned. Use this when a user explicitly says how many options they want to see.",
          },
        },
      },
    },
  },
];

const chatCompletionSettings = {
  model: "gpt-4-1106-preview",  
}

export async function sendMessageAndGetAnswer(message, thread) {        
    let messages = [
      {
        "role": "system",
        "content": modelInstructions,
      }      
    ];

    if (thread) {
      if (threads[thread]) {
        logger.info(`new message in thread ${thread}: ${message}`);
        messages = threads[thread];       
      } else {
        logger.info(`new thread ${thread} created for message: ${message}`);
        threads[thread] = messages;
      }
    } else {
      logger.info(`message sent w/o a thread: ${message}`);
    }

    const logPointer = thread ? `thread ${thread}`: `msg ${message.slice(0, 10)}`;

    messages.push({
      "role": "user",
      "content": message
    })

    try {
      const response = await openai.chat.completions.create({
          model: chatCompletionSettings.model,
          messages,
          tools,        
      });

      const responseMessage = response.choices[0].message;

      const toolCalls = responseMessage.tool_calls;
      if (toolCalls) {           
        logger.info(`tool call received for ${logPointer}`); 
        if (toolCalls.length > 1) {
          logger.info(`${toolCalls.length} tool calls received for ${logPointer}`, toolCalls)
        }

        messages.push(responseMessage);          

        const functionCalls = [];        

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionToCall = functions[functionName];
          const functionArgs = JSON.parse(toolCall.function.arguments);

          functionCalls.push(functionToCall(functionArgs).catch(err => {            
            logger.warn("Error in a function call. AI client will proceed regardless.", err);
            return [];
          }));          
        }
        
        const functionResponses = await Promise.all(functionCalls);
        logger.info("Functions resolved", functionResponses)

        for (const [index, toolCall] of toolCalls.entries()) {
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(functionResponses[index]),
          });
        }
        
        const secondResponse = await openai.chat.completions.create({
          model: chatCompletionSettings.model,
          messages: messages,
        });         

        logger.info(`second response received for ${logPointer}`, secondResponse?.choices[0]?.message.content);

        messages.push(secondResponse.choices[0].message);

        return secondResponse.choices[0].message.content;
      } else {
        logger.info(`text response received for ${logPointer}`, response?.choices[0]?.message.content);

        messages.push(response.choices[0].message);

        return response.choices[0].message.content
      }    
    } catch(err) {
      logger.error('open ai error', err);
      throw err;
    }
}

