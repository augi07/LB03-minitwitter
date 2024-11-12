const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const crypto = require("crypto");

require("dotenv").config();

const encryptionKey = process.env.ENCRYPTION_KEY;
if (encryptionKey.length !== 32) {
  throw new Error("ENCRYPTION_KEY muss genau 32 Zeichen lang sein.");
}

const algorithm = "aes-256-cbc";

// Verschlüsselungsfunktion
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

// Entschlüsselungsfunktion
const decrypt = (text) => {
  if (!text.includes(":")) {
    return text; // Unverschlüsselten Text zurückgeben
  }

  try {
    const [iv, encryptedText] = text.split(":");
    const decipher = crypto.createDecipheriv(
      algorithm,
      encryptionKey,
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Fehler beim Entschlüsseln:", error.message);
    return "[Fehler beim Entschlüsseln]";
  }
};

// Bestehende Passwörter prüfen und hashen
const hashExistingPasswords = async (db) => {
  const users = await queryDB(db, "SELECT id, username, password FROM users");
  for (const user of users) {
    if (!user.password.startsWith("$2b$")) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await insertDB(db, "UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        user.id,
      ]);
      console.log(`Passwort für '${user.username}' gehasht.`);
    }
  }
};

// Seed-Benutzer hinzufügen
const seedUsersTable = async (db) => {
  const users = [
    { username: "switzerchees", password: "123456" },
    { username: "john", password: "123456" },
    { username: "jane", password: "123456" },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await insertDB(db, "INSERT INTO users (username, password) VALUES (?, ?)", [
      user.username,
      hashedPassword,
    ]);
  }
};

// Datenbank initialisieren
const initializeDatabase = async () => {
  const db = new sqlite3.Database("./minitwitter.db");

  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS tweets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        timestamp TEXT,
        text TEXT
      )`
    );

    db.get("SELECT * FROM users LIMIT 1", [], async (err, row) => {
      if (!row) {
        await seedUsersTable(db);
      } else {
        await hashExistingPasswords(db);
      }
    });
  });

  return db;
};

// Datenbankabfragen
const insertDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const queryDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = { initializeDatabase, queryDB, insertDB, encrypt, decrypt };
