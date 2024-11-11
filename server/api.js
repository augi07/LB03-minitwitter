const { initializeDatabase, queryDB, insertDB, encrypt, decrypt } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const xss = require("xss"); // Für XSS-Schutz
require("dotenv").config();

let db;

const secretKey = process.env.JWT_SECRET;

const generateToken = (username) => {
  return jwt.sign({ username }, secretKey, { expiresIn: "1h" });
};

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", login);
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
    res.json(sanitizedTweets);
  } catch (error) {
    console.error("Error in getFeed:", error.message);
    res.status(500).json({ error: "Failed to fetch feed." });
  }
};

const postTweet = async (req, res) => {
  try {
    if (req.user.username !== req.body.username) {
      return res.status(403).json({ error: "Access denied" });
    }

    const sanitizedText = xss(req.body.text.trim()); // Sanitisierung
    if (!sanitizedText) {
      return res.status(400).json({ error: "Tweet cannot be empty." });
    }

    const encryptedText = encrypt(sanitizedText); // Verschlüsselung
    const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)`;
    await insertDB(db, query, [req.user.username, new Date().toISOString(), encryptedText]);
    res.status(201).json({ status: "Tweet posted successfully." });
  } catch (error) {
    console.error("Error in postTweet:", error.message);
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
      res.json({ username, token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ error: "Failed to login." });
  }
};

module.exports = { initializeAPI };