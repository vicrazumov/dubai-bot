let SHEET_DB_KEY;
let botLogger;

export const enums = {
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

    botLogger.info('recommendation engine initialized')
}

export async function querySheetDb({ cuisine, tag = "dining", minrating = 4.0, address, limit = 5 }) {
    if (!SHEET_DB_KEY) {
        botLogger.error('recommendation engine not initialized')
    }

    botLogger.info('recommendations request received', { cuisine, tag, minrating, address, limit })

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

    botLogger.info(`searching in recommendations: ${query}`)      

    try {
        const results = await fetch(`https://sheetdb.io/api/v1/i5933ngo82tpx/search?sort_by=rate&sort_order=desc&limit=${limit}${query}`, {
            headers: { Authorization: `Bearer ${SHEET_DB_KEY}` }
        }).then(res => res.json())

        botLogger.info('recommendation search results received\n', results)        

        return results;
    } catch (err) {
        botLogger.error('call to recommendation engine failed', err)
        return [];
    }
}