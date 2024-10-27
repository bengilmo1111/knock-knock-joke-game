document.addEventListener('DOMContentLoaded', () => {
  const outputElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];
  let selectedVoice;
  let voicesLoaded = false;
  let speechEnabled = false;

  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find(voice => voice.name === 'Google UK English Male') || voices[0];
    voicesLoaded = true;
  }

  window.speechSynthesis.onvoiceschanged = loadVoices;
  if (window.speechSynthesis.getVoices().length > 0) loadVoices();

  function extractTextFromJson(json) {
    // If the input is an array, recursively extract text from each item
    if (Array.isArray(json)) {
      return json.map(extractTextFromJson).join(" ");
    }
    // If the input is an object, look for a "text" key
    if (typeof json === 'object' && json !== null) {
      if (json.text) return json.text;
      // Recursively search for text in other keys
      return Object.values(json).map(extractTextFromJson).join(" ");
    }
    // If it’s a string, return as-is
    return typeof json === 'string' ? json : '';
  }
  
  function preprocessTextForMarkdown(text) {
    try {
      // Attempt to parse the text as JSON
      const parsedJson = JSON.parse(text);
      // Extract clean text using recursive extraction
      return extractTextFromJson(parsedJson);
    } catch {
      // If parsing fails, return text with newline conversions only
      return text.replace(/\\n/g, '\n').replace(/\\r/g, '');
    }
  }
  
  function appendToConsole(text, speak = false) {
    const paragraph = document.createElement('p');
    const cleanedText = preprocessTextForMarkdown(text); // Clean and extract text before parsing
    paragraph.innerHTML = marked.parse(cleanedText); // Use marked to parse Markdown to HTML
    outputElement.appendChild(paragraph);
    outputElement.scrollTop = outputElement.scrollHeight;
  
    if (speechEnabled && speak && voicesLoaded) speakText(cleanedText);
  }

  function appendImage(base64Image) {
    const img = document.createElement('img');
    img.src = base64Image;
    img.alt = "Game Image";
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    outputElement.appendChild(img);
    outputElement.scrollTop = outputElement.scrollHeight;
  }

  function speakText(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.lang = 'en-GB';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech not supported in this browser.");
    }
  }

  window.toggleSpeech = function () {
    speechEnabled = !speechEnabled;
    const toggleButton = document.getElementById('speech-toggle');
    toggleButton.textContent = speechEnabled ? "🔊 Speech On" : "🔊 Speech Off";
  };

  async function sendInput(input, isInitial = false) {
    if (!isInitial) {
      appendToConsole(`> ${input}`);
      history.push({ role: 'user', content: input });
    }

    try {
      const textResponse = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, history })
      });
      const textData = await textResponse.json();
      const responseText = textData.response;
      appendToConsole(responseText, true);
      history.push({ role: 'assistant', content: responseText });

      const imageResponse = await fetch('/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${responseText}, 256x256 resolution` })
      });
      const imageData = await imageResponse.json();
      if (imageData.image) appendImage(imageData.image);

    } catch (error) {
      console.error("Error processing input:", error);
      appendToConsole("An error occurred. Please try again.");
    }
  }

  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && inputElement.value.trim() !== '') {
      const userInput = inputElement.value.trim();
      inputElement.value = '';
      sendInput(userInput);
    }
  });

  let recognition;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const voiceInput = event.results[0][0].transcript;
      appendToConsole(`> ${voiceInput}`);
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

  appendToConsole("<strong>Welcome to the game of destiny. Will you be a hero, or doomed to wander forever? Play on, brave adventurer.</strong>", true);
  history.push({ role: 'system', content: "Welcome to the game of destiny." });
  sendInput("start", true);
});