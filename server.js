require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- HR: Employees API ---
app.get('/api/employees', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees ORDER BY branch, id ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, branch, shift, phone, position, birthday } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, branch, shift, phone, position, birthday]
    );
    res.json({ success: true, employee: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Store Management: Checklists API ---
app.get('/api/checklists', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM checklists ORDER BY branch, id ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checklists', async (req, res) => {
  try {
    const { branch, task_name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO checklists (branch, task_name, is_completed) VALUES ($1, $2, false) RETURNING *',
      [branch, task_name]
    );
    res.json({ success: true, checklist: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/checklists/:id', async (req, res) => {
  try {
    const { is_completed } = req.body;
    await pool.query('UPDATE checklists SET is_completed = $1 WHERE id = $2', [is_completed, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/checklists/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM checklists WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Inventory API ---
app.get('/api/inventory', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventory ORDER BY branch, item_name ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { item_name, category, quantity, unit, branch } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [item_name, category, quantity, unit, branch]
    );
    res.json({ success: true, item: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    await pool.query('UPDATE inventory SET quantity = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2', [quantity, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Finances & Sales API ---
app.get('/api/finances', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM daily_finances ORDER BY date DESC, branch ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/finances', async (req, res) => {
  try {
    const { branch, revenue, expenses, total_orders, cancelled_orders } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO daily_finances (branch, revenue, expenses, total_orders, cancelled_orders) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (date, branch) DO UPDATE SET revenue = daily_finances.revenue + EXCLUDED.revenue, expenses = daily_finances.expenses + EXCLUDED.expenses, total_orders = daily_finances.total_orders + EXCLUDED.total_orders, cancelled_orders = daily_finances.cancelled_orders + EXCLUDED.cancelled_orders RETURNING *',
      [branch, revenue, expenses, total_orders, cancelled_orders]
    );
    res.json({ success: true, finance: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
