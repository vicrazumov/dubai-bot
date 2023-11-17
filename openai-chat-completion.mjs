import OpenAI from "openai";
import { initializeTavily, search } from "./tavily.mjs";
import { initializeRecommendationEngine, querySheetDb, enums } from "./recommendation-engine.mjs"

let openai;
let logger;

const threads = {

};

export function initializeOpenApi(apiKey, botLogger, tavilyKey, sheetDbKey) {
    if (openai) {
        logger.warn('open ai client already initiated')
        return ;
    }

    logger = botLogger;
    openai = new OpenAI({ apiKey });

    initializeTavily(tavilyKey, botLogger);

    initializeRecommendationEngine(sheetDbKey, botLogger);
    
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
      description: "Use this function to search internet for the newest information.",
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
            description: "Address of the venue.",
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
        "content": "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nНаша валюта: RUB.\n\nБилеты для родителей из России:\nDeparture from Yekaterinburg (Flight FZ 998) 16 February 2024, Friday 16:45 arrives 21:10 to Dubai International Airport Terminal 2\nDeparture from Dubai International Airport Terminal 2 (Flight FZ 997) 25 February 2024, Sunday 09:30 arrives 15:45 to Yekaterinburg\n\nБилеты для Ани, Вити и Льва из Нидерландов:\nDeparture from Amsterdam (Flights AF1441, AF0658) 16 February 2024, Friday 20:25 arrives 09:20 17 February 2024 to Dubai International Airport Terminal 1\nDeparture from Dubai International Airport Terminal 1 (Flights AF0659, AF1440) 25 February 2024, Sunday 11:10 arrives 19:35 to Amsterdam\n\nНаши апартаменты: Apartment 3203 Al Bateen Residence Towers JBR walk, Jumeirah Beach Residence, Dubai, United Arab Emirates. \nОписание: Stunning 5* 4BR-Oceanfront-Apartment is located in Dubai and provides accommodation with a private beach area and free WiFi, 1.9 km from The Walk at JBR and 3.2 km from Dubai Marina Mall.\nOffering two furnished balconies, all units are air conditioned and feature a dining area and a seating area with a cable flat-screen TV. There is also a kitchen in all apartments, equipped with a dishwasher and an oven.\nGuests can make use of the fitness centre. Guests can enjoy access to a private beach with a licensed beach bar. Guests have access to a large chilled 50m infinity pool and shaded children’s pool with lifeguard.\nСайт: https://www.booking.com/hotel/ae/stunning-5-4br-oceanfront-apartment.en-gb.html?label=gen173nr-1FCAEoggI46AdIM1gEaKkBiAEBmAEJuAEHyAEM2AEB6AEB-AENiAIBqAIDuAKipMmqBsACAdICJGQwNzI4ZDFjLTkyYmYtNGVjYy1hNGYxLWI2ZDk2MDhhNTJkYdgCBuACAQ&sid=b7d01c1beed282e86e8b4516ad085941&aid=304142 \n\nПрокат машины: у нас будет арендована 5-местная машина типа Toyota Corolla. При необходимости будем брать такси.\n\nКуда хочет пойти Лев:\nLegoland Dubai\nOliOli Dubai\nAir Maniax Dubai\nKidzania Dubai Mall\nFerrari World\n\nКуда хотят сходить Аня и Витя:\nLouvre Abu-Dhabi\nAura sky lounge\nMuseum of future\nFrame\nBurj Khalifa\nSki Dubai\nDune bashing\nAya\nOld Dubai \nUntold Festival\nOpera\nMiracle garden\nCloud 22\nCrocodile farm"
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

