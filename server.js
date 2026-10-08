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

// ==========================================
// 1. DATABASE INITIALIZATION & MOCK DATA
// ==========================================
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 1. Tạo các bảng nếu chưa có
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, branch VARCHAR(100), shift VARCHAR(50),
        phone VARCHAR(20), position VARCHAR(50), birthday DATE, start_date DATE DEFAULT CURRENT_DATE, status VARCHAR(20) DEFAULT 'Hoạt động'
      );
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY, work_date DATE NOT NULL, start_time TIME, end_time TIME, assigned_employees JSONB DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE, request_date DATE NOT NULL,
        reason TEXT, shift_time VARCHAR(50), status VARCHAR(20) DEFAULT 'Chờ duyệt', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY, branch VARCHAR(100), task_name VARCHAR(200), is_completed BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY, item_name VARCHAR(150), category VARCHAR(50), quantity INTEGER DEFAULT 0, unit VARCHAR(20),
        branch VARCHAR(100), last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY, trans_type VARCHAR(10), amount NUMERIC(12, 2), category VARCHAR(100),
        creator VARCHAR(100), trans_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS daily_orders (
        id SERIAL PRIMARY KEY, order_date DATE NOT NULL UNIQUE, total_orders INTEGER DEFAULT 0, revenue NUMERIC(12,2) DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, category VARCHAR(50), price NUMERIC(10,2) NOT NULL, image_icon VARCHAR(50) DEFAULT 'fa-mug-hot'
      );
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY, name VARCHAR(100), phone VARCHAR(20) UNIQUE, points INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS attendances (
        id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE, work_date DATE DEFAULT CURRENT_DATE, 
        check_in TIME, check_out TIME, status VARCHAR(50) DEFAULT 'Đúng giờ'
      );
    `);

    // 2. Kiểm tra và nạp dữ liệu mồi TỰ ĐỘNG nếu trống
    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) === 0) {
      console.log('Bắt đầu nạp dữ liệu mồi tự động...');
      
      const branches = ['StoreMate Central - Q1', 'StoreMate Hub - Gò Vấp', 'StoreMate Express - Q7', 'Kho Tổng'];
      
      // Employees
      const mockEmps = [
        ['Trần Lê Hoàng Anh', branches[0], 'Ca Sáng', '0901234567', 'Cửa hàng trưởng', '1995-05-12'],
        ['Nguyễn Phương Thảo', branches[0], 'Ca Chiều', '0912345678', 'Barista', '1998-08-22'],
        ['Lê Minh Quân', branches[0], 'Ca Sáng', '0923456789', 'Phục vụ', '2001-01-15'],
        ['Phạm Thu Trang', branches[1], 'Full-time', '0934567890', 'Cửa hàng trưởng', '1993-11-05'],
        ['Vũ Đức Hải', branches[1], 'Ca Chiều', '0945678901', 'Barista', '1999-04-10']
      ];
      for (let e of mockEmps) await client.query('INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6)', e);

      // Inventory
      await client.query("INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ('Cà phê hạt nguyên chất', 'Nguyên liệu', 45, 'kg', 'StoreMate Central - Q1')");
      await client.query("INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ('Sữa tươi', 'Nguyên liệu', 5, 'thùng', 'StoreMate Central - Q1')");
      await client.query("INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ('Trà Olong', 'Nguyên liệu', 12, 'kg', 'StoreMate Hub - Gò Vấp')");
      await client.query("INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ('Ly nhựa 500ml', 'Bao bì', 2000, 'cái', 'StoreMate Central - Q1')");
      
      // Products (Menu)
      const menu = [
        ['Cà Phê Đen Đá', 'Cà phê', 25000, 'fa-mug-hot'],
        ['Bạc Xỉu', 'Cà phê', 35000, 'fa-glass-water'],
        ['Trà Đào Cam Sả', 'Trà trái cây', 45000, 'fa-leaf'],
        ['Trà Vải Nhiệt Đới', 'Trà trái cây', 45000, 'fa-leaf'],
        ['Matcha Latte', 'Đồ uống đá xay', 55000, 'fa-mug-saucer'],
        ['Bánh Sừng Trâu', 'Bánh ngọt', 30000, 'fa-bread-slice'],
        ['Tiramisu', 'Bánh ngọt', 40000, 'fa-cake-candles'],
        ['Trà Sữa Trân Châu', 'Trà sữa', 40000, 'fa-cup-togo']
      ];
      for(let p of menu) await client.query('INSERT INTO products (name, category, price, image_icon) VALUES ($1, $2, $3, $4)', p);

      // Customers
      await client.query("INSERT INTO customers (name, phone, points) VALUES ('Chị Mai', '0909999888', 150)");
      await client.query("INSERT INTO customers (name, phone, points) VALUES ('Anh Hùng', '0911222333', 45)");

      // Transactions & Orders
      for(let i=6; i>=0; i--) {
        let dateStr = `CURRENT_DATE - INTERVAL '${i} day'`;
        let rev = Math.floor(Math.random()*5000000) + 2000000;
        let ords = Math.floor(Math.random()*50) + 20;
        await client.query(`INSERT INTO daily_orders (order_date, total_orders, revenue) VALUES (${dateStr}, ${ords}, ${rev})`);
        if(i===0) await client.query(`INSERT INTO transactions (trans_type, amount, category, creator, trans_date) VALUES ('Thu', ${rev}, 'Doanh thu trong ngày', 'Hệ thống', CURRENT_DATE)`);
      }
      
      // Leave Requests
      await client.query(`INSERT INTO leave_requests (employee_id, request_date, reason, shift_time, status) VALUES (2, CURRENT_DATE + INTERVAL '2 day', 'Khám sức khỏe định kỳ', 'Ca Sáng', 'Chờ duyệt')`);
      await client.query(`INSERT INTO leave_requests (employee_id, request_date, reason, shift_time, status) VALUES (5, CURRENT_DATE + INTERVAL '5 day', 'Xin nghỉ về quê', 'Full-time', 'Chờ duyệt')`);
    }
  } catch (err) {
    console.error('Lỗi Database (Initialize):', err);
  } finally {
    client.release();
  }
}

// Khởi chạy ngầm DB
initializeDatabase().catch(console.error);

// ==========================================
// 2. APIs
// ==========================================
const handleQuery = async (res, queryStr, params = []) => {
  try {
    const { rows } = await pool.query(queryStr, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Products & POS ---
app.get('/api/products', (req, res) => handleQuery(res, 'SELECT * FROM products ORDER BY category, id'));
app.post('/api/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { total, phone, payment_method } = req.body;
    
    // Ghi giao dịch
    await client.query("INSERT INTO transactions (trans_type, amount, category, creator) VALUES ('Thu', $1, $2, 'Thu ngân POS')", [total, `Doanh thu POS - ${payment_method}`]);
    // Cập nhật daily orders
    await client.query("INSERT INTO daily_orders (order_date, total_orders, revenue) VALUES (CURRENT_DATE, 1, $1) ON CONFLICT (order_date) DO UPDATE SET total_orders = daily_orders.total_orders + 1, revenue = daily_orders.revenue + $1", [total]);
    // Tích điểm
    if (phone) {
      const pts = Math.floor(total / 10000);
      await client.query("UPDATE customers SET points = points + $1 WHERE phone = $2", [pts, phone]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- CRM & Attendance ---
app.get('/api/customers', (req, res) => handleQuery(res, 'SELECT * FROM customers ORDER BY points DESC'));
app.get('/api/attendances', (req, res) => handleQuery(res, 'SELECT a.*, e.name as emp_name FROM attendances a JOIN employees e ON a.employee_id = e.id WHERE a.work_date = CURRENT_DATE ORDER BY a.check_in DESC'));
app.post('/api/attendance/check', async (req, res) => {
  try {
    const { emp_id, type } = req.body;
    if(type === 'in') {
      await pool.query('INSERT INTO attendances (employee_id, check_in) VALUES ($1, CURRENT_TIME)', [emp_id]);
    } else {
      await pool.query('UPDATE attendances SET check_out = CURRENT_TIME WHERE employee_id = $1 AND work_date = CURRENT_DATE AND check_out IS NULL', [emp_id]);
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// --- Dashboard & Core ---
app.get('/api/dashboard', async (req, res) => {
  try {
    const rev = await pool.query("SELECT SUM(amount) as t FROM transactions WHERE trans_type = 'Thu' AND trans_date = CURRENT_DATE");
    const ord = await pool.query("SELECT SUM(total_orders) as o FROM daily_orders WHERE order_date = CURRENT_DATE");
    const emp = await pool.query("SELECT COUNT(*) FROM employees WHERE status = 'Hoạt động'");
    const chart = await pool.query("SELECT TO_CHAR(order_date, 'DD/MM') as date, revenue FROM daily_orders ORDER BY order_date ASC LIMIT 7");
    
    res.json({
      todayRev: rev.rows[0].t || 0,
      todayOrders: ord.rows[0].o || 0,
      empCount: emp.rows[0].count,
      chartData: chart.rows
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/employees', (req, res) => handleQuery(res, 'SELECT * FROM employees ORDER BY id DESC'));
app.post('/api/employees', (req, res) => handleQuery(res, 'INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.body.name, req.body.branch, req.body.shift, req.body.phone, req.body.position, req.body.birthday]));

app.get('/api/inventory', (req, res) => handleQuery(res, 'SELECT * FROM inventory ORDER BY item_name ASC'));
app.get('/api/transactions', (req, res) => handleQuery(res, 'SELECT * FROM transactions ORDER BY created_at DESC'));

app.get('/api/leave-requests', (req, res) => handleQuery(res, 'SELECT l.*, e.name as employee_name FROM leave_requests l JOIN employees e ON l.employee_id = e.id ORDER BY l.request_date DESC'));
app.put('/api/leave-requests/:id/status', (req, res) => handleQuery(res, 'UPDATE leave_requests SET status = $1 WHERE id = $2', [req.body.status, req.params.id]));

app.get('/api/shifts', (req, res) => handleQuery(res, 'SELECT * FROM shifts ORDER BY work_date DESC'));

// --- Frontend Routes ---
app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pos.html')));
app.get('/onboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'onboard.html')));
app.get('/leave-request', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leave.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(process.env.PORT || 3000, () => console.log('StoreMate OS Backend Ready'));
