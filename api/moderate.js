const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });
  try {
    const response = await openai.moderations.create({ input: text });
    const flagged = response.results[0].flagged;
    res.status(200).json({ flagged });
  } catch (err) {
    console.error(err);
    res.status(200).json({ flagged: false });
  }
};
