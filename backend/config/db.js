import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Vercel serverless functions have a writable /tmp directory, but it is ephemeral.
// For local hosting, use ./data unless DATA_DIR is explicitly configured.
const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/employee-management-data' : path.join(projectRoot, 'data'));
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'employee_management.sqlite');
const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);
sqlite.function('NOW', now);
sqlite.function('CURDATE', today);
sqlite.function('CONCAT', { varargs: true }, (...args) => args.map(v => v == null ? '' : String(v)).join(''));
sqlite.function('YEAR', value => value ? Number(String(value).slice(0, 4)) : null);
sqlite.function('MONTH', value => value ? Number(String(value).slice(5, 7)) : null);
sqlite.function('TIMESTAMPDIFF', (unit, start, end) => {
  if (!start || !end) return null;
  const seconds = (new Date(String(end).replace(' ', 'T') + (String(end).includes('Z') ? '' : 'Z')) - new Date(String(start).replace(' ', 'T') + (String(start).includes('Z') ? '' : 'Z'))) / 1000;
  if (String(unit).toUpperCase() === 'SECOND') return Math.trunc(seconds);
  if (String(unit).toUpperCase() === 'MINUTE') return Math.trunc(seconds / 60);
  if (String(unit).toUpperCase() === 'HOUR') return Math.trunc(seconds / 3600);
  if (String(unit).toUpperCase() === 'DAY') return Math.trunc(seconds / 86400);
  return null;
});
sqlite.function('DATE_FORMAT', (value, format) => {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return null;
  const pad = n => String(n).padStart(2, '0');
  const tokens = {
    '%Y': String(d.getUTCFullYear()), '%m': pad(d.getUTCMonth() + 1), '%d': pad(d.getUTCDate()),
    '%H': pad(d.getUTCHours()), '%i': pad(d.getUTCMinutes()), '%s': pad(d.getUTCSeconds()),
    '%a': ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()],
    '%b': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
  };
  return String(format).replace(/%[YmdHisab]/g, token => tokens[token] ?? token);
});

const schemaPath = path.join(projectRoot, 'database', 'schema.sqlite.sql');
if (!fs.existsSync(schemaPath)) throw new Error(`SQLite schema not found: ${schemaPath}`);
sqlite.exec(fs.readFileSync(schemaPath, 'utf8'));

// Required lookup rows: account registration depends on role IDs 1-4 existing.
const insertRole = sqlite.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)');
[
  [1, 'Admin', 'Complete administrative access'],
  [2, 'HR', 'Human resources access'],
  [3, 'Manager', 'Team management access'],
  [4, 'Employee', 'Standard employee access']
].forEach(row => insertRole.run(...row));
const insertDepartment = sqlite.prepare('INSERT OR IGNORE INTO departments (id, name, code, description, status) VALUES (?, ?, ?, ?, ?)');
[
  [1, 'Engineering & Technology', 'ENG', 'Software engineering and IT operations', 'Active'],
  [2, 'Human Resources', 'HR', 'People operations', 'Active'],
  [3, 'Product & Design', 'PRD', 'Product and design', 'Active'],
  [4, 'Finance & Accounts', 'FIN', 'Finance and accounting', 'Active'],
  [5, 'Marketing & Growth', 'MKT', 'Marketing and communications', 'Active'],
  [6, 'Operations & Logistics', 'OPS', 'Operations and compliance', 'Active']
].forEach(row => insertDepartment.run(...row));

function normalizeSql(input) {
  let sql = String(input).replace(/\uFEFF/g, '').trim();
  // MySQL interval/date functions used by existing controllers.
  sql = sql.replace(/DATE_SUB\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+(DAY|MONTH|YEAR)\s*\)/gi,
    (_, n, unit) => `date(CURDATE(), '-${n} ${unit.toLowerCase()}s')`);
  sql = sql.replace(/TIMESTAMPDIFF\(\s*(SECOND|MINUTE|HOUR|DAY)\s*,/gi, "TIMESTAMPDIFF('$1',");
  sql = sql.replace(/\bON DUPLICATE KEY UPDATE\b/gi, 'ON CONFLICT DO UPDATE SET');
  sql = sql.replace(/VALUES\(\s*([a-zA-Z_][\w]*)\s*\)/gi, 'excluded.$1');
  return sql;
}

function query(sqlText, params = []) {
  const sql = normalizeSql(sqlText);
  const statement = sqlite.prepare(sql);
  if (/^\s*(SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(sql)) {
    return [statement.all(...(Array.isArray(params) ? params : [params])), []];
  }
  const result = statement.run(...(Array.isArray(params) ? params : [params]));
  return [{
    insertId: Number(result.lastInsertRowid || 0),
    affectedRows: Number(result.changes || 0),
    changedRows: Number(result.changes || 0),
    warningStatus: 0
  }, []];
}

const pool = {
  query: async (sql, params = []) => query(sql, params),
  execute: async (sql, params = []) => query(sql, params),
  getConnection: async () => ({
    query: async (sql, params = []) => query(sql, params),
    beginTransaction: async () => sqlite.exec('BEGIN'),
    commit: async () => sqlite.exec('COMMIT'),
    rollback: async () => { try { sqlite.exec('ROLLBACK'); } catch {} },
    release: () => {}
  }),
  end: async () => sqlite.close()
};

export async function testConnection() {
  try {
    sqlite.prepare('SELECT 1 AS ok').get();
    return true;
  } catch (error) {
    console.error('[Database] SQLite connection error:', error.message);
    return false;
  }
}

export default pool;
