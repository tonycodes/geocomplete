const logMessage = (message) => {
  const loggerElement = $("#logger");
  
  // Create a new line element to avoid potential XSS attacks and perform more efficient DOM manipulations
  const newLogEntry = $("<div>").text(message).prepend("* ").prop('outerHTML');

  loggerElement.append(newLogEntry);
};