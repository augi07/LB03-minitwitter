const { initializeDatabase, queryDB, insertDB, encrypt, decrypt } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const xss = require("xss"); // Für XSS-Schutz
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path"); // Für Dateioperationen
require("dotenv").config();

let db;

// Log-Funktion
const logAction = (message) => {
  const logEntry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(path.join(__dirname, "server.log"), logEntry);
};

const secretKey = process.env.JWT_SECRET;

const generateToken = (username) => {
  return jwt.sign({ username }, secretKey, { expiresIn: "1h" });
};

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    logAction(`Unauthorized request from IP ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      logAction(`Forbidden request from IP ${req.ip}`);
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = user;
    logAction(`Authenticated request by user '${user.username}' from IP ${req.ip}`);
    next();
  });
};

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 5, // Maximal 5 Anfragen pro IP
  message: { error: "Too many login attempts. Please try again later." },
});

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", loginLimiter, login);
};

const getFeed = async (req, res) => {
  try {
    const tweets = await queryDB(db, "SELECT * FROM tweets ORDER BY id DESC");
    const sanitizedTweets = tweets.map((tweet) => ({
      id: tweet.id,
      username: tweet.username,
      timestamp: tweet.timestamp,
      text: xss(decrypt(tweet.text)), // Entschlüsselung und XSS-Schutz
    }));
    logAction(`User '${req.user.username}' fetched the feed.`);
    res.json(sanitizedTweets);
  } catch (error) {
    console.error("Error in getFeed:", error.message);
    logAction(`Error while fetching feed for user '${req.user.username}': ${error.message}`);
    res.status(500).json({ error: "Failed to fetch feed." });
  }
};

const postTweet = async (req, res) => {
  try {
    if (req.user.username !== req.body.username) {
      logAction(`Access denied: User '${req.user.username}' tried to post as '${req.body.username}'`);
      return res.status(403).json({ error: "Access denied" });
    }

    const sanitizedText = xss(req.body.text.trim()); // Sanitisierung
    if (!sanitizedText) {
      logAction(`User '${req.user.username}' tried to post an empty tweet.`);
      return res.status(400).json({ error: "Tweet cannot be empty." });
    }

    const encryptedText = encrypt(sanitizedText); // Verschlüsselung
    const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)`;
    await insertDB(db, query, [req.user.username, new Date().toISOString(), encryptedText]);
    logAction(`User '${req.user.username}' posted a tweet.`);
    res.status(201).json({ status: "Tweet posted successfully." });
  } catch (error) {
    console.error("Error in postTweet:", error.message);
    logAction(`Error while posting a tweet for user '${req.user.username}': ${error.message}`);
    res.status(500).json({ error: "Failed to post tweet." });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = ?`;
    const user = await queryDB(db, query, [username]);

    if (user.length === 1 && await bcrypt.compare(password, user[0].password)) {
      const token = generateToken(username);
      logAction(`User '${username}' logged in successfully.`);
      res.json({ username, token });
    } else {
      logAction(`Failed login attempt for username '${username}'`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error in login:", error.message);
    logAction(`Error during login attempt for username '${req.body.username}': ${error.message}`);
    res.status(500).json({ error: "Failed to login." });
  }
};

module.exports = { initializeAPI };
