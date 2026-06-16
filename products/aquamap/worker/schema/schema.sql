CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  assignee TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  due TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  due TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  email TEXT,
  product TEXT NOT NULL DEFAULT 'aquamap',
  status TEXT NOT NULL,
  price_id TEXT,
  subscription_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
