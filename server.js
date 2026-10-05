require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
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

// --- Leave Requests API ---
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, e.name as employee_name, e.branch 
      FROM leave_requests l 
      JOIN employees e ON l.employee_id = e.id 
      ORDER BY l.request_date DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leave-requests', async (req, res) => {
  try {
    const { employee_id, request_date, reason, shift_time } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO leave_requests (employee_id, request_date, reason, shift_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [employee_id, request_date, reason, shift_time]
    );
    res.json({ success: true, request: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/leave-requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'Approved' or 'Rejected'
    await pool.query('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Shifts API ---
app.get('/api/shifts', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shifts ORDER BY work_date DESC, start_time ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/shifts', async (req, res) => {
  try {
    const { work_date, start_time, end_time, assigned_employees } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO shifts (work_date, start_time, end_time, assigned_employees) VALUES ($1, $2, $3, $4) RETURNING *',
      [work_date, start_time, end_time, JSON.stringify(assigned_employees)]
    );
    res.json({ success: true, shift: rows[0] });
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

// --- Inventory API (Kept as requested) ---
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

// --- Finance: Transactions API ---
app.get('/api/transactions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { trans_type, amount, category, creator } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO transactions (trans_type, amount, category, creator) VALUES ($1, $2, $3, $4) RETURNING *',
      [trans_type, amount, category, creator]
    );
    res.json({ success: true, transaction: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Finance: Daily Orders API ---
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM daily_orders ORDER BY order_date DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { order_date, total_orders, notes } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO daily_orders (order_date, total_orders, notes) VALUES ($1, $2, $3) ON CONFLICT (order_date) DO UPDATE SET total_orders = EXCLUDED.total_orders, notes = EXCLUDED.notes RETURNING *',
      [order_date, total_orders, notes]
    );
    res.json({ success: true, order: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Public Pages ---
app.get('/onboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboard.html'));
});

app.get('/leave-request', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leave.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
