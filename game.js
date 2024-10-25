<<<<<<< HEAD
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
    const response = await fetch('http://localhost:5000/api', {
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
=======
const gameOutput = document.getElementById('game-output');
const gameInput = document.getElementById('game-input');

const gameState = {
    location: 'start',
    inventory: []
};

const rooms = {
    start: {
        description: "You are in a dark room. There is a door to the north.",
        exits: { north: 'hallway' }
    },
    hallway: {
        description: "A long hallway stretches out before you.",
        exits: { south: 'start' }
    }
};

function render(message) {
    gameOutput.innerHTML += `<p>${message}</p>`;
    gameOutput.scrollTop = gameOutput.scrollHeight;
}

function handleCommand(command) {
    command = command.toLowerCase();
    if (command === 'look') {
        render(rooms[gameState.location].description);
    } else if (command.startsWith('go ')) {
        const direction = command.split(' ')[1];
        const newLocation = rooms[gameState.location].exits[direction];
        if (newLocation) {
            gameState.location = newLocation;
            render(rooms[gameState.location].description);
        } else {
            render("You can't go that way.");
        }
    } else {
        render("I don't understand that command.");
    }
}

gameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleCommand(gameInput.value);
        gameInput.value = '';
    }
});
>>>>>>> 844916f54ae2d9a89170c3ba2d6c77e00149b80b
