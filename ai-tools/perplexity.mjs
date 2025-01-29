let PERPLEXITY_KEY;
let botLogger;

export function initializePerplexity(apiKey, logger) {
    PERPLEXITY_KEY = apiKey;
    botLogger = logger;

    botLogger.info('[Perplexity Search] initialized')
}

export async function search({ query }) {
    if (!PERPLEXITY_KEY) {        
        botLogger.error('[Perplexity Search] not initialized')
        throw new Error('Perplexity Search not initialized')
    }

    botLogger.info(`searching query: ${query}`)

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            body: JSON.stringify({
                model: "sonar-pro",
                messages: [
                    { "role": "system", "content": "search for answers related to Dubai only. be precise and concise." },
                    { "role": "user", "content": query }
                ],
                max_tokens: 1000
            }),
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PERPLEXITY_KEY}`
            }
        }).then(res => res.json())

        botLogger.info('[Perplexity Search] results received', response)

        // Extract and format results
        const results = response?.choices?.map(choice => choice.message.content) || [];

        return results;
    } catch (err) {
        botLogger.error('[Perplexity Search] call failed', err)
        throw err;
    }
}

export const PERPLEXITY_SEARCH_TOOL_NAME = "perplexity_search";

export const perplexitySearchTool = {
    type: "function",
    function: {
        name: PERPLEXITY_SEARCH_TOOL_NAME,
        description: "Use this function to search internet using Perplexity AI for the newest information. This provides high-quality, AI-enhanced search results.",
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