const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = require('node-fetch'); // Use fetch for HTTP requests

// Allowed origins
const allowedOrigins = ['https://bengilmo1111-github-io.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Create handler for Vercel
const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(req.headers.origin) ? req.headers.origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Main game endpoint
  if (req.method === 'POST' && req.url === '/api') {
    try {
      const { input, history } = req.body;

      if (!input) {
        return res.status(400).json({ error: 'Input is required' });
      }

      if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'History must be an array' });
      }

      // Format messages as required by Cohere's v2 chat endpoint
      const messages = [
        { role: 'system', content: "You are a text-based adventure game assistant. Respond concisely with humor and wit. The game should be lord of the rings or hobbit style, but funny and full of British humour like the hitchhikers guide to the galaxy. The user should be able to win the game if they complete 7 riddles, find the 3 magic swords, and defeat Sauron. There should also be funny side quests. If the user wins they should be rewarded with an epic poem and then asked if they want to play again. Each response should be short, ideally less than what a normal human says in a conversation turn." },
        ...history.map((entry) => ({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.content
        })),
        { role: 'user', content: input }
      ];

      // Prepare payload for Cohere's v2 chat endpoint
      const payload = {
        model: 'command-r-plus-08-2024', // Update as per model availability
        messages: messages,
        max_tokens: 150,
        temperature: 0.8,
        frequency_penalty: 0.5,
      };

      // Send request to Cohere v2 chat endpoint
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

      return res.json({ response: responseText });

    } catch (error) {
      console.error('Error during Cohere API call:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });

      return res.status(500).json({
        error: 'An error occurred while processing your request',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  return res.status(404).json({ error: 'Not found' });
};

// Export the handler for Vercel
module.exports = handler;