const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { prompt, systemInstruction } = req.body;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction || ''
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};