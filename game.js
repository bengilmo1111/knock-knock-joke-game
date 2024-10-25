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
