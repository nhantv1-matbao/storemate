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
  connectionString: process.env.DATABASE_URL
});

// ==========================================
// 1. DATABASE INITIALIZATION & MOCK DATA
// ==========================================
async function initializeDatabase(forceSeed = false) {
  const client = await pool.connect();
  try {
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

    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) < 100 || forceSeed) {
      console.log('Bắt đầu nạp siêu dữ liệu Vibehost (100 NV, 30 Menu, 100+ Kho, 500 KH, 30 ngày Finance)...');
      await client.query('TRUNCATE employees, shifts, leave_requests, checklists, inventory, transactions, daily_orders, products, customers, attendances RESTART IDENTITY CASCADE');

      const branches = ['StoreMate Central - Q1', 'StoreMate Hub - Gò Vấp', 'StoreMate Express - Q7', 'Kho Tổng'];
      const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Đinh', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
      const dem = ['Thị', 'Văn', 'Ngọc', 'Hữu', 'Minh', 'Thanh', 'Thu', 'Bá', 'Quốc', 'Tuấn', 'Hải', 'Thùy', 'Mai', 'Xuân'];
      const ten = ['Anh', 'Bình', 'Châu', 'Dương', 'Giang', 'Hùng', 'Khánh', 'Linh', 'Nhung', 'Phát', 'Quang', 'Sơn', 'Tâm', 'Vy', 'Trang', 'Phương', 'Bảo', 'Long'];

      // 1. Generate 100 Employees
      for(let i=1; i<=100; i++) {
        let name = ho[i%ho.length] + ' ' + dem[i%dem.length] + ' ' + ten[i%ten.length];
        let branch = branches[i%branches.length];
        let shift = (i%3===0) ? 'Ca Sáng' : ((i%2===0) ? 'Ca Chiều' : 'Full-time');
        let phone = '09' + Math.floor(10000000 + Math.random()*90000000);
        let pos = (i%15===0) ? 'Quản lý' : (i%5===0 ? 'Barista Chính' : 'Phục vụ');
        let bday = `199${i%10}-0${(i%9)+1}-1${i%9}`;
        await client.query('INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6)', [name, branch, shift, phone, pos, bday]);
      }

      // 2. Generate 100+ Inventory Items
      const invPrefix = ['Cà phê', 'Trà', 'Siro', 'Sữa', 'Ly', 'Ống hút', 'Túi', 'Bánh', 'Đường', 'Trái cây'];
      for(let i=1; i<=110; i++) {
        let item = invPrefix[i%invPrefix.length] + ' Loại ' + i;
        let cat = (i%4===0) ? 'Bao bì' : 'Nguyên liệu';
        let branch = branches[i%branches.length];
        let qty = Math.floor(Math.random()*500);
        await client.query('INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5)', [item, cat, qty, 'Đơn vị', branch]);
      }

      // 3. Generate 30 Menu Items
      const menuNames = [
        'Cà Phê Đen Đá', 'Cà Phê Sữa Đá', 'Bạc Xỉu', 'Espresso', 'Americano', 'Cappuccino', 'Latte', 'Mocha', 'Caramel Macchiato', 'Cold Brew',
        'Trà Đào Cam Sả', 'Trà Vải Nhiệt Đới', 'Trà Sen Vàng', 'Trà Ô Long Macchiato', 'Trà Đen Khứu Giác', 'Trà Sữa Trân Châu', 'Trà Sữa Matcha', 'Trà Sữa Khoai Môn',
        'Sinh Tố Bơ', 'Sinh Tố Dâu', 'Sinh Tố Xoài', 'Nước Ép Cam', 'Nước Ép Táo', 'Nước Ép Thơm',
        'Bánh Sừng Trâu', 'Tiramisu', 'Bánh Mì Que', 'Cheesecake', 'Macaron', 'Bánh Quy Bơ'
      ];
      
      const coffeeImg = 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=300&q=80';
      const teaImg = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&q=80';
      const smoothieImg = 'https://images.unsplash.com/photo-1628557044797-f21a177c37ec?w=300&q=80';
      const cakeImg = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&q=80';

      for(let i=0; i<30; i++) {
        let cat = (i<10) ? 'Cà phê' : (i<18 ? 'Trà' : (i<24 ? 'Sinh tố & Ép' : 'Bánh ngọt'));
        let price = Math.floor(Math.random()*4 + 2) * 10000;
        let img = (cat==='Cà phê') ? coffeeImg : (cat==='Trà' ? teaImg : (cat==='Bánh ngọt' ? cakeImg : smoothieImg));
        await client.query('INSERT INTO products (name, category, price, image_icon) VALUES ($1, $2, $3, $4)', [menuNames[i], cat, price, img]);
      }

      // 4. Generate 500 Customers
      for(let i=1; i<=500; i++) {
        let name = ho[Math.floor(Math.random()*ho.length)] + ' ' + ten[Math.floor(Math.random()*ten.length)];
        let phone = '09' + Math.floor(10000000 + Math.random()*90000000);
        let pts = Math.floor(Math.random()*200);
        try { await client.query('INSERT INTO customers (name, phone, points) VALUES ($1, $2, $3)', [name, phone, pts]); } catch(e){} // ignore unique phone collisions
      }

      // 5. Generate 30 Days of Finance & Orders
      const transCategories = ['Doanh thu POS - Tiền mặt', 'Doanh thu POS - Chuyển khoản', 'Doanh thu GrabFood', 'Doanh thu ShopeeFood', 'Thanh toán VNPay'];
      for(let i=30; i>=0; i--) {
        let dateStr = `CURRENT_DATE - INTERVAL '${i} day'`;
        
        // Randomly generate 3-5 income sources per day
        let dailyRev = 0;
        let dailyOrds = Math.floor(Math.random()*150) + 50;
        
        let incomes = Math.floor(Math.random()*3) + 3; // 3 to 5 transactions per day
        for(let j=0; j<incomes; j++) {
           let amount = Math.floor(Math.random()*3000000) + 1000000;
           dailyRev += amount;
           let cat = transCategories[Math.floor(Math.random()*transCategories.length)];
           await client.query(`INSERT INTO transactions (trans_type, amount, category, creator, trans_date) VALUES ('Thu', ${amount}, '${cat}', 'Hệ thống', ${dateStr})`);
        }
        
        // Sometimes insert an expense
        if(Math.random() > 0.5) {
          let exp = Math.floor(Math.random()*1000000) + 500000;
          await client.query(`INSERT INTO transactions (trans_type, amount, category, creator, trans_date) VALUES ('Chi', ${exp}, 'Nhập hàng nhà cung cấp', 'Quản lý', ${dateStr})`);
        }

        await client.query(`INSERT INTO daily_orders (order_date, total_orders, revenue) VALUES (${dateStr}, ${dailyOrds}, ${dailyRev})`);
      }
      
      console.log('Đã nạp xong Siêu Dữ Liệu!');
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

app.get('/api/products', (req, res) => handleQuery(res, 'SELECT * FROM products ORDER BY category, id'));
app.post('/api/products', (req, res) => handleQuery(res, 'INSERT INTO products (name, category, price, image_icon) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.name, req.body.cat, req.body.price, req.body.img || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=300&q=80']));
app.delete('/api/products/:id', (req, res) => handleQuery(res, 'DELETE FROM products WHERE id = $1', [req.params.id]));

app.post('/api/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { total, phone, payment_method } = req.body;
    await client.query("INSERT INTO transactions (trans_type, amount, category, creator) VALUES ('Thu', $1, $2, 'Thu ngân POS')", [total, `Doanh thu POS - ${payment_method}`]);
    await client.query("INSERT INTO daily_orders (order_date, total_orders, revenue) VALUES (CURRENT_DATE, 1, $1) ON CONFLICT (order_date) DO UPDATE SET total_orders = daily_orders.total_orders + 1, revenue = daily_orders.revenue + $1", [total]);
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

app.get('/api/customers', (req, res) => handleQuery(res, 'SELECT * FROM customers ORDER BY points DESC LIMIT 100'));
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

app.get('/api/employees', (req, res) => {
  const branch = req.query.branch;
  if(branch && branch !== 'all') return handleQuery(res, 'SELECT * FROM employees WHERE branch = $1 ORDER BY id DESC', [branch]);
  handleQuery(res, 'SELECT * FROM employees ORDER BY id DESC LIMIT 50');
});
app.post('/api/employees', (req, res) => handleQuery(res, 'INSERT INTO employees (name, branch, shift, phone, position, birthday) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.body.name, req.body.branch, req.body.shift, req.body.phone, req.body.position, req.body.birthday]));

app.get('/api/inventory', (req, res) => {
  const branch = req.query.branch;
  if(branch && branch !== 'all') return handleQuery(res, 'SELECT * FROM inventory WHERE branch = $1 ORDER BY item_name ASC', [branch]);
  handleQuery(res, 'SELECT * FROM inventory ORDER BY item_name ASC LIMIT 50');
});
app.post('/api/inventory', (req, res) => handleQuery(res, 'INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.body.name, req.body.cat, req.body.qty, req.body.unit, req.body.branch]));
app.delete('/api/inventory/:id', (req, res) => handleQuery(res, 'DELETE FROM inventory WHERE id = $1', [req.params.id]));

app.get('/api/transactions', async (req, res) => {
  const filter = req.query.filter || 'all'; 
  let query = 'SELECT * FROM transactions ORDER BY trans_date DESC, id DESC LIMIT 100';
  if(filter && filter !== 'all') {
    const [year, month] = filter.split('-');
    if(year && month) {
      query = `SELECT * FROM transactions WHERE EXTRACT(YEAR FROM trans_date) = ${year} AND EXTRACT(MONTH FROM trans_date) = ${month} ORDER BY trans_date DESC`;
    } else if(filter === 'today') {
      query = "SELECT * FROM transactions WHERE trans_date = CURRENT_DATE ORDER BY id DESC";
    }
  }
  handleQuery(res, query);
});

app.get('/api/leave-requests', (req, res) => handleQuery(res, 'SELECT l.*, e.name as employee_name FROM leave_requests l JOIN employees e ON l.employee_id = e.id ORDER BY l.request_date DESC'));
app.put('/api/leave-requests/:id/status', (req, res) => handleQuery(res, 'UPDATE leave_requests SET status = $1 WHERE id = $2', [req.body.status, req.params.id]));

app.get('/api/shifts', (req, res) => handleQuery(res, 'SELECT * FROM shifts ORDER BY work_date DESC'));

// Lệnh bắt buộc reset toàn bộ data từ Frontend (nếu cần)
app.get('/api/force-init-db', async (req, res) => {
  try {
    await initializeDatabase(true);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pos.html')));
app.get('/onboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'onboard.html')));
app.get('/leave-request', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leave.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(process.env.PORT || 3000, () => console.log('StoreMate OS Backend Ready'));
