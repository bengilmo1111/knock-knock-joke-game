console.log("Server is starting up...");

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// CORS configuration
const allowedOrigins = ['https://bengilmo1111-github-io.vercel.app'];

app.use(cors({
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
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json());

// Error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Debugging: Log the API key to check if it's being retrieved correctly
console.log("API Key Loaded:", configuration.apiKey ? "Yes" : "No");

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main game endpoint
app.post('/api', async (req, res) => {
  console.log('Received request body:', req.body); // Debug log

  const { input, history } = req.body;

  // Validate input
  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'History must be an array' });
  }

  try {
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
    console.log('OpenAI response:', response); // Debug log

    res.json({ response });
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

    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return res.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }

    res.status(500).json({
      error: 'An error occurred while processing your request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server in development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel
module.exports = app;