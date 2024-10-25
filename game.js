const consoleElement = document.getElementById('console');
const inputElement = document.getElementById('input');
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
    const response = await fetch('https://bengilmo1111-github-f0ldym4tc-ben-gilmores-projects.vercel.app/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, history }),
    });
    const data = await response.json();

    if (data.response) {
      appendToConsole(data.response);
      history.push({ role: 'assistant', content: data.response });
    } else {
      appendToConsole('Error: ' + data.error);
    }
  } catch (error) {
    console.error(error);
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

// Start the game
window.onload = () => {
  sendInput('start');
};
