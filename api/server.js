// api/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

// Update allowed origins to include your new domain
const allowedOrigins = [
  'https://bengilmo1111-github-io.vercel.app',
  'https://bengilmo1111-github-f0ldym4tc-ben-gilmores-projects.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    console.log('Request origin:', origin); // Debug log
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Create handler for Vercel
const handler = async (req, res) => {
  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(req.headers.origin) ? req.headers.origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Enable CORS for all requests
  await new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

// OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Create handler for Vercel
const handler = async (req, res) => {
  // Enable CORS
  await new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Main game endpoint
  if (req.method === 'POST' && req.url === '/api') {
    try {
      const { input, history } = req.body;

      // Validate input
      if (!input) {
        return res.status(400).json({ error: 'Input is required' });
      }

      if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'History must be an array' });
      }

      // Verify OpenAI configuration
      if (!configuration.apiKey) {
        console.error('OpenAI API key not configured');
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are a text-based adventure game. Create immersive experiences for the player. The game should be funny and have jokes and puns like Hitchhiker\'s Guide to the Galaxy. If a player is stuck and asks for help you should offer it to them.' 
          },
          ...history,
          { role: 'user', content: input },
        ],
        max_tokens: 150,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      const response = completion.data.choices[0].message.content.trim();
      console.log('OpenAI response:', response);

      return res.json({ response });
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'OpenAI API error',
          details: error.response.data
        });
      }

      return res.status(500).json({
        error: 'An error occurred while processing your request',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Handle 404
  return res.status(404).json({ error: 'Not found' });
};

// Export the handler for Vercel
module.exports = handler;