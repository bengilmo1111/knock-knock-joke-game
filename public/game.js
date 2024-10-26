document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  // Base URL for your API - update this to your actual server URL
  const BASE_URL = 'https://bengilmo1111-github-io.vercel.app';

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    consoleElement.appendChild(paragraph);
    consoleElement.scrollTop = consoleElement.scrollHeight;
  }

  // Health check function
  async function checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Health check:', data);
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async function sendInput(input) {
    appendToConsole(`<strong>> ${input}</strong>`);
    history.push({ role: 'user', content: input });

    try {
      // Check health before sending main request
      const isHealthy = await checkHealth();
      if (!isHealthy) {
        throw new Error('Server health check failed');
      }
      
      const response = await fetch(`${BASE_URL}/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ input, history }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server responded with an error:", response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.response) {
        appendToConsole(data.response);
        history.push({ role: 'assistant', content: data.response });
      } else {
        appendToConsole('Error: ' + data.error);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      appendToConsole('An error occurred while connecting to the server. Please try again.');
    }
  }

  // Handle user input when Enter is pressed
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && inputElement.value.trim() !== '') {
      const userInput = inputElement.value.trim();
      inputElement.value = '';
      sendInput(userInput);
    }
  });

  // Game initialization
  window.addEventListener('load', async () => {
  //  appendToConsole('Checking server connection...');

    // Start the health check process
    try {
      const isHealthy = await checkHealth();
      if (isHealthy) {
      //  appendToConsole('Connected to server successfully!');
        sendInput('start');
      } else {
        appendToConsole('Unable to connect to server. Please refresh the page or try again later.');
      }
    } catch (error) {
      console.error("Error starting game:", error);
      appendToConsole('Failed to start the game. Please refresh the page to try again.');
    }
  });

  // Optional: Add a visual indicator when the input is focused
  inputElement.addEventListener('focus', () => {
    inputElement.classList.add('focused');
  });

  inputElement.addEventListener('blur', () => {
    inputElement.classList.remove('focused');
  });

// Voice recognition setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US'; // Set language
recognition.interimResults = false; // Only final results
recognition.maxAlternatives = 1;

// Start listening and handle result
function startListening() {
  recognition.start();
  appendToConsole("Listening for voice input...");
}

recognition.onresult = (event) => {
  const voiceInput = event.results[0][0].transcript;
  appendToConsole(`<strong>> ${voiceInput}</strong>`);
  sendInput(voiceInput); // Send recognized text as game input
};

recognition.onerror = (event) => {
  appendToConsole("Error with voice input: " + event.error);
};

  // Optional: Scroll to bottom when new content is added
  const observer = new MutationObserver(() => {
    consoleElement.scrollTop = consoleElement.scrollHeight;
  });

  observer.observe(consoleElement, {
    childList: true,
    subtree: true
  });
});