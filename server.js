const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

const app = express();

// Define allowed origins - remove trailing slash
const allowedOrigins = ['https://bengilmo1111-github-io.vercel.app'];

// Configure CORS
app.use(cors({
  origin: function(origin, callback) {
    // Check if origin is allowed or if it's undefined (like postman requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// API route
app.post('/api', async (req, res) => {
  const { input, history } = req.body;
  
  // Construct messages for GPT-4
  const messages = [
    { 
      role: 'system', 
      content: 'You are a text-based adventure game. Create immersive experiences for the player. The game should be funny and have jokes and puns like Hitchhikers guide to the Galaxy. If a player is stuck and asks for help you should offer it to them.' 
    },
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
