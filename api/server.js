const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch');
const { Buffer } = require('buffer');

const app = express();
app.use(express.json());

const allowedOrigins = ['https://bengilmo1111-github-io.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main game endpoint for Cohere API
app.post('/api', async (req, res) => {
  const { input, history } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'History must be an array' });
  }

  const messages = [
    {
      role: 'system',
      content: "You are a classic text-based adventure game assistant. Outline scenarios and responses with humour and wit. The player progresses through rooms in a castle, haunted house, magic kingdom, prison, lair, or similar, each with unique descriptions, items, and occasional puzzles or riddles. Add funny side quests. To win, the player forms a company to defeat a final enemy."
    },
    ...history.map(entry => ({
      role: entry.role === 'user' ? 'user' : 'assistant',
      content: entry.content
    })),
    { role: 'user', content: input }
  ];

  const payload = {
    model: 'command-r-plus-08-2024',
    messages: messages,
    max_tokens: 800,
    temperature: 0.7,
    frequency_penalty: 0.5,
    safety_mode: 'CONTEXTUAL'
  };

  try {
    const cohereResponse = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await cohereResponse.json();

    if (!cohereResponse.ok || !responseData.message) {
      console.error('Cohere API error:', responseData);
      return res.status(cohereResponse.status).json({
        error: 'Cohere API error',
        details: responseData
      });
    }

    const responseText = responseData.message.content.trim();
    res.json({ response: responseText });

  } catch (error) {
    console.error('Error during Cohere API call:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Image generation endpoint with summarization for Hugging Face API
app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for image generation' });
  }

  try {
    // Summarize the prompt using Cohere for image generation
    const cohereSummaryResponse = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus-08-2024',
        messages: [
          { role: 'system', content: 'Summarize the following text concisely for use in image generation.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.5
      })
    });

    const cohereSummaryData = await cohereSummaryResponse.json();
    if (!cohereSummaryResponse.ok || !cohereSummaryData.message) {
      console.error("Cohere summarization error:", cohereSummaryData);
      return res.status(cohereSummaryResponse.status).json({
        error: 'Cohere summarization error',
        details: cohereSummaryData
      });
    }

    const summarizedPrompt = cohereSummaryData.message.content.trim();
    console.log("Summarized prompt for image generation:", summarizedPrompt);

    // Generate the image using the summarized prompt
    const hfResponse = await fetch(`https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3-medium-diffusers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: summarizedPrompt })
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('Hugging Face API error:', errorText);
      return res.status(hfResponse.status).json({
        error: 'Hugging Face API error',
        details: errorText
      });
    }

    const buffer = await hfResponse.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    res.json({ image: `data:image/png;base64,${base64Image}` });

  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

module.exports = app;