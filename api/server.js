const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch');
const { Buffer } = require('buffer');

const app = express();
app.use(express.json());

const allowedOrigins = ['https://knock-knock-joke-game-ben-gilmores-projects.vercel.app'];

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

// Helper function to flatten the response content from Cohere
function flattenResponse(responseContent) {
  if (Array.isArray(responseContent)) {
    return responseContent.map(item => item.text || '').join(' ');
  }
  return responseContent || '';
}

// Main game endpoint for Cohere API
app.post('/api', async (req, res) => {
  const { input, history } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'History must be an array' });
  }

  const systemMessage = `
    ## Task and Context
    You are a conversational assistant in a knock-knock joke game, acting as the joke teller. Your primary role is to keep the traditional knock-knock joke format and engage the user in a lighthearted way. Respond naturally, as though you are hearing each joke for the first time, and help the user stay on track.

    ## Style Guide
    - Always start jokes with "Knock knock" and prompt the user to respond with any variation of "Who's there?"
    - If the user’s response isn’t exact, but close, continue to the next part of the joke, adapting to variations like "who's here" or "who's that."
    - After the user responds with "[setup word/phrase] who?", deliver the punchline in a playful, friendly tone.
    - Use concise, child-appropriate language and reactions with brief authentic responses, using emojis for extra fun.
    - Avoid breaking character or anticipating punchlines too early. Keep responses natural and allow jokes to unfold as though you’re telling them for the first time.
    - If the user replies off-track or doesn’t follow up correctly, gently guide them back with prompts like, "You're supposed to say 'Who's there?' 😉"
  `;

  const messages = [
    {
      role: 'system',
      content: systemMessage
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
    response_format: { "type": "text" },
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

    if (!cohereResponse.ok || !responseData.message || !responseData.message.content) {
      console.error('Cohere API error:', responseData);
      return res.status(cohereResponse.status).json({
        error: 'Cohere API error',
        details: responseData
      });
    }

    const responseText = flattenResponse(responseData.message.content);  // Flatten nested JSON content
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
    if (!cohereSummaryResponse.ok || !cohereSummaryData.message || !cohereSummaryData.message.content) {
      console.error("Cohere summarization error:", cohereSummaryData);
      return res.status(cohereSummaryResponse.status).json({
        error: 'Cohere summarization error',
        details: cohereSummaryData
      });
    }

    const summarizedPrompt = flattenResponse(cohereSummaryData.message.content);

    console.log("Summarized prompt for image generation:", summarizedPrompt);

    const response = await fetch(`https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3-medium-diffusers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true'
      },
      body: JSON.stringify({
        inputs: `${summarizedPrompt}, Generate in a kid friendly, comic style, vibrant colors`,
        parameters: {
          width: 256,
          height: 256,
          negative_prompt: "blurry, bad quality, ugly, realistic, photographic, scary, dark"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      return res.status(response.status).json({
        error: 'Hugging Face API error',
        details: errorText
      });
    }

    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    res.json({ image: `data:image/png;base64,${base64Image}` });

  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

module.exports = app;