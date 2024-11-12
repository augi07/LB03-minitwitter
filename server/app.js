const express = require("express");
const http = require("http");
const { initializeAPI } = require("./api");
const rateLimit = require("express-rate-limit");

// Create the express server
const app = express();
app.disable('x-powered-by');
app.use(express.json());
const server = http.createServer(app);

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

// Initialize the REST api
initializeAPI(app);

//start the web server
const serverPort = process.env.PORT || 3000;
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});
