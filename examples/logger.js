(function() {
  // Store the logger element in a variable
  const loggerElement = document.getElementById("logger");

  // Check if loggerElement exists to prevent errors
  if (!loggerElement) {
    console.error("Logger element not found");
    return;
  }

  // Define a logging function
  const logMessage = (message) => {
    // Create a new log item
    const logItem = document.createElement("div");
    logItem.textContent = `* ${message}`;
    
    // Append the log item to the logger element
    loggerElement.appendChild(logItem);
  }

  // Expose the logger to the global scope (or module, if using modules)
  window.log = logMessage;

})();

log("This is a log message");