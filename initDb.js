require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // often required for remote DBs
});

async function initDb() {
  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Employees Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        shift VARCHAR(50),
        phone VARCHAR(20),
        position VARCHAR(50),
        birthday VARCHAR(20)
      );
    `);

    // 2. Leave Records Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_records (
        id SERIAL PRIMARY KEY,
        month VARCHAR(10) NOT NULL,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        day INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        UNIQUE(month, employee_id, day)
      );
    `);

    // 3. Checklists Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY,
        branch VARCHAR(100) NOT NULL,
        task_name VARCHAR(200) NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE
      );
    `);

    // 4. Inventory Table (New for Store Management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(150) NOT NULL,
        category VARCHAR(50),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(20),
        branch VARCHAR(100) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Finance & Sales Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_finances (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        branch VARCHAR(100) NOT NULL,
        revenue NUMERIC(12, 2) DEFAULT 0,
        expenses NUMERIC(12, 2) DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        cancelled_orders INTEGER DEFAULT 0,
        UNIQUE(date, branch)
      );
    `);

    console.log('Tables created successfully.');

    // Seed Mock Data
    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) === 0) {
      console.log('Seeding mock employees...');
      const mockEmps = [
        ['John Doe', 'Downtown Branch', 'Morning Shift', '555-0101', 'Manager', '1990-05-15'],
        ['Jane Smith', 'Downtown Branch', 'Evening Shift', '555-0102', 'Barista', '1995-08-20'],
        ['Alice Johnson', 'Uptown Branch', 'Full Day', '555-0103', 'Store Lead', '1992-11-03'],
        ['Bob Williams', 'Uptown Branch', 'Morning Shift', '555-0104', 'Barista', '1998-02-14'],
        ['Charlie Brown', 'Mall Kiosk', 'Evening Shift', '555-0105', 'Cashier', '2000-07-22']
      ];
      
      for (const emp of mockEmps) {
        await client.query(
          'INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6)',
          emp
        );
      }
    }

    const { rows: invRows } = await client.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(invRows[0].count) === 0) {
      console.log('Seeding mock inventory...');
      const mockInventory = [
        ['Coffee Beans (Arabica)', 'Raw Materials', 50, 'kg', 'Downtown Branch'],
        ['Milk (Whole)', 'Dairy', 20, 'Liters', 'Downtown Branch'],
        ['Syrup (Vanilla)', 'Additives', 15, 'Bottles', 'Downtown Branch'],
        ['Paper Cups (M)', 'Packaging', 500, 'pcs', 'Uptown Branch'],
        ['Coffee Beans (Robusta)', 'Raw Materials', 30, 'kg', 'Uptown Branch']
      ];

      for (const item of mockInventory) {
        await client.query(
          'INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5)',
          item
        );
      }
    }

    const { rows: chkRows } = await client.query('SELECT COUNT(*) FROM checklists');
    if (parseInt(chkRows[0].count) === 0) {
      console.log('Seeding mock checklists...');
      const mockChecklists = [
        ['Downtown Branch', 'Clean espresso machine', false],
        ['Downtown Branch', 'Restock front display', true],
        ['Uptown Branch', 'Count cash register', false],
        ['Mall Kiosk', 'Wipe tables', true]
      ];

      for (const chk of mockChecklists) {
        await client.query(
          'INSERT INTO checklists (branch, task_name, is_completed) VALUES ($1, $2, $3)',
          chk
        );
      }
    }

    const { rows: finRows } = await client.query('SELECT COUNT(*) FROM daily_finances');
    if (parseInt(finRows[0].count) === 0) {
      console.log('Seeding mock daily finances...');
      const mockFinances = [
        ['Downtown Branch', 1500.50, 300.00, 120, 2],
        ['Uptown Branch', 2100.00, 450.00, 180, 5],
        ['Mall Kiosk', 850.75, 120.00, 75, 0]
      ];

      for (const fin of mockFinances) {
        await client.query(
          'INSERT INTO daily_finances (branch, revenue, expenses, total_orders, cancelled_orders) VALUES ($1, $2, $3, $4, $5)',
          fin
        );
      }
    }

    console.log('Database initialization and seeding completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.end();
  }
}

initDb();
