const { initializeDatabase, queryDB, insertDB, encrypt, decrypt } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

let db;

const secretKey = process.env.JWT_SECRET; // Secret Key aus der .env-Datei

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
    const decryptedTweets = tweets.map((tweet) => {
      try {
        return {
          ...tweet,
          text: decrypt(tweet.text), // Entschlüsseln des Textes
        };
      } catch (error) {
        console.error(`Fehler beim Entschlüsseln von Tweet mit ID ${tweet.id}:`, error.message);
        return {
          ...tweet,
          text: "[Fehler beim Entschlüsseln]", // Fallback-Text anzeigen
        };
      }
    });
    res.json(decryptedTweets);
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

    const encryptedText = encrypt(req.body.text); // Verschlüsselung des Textes
    const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)`;
    await insertDB(db, query, [req.user.username, new Date().toISOString(), encryptedText]);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Error in postTweet:", error.message);
    res.status(500).json({ error: "Failed to post tweet." });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ?`;
  const user = await queryDB(db, query, [username]);

  if (user.length === 1 && await bcrypt.compare(password, user[0].password)) {
    const token = generateToken(username);
    res.json({ username, token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
};

module.exports = { initializeAPI };