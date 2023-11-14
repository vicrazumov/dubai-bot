import OpenAI from "openai";

let openai;

export function initializeOpenApi(apiKey,) {
    if (openai) {
        console.warn('open ai client already initiated')
        return ;
    }

    openai = new OpenAI({ apiKey });
}

export async function sendMessageAndGetAnswer(message) {
    const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            "role": "system",
            "content": "Это гид для поездки с семъей в Дубай с 16 по 25 февраля 2024 года.\n\nБилеты для родителей из России:\nDeparture from Yekaterinburg (Flight FZ 998) 16 February 2024, Friday 16:45 arrives 21:10 to Dubai International Airport Terminal 2\nDeparture from Dubai International Airport Terminal 2 (Flight FZ 997) 25 February 2024, Sunday 09:30 arrives 15:45 to Yekaterinburg\n\nБилеты для Ани, Вити и Льва из Нидерландов:\nDeparture from Amsterdam (Flights AF1441, AF0658) 16 February 2024, Friday 20:25 arrives 09:20 17 February 2024 to Dubai International Airport Terminal 1\nDeparture from Dubai International Airport Terminal 1 (Flights AF0659, AF1440) 25 February 2024, Sunday 11:10 arrives 19:35 to Amsterdam\n\nНаши апартаменты: Apartment 3203 Al Bateen Residence Towers JBR walk, Jumeirah Beach Residence, Dubai, United Arab Emirates. \nОписание: Stunning 5* 4BR-Oceanfront-Apartment is located in Dubai and provides accommodation with a private beach area and free WiFi, 1.9 km from The Walk at JBR and 3.2 km from Dubai Marina Mall.\nOffering two furnished balconies, all units are air conditioned and feature a dining area and a seating area with a cable flat-screen TV. There is also a kitchen in all apartments, equipped with a dishwasher and an oven.\nGuests can make use of the fitness centre. Guests can enjoy access to a private beach with a licensed beach bar. Guests have access to a large chilled 50m infinity pool and shaded children’s pool with lifeguard.\nСайт: https://www.booking.com/hotel/ae/stunning-5-4br-oceanfront-apartment.en-gb.html?label=gen173nr-1FCAEoggI46AdIM1gEaKkBiAEBmAEJuAEHyAEM2AEB6AEB-AENiAIBqAIDuAKipMmqBsACAdICJGQwNzI4ZDFjLTkyYmYtNGVjYy1hNGYxLWI2ZDk2MDhhNTJkYdgCBuACAQ&sid=b7d01c1beed282e86e8b4516ad085941&aid=304142 \n\nПрокат машины: у нас будет арендована 5-местная машина типа Toyota Corolla. При необходимости будем брать такси.\n\nКуда хочет пойти Лев:\nLegoland Dubai\nOliOli Dubai\nAir Maniax Dubai\nKidzania Dubai Mall\nFerrari World\n\nКуда хотят сходить Аня и Витя:\nLouvre Abu-Dhabi\nAura sky lounge\nMuseum of future\nFrame\nBurj Khalifa\nSki Dubai\nDune bashing\nAya\nOld Dubai \nUntold Festival\nOpera\nMiracle garden"
          },
          {
            "role": "user",
            "content": message
          }
        ],
        temperature: 1,
        max_tokens: 2665,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    return response?.choices[0]?.message.content
}

