let TAVILY_KEY;
let botLogger;


export function initializeTavily(apiKey, logger) {
    TAVILY_KEY = apiKey;
    botLogger = logger;

    botLogger.info('[Search engine] initialized')
}

export async function search({ query }) {
    if (!TAVILY_KEY) {        
        botLogger.error('[Search engine] not initialized')
        
        throw new Error('Search engine not initialized')
    }

    botLogger.info(`searching query: ${query}`)

    const postData = JSON.stringify({
        "api_key": TAVILY_KEY,
        "query": query,
        "search_depth": "advanced",
        "include_answer": true,
        // "include_images": false,
        // "include_raw_content": false,
        // "max_results": 5,
        // "include_domains": [],
        // "exclude_domains": []
      }
    );   

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            body: postData,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }).then(res => res.json())

        botLogger.info('[Search engine] results received', response.answer, response.results)

        const results = response?.results?.map(r => r.content) || [];
        results.unshift(response.answer);

        return results;
    } catch (err) {
        botLogger.error('[Search engine] call failed', err)
        throw err;
    }
}

export const SEARCH_INTERNET_TOOL_NAME = "search_internet";

export const searchInternetTool = {
    type: "function",
    function: {
    name: SEARCH_INTERNET_TOOL_NAME,
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
}