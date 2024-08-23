const logMessage = (message) => {
  const logger = document.getElementById("logger");
  if (logger) {
    const newMessage = document.createElement('div');
    newMessage.textContent = `* ${message}`;
    logger.appendChild(newMessage);
  } else {
    console.warn('Logger element not found');
  }
}