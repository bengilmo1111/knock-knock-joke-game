document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  // Base URL for your API
  const BASE_URL = 'https://bengilmo1111-github-io.vercel.app';

  // Initial title and intro messages
  const introMessage = "Welcome to the game of destiny. Will you be a hero, or doomed to wander forever? Play on, brave adventurer.";

  // Append text to game console and optionally speak it
  function appendToConsole(text, speak = false) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    consoleElement.appendChild(paragraph);
    consoleElement.scrollTop = consoleElement.scrollHeight;

    // Use text-to-speech if enabled and requested
    if (speechEnabled && speak) speakText(text);
  }

  // Text-to-speech function
  function speakText(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech not supported in this browser.");
    }
  }

  // Toggle speech output on and off
  let speechEnabled = false;
  window.toggleSpeech = function () {
    speechEnabled = !speechEnabled;
    const toggleButton = document.getElementById('speech-toggle');
    toggleButton.textContent = speechEnabled ? "🔊 Speech On" : "🔊 Speech Off";
    toggleButton.classList.toggle('on', speechEnabled);
  };

  // Display intro message and initiate first Cohere response
  function startGame() {
    appendToConsole(`<strong>${introMessage}</strong>`, true);

    // Add the intro message to history and send initial request to Cohere
    history.push({ role: 'system', content: introMessage });
    sendInput("start", true); // Set `true` for initial request so it doesn't wait for user input
  }

  // Modified sendInput to handle both user and initial Cohere requests
  async function sendInput(input, isInitial = false) {
    if (!isInitial) {
      appendToConsole(`<strong>> ${input}</strong>`, false);
      history.push({ role: 'user', content: input });
    }

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
        appendToConsole(data.response, true);
        history.push({ role: 'assistant', content: data.response });

        // If this is the initial request, set up for the user’s turn
        if (isInitial) {
          inputElement.focus();
        }
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

  // Handle Enter key in the input field for keyboard input
  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && inputElement.value.trim() !== '') {
      const userInput = inputElement.value.trim();
      inputElement.value = ''; // Clear the input field
      sendInput(userInput); // Send the user input to the game
    }
  });

  // Start the game on page load with the intro and Cohere response
  startGame();

  // Voice recognition setup (preserves existing voice input functionality)
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

  window.startListening = function () {
    if (recognition) {
      recognition.start();
      appendToConsole("Listening for voice input...");
    } else {
      appendToConsole("Voice input not supported on this device.");
    }
  };
});