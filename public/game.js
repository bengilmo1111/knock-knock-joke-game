document.addEventListener('DOMContentLoaded', () => {
  const outputElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerText = text;
    outputElement.appendChild(paragraph);
    outputElement.scrollTop = outputElement.scrollHeight;
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

  async function sendInput(input) {
    appendToConsole(`> ${input}`);
    history.push({ role: 'user', content: input });

    try {
      // Get text response from the game API
      const textResponse = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, history })
      });
      const textData = await textResponse.json();
      const responseText = textData.response;
      appendToConsole(responseText);

      history.push({ role: 'assistant', content: responseText });

      // Get image based on text response, with smaller resolution hint
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

  sendInput("start");
});