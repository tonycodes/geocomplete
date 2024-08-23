const log = (() => {
  const logger = $("#logger");
  
  if (!logger.length) {
    console.error("Logger element not found.");
    return;
  }

  return function(message) {
    const formattedMessage = `\n * ${message}`;
    logger.append(formattedMessage);
  };
})();