"""
create_org_databases.py — Creates realistic demo databases for each organisation.

Creates:
  acme_db   — for Acme Corporation  (retail/e-commerce domain)
  techstart_db — for TechStart Inc  (SaaS subscription domain)

Then connects each org to their database in the platform DB,
and updates their KPI tiles to use the correct tables.

Run once:
  python3 create_org_databases.py
"""
import os, sys
from dotenv import load_dotenv
load_dotenv(".env")

import psycopg
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.database import engine as platform_engine, Base
from app.models.user import User, UserRole
from app.models.org_db_config import OrgDbConfig
from app.models.kpi_tile import KPITile
from app.core.encryption import encrypt

# ── Get current OS user for DB connection ──────────────────────────────────────
import subprocess
DB_USER = subprocess.check_output(["whoami"]).decode().strip()
DB_HOST = "localhost"
DB_PORT = 5432

print(f"Using PostgreSQL user: {DB_USER}")

# ── Helper: create a database if it doesn't exist ──────────────────────────────
def create_database_if_not_exists(db_name: str):
    try:
        conn = psycopg.connect(f"dbname=postgres user={DB_USER} host={DB_HOST} port={DB_PORT}")
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"  ✅ Created database: {db_name}")
        else:
            print(f"  ℹ️  Database already exists: {db_name}")
        conn.close()
    except Exception as e:
        print(f"  ❌ Could not create {db_name}: {e}")
        sys.exit(1)


# ══════════════════════════════════════════════════════════════════════════════
# ACME CORPORATION DATABASE (Retail / E-Commerce)
# ══════════════════════════════════════════════════════════════════════════════
ACME_DDL_AND_SEED = """
-- Drop existing tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS monthly_revenue CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    city VARCHAR(80),
    country VARCHAR(80) DEFAULT 'India',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60),
    price NUMERIC(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    status VARCHAR(30) DEFAULT 'completed',
    total_amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);

-- Employees
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(60),
    designation VARCHAR(80),
    salary NUMERIC(10,2),
    joined_at DATE DEFAULT CURRENT_DATE
);

-- Monthly Revenue
CREATE TABLE monthly_revenue (
    id SERIAL PRIMARY KEY,
    month VARCHAR(20),
    year INT,
    revenue NUMERIC(12,2),
    expenses NUMERIC(12,2),
    profit NUMERIC(12,2)
);

-- Support Tickets
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    subject VARCHAR(200),
    status VARCHAR(30) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- ── SEED DATA ──────────────────────────────────────────────────────────────

-- Customers (30 records)
INSERT INTO customers (name, email, city, status, created_at) VALUES
('Raj Sharma',        'raj.sharma@gmail.com',       'Mumbai',    'active',   NOW() - INTERVAL '180 days'),
('Priya Nair',        'priya.nair@gmail.com',        'Bangalore', 'active',   NOW() - INTERVAL '150 days'),
('Amit Verma',        'amit.verma@yahoo.com',        'Delhi',     'active',   NOW() - INTERVAL '130 days'),
('Sunita Joshi',      'sunita.j@gmail.com',          'Pune',      'active',   NOW() - INTERVAL '120 days'),
('Vikram Singh',      'vikram.s@outlook.com',        'Chennai',   'active',   NOW() - INTERVAL '115 days'),
('Ananya Gupta',      'ananya.gupta@gmail.com',      'Hyderabad', 'active',   NOW() - INTERVAL '100 days'),
('Rohit Mehta',       'rohit.mehta@gmail.com',       'Kolkata',   'active',   NOW() - INTERVAL '95 days'),
('Divya Krishnan',    'divya.k@gmail.com',           'Jaipur',    'active',   NOW() - INTERVAL '90 days'),
('Karan Patel',       'karan.patel@gmail.com',       'Ahmedabad', 'active',   NOW() - INTERVAL '80 days'),
('Meera Iyer',        'meera.iyer@gmail.com',        'Bangalore', 'active',   NOW() - INTERVAL '75 days'),
('Sanjay Kapoor',     'sanjay.k@gmail.com',          'Delhi',     'active',   NOW() - INTERVAL '70 days'),
('Pooja Desai',       'pooja.d@yahoo.com',           'Mumbai',    'active',   NOW() - INTERVAL '65 days'),
('Arjun Reddy',       'arjun.reddy@gmail.com',       'Hyderabad', 'active',   NOW() - INTERVAL '60 days'),
('Kavya Menon',       'kavya.m@gmail.com',           'Chennai',   'inactive', NOW() - INTERVAL '55 days'),
('Deepak Nair',       'deepak.nair@gmail.com',       'Kochi',     'active',   NOW() - INTERVAL '50 days'),
('Shreya Agarwal',    'shreya.a@gmail.com',          'Lucknow',   'active',   NOW() - INTERVAL '45 days'),
('Ravi Kumar',        'ravi.kumar@gmail.com',         'Bangalore', 'active',   NOW() - INTERVAL '40 days'),
('Nisha Tiwari',      'nisha.t@gmail.com',           'Indore',    'active',   NOW() - INTERVAL '35 days'),
('Suresh Pillai',     'suresh.pillai@gmail.com',     'Kochi',     'inactive', NOW() - INTERVAL '30 days'),
('Lakshmi Rao',       'lakshmi.rao@gmail.com',       'Mysore',    'active',   NOW() - INTERVAL '25 days'),
('Mohan Das',         'mohan.das@gmail.com',         'Bhubaneswar','active',  NOW() - INTERVAL '20 days'),
('Geeta Shah',        'geeta.shah@gmail.com',        'Surat',     'active',   NOW() - INTERVAL '15 days'),
('Tarun Bose',        'tarun.bose@gmail.com',        'Kolkata',   'active',   NOW() - INTERVAL '12 days'),
('Rekha Choudhary',   'rekha.c@gmail.com',           'Jaipur',    'active',   NOW() - INTERVAL '10 days'),
('Prakash Naidu',     'prakash.n@gmail.com',         'Vijayawada','active',   NOW() - INTERVAL '8 days'),
('Swati Bhatt',       'swati.bhatt@gmail.com',       'Vadodara',  'active',   NOW() - INTERVAL '6 days'),
('Hemant Mishra',     'hemant.m@gmail.com',          'Patna',     'active',   NOW() - INTERVAL '5 days'),
('Lata Kulkarni',     'lata.k@gmail.com',            'Pune',      'active',   NOW() - INTERVAL '4 days'),
('Ganesh Iyer',       'ganesh.i@gmail.com',          'Chennai',   'active',   NOW() - INTERVAL '3 days'),
('Sarita Yadav',      'sarita.y@gmail.com',          'Kanpur',    'active',   NOW() - INTERVAL '2 days');

-- Products (15 records)
INSERT INTO products (name, category, price, stock_quantity, created_at) VALUES
('Wireless Earbuds Pro',      'Electronics',   2999.00, 150, NOW() - INTERVAL '200 days'),
('Smart Watch Series 5',      'Electronics',   8999.00,  80, NOW() - INTERVAL '180 days'),
('Office Chair Ergonomic',    'Furniture',     6500.00,  40, NOW() - INTERVAL '160 days'),
('Leather Laptop Bag',        'Accessories',   1800.00, 200, NOW() - INTERVAL '140 days'),
('Mechanical Keyboard RGB',   'Electronics',   3500.00,  90, NOW() - INTERVAL '120 days'),
('Standing Desk Adjustable',  'Furniture',    12000.00,  25, NOW() - INTERVAL '110 days'),
('Noise Cancelling Headphones','Electronics',  5500.00,  60, NOW() - INTERVAL '100 days'),
('Webcam 4K HD',              'Electronics',   4200.00,  70, NOW() - INTERVAL '90 days'),
('Portable Power Bank 20000', 'Electronics',   2200.00, 180, NOW() - INTERVAL '80 days'),
('Desk Lamp LED',             'Furniture',      999.00, 250, NOW() - INTERVAL '70 days'),
('Wireless Mouse',            'Electronics',   1500.00, 300, NOW() - INTERVAL '60 days'),
('Monitor 27 inch 4K',        'Electronics',  28000.00,  20, NOW() - INTERVAL '50 days'),
('USB-C Hub 7-in-1',          'Electronics',   2800.00, 120, NOW() - INTERVAL '40 days'),
('Cable Management Kit',      'Accessories',    650.00, 400, NOW() - INTERVAL '30 days'),
('Smartphone Stand Adjustable','Accessories',   850.00, 350, NOW() - INTERVAL '20 days');

-- Orders (50 records spread over past 6 months)
INSERT INTO orders (customer_id, status, total_amount, created_at) VALUES
(1,  'completed', 11999.00, NOW() - INTERVAL '170 days'),
(2,  'completed', 2999.00,  NOW() - INTERVAL '165 days'),
(3,  'completed', 8999.00,  NOW() - INTERVAL '160 days'),
(4,  'completed', 6500.00,  NOW() - INTERVAL '155 days'),
(5,  'completed', 3500.00,  NOW() - INTERVAL '150 days'),
(6,  'completed', 5500.00,  NOW() - INTERVAL '145 days'),
(7,  'completed', 14199.00, NOW() - INTERVAL '140 days'),
(8,  'completed', 2999.00,  NOW() - INTERVAL '135 days'),
(9,  'completed', 4200.00,  NOW() - INTERVAL '130 days'),
(10, 'completed', 2200.00,  NOW() - INTERVAL '125 days'),
(11, 'completed', 8999.00,  NOW() - INTERVAL '120 days'),
(12, 'completed', 6500.00,  NOW() - INTERVAL '115 days'),
(13, 'completed', 28000.00, NOW() - INTERVAL '110 days'),
(14, 'completed', 3500.00,  NOW() - INTERVAL '105 days'),
(15, 'completed', 2800.00,  NOW() - INTERVAL '100 days'),
(1,  'completed', 1500.00,  NOW() - INTERVAL '95 days'),
(2,  'completed', 999.00,   NOW() - INTERVAL '90 days'),
(3,  'completed', 5500.00,  NOW() - INTERVAL '85 days'),
(4,  'completed', 4200.00,  NOW() - INTERVAL '80 days'),
(5,  'completed', 2800.00,  NOW() - INTERVAL '75 days'),
(6,  'completed', 8999.00,  NOW() - INTERVAL '70 days'),
(7,  'completed', 2999.00,  NOW() - INTERVAL '65 days'),
(8,  'completed', 12650.00, NOW() - INTERVAL '60 days'),
(9,  'completed', 3500.00,  NOW() - INTERVAL '55 days'),
(10, 'completed', 6500.00,  NOW() - INTERVAL '50 days'),
(11, 'completed', 1800.00,  NOW() - INTERVAL '45 days'),
(12, 'completed', 2200.00,  NOW() - INTERVAL '40 days'),
(13, 'completed', 4200.00,  NOW() - INTERVAL '38 days'),
(14, 'completed', 28999.00, NOW() - INTERVAL '35 days'),
(15, 'completed', 2999.00,  NOW() - INTERVAL '32 days'),
(16, 'completed', 1500.00,  NOW() - INTERVAL '30 days'),
(17, 'completed', 5500.00,  NOW() - INTERVAL '28 days'),
(18, 'completed', 8999.00,  NOW() - INTERVAL '25 days'),
(19, 'completed', 2800.00,  NOW() - INTERVAL '22 days'),
(20, 'completed', 4200.00,  NOW() - INTERVAL '20 days'),
(21, 'completed', 3500.00,  NOW() - INTERVAL '18 days'),
(22, 'completed', 2999.00,  NOW() - INTERVAL '16 days'),
(23, 'completed', 6500.00,  NOW() - INTERVAL '14 days'),
(24, 'pending',   1800.00,  NOW() - INTERVAL '12 days'),
(25, 'completed', 2200.00,  NOW() - INTERVAL '10 days'),
(26, 'completed', 8999.00,  NOW() - INTERVAL '9 days'),
(27, 'pending',   3500.00,  NOW() - INTERVAL '7 days'),
(28, 'completed', 12000.00, NOW() - INTERVAL '5 days'),
(29, 'completed', 2999.00,  NOW() - INTERVAL '4 days'),
(30, 'completed', 4200.00,  NOW() - INTERVAL '3 days'),
(1,  'completed', 1500.00,  NOW() - INTERVAL '2 days'),
(2,  'completed', 2800.00,  NOW() - INTERVAL '1 day'),
(3,  'pending',   5500.00,  NOW()),
(4,  'completed', 999.00,   NOW());

-- Employees
INSERT INTO employees (name, department, designation, salary, joined_at) VALUES
('Amit Sharma',    'Sales',      'Sales Manager',         85000, '2022-01-10'),
('Neha Kulkarni',  'Sales',      'Sales Executive',       55000, '2022-03-15'),
('Rajan Mehta',    'Marketing',  'Marketing Head',        92000, '2021-06-01'),
('Divya Sharma',   'Marketing',  'Digital Marketing Exec',60000, '2022-08-20'),
('Suresh Nair',    'Operations', 'Operations Manager',    80000, '2021-11-05'),
('Pooja Reddy',    'Operations', 'Logistics Coordinator', 52000, '2023-01-12'),
('Kiran Patel',    'Finance',    'Finance Manager',       95000, '2021-04-01'),
('Smita Joshi',    'Finance',    'Accounts Executive',    58000, '2022-07-18'),
('Rahul Desai',    'IT',         'IT Manager',            90000, '2021-09-01'),
('Anjali Rao',     'IT',         'Software Developer',    75000, '2022-05-22'),
('Pradeep Verma',  'HR',         'HR Manager',            78000, '2021-12-01'),
('Rekha Singh',    'HR',         'HR Executive',          50000, '2023-03-05');

-- Monthly Revenue (last 12 months)
INSERT INTO monthly_revenue (month, year, revenue, expenses, profit) VALUES
('September', 2025, 520000, 380000, 140000),
('October',   2025, 610000, 410000, 200000),
('November',  2025, 890000, 520000, 370000),
('December',  2025, 1250000,650000, 600000),
('January',   2026, 480000, 360000, 120000),
('February',  2026, 530000, 380000, 150000),
('March',     2026, 680000, 430000, 250000),
('April',     2026, 720000, 450000, 270000),
('May',       2026, 760000, 470000, 290000),
('June',      2026, 810000, 490000, 320000),
('July',      2026, 855000, 510000, 345000),
('August',    2026, 420000, 280000, 140000);

-- Support Tickets
INSERT INTO support_tickets (customer_id, subject, status, priority, created_at, resolved_at) VALUES
(1, 'Order not delivered',        'resolved', 'high',   NOW()-INTERVAL '30 days', NOW()-INTERVAL '28 days'),
(3, 'Wrong item received',        'resolved', 'high',   NOW()-INTERVAL '25 days', NOW()-INTERVAL '23 days'),
(5, 'Refund request',             'open',     'medium', NOW()-INTERVAL '10 days', NULL),
(7, 'Product damaged',            'resolved', 'high',   NOW()-INTERVAL '20 days', NOW()-INTERVAL '18 days'),
(9, 'Billing query',              'open',     'low',    NOW()-INTERVAL '5 days',  NULL),
(2, 'Delivery delay',             'resolved', 'medium', NOW()-INTERVAL '15 days', NOW()-INTERVAL '14 days'),
(4, 'Size exchange request',      'open',     'medium', NOW()-INTERVAL '3 days',  NULL),
(6, 'Payment not processed',      'resolved', 'high',   NOW()-INTERVAL '12 days', NOW()-INTERVAL '11 days'),
(8, 'Product quality complaint',  'open',     'high',   NOW()-INTERVAL '2 days',  NULL),
(10,'Tracking number not found',  'resolved', 'low',    NOW()-INTERVAL '8 days',  NOW()-INTERVAL '7 days');
"""


# ══════════════════════════════════════════════════════════════════════════════
# TECHSTART INC DATABASE (SaaS / Subscriptions)
# ══════════════════════════════════════════════════════════════════════════════
TECHSTART_DDL_AND_SEED = """
-- Drop existing tables
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS monthly_revenue CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS features CASCADE;

-- Customers (SaaS users/companies)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(120) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    plan VARCHAR(30) DEFAULT 'starter',
    city VARCHAR(80),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription Plans
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    plan VARCHAR(30) NOT NULL,
    monthly_fee NUMERIC(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Logs (API calls / feature usage)
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    feature VARCHAR(80),
    calls_count INT DEFAULT 0,
    log_date DATE DEFAULT CURRENT_DATE
);

-- Employees
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(60),
    designation VARCHAR(80),
    salary NUMERIC(10,2),
    joined_at DATE DEFAULT CURRENT_DATE
);

-- Monthly Revenue
CREATE TABLE monthly_revenue (
    id SERIAL PRIMARY KEY,
    month VARCHAR(20),
    year INT,
    mrr NUMERIC(12,2),
    new_customers INT,
    churned_customers INT,
    arr NUMERIC(14,2)
);

-- Support Tickets
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    subject VARCHAR(200),
    category VARCHAR(60),
    status VARCHAR(30) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Features
CREATE TABLE features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    launch_date DATE
);

-- ── SEED DATA ──────────────────────────────────────────────────────────────

-- Customers (25 SaaS clients)
INSERT INTO customers (company_name, contact_name, email, plan, city, status, created_at) VALUES
('Nexus Analytics',     'Arun Kumar',     'arun@nexus.io',         'enterprise', 'Bangalore', 'active',   NOW()-INTERVAL '300 days'),
('Retail Vision',       'Suma Rao',       'suma@retailvision.com', 'professional','Mumbai',   'active',   NOW()-INTERVAL '280 days'),
('CloudEdge Systems',   'Deepak Nair',    'deepak@cloudedge.io',   'enterprise', 'Delhi',     'active',   NOW()-INTERVAL '250 days'),
('DataPulse Labs',      'Kritika Sharma', 'kritika@datapulse.io',  'professional','Pune',     'active',   NOW()-INTERVAL '220 days'),
('FinTech Bridge',      'Rahul Joshi',    'rahul@fintechb.com',    'enterprise', 'Mumbai',    'active',   NOW()-INTERVAL '200 days'),
('GreenLeaf Agri',      'Priya Shetty',   'priya@greenleaf.com',   'starter',    'Mysore',   'active',   NOW()-INTERVAL '180 days'),
('MediCare Diagnostics','Suresh Pillai',  'suresh@medicare.in',    'professional','Chennai',  'active',   NOW()-INTERVAL '160 days'),
('EduPath eLearning',   'Anjali Menon',   'anjali@edupath.in',     'starter',    'Kochi',    'active',   NOW()-INTERVAL '140 days'),
('Logistics Pro',       'Vijay Reddy',    'vijay@logisticspro.com','enterprise', 'Hyderabad', 'active',   NOW()-INTERVAL '120 days'),
('HRMax Solutions',     'Nisha Gupta',    'nisha@hrmax.co',        'professional','Bangalore','active',   NOW()-INTERVAL '100 days'),
('TravelGenie',         'Rohan Verma',    'rohan@travelgenie.in',  'starter',    'Jaipur',   'churned',  NOW()-INTERVAL '90 days'),
('AutoDrive Tech',      'Kavitha Iyer',   'kavitha@autodrive.io',  'professional','Pune',    'active',   NOW()-INTERVAL '80 days'),
('ShopSmart Retail',    'Manish Patel',   'manish@shopsmart.co',   'enterprise', 'Ahmedabad', 'active',   NOW()-INTERVAL '70 days'),
('HealthFirst Clinics', 'Laxmi Devi',     'laxmi@healthfirst.in',  'starter',    'Nagpur',   'active',   NOW()-INTERVAL '60 days'),
('CyberSec Partners',   'Anand Krishnan', 'anand@cybersec.io',     'professional','Delhi',   'active',   NOW()-INTERVAL '50 days'),
('RealEstate Hub',      'Shalini Bhat',   'shalini@rehub.co',      'starter',    'Bangalore','churned',  NOW()-INTERVAL '45 days'),
('FoodChain Analytics', 'Tarun Mehta',    'tarun@foodchain.io',    'enterprise', 'Mumbai',    'active',   NOW()-INTERVAL '40 days'),
('BankingTech AI',      'Divya Subramanian','divya@banktech.io',   'enterprise', 'Chennai',   'active',   NOW()-INTERVAL '35 days'),
('SocialBoost Media',   'Akash Sharma',   'akash@socialboost.in',  'professional','Bangalore','active',  NOW()-INTERVAL '30 days'),
('EnergyTrack Solutions','Reena Desai',   'reena@energytrack.co',  'starter',    'Surat',    'active',   NOW()-INTERVAL '25 days'),
('Pharma Analytics',    'Girish Nair',    'girish@pharmaai.in',    'enterprise', 'Hyderabad', 'active',   NOW()-INTERVAL '20 days'),
('InsureTech Pro',      'Sunita Rao',     'sunita@insuretech.io',  'professional','Mumbai',  'active',   NOW()-INTERVAL '15 days'),
('AgroSense',           'Kartik Jain',    'kartik@agrosense.io',   'starter',    'Indore',   'active',   NOW()-INTERVAL '10 days'),
('SpaceDesign 3D',      'Meena Pillai',   'meena@spacedesign.in',  'professional','Kochi',   'active',   NOW()-INTERVAL '7 days'),
('RetailAI Solutions',  'Pratik Verma',   'pratik@retailai.co',    'enterprise', 'Bangalore', 'active',   NOW()-INTERVAL '3 days');

-- Subscriptions
INSERT INTO subscriptions (customer_id, plan, monthly_fee, start_date, status) VALUES
(1, 'enterprise',    15000.00, '2025-10-01', 'active'),
(2, 'professional',   8000.00, '2025-10-15', 'active'),
(3, 'enterprise',    15000.00, '2025-11-01', 'active'),
(4, 'professional',   8000.00, '2025-12-01', 'active'),
(5, 'enterprise',    15000.00, '2025-12-15', 'active'),
(6, 'starter',        2500.00, '2026-01-01', 'active'),
(7, 'professional',   8000.00, '2026-01-15', 'active'),
(8, 'starter',        2500.00, '2026-02-01', 'active'),
(9, 'enterprise',    15000.00, '2026-02-15', 'active'),
(10,'professional',   8000.00, '2026-03-01', 'active'),
(11,'starter',        2500.00, '2026-03-15', 'churned'),
(12,'professional',   8000.00, '2026-04-01', 'active'),
(13,'enterprise',    15000.00, '2026-04-15', 'active'),
(14,'starter',        2500.00, '2026-05-01', 'active'),
(15,'professional',   8000.00, '2026-05-15', 'active'),
(16,'starter',        2500.00, '2026-06-01', 'churned'),
(17,'enterprise',    15000.00, '2026-06-15', 'active'),
(18,'enterprise',    15000.00, '2026-07-01', 'active'),
(19,'professional',   8000.00, '2026-07-15', 'active'),
(20,'starter',        2500.00, '2026-07-20', 'active'),
(21,'enterprise',    15000.00, '2026-07-25', 'active'),
(22,'professional',   8000.00, '2026-08-01', 'active'),
(23,'starter',        2500.00, '2026-08-05', 'active'),
(24,'professional',   8000.00, '2026-08-10', 'active'),
(25,'enterprise',    15000.00, '2026-08-12', 'active');

-- Monthly Revenue (MRR data)
INSERT INTO monthly_revenue (month, year, mrr, new_customers, churned_customers, arr) VALUES
('September', 2025, 45000,  2, 0,  540000),
('October',   2025, 68000,  3, 1,  816000),
('November',  2025, 83000,  2, 0,  996000),
('December',  2025, 98500,  3, 1, 1182000),
('January',   2026, 101000, 2, 0, 1212000),
('February',  2026, 117500, 2, 0, 1410000),
('March',     2026, 134000, 3, 1, 1608000),
('April',     2026, 157000, 3, 1, 1884000),
('May',       2026, 167500, 2, 0, 2010000),
('June',      2026, 182500, 3, 2, 2190000),
('July',      2026, 220500, 5, 0, 2646000),
('August',    2026, 243000, 4, 0, 2916000);

-- Features
INSERT INTO features (name, description, is_active, launch_date) VALUES
('Natural Language Query', 'Ask questions in plain English, get SQL results', TRUE, '2024-01-15'),
('Auto Visualization',     'Automatic chart generation for query results',    TRUE, '2024-03-01'),
('Query History',          'Browse and replay past queries',                  TRUE, '2024-04-10'),
('KPI Dashboard',          'Custom metric tiles with live SQL execution',     TRUE, '2024-06-01'),
('Admin Workspace',        'Full SQL editor with commit/rollback support',    TRUE, '2024-07-15'),
('Audit Log',              'Complete trail of all admin actions',             TRUE, '2024-08-01'),
('Employee Approval',      'Join-code-based self-registration with approval', TRUE, '2024-09-01'),
('SuperAdmin Portal',      'Platform-wide management for developers',         TRUE, '2025-01-01'),
('Saved Charts',           'Save and revisit chart visualizations',           FALSE, NULL),
('Email Notifications',    'Email alerts for approvals and events',           FALSE, NULL);

-- Support Tickets
INSERT INTO support_tickets (customer_id, subject, category, status, priority, created_at, resolved_at) VALUES
(1,  'API rate limit exceeded',         'Technical', 'resolved', 'high',   NOW()-INTERVAL '60 days', NOW()-INTERVAL '59 days'),
(3,  'Dashboard not loading',           'Bug',       'resolved', 'high',   NOW()-INTERVAL '45 days', NOW()-INTERVAL '44 days'),
(5,  'Billing discrepancy',             'Billing',   'open',     'medium', NOW()-INTERVAL '10 days', NULL),
(7,  'Feature request: CSV export',     'Feature',   'open',     'low',    NOW()-INTERVAL '30 days', NULL),
(9,  'Slow query performance',          'Technical', 'resolved', 'medium', NOW()-INTERVAL '25 days', NOW()-INTERVAL '23 days'),
(2,  'Integration with Salesforce',     'Integration','open',    'medium', NOW()-INTERVAL '15 days', NULL),
(4,  'Custom chart types needed',       'Feature',   'open',     'low',    NOW()-INTERVAL '8 days',  NULL),
(6,  'Login issue with SSO',            'Technical', 'resolved', 'high',   NOW()-INTERVAL '20 days', NOW()-INTERVAL '19 days'),
(8,  'Data not refreshing',             'Bug',       'open',     'high',   NOW()-INTERVAL '3 days',  NULL),
(10, 'Upgrade plan query',              'Billing',   'resolved', 'low',    NOW()-INTERVAL '5 days',  NOW()-INTERVAL '4 days');
"""


# ══════════════════════════════════════════════════════════════════════════════
# KPI TILES per organisation
# ══════════════════════════════════════════════════════════════════════════════
ACME_KPI_TILES = [
    {
        "title": "Total Revenue",
        "description": "Total revenue from all completed orders",
        "sql_query": "SELECT TO_CHAR(SUM(total_amount), 'FM₹99,99,99,999') AS total_revenue FROM orders WHERE status = 'completed'",
        "position": 0,
    },
    {
        "title": "Total Orders",
        "description": "Total number of orders placed",
        "sql_query": "SELECT COUNT(*) AS total_orders FROM orders",
        "position": 1,
    },
    {
        "title": "Active Customers",
        "description": "Customers with active status",
        "sql_query": "SELECT COUNT(*) AS active_customers FROM customers WHERE status = 'active'",
        "position": 2,
    },
    {
        "title": "Orders This Month",
        "description": "Orders placed in the current month",
        "sql_query": "SELECT COUNT(*) AS orders_this_month FROM orders WHERE created_at >= DATE_TRUNC('month', NOW())",
        "position": 3,
    },
    {
        "title": "Revenue by Month (Last 6)",
        "description": "Monthly revenue trend for the last 6 months",
        "sql_query": "SELECT month, revenue FROM monthly_revenue WHERE year = 2026 ORDER BY id DESC LIMIT 6",
        "position": 4,
    },
    {
        "title": "Top Products by Category",
        "description": "Number of products per category",
        "sql_query": "SELECT category, COUNT(*) AS product_count FROM products GROUP BY category ORDER BY product_count DESC",
        "position": 5,
    },
]

TECHSTART_KPI_TILES = [
    {
        "title": "Monthly Recurring Revenue",
        "description": "Current month MRR",
        "sql_query": "SELECT TO_CHAR(mrr, 'FM₹99,99,99,999') AS mrr FROM monthly_revenue ORDER BY id DESC LIMIT 1",
        "position": 0,
    },
    {
        "title": "Active Subscriptions",
        "description": "Number of active paying customers",
        "sql_query": "SELECT COUNT(*) AS active_subscriptions FROM subscriptions WHERE status = 'active'",
        "position": 1,
    },
    {
        "title": "Total Customers",
        "description": "Total customers onboarded",
        "sql_query": "SELECT COUNT(*) AS total_customers FROM customers",
        "position": 2,
    },
    {
        "title": "Customers by Plan",
        "description": "Distribution across starter, professional, enterprise",
        "sql_query": "SELECT plan, COUNT(*) AS customer_count FROM customers WHERE status = 'active' GROUP BY plan ORDER BY customer_count DESC",
        "position": 3,
    },
    {
        "title": "MRR Growth (Last 6 Months)",
        "description": "Monthly recurring revenue trend",
        "sql_query": "SELECT month, mrr FROM monthly_revenue WHERE year = 2026 ORDER BY id DESC LIMIT 6",
        "position": 4,
    },
    {
        "title": "Open Support Tickets",
        "description": "Unresolved support tickets by priority",
        "sql_query": "SELECT priority, COUNT(*) AS ticket_count FROM support_tickets WHERE status = 'open' GROUP BY priority ORDER BY ticket_count DESC",
        "position": 5,
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    print("\n" + "="*60)
    print("  SQLense — Creating Organisation Databases")
    print("="*60 + "\n")

    # Step 1: Create databases
    print("📦 Step 1: Creating PostgreSQL databases...")
    create_database_if_not_exists("acme_db")
    create_database_if_not_exists("techstart_db")

    # Step 2: Populate databases
    print("\n🌱 Step 2: Seeding Acme Corporation database (acme_db)...")
    acme_engine = create_engine(f"postgresql+psycopg://{DB_USER}@{DB_HOST}:{DB_PORT}/acme_db")
    with acme_engine.connect() as conn:
        conn.execute(text(ACME_DDL_AND_SEED))
        conn.commit()
    print("  ✅ acme_db seeded: customers, products, orders, employees, monthly_revenue, support_tickets")

    print("\n🌱 Step 3: Seeding TechStart Inc database (techstart_db)...")
    techstart_engine = create_engine(f"postgresql+psycopg://{DB_USER}@{DB_HOST}:{DB_PORT}/techstart_db")
    with techstart_engine.connect() as conn:
        conn.execute(text(TECHSTART_DDL_AND_SEED))
        conn.commit()
    print("  ✅ techstart_db seeded: customers, subscriptions, employees, monthly_revenue, features, support_tickets")

    # Step 3: Connect each org to their database in platform
    print("\n🔗 Step 4: Connecting organisations to their databases...")
    with Session(bind=platform_engine) as db:
        # Get admins
        acme_admin = db.query(User).filter(User.email == "admin@acme.com").first()
        tech_admin = db.query(User).filter(User.email == "admin@techstart.com").first()

        if not acme_admin or not tech_admin:
            print("  ❌ Admins not found — run seed_data.py first!")
            return

        # Upsert Acme DB config
        acme_cfg = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == acme_admin.org_id).first()
        if not acme_cfg:
            acme_cfg = OrgDbConfig(org_id=acme_admin.org_id)
            db.add(acme_cfg)

        from datetime import datetime, timezone
        acme_cfg.host = DB_HOST
        acme_cfg.port = DB_PORT
        acme_cfg.database_name = "acme_db"
        acme_cfg.username = DB_USER
        acme_cfg.encrypted_password = encrypt("")  # no password for local postgres
        acme_cfg.connection_status = "connected"
        acme_cfg.last_connected_at = datetime.now(timezone.utc)

        # Upsert TechStart DB config
        tech_cfg = db.query(OrgDbConfig).filter(OrgDbConfig.org_id == tech_admin.org_id).first()
        if not tech_cfg:
            tech_cfg = OrgDbConfig(org_id=tech_admin.org_id)
            db.add(tech_cfg)

        tech_cfg.host = DB_HOST
        tech_cfg.port = DB_PORT
        tech_cfg.database_name = "techstart_db"
        tech_cfg.username = DB_USER
        tech_cfg.encrypted_password = encrypt("")
        tech_cfg.connection_status = "connected"
        tech_cfg.last_connected_at = datetime.now(timezone.utc)


        db.commit()
        print(f"  ✅ Acme Corporation → acme_db (user={DB_USER})")
        print(f"  ✅ TechStart Inc    → techstart_db (user={DB_USER})")

        # Step 4: Replace KPI tiles
        print("\n📊 Step 5: Updating KPI tiles for each organisation...")

        # Remove old seeded tiles
        db.query(KPITile).filter(KPITile.org_id == acme_admin.org_id).delete()
        db.query(KPITile).filter(KPITile.org_id == tech_admin.org_id).delete()
        db.flush()

        for tile_data in ACME_KPI_TILES:
            db.add(KPITile(
                org_id=acme_admin.org_id,
                created_by=acme_admin.id,
                **tile_data,
            ))

        for tile_data in TECHSTART_KPI_TILES:
            db.add(KPITile(
                org_id=tech_admin.org_id,
                created_by=tech_admin.id,
                **tile_data,
            ))

        db.commit()
        print(f"  ✅ {len(ACME_KPI_TILES)} KPI tiles created for Acme Corporation")
        print(f"  ✅ {len(TECHSTART_KPI_TILES)} KPI tiles created for TechStart Inc")

    print("\n" + "="*60)
    print("  🎉 Done! Org databases ready.")
    print("="*60)
    print("""
  Databases created:
    acme_db      → Retail/E-Commerce (customers, orders, products, revenue)
    techstart_db → SaaS (customers, subscriptions, MRR, features)

  You can now:
    • Login as admin@acme.com     → KPI Dashboard will show real data
    • Login as admin@techstart.com → KPI Dashboard will show SaaS metrics
    • Use AI chat to query these databases in natural language
""")


if __name__ == "__main__":
    main()
