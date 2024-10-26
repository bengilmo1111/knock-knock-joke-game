const express = require('express');
const cors = require('cors');
const cohere = require('cohere-ai');
require('dotenv').config();
const fetch = require('node-fetch'); // Use fetch for HTTP requests if cohere SDK is not compatible

// Initialize Cohere API client
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
      console.log('Received input:', input);
      console.log('Received history:', history);

      if (!input) {
        return res.status(400).json({ error: 'Input is required' });
      }

      if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'History must be an array' });
      }

      // Format messages for the Cohere API's required structure
      const messages = history.map((entry) => ({
        role: entry.role === 'user' ? 'User' : 'Assistant',
        content: entry.content
      }));
      messages.push({ role: 'User', content: input });

      // Prepare payload for Cohere's v2 chat endpoint
      const payload = {
        model: 'command-r', // or 'command-r-plus' as applicable
        messages: messages,
        max_tokens: 150,
        temperature: 0.8,
        k: 0,
        p: 0.75,
        frequency_penalty: 0.5,
        presence_penalty: 0.3
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

      const responseText = responseData.message?.content || 'No response generated';

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