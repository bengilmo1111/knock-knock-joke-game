require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api', async (req, res) => {
  const { input, history } = req.body;

  // Construct messages for GPT-4
  const messages = [
    { role: 'system', content: 'You are a text-based adventure game. Create immersive experiences for the player. The game should be funny and have jokes and puns like Hitchhikers guide to the Galaxy. If a player is stuck and asks for help you should offer it to them.' },
    ...history,
    { role: 'user', content: input },
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 150,
    });
    const response = completion.data.choices[0].message.content.trim();
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
