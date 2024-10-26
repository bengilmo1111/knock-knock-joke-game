document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  // Speech output control
  let speechEnabled = false;

  // Base URL for your API
  const BASE_URL = 'https://bengilmo1111-github-io.vercel.app';

  // Initial title message
  const titleMessage = "Welcome to the world of adventure! Will you be a hero or will you be doomed to wander forever. Choose your destiny!";

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
  window.toggleSpeech = function () {
    speechEnabled = !speechEnabled;
    const toggleButton = document.getElementById('speech-toggle');
    toggleButton.textContent = speechEnabled ? "🔊 Speech On" : "🔊 Speech Off";
    toggleButton.classList.toggle('on', speechEnabled);
  };

  // Show the title message on load
  appendToConsole(`<strong>${titleMessage}</strong>`, true);

  // Voice recognition setup
  let recognition;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    console.log("Setting up speech recognition");
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

  // Ensure startListening is globally accessible
  window.startListening = function () {
    if (recognition) {
      recognition.start();
      appendToConsole("Listening for voice input...");
    } else {
      appendToConsole("Voice input not supported on this device.");
    }
  };

  // Existing sendInput function with added text-to-speech call
  async function sendInput(input) {
    console.log("Sending input:", input);
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
        speakText(data.response); // Speak the response out loud
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
      console.log("Checking server health...");
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