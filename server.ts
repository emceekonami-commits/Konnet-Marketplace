import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("konnet.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'buyer',
    phone TEXT,
    location TEXT,
    kyc_status TEXT DEFAULT 'pending',
    is_verified INTEGER DEFAULT 0,
    verification_code TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    title TEXT,
    description TEXT,
    price REAL,
    phone TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(vendor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT DEFAULT 'active',
    expires_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    buyer_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'escrow',
    confirmed_at DATETIME,
    released_at DATETIME,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/send-code", (req, res) => {
    try {
      const { email, name, username, role, phone, location } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
      
      if (existing) {
        db.prepare("UPDATE users SET verification_code = ? WHERE id = ?").run(code, existing.id);
      } else {
        // Registration attempt
        if (!name || !username) {
          return res.status(400).json({ error: "User not found. Please register first." });
        }
        db.prepare(`
          INSERT INTO users (email, name, username, role, phone, location, verification_code)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(email, name, username, role, phone, location, code);
      }

      console.log(`[AUTH] Verification code for ${email}: ${code}`);
      res.json({ success: true, code }); // Sending code back for easy testing in this environment
    } catch (err: any) {
      console.error("Auth error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/verify-code", (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

      const user = db.prepare("SELECT * FROM users WHERE email = ? AND verification_code = ?").get(email, code) as any;
      
      if (user) {
        db.prepare("UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?").run(user.id);
        const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
        res.json(updatedUser);
      } else {
        res.status(400).json({ error: "Invalid verification code" });
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/admin-login", (req, res) => {
    const { name, password } = req.body;
    if (password === "Konami123") {
      let admin = db.prepare("SELECT * FROM users WHERE name = ? AND role = 'admin'").get(name) as any;
      if (!admin) {
        // Auto-create admin if password is correct
        const result = db.prepare("INSERT INTO users (name, email, role, is_verified) VALUES (?, ?, 'admin', 1)").run(name, `${name.toLowerCase()}@konnet.com`);
        admin = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      }
      res.json(admin);
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  });

  // API Routes
  app.get("/api/items", (req, res) => {
    const items = db.prepare(`
      SELECT items.*, users.email as vendor_email, users.location as vendor_location
      FROM items 
      JOIN users ON items.vendor_id = users.id 
      WHERE items.status = 'verified'
    `).all();
    res.json(items);
  });

  app.get("/api/admin/pending-items", (req, res) => {
    const items = db.prepare(`
      SELECT items.*, users.email as vendor_email 
      FROM items 
      JOIN users ON items.vendor_id = users.id 
      WHERE items.status = 'pending'
    `).all();
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { vendor_id, title, description, price, phone, image_url } = req.body;
    const result = db.prepare(`
      INSERT INTO items (vendor_id, title, description, price, phone, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(vendor_id, title, description, price, phone, image_url);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/admin/verify-item", (req, res) => {
    const { item_id } = req.body;
    db.prepare("UPDATE items SET status = 'verified' WHERE id = ?").run(item_id);
    res.json({ success: true });
  });

  app.post("/api/pay-escrow", (req, res) => {
    const { item_id, buyer_id, amount } = req.body;
    const result = db.prepare(`
      INSERT INTO transactions (item_id, buyer_id, amount, status)
      VALUES (?, ?, ?, 'escrow')
    `).run(item_id, buyer_id, amount);
    
    // Mark item as sold (waiting for confirmation)
    db.prepare("UPDATE items SET status = 'sold' WHERE id = ?").run(item_id);
    
    res.json({ transaction_id: result.lastInsertRowid });
  });

  app.post("/api/confirm-delivery", (req, res) => {
    const { transaction_id } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE transactions 
      SET confirmed_at = ? 
      WHERE id = ?
    `).run(now, transaction_id);
    res.json({ success: true, confirmed_at: now });
  });

  app.post("/api/admin/release-funds", (req, res) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      UPDATE transactions 
      SET status = 'released', released_at = ?
      WHERE status = 'escrow' AND confirmed_at IS NOT NULL AND confirmed_at <= ?
    `).run(new Date().toISOString(), twelveHoursAgo);
    res.json({ released_count: result.changes });
  });

  app.get("/api/users/:email", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email);
    if (user) res.json(user);
    else res.status(404).json({ error: "User not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
