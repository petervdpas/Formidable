// plugins/Crazy/plugin.js
exports.run = function (context) {
  console.log("Hello from Crazy!");
  return { message: "Hello World", context };
};