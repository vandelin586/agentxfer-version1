var Application = require("./lib/app");
var Server      = require("./lib/server");
var sdk         = require("./lib/sdk");
var config      = require("./config");

var app    = new Application(null, config);
var server = new Server(config, app);

sdk.checkNodeVersion();

server.start();

sdk.registerBot(require('./LiveChat.js'));

