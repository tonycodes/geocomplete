// Logger class using IIFE to encapsulate the functionality
var Logger = (function() {
    var $logger = $("#logger");

    function log(message) {
        var formattedMessage = "\n * " + message; // Format the message
        $logger.append(formattedMessage); // Append the new message
    }

    return {
        log: log // Expose the log method
    };
})();

// Usage
Logger.log("This is a log message."); // Call the log method wherever needed