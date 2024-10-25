document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    consoleElement.appendChild(paragraph);
    consoleElement.scrollTop = consoleElement.scrollHeight;
  }

  async function sendInput(input) {
    appendToConsole(`<strong>> ${input}</strong>`);
    history.push({ role: 'user', content: input });

    try {
        const response = await fetch('https://bengilmo1111-github-f0ldym4tc-ben-gilmores-projects.vercel.app/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
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
        appendToConsole('An error occurred while connecting to the server.');
    }
}

  inputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && inputElement.value.trim() !== '') {
      const userInput = inputElement.value.trim();
      inputElement.value = '';
      sendInput(userInput);
    }
  });

  // Add error handling for initial game start
  window.addEventListener('load', () => {
    sendInput('start').catch(error => {
      console.error("Error starting game:", error);
      appendToConsole('Failed to start the game. Please refresh the page to try again.');
    });
  });
});
