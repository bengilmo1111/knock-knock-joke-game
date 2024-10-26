document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  // Base URL for your API
  const BASE_URL = 'https://bengilmo1111-github-io.vercel.app';

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    consoleElement.appendChild(paragraph);
    consoleElement.scrollTop = consoleElement.scrollHeight;
  }

  // Voice recognition setup
  let recognition;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const voiceInput = event.results[0][0].transcript;
      appendToConsole(`<strong>> ${voiceInput}</strong>`);
      sendInput(voiceInput);
    };

    recognition.onerror = (event) => {
      appendToConsole("Error with voice input: " + event.error);
    };
  } else {
    console.warn("Speech recognition not supported in this browser.");
  }

  function startListening() {
    if (recognition) {
      recognition.start();
      appendToConsole("Listening for voice input...");
    } else {
      appendToConsole("Voice input not supported on this device.");
    }
  }

  // Existing sendInput function
  async function sendInput(input) {
    appendToConsole(`<strong>> ${input}</strong>`);
    history.push({ role: 'user', content: input });

    try {
      const isHealthy = await checkHealth();
      if (!isHealthy) throw new Error('Server health check failed');
      
      const response = await fetch(`${BASE_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({ input, history }),
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

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

  async function checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET', headers: { 'Accept': 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
});