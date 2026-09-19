export default async function handler(req, res) {
  const BOT_TOKEN = "8862771334:AAHk2-gDl79DjBIg6br8hevhdpDejPR0ceI"; 

  if (req.method !== 'POST') {
    return res.status(200).send('Bot Serverless Endpoint is Running!');
  }

  // 1. የ Button ንክኪዎችን (Callback Queries) ማስተናገጃ
  if (req.body.callback_query) {
    const chatId = req.body.callback_query.message.chat.id;
    const data = req.body.callback_query.data;
    let text = "";

    if (data === "deposit") {
      text = "💳 **ገንዘብ ለመሙላት (Deposit)**\n\n1. በቴሌብር ወደ **0975267277** (mikael) ብር ያስገቡ።\n2. ክፍያው ሲጠናቀቅ ከቴሌብር የሚደርስዎትን **የትራንዛክሽን ቁጥር** (ምሳሌ: DII9TZNJE9) ኮፒ አድርገው እዚሁ ላይ ይጻፉልኝ።";
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    return res.status(200).send('OK');
  }

  // 2. መደበኛ የጽሁፍ መልእክቶችን ማስተናገጃ
  const { message } = req.body || {};
  if (!message || !message.chat || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const text = message.text;

  let replyText = "ያልታወቀ ትዕዛዝ ነው። እባክዎ መጫወት ከፈለጉ /start ይበሉ ወይም ከማውጫው ይምረጡ።";
  let replyMarkup = null;

  if (text.startsWith('/start') || text.startsWith('/playbingo')) {
    replyText = "🍀 Best of luck on your Bingo game adventure! 🎮";
    replyMarkup = {
      inline_keyboard: [
        [
          { text: "🎮 Play Bingo 10", web_app: { url: "https://efoy-bingo-1.vercel.app/" } },
          { text: "🎮 Play Bingo 20", web_app: { url: "https://efoy-bingo-1.vercel.app/" } }
        ],
        [
          { text: "🎮 Play Bingo 50", web_app: { url: "https://efoy-bingo-1.vercel.app/" } },
          { text: "🎮 Play Bingo 100", web_app: { url: "https://efoy-bingo-1.vercel.app/" } }
        ],
        [
          { text: "💳 ገንዘብ መሙያ (Deposit)", callback_data: "deposit" }
        ]
      ]
    };
  } else if (text.startsWith('/deposit')) {
     replyText = "💳 **ገንዘብ ለመሙላት (Deposit)**\n\n1. በቴሌብር ወደ **0975267277** (mikael) ብር ያስገቡ።\n2. ክፍያው ሲጠናቀቅ ከቴሌብር የሚደርስዎትን **የትራንዛክሽን ቁጥር** (ምሳሌ: DII9TZNJE9) ኮፒ አድርገው እዚሁ ላይ ይጻፉልኝ።";
  } 
  // ተጠቃሚው የትራንዛክሽን ቁጥር ከላከ (ከ 8 እስከ 12 ፊደል/ቁጥር የሆነ)
  else if (text.length >= 8 && text.length <= 12 && !text.includes('/')) {
     replyText = `✅ **የትራንዛክሽን ቁጥር ተቀብለናል!**\n\n**Reference:** \`${text}\`\n\nይህ ቁጥር ወደ አድሚን ተልኳል። ክፍያው እንደተረጋገጠ ኮይንዎ ወዲያውኑ ወደ አካውንትዎ ይገባል!\nመልካም እድል!`;
  }

  try {
    const bodyPayload = {
      chat_id: chatId,
      text: replyText,
      parse_mode: 'Markdown'
    };

    if (replyMarkup) {
      bodyPayload.reply_markup = replyMarkup;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }

  return res.status(200).json({ ok: true });
}