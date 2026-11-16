#!/usr/bin/env node
/**
 * Seeds demo accounts and one clearly-labelled welcome event.
 *
 * Usage:  npm run db:seed
 * Safe to run more than once: accounts are created only when missing, old
 * sample events are removed, and the welcome event is skipped if it exists.
 */
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.resolve(ROOT, process.env.DATABASE_PATH || "data/fulafia.db");
const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || "storage/uploads");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@fulafia.edu.ng").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Platform Administrator";

const DAY = 86400000;

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function isoDate(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

function nowISO() {
  return new Date().toISOString();
}

/** Reads the SQL blocks out of src/lib/migrations.ts so the schema stays in one place. */
function readMigrations() {
  const source = fs.readFileSync(path.join(ROOT, "src/lib/migrations.ts"), "utf8");
  const chunks = source.split("`");
  // Odd indexes are template literals; keep only real migration blocks so
  // inline code spans in comments cannot be mistaken for SQL.
  return chunks.filter((chunk, index) => index % 2 === 1 && chunk.includes("CREATE TABLE"));
}

function migrate(db) {
  const row = db.prepare("PRAGMA user_version").get();
  const current = Number(row?.user_version ?? 0);
  const migrations = readMigrations();
  for (let version = current; version < migrations.length; version += 1) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(migrations[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

const CATEGORY_STYLE = {
  academic: ["#0a5136", "#16835a", "#d9f0c4"],
  religious: ["#2b3d63", "#4a6ba3", "#e7eefb"],
  sports: ["#8a3b06", "#c46a1b", "#ffe6cc"],
  entertainment: ["#4a1d55", "#8a3d99", "#f4ddf7"],
  career: ["#0c4a52", "#136f7a", "#d4f0f2"],
  social: ["#5c2b12", "#94502a", "#fbe6d7"],
  other: ["#243b2e", "#3f6350", "#e3efe7"],
};

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]);
}

function wrap(text, perLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function flyerSvg({ title, category, date, venue, price }) {
  const [dark, mid, light] = CATEGORY_STYLE[category] || CATEGORY_STYLE.other;
  const titleLines = wrap(title, 24).slice(0, 3);
  const titleMarkup = titleLines
    .map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 62}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${dark}"/>
      <stop offset="65%" stop-color="${mid}"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="12%" r="60%">
      <stop offset="0%" stop-color="${light}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${light}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#bg)"/>
  <rect width="1200" height="750" fill="url(#glow)"/>
  <g opacity="0.18" stroke="${light}" stroke-width="2" fill="none">
    <circle cx="1050" cy="120" r="180"/>
    <circle cx="1050" cy="120" r="120"/>
    <circle cx="120" cy="660" r="150"/>
  </g>
  <text x="64" y="220" fill="#ffffff" font-family="Georgia,serif" font-size="62" font-weight="bold">${titleMarkup}</text>
  <line x1="64" y1="500" x2="1136" y2="500" stroke="${light}" stroke-opacity="0.4" stroke-width="2"/>
  <text x="64" y="566" fill="#ffffff" font-family="Helvetica,Arial,sans-serif" font-size="30">${escapeXml(date)}</text>
  <text x="64" y="614" fill="${light}" font-family="Helvetica,Arial,sans-serif" font-size="26">${escapeXml(venue)}</text>
  <text x="64" y="692" fill="#ffffff" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="bold">${escapeXml(price)}</text>
  <text x="1136" y="692" fill="${light}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="22">Campus Events · Federal University of Lafia</text>
</svg>`;
}

function writeFlyer(event) {
  const dir = path.join(UPLOAD_DIR, "events");
  fs.mkdirSync(dir, { recursive: true });
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${event.eventDate}T12:00:00Z`));
  const priceLabel =
    event.ticketType === "free" ? "Free entry" : `NGN ${Number(event.price).toLocaleString("en-NG")}`;
  const svg = flyerSvg({
    title: event.title,
    category: event.category,
    date: dateLabel,
    venue: event.venue,
    price: priceLabel,
  });
  // Include a content hash so a reseed never reuses a filename the browser
  // may still hold in its immutable image cache.
  const hash = createHash("sha1").update(svg).digest("hex").slice(0, 8);
  const name = `sample-${event.slug}-${hash}.svg`;
  fs.writeFileSync(path.join(dir, name), svg);
  return name;
}

function upsertUser(db, user) {
  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(user.email);
  if (existing) {
    // Refresh demo passwords so the documented logins always work on reseed.
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      hashPassword(user.password),
      nowISO(),
      existing.id,
    );
    return existing.id;
  }
  const id = randomUUID();
  const now = nowISO();
  db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, organization_name,
      contact_phone, contact_email, is_blocked, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    id,
    user.fullName,
    user.email,
    user.phone || null,
    hashPassword(user.password),
    user.role,
    user.organizationName || null,
    user.contactPhone || null,
    user.contactEmail || user.email,
    now,
    now,
  );
  return id;
}

function seedEvent(db, organizerId, event) {
  const existing = db.prepare("SELECT id FROM events WHERE title = ?").get(event.title);
  if (existing) return { id: existing.id, skipped: true };

  const id = randomUUID();
  const flyer = writeFlyer(event);
  const now = nowISO();
  db.prepare(
    `INSERT INTO events (id, organizer_id, title, category, description, event_date, start_time, end_time,
      venue, flyer_path, ticket_type, price, capacity, registration_deadline, contact_type, contact_value,
      contact_phone, contact_email, status, featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
  ).run(
    id,
    organizerId,
    event.title,
    event.category,
    event.description,
    event.eventDate,
    event.startTime,
    event.endTime,
    event.venue,
    flyer,
    event.ticketType,
    event.price || 0,
    event.capacity ?? null,
    event.deadline ?? null,
    event.ticketType === "paid" ? "whatsapp" : null,
    event.ticketType === "paid" ? event.contactValue : null,
    event.contactPhone,
    event.contactEmail,
    event.featured ? 1 : 0,
    now,
    now,
  );
  return { id, skipped: false };
}

function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);

  const adminId = upsertUser(db, {
    fullName: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
    phone: "08030000000",
  });

  const organizerId = upsertUser(db, {
    fullName: "FULAFIA Events Demo",
    email: "musa.adamu@example.com",
    password: "Organiser123!",
    role: "organizer",
    phone: "08031234567",
    organizationName: "Campus Events Demo",
    contactPhone: "08031234567",
    contactEmail: "musa.adamu@example.com",
  });

  upsertUser(db, {
    fullName: "Aisha Mohammed",
    email: "student@fulafia.edu.ng",
    password: "Student123!",
    role: "student",
    phone: "08031112222",
  });

  upsertUser(db, {
    fullName: "Peter Danjuma",
    email: "peter.danjuma@example.com",
    password: "Student123!",
    role: "student",
    phone: "08033334444",
  });

  db.prepare("DELETE FROM events WHERE substr(title, 1, 8) = '[Sample]'").run();

  const flyerDir = path.join(UPLOAD_DIR, "events");
  if (fs.existsSync(flyerDir)) {
    for (const file of fs.readdirSync(flyerDir)) {
      if (!file.startsWith("sample-")) continue;
      const referenced = db.prepare(
        `SELECT 1 FROM events WHERE flyer_path = ?
         UNION ALL
         SELECT 1 FROM manual_tickets WHERE flyer_path = ?`,
      ).get(file, file);
      if (!referenced) fs.rmSync(path.join(flyerDir, file), { force: true });
    }
  }

  const welcome = {
    slug: "welcome-demo",
    title: "Welcome to FULAFIA Campus Events",
    category: "social",
    description:
      "Welcome! This is the single demo event for trying out the FULAFIA Campus Events platform. It is demonstration content only, not an official university announcement. Organisers can create real events from the dashboard.",
    eventDate: isoDate(30),
    startTime: "10:00",
    endTime: "11:00",
    venue: "Campus Events Demo",
    ticketType: "free",
    capacity: null,
    contactPhone: "08031234567",
    contactEmail: "musa.adamu@example.com",
    featured: false,
  };
  const result = seedEvent(db, organizerId, welcome);

  db.close();

  console.log("Seed complete.");
  console.log(`Welcome event: ${result.skipped ? "already present" : "added"}. Old sample events removed.`);
  console.log("");
  console.log("Demo logins:");
  console.log(`  Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("  Student:  student@fulafia.edu.ng / Student123!");
  console.log("  Organiser: musa.adamu@example.com / Organiser123!");
}

main();
