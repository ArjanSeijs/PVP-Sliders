global.rootDir = __dirname;

const path = require("path");
const express = require("express");
const http = require("http");
const LobbyManager = require("./src/lobbies/LobbyManager");
const config = require("./src/lib/config");

const app = express();
const port = process.argv[2] || 3000;

app.use('/', express.static(path.join(__dirname, '/public/views')));
app.use('/assets', express.static(path.join(__dirname, '/public/assets')));
app.use('/images', express.static(path.join(__dirname, '/public/images')));
app.use('/scripts', express.static(path.join(__dirname, '/public/scripts')));
app.use('/stylesheets', express.static(path.join(__dirname, '/public/stylesheets')));

// app.set('views', path.join(__dirname, '/public/views'));
// app.set('view engine', 'ejs');
const server = http.createServer(app);
config.init();
LobbyManager.init(server);
server.listen(port);
console.log("[Server] Server started on port " + port);

