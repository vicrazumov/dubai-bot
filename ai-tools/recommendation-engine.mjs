let SHEET_DB_KEY;
let botLogger;

const enums = {
    cuisine: [
        'japanese',       'burgers',
        'indian',         'breakfast',
        'seafood',        'coffee',
        'mediterranean',  'tapas',
        'pasta',          'noodles',
        'asian',          'lebanese',
        'italian',        'arabic',
        'middle eastern', 'pizza',
        'ice cream',      'chinese',
        'persian',        'german',
        'french',         'turkish',
        'steak'
    ],
    tag: [
        'sports',      'theme park',
        'buffet',      'attractions',
        'brunch',      'alcohol',
        'kids',        'culture',
        'activities',  'live',
        'with a view', 'dining'
      ]
}

export function initializeRecommendationEngine(apiKey, logger) {
    SHEET_DB_KEY = apiKey;
    botLogger = logger;

    botLogger.info('[Recommendation engine] initialized')
}

export async function queryRecommendationEngine({ cuisine, tag = "dining", minrating = 4.0, address, limit = 5 }) {
    if (!SHEET_DB_KEY) {
        botLogger.error('[Recommendation engine] not initialized')
    }

    botLogger.info('[Recommendation engine] request received', { cuisine, tag, minrating, address, limit })

    let query = `&rate=>=${minrating*10}`;
    if (cuisine) {
        query += `&cuisines=*${cuisine}*`
    }    
    if (tag && enums.tag.indexOf(tag) !== -1) {
        query += `&tags=*${tag}*`
    }
    if (address) {
        query += `&address_term=*${address}*`
    }

    botLogger.info(`[Recommendation engine] searching`, query)      

    try {
        const results = await fetch(`https://sheetdb.io/api/v1/i5933ngo82tpx/search?sort_by=rate&sort_order=desc&limit=${limit}${query}`, {
            headers: { Authorization: `Bearer ${SHEET_DB_KEY}` }
        }).then(res => res.json())

        botLogger.info('[Recommendation engine] results received\n', results)        

        return results;
    } catch (err) {        
        botLogger.error('[Recommendation engine] call failed', err)
        throw err;
    }
}

export const QUERY_RECOMMENDATION_ENGINE_TOOL_NAME = 'get_deals_with_reviews';

export const queryRecommendationEngineTool = {
    type: "function",
    function: {
    name: QUERY_RECOMMENDATION_ENGINE_TOOL_NAME,
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
}