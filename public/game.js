function appendToConsole(text, isUser = false, speak = false) {
  const paragraph = document.createElement('p');
  const cleanedText = preprocessTextForMarkdown(text);

  if (isUser) {
    // Create a strong element for the prefix
    const prefix = document.createElement('strong');
    prefix.textContent = '>>> ';

    // Create a text node for the user input
    const userText = document.createTextNode(cleanedText);

    // Append the prefix and the text node to the paragraph
    paragraph.appendChild(prefix);
    paragraph.appendChild(userText);
  } else {
    paragraph.textContent = cleanedText;
  }

  outputElement.appendChild(paragraph);
  outputElement.scrollTop = outputElement.scrollHeight;

  if (speechEnabled && speak && voicesLoaded) speakText(cleanedText);
}