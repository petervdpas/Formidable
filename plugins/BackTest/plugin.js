// plugins/BackTest/plugin.js

// Example IPC handler function
function echoHandler(event, args) {
  console.log("[BackTest] echoHandler called with:", args);
  return { echoed: args };
}

// Main run function
exports.run = function (context) {
  console.log("Hello from BackTest!");
  return { message: "Hello World", context };
};

// Expose named handlers for declarative IPC registration
exports.echoHandler = echoHandler;
