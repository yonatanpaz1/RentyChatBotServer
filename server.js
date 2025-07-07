const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config(); // 🟢 מייבא את המשתנים מה-.env

const app = express();
app.use(cors());
app.use(express.json());

// הגשת קבצי HTML וסטטיים מתיקיית public
app.use(express.static(path.join(__dirname, 'public')));

// שימוש במפתח מתוך משתני סביבה
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

let faqList = [];
try {
    const rawData = fs.readFileSync('./data/faq.json', 'utf8');
    faqList = JSON.parse(rawData);
} catch (e) {
    console.error("❌ שגיאה בטעינת קובץ FAQ:", e);
}

app.post("/chat", async (req, res) => {
    const message = req.body.message?.trim();
    if (!message) return res.status(400).json({ text: "שאלה ריקה." });

    const match = faqList.find(item =>
        item.question && (
            message.includes(item.question) ||
            item.question.includes(message) ||
            (item.keywords && item.keywords.some(k => message.includes(k)))
        )
    );

    if (match) {
        console.log("נמצא ב-FAQ:", match.question);
        return res.json({ text: match.answer });
    }

    console.log("⏩ לא נמצא ב-FAQ — שולח ל-OpenAI:", message);

    try {
        const chatResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "אתה עוזר וירטואלי של אתר להשכרת ציוד. ענה תשובות מועילות וברורות בעברית."
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        const botText = chatResponse.choices[0].message.content;
        return res.json({ text: botText });

    } catch (err) {
        console.error("שגיאה ב-OpenAI:", err);
        return res.status(500).json({ text: "מצטער, לא הצלחתי לקבל תשובה מהשרת." });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
