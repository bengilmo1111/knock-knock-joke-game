// api/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cohere = require('cohere-ai');

// Initialize Cohere with your API key
cohere.init(process.env.COHERE_API_KEY);

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

      const messages = history.map((entry) => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`).join("\n");
      const prompt = `You are a text-based adventure game. Create immersive experiences for the player with humor and wit.\n\n${messages}\nUser: ${input}\nAssistant:`;

      const cohereResponse = await cohere.generate({
        model: 'command-xlarge-nightly', // or 'command-medium-nightly' for smaller models
        prompt: prompt,
        max_tokens: 150,
        temperature: 0.8,
        k: 0,
        p: 0.75,
        frequency_penalty: 0.5,
        presence_penalty: 0.3
      });

      const responseText = cohereResponse.body.generations[0].text.trim();
      console.log('Cohere response:', responseText);

      return res.json({ response: responseText });
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Cohere API error',
          details: error.response.data
        });
      }

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