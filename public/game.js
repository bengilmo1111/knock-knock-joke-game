document.addEventListener('DOMContentLoaded', () => {
  const consoleElement = document.getElementById('game-output');
  const inputElement = document.getElementById('game-input');
  let history = [];

  // Base URL for your API
  const BASE_URL = 'https://bengilmo1111-github-f0ldym4tc-ben-gilmores-projects.vercel.app';

  function appendToConsole(text) {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    consoleElement.appendChild(paragraph);
    consoleElement.scrollTop = consoleElement.scrollHeight;
  }

  // Add health check function
  async function checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Health check:', data);
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async function sendInput(input) {
    appendToConsole(`<strong>> ${input}</strong>`);
    history.push({ role: 'user', content: input });

    try {
      // Check health before sending main request
      const isHealthy = await checkHealth();
      if (!isHealthy) {
        throw new Error('Server health check failed');
      }
      
      const response = await fetch(`${BASE_URL}/api`, {
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

  // Modified game start with health check
  window.addEventListener('load', async () => {
    try {
      const isHealthy = await checkHealth();
      if (isHealthy) {
        sendInput('start');
      } else {
        appendToConsole('Server is not responding. Please try again later.');
      }
    } catch (error) {
      console.error("Error starting game:", error);
      appendToConsole('Failed to start the game. Please refresh the page to try again.');
    }
  });
});