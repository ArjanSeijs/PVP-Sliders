global.rootDir = __dirname;

const http = require("http");
const bodyParser = require("body-parser");
const express = require("express");


const app = express();
const port = process.argv[2] || 3000;

const path = require("path");

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use('/assets', express.static(path.join(__dirname, '/public/assets')));
app.use('/images', express.static(path.join(__dirname, '/public/images')));
app.use('/scripts', express.static(path.join(__dirname, '/public/scripts')));
app.use('/stylesheets', express.static(path.join(__dirname, '/public/stylesheets')));

app.set('views', path.join(__dirname, '/public/views'));
app.set('view engine', 'ejs');

const server = http.createServer(app);
server.listen(port);
console.log("[Server] Server started on port " + port);

