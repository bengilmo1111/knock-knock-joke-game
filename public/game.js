document.addEventListener('DOMContentLoaded', () => {
  const outputElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  const imageElement = document.getElementById('game-image');
  let history = [];

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerText = text;
    outputElement.appendChild(paragraph);
    outputElement.scrollTop = outputElement.scrollHeight;
  }

  async function sendInput(input) {
    appendToConsole(`> ${input}`);
    history.push({ role: 'user', content: input });

    try {
      // Call the /api endpoint to get text response
      const textResponse = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, history })
      });
      const textData = await textResponse.json();
      const responseText = textData.response;
      appendToConsole(responseText);

      // Add the assistant response to history
      history.push({ role: 'assistant', content: responseText });

      // Call the /generate-image endpoint to get image based on text
      const imageResponse = await fetch('/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: responseText })
      });
      const imageData = await imageResponse.json();

      if (imageData.image) {
        imageElement.src = imageData.image;
        imageElement.style.display = 'block';
      }

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

  // Initial game start
  sendInput("start");
});