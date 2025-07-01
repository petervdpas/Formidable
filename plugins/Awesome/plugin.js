// plugins/Awesome/plugin.js
exports.run = function (context) {
  console.log("Hello from Awesome!");
  return { message: "Hello World", context };
};