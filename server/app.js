const express = require("express");
const http = require("http");
const { initializeAPI } = require("./api");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Create the express server
const app = express();
app.disable("x-powered-by");
app.use(express.json());
const server = http.createServer(app);

const logStream = fs.createWriteStream(path.join(__dirname, "server.log"), {
  flags: "a",
});
app.use(morgan("combined", { stream: logStream }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Maximal 100 Anfragen pro IP
  message: { error: "Too many requests. Please try again later." },
});
app.use(generalLimiter);

// deliver static files from the client folder like css, js, images
app.use(express.static("client"));
// route for the homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  fs.appendFileSync(
    path.join(__dirname, "server.log"),
    `[${new Date().toISOString()}] ERROR: ${err.stack}\n`
  );
  res.status(500).json({ error: "Internal Server Error" });
});

// Initialize the REST api
initializeAPI(app);

//start the web server
const serverPort = process.env.PORT || 3000;
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});
