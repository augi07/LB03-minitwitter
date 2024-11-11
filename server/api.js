const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
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
  const tweets = await queryDB(db, "SELECT * FROM tweets ORDER BY id DESC");
  res.json(tweets);
};

const postTweet = async (req, res) => {
  if (req.user.username !== req.body.username) {
    return res.status(403).json({ error: "Access denied" });
  }

  const query = `INSERT INTO tweets (username, timestamp, text) VALUES ('${req.user.username}', '${new Date().toISOString()}', '${req.body.text}')`;
  await insertDB(db, query);
  res.json({ status: "ok" });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  const user = await queryDB(db, query);

  if (user.length === 1) {
    const token = generateToken(username);
    res.json({ username, token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
};

module.exports = { initializeAPI };