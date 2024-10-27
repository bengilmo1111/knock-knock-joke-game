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
    if (Array.isArray(json)) {
      return json.map(extractTextFromJson).join(" ");
    }
    if (typeof json === 'object' && json !== null) {
      if (json.text) return json.text;
      return Object.values(json).map(extractTextFromJson).join(" ");
    }
    return typeof json === 'string' ? json : '';
  }

  function preprocessTextForMarkdown(text) {
    try {
      const parsedJson = JSON.parse(text);
      return extractTextFromJson(parsedJson);
    } catch {
      return text.replace(/\\n/g, '\n').replace(/\\r/g, '');
    }
  }

  function appendToConsole(text, speak = false) {
    const paragraph = document.createElement('p');
    const cleanedText = preprocessTextForMarkdown(text);
    paragraph.innerHTML = marked.parse(cleanedText);
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
    toggleButton.textContent = speechEnabled ? "🔊" : "🔇";
    toggleButton.title = speechEnabled ? "Speech On" : "Speech Off";
  };

  async function sendInput(input, isInitial = false) {
    if (!isInitial) {
      appendToConsole(input);
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
        body: JSON.stringify({ prompt: `${responseText}` })
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
      appendToConsole(voiceInput);
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

  appendToConsole("<strong>Hi is it knock knock time?</strong>", true);
  history.push({ role: 'system', content: "I'll tell you a joke." });
  sendInput("start", true);
});