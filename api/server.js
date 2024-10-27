const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Allowed origins
const allowedOrigins = ['https://bengilmo1111-github-io.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin); // Debugging line
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main game endpoint for Cohere API
app.post('/api', async (req, res) => {
  try {
    const { input, history } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'History must be an array' });
    }

    // Format messages for Cohere's chat endpoint
    const messages = [
      {
        role: 'system',
        content: "You are a text-based adventure game assistant. Respond concisely with humor and wit. The game should be lord of the rings or hobbit style, but funny and full of British humour like the hitchhikers guide to the galaxy. The user should be able to win the game if they complete 7 riddles, find the 3 magic swords, and defeat Sauron. There should also be funny side quests. If the user wins they should be rewarded with an epic poem and then asked if they want to play again. Each response should be short, about what a normal human says in a conversation turn."
      },
      ...history.map((entry) => ({
        role: entry.role === 'user' ? 'user' : 'assistant',
        content: entry.content
      })),
      { role: 'user', content: input }
    ];

    // Prepare payload for Cohere API
    const payload = {
      model: 'command-r-plus-08-2024',
      messages: messages,
      max_tokens: 150,
      temperature: 0.8,
      frequency_penalty: 0.5
    };

    // Call Cohere API
    const cohereResponse = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await cohereResponse.json();

    if (!cohereResponse.ok) {
      console.error('Cohere API error:', responseData);
      return res.status(cohereResponse.status).json({
        error: 'Cohere API error',
        details: responseData
      });
    }

    // Extract the assistant's response
    const responseText = responseData.message.content[0].text;

    // Send the text response from Cohere back to the client
    res.json({ response: responseText });

  } catch (error) {
    console.error('Error during Cohere API call:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Image generation endpoint for Hugging Face API
app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for image generation' });
  }

  try {
    console.log("Generating image with prompt:", prompt); // Debugging line

    // Call Hugging Face API for Stable Diffusion
    const response = await fetch(`https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1-base`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const imageResponse = await response.json();

    if (!response.ok) {
      console.error('Hugging Face API error:', imageResponse);
      return res.status(response.status).json({
        error: 'Hugging Face API error',
        details: imageResponse
      });
    }

    // The response should include the image data in base64 format
    const imageBase64 = imageResponse[0]?.data; // Ensure correct response structure

    if (!imageBase64) {
      console.error('No image data returned from Hugging Face');
      return res.status(500).json({ error: "Image generation failed: no data returned" });
    }

    // Send back the base64 image
    res.json({ image: `data:image/png;base64,${imageBase64}` });

  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// Export for Vercel
module.exports = app;