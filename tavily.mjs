let TAVILY_KEY;
let botLogger;


export function initializeTavily(apiKey, logger) {
    TAVILY_KEY = apiKey;
    botLogger = logger;

    botLogger.info('search engine initialized')
}

export async function search({ query }) {
    if (!TAVILY_KEY) {
        botLogger.error('search engine not initialized')
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

        botLogger.info('search results received\n', response.answer, response.results)

        const results = response?.results?.map(r => r.content) || [];
        results.unshift(response.answer);

        return results;
    } catch (err) {
        botLogger.error('call to search engine failed', err)
        return [];
    }
}