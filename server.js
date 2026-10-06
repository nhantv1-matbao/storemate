require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kiểm tra DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("LỖI NGHIÊM TRỌNG: Không tìm thấy biến môi trường DATABASE_URL trong file .env");
}

// Cấu hình kết nối DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Vibehost thường cần thiết lập này
});

// Hàm khởi tạo và tạo 50 dữ liệu mồi (Gộp chung vào server.js để dễ quản lý)
async function initializeDatabase(forceSeed = false) {
  const client = await pool.connect();
  try {
    console.log('Đang kiểm tra/tạo bảng Database...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, branch VARCHAR(100) NOT NULL, shift VARCHAR(50),
        phone VARCHAR(20), position VARCHAR(50), birthday VARCHAR(20), start_date DATE DEFAULT CURRENT_DATE, status VARCHAR(20) DEFAULT 'Đang làm việc'
      );
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY, work_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, assigned_employees JSONB DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY, employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE, request_date DATE NOT NULL,
        reason TEXT, shift_time VARCHAR(50), status VARCHAR(20) DEFAULT 'Chờ duyệt', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY, branch VARCHAR(100) NOT NULL, task_name VARCHAR(200) NOT NULL, is_completed BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY, item_name VARCHAR(150) NOT NULL, category VARCHAR(50), quantity INTEGER DEFAULT 0, unit VARCHAR(20),
        branch VARCHAR(100) NOT NULL, last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY, trans_type VARCHAR(10) NOT NULL, amount NUMERIC(12, 2) NOT NULL, category VARCHAR(100),
        creator VARCHAR(100), trans_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS daily_orders (
        id SERIAL PRIMARY KEY, order_date DATE NOT NULL UNIQUE, total_orders INTEGER DEFAULT 0, notes TEXT
      );
    `);

    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) === 0 || forceSeed) {
      console.log('Bắt đầu nạp 50 dữ liệu mồi...');
      await client.query('TRUNCATE employees, shifts, leave_requests, checklists, inventory, transactions, daily_orders RESTART IDENTITY CASCADE');

      // Tạo 50 nhân viên
      const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Đinh', 'Ngô', 'Bùi', 'Vũ', 'Đặng', 'Lý', 'Mai'];
      const dem = ['Văn', 'Thị', 'Hoàng', 'Thu', 'Khắc', 'Ngọc', 'Minh', 'Quốc', 'Anh', 'Thúy', 'Đức', 'Phương'];
      const ten = ['An', 'Bình', 'Cường', 'Dung', 'Ân', 'Phong', 'Yến', 'Tuấn', 'Hoa', 'Trí', 'Bảo', 'Hạnh', 'Linh', 'Quân'];
      const branches = ['Chi nhánh Quận 1 - Lê Lợi', 'Chi nhánh Gò Vấp - Quang Trung', 'Chi nhánh Quận 7 - Nguyễn Văn Linh', 'Kiosk Sinh Viên - Thủ Đức', 'Kho Tổng Hợp StoreMate'];
      const shiftsArr = ['Sáng (06h - 14h)', 'Chiều (14h - 22h)', 'Full ca (08h - 20h)', 'Hành chính (08h - 17h)'];
      const positions = ['Cửa hàng trưởng', 'Phục vụ', 'Pha chế', 'Quản lý', 'Cửa hàng phó', 'Thợ làm bánh', 'Thủ kho'];
      
      for(let i=0; i<50; i++) {
        let name = ho[i%ho.length] + ' ' + dem[i%dem.length] + ' ' + ten[i%ten.length];
        let branch = branches[i%branches.length];
        let shift = shiftsArr[i%shiftsArr.length];
        let phone = '090' + Math.floor(1000000 + Math.random() * 9000000);
        let pos = positions[i%positions.length];
        let bday = \`199\${i%10}-0\${(i%9)+1}-1\${i%9}\`;
        await client.query('INSERT INTO employees (name, branch, shift, phone, position, birthday, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', [name, branch, shift, phone, pos, bday, 'Đang làm việc']);
      }

      // Tạo 30 Kho hàng
      const items = [
        ['Cà phê Robusta (Hạt)', 'Nguyên liệu', 'kg'], ['Cà phê Arabica (Hạt)', 'Nguyên liệu', 'kg'],
        ['Sữa tươi thanh trùng', 'Thức uống', 'hộp'], ['Đường cát trắng', 'Gia vị', 'kg'],
        ['Ly nhựa chữ U 500ml', 'Bao bì', 'cái'], ['Trà Ô Long', 'Nguyên liệu', 'kg'],
        ['Sữa đặc Ngôi Sao', 'Thức uống', 'lon'], ['Syrup Vanilla', 'Nguyên liệu', 'chai'],
        ['Ống hút giấy', 'Bao bì', 'cái'], ['Bột matcha Nhật', 'Nguyên liệu', 'kg'],
        ['Bánh Croissant', 'Thực phẩm', 'cái'], ['Giấy ăn', 'Vật tư', 'bịch'],
        ['Bột mì đa dụng', 'Nguyên liệu', 'kg'], ['Bơ lạt Anchor', 'Nguyên liệu', 'kg'],
        ['Men nở', 'Nguyên liệu', 'kg'], ['Syrup Caramel', 'Nguyên liệu', 'chai'],
        ['Sốt Socola', 'Nguyên liệu', 'chai'], ['Cốc giấy 350ml', 'Bao bì', 'cái'],
        ['Trà đen Lipton', 'Nguyên liệu', 'hộp'], ['Sữa chua có đường', 'Thực phẩm', 'hộp'],
        ['Bột cacao', 'Nguyên liệu', 'kg'], ['Đá viên', 'Vật tư', 'bao'],
        ['Nước lọc Aquafina', 'Thức uống', 'chai'], ['Trà đào túi lọc', 'Nguyên liệu', 'hộp'],
        ['Kem béo', 'Nguyên liệu', 'hộp'], ['Ly thủy tinh', 'Vật tư', 'cái'],
        ['Khăn lạnh', 'Vật tư', 'cái'], ['Đường phèn', 'Gia vị', 'kg'],
        ['Mứt dâu tây', 'Nguyên liệu', 'hộp'], ['Hạt điều rang', 'Thực phẩm', 'hộp']
      ];
      for(let i=0; i<30; i++) {
        let item = items[i % items.length];
        let branch = branches[i % branches.length];
        let qty = Math.floor(Math.random() * 100) + 5;
        await client.query('INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5)', [item[0], item[1], qty, item[2], branch]);
      }
      
      // Tạo Checklist
      await client.query("INSERT INTO checklists (branch, task_name, is_completed) VALUES ('Chi nhánh Quận 1 - Lê Lợi', 'Vệ sinh máy pha cà phê', false)");
      await client.query("INSERT INTO checklists (branch, task_name, is_completed) VALUES ('Chi nhánh Quận 1 - Lê Lợi', 'Kiểm đếm tiền', true)");
      
      // Tạo Giao dịch
      await client.query("INSERT INTO transactions (trans_type, amount, category, creator) VALUES ('Thu', 1500000, 'Doanh thu Ca Sáng', 'Nguyễn Văn An')");
      await client.query("INSERT INTO transactions (trans_type, amount, category, creator) VALUES ('Chi', 350000, 'Mua đá bi', 'Nguyễn Văn An')");
      
      // Tạo Đơn hàng
      await client.query("INSERT INTO daily_orders (order_date, total_orders, notes) VALUES (CURRENT_DATE, 125, 'Ngày thường')");

      console.log('Đã nạp xong 50 dữ liệu mồi!');
    }
  } catch (err) {
    console.error('Lỗi khi khởi tạo Database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Khởi tạo ngay khi chạy server
initializeDatabase().catch(err => console.error("Không thể khởi tạo DB lúc startup:", err));

// --- System API (Tạo dữ liệu mồi bằng nút bấm) ---
app.get('/api/force-init-db', async (req, res) => {
  try {
    await initializeDatabase(true);
    res.json({ success: true, message: 'Đã tạo lại toàn bộ 50 dữ liệu mồi!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Lỗi không xác định khi tạo DB" });
  }
});

// --- API Xử Lý Lỗi Tập Trung ---
const handleResponse = async (res, queryPromise) => {
  try {
    const { rows } = await queryPromise;
    res.json(rows);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- APIs ---
app.get('/api/employees', (req, res) => handleResponse(res, pool.query('SELECT * FROM employees ORDER BY branch, id ASC')));
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
app.delete('/api/employees/:id', (req, res) => handleResponse(res, pool.query('DELETE FROM employees WHERE id = $1', [req.params.id])));

app.get('/api/leave-requests', (req, res) => handleResponse(res, pool.query('SELECT l.*, e.name as employee_name, e.branch FROM leave_requests l JOIN employees e ON l.employee_id = e.id ORDER BY l.request_date DESC')));
app.post('/api/leave-requests', async (req, res) => {
  try {
    const { employee_id, request_date, reason, shift_time } = req.body;
    const { rows } = await pool.query('INSERT INTO leave_requests (employee_id, request_date, reason, shift_time) VALUES ($1, $2, $3, $4) RETURNING *', [employee_id, request_date, reason, shift_time]);
    res.json({ success: true, request: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/leave-requests/:id/status', async (req, res) => {
  try {
    await pool.query('UPDATE leave_requests SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shifts', (req, res) => handleResponse(res, pool.query('SELECT * FROM shifts ORDER BY work_date DESC, start_time ASC')));
app.post('/api/shifts', async (req, res) => {
  try {
    const { work_date, start_time, end_time, assigned_employees } = req.body;
    const { rows } = await pool.query('INSERT INTO shifts (work_date, start_time, end_time, assigned_employees) VALUES ($1, $2, $3, $4) RETURNING *', [work_date, start_time, end_time, JSON.stringify(assigned_employees)]);
    res.json({ success: true, shift: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory', (req, res) => handleResponse(res, pool.query('SELECT * FROM inventory ORDER BY branch, item_name ASC')));
app.post('/api/inventory', async (req, res) => {
  try {
    const { item_name, category, quantity, unit, branch } = req.body;
    const { rows } = await pool.query('INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *', [item_name, category, quantity, unit, branch]);
    res.json({ success: true, item: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('UPDATE inventory SET quantity = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2', [req.body.quantity, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/inventory/:id', (req, res) => handleResponse(res, pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id])));

app.get('/api/checklists', (req, res) => handleResponse(res, pool.query('SELECT * FROM checklists ORDER BY branch, id ASC')));
app.post('/api/checklists', async (req, res) => {
  try {
    const { rows } = await pool.query('INSERT INTO checklists (branch, task_name, is_completed) VALUES ($1, $2, false) RETURNING *', [req.body.branch, req.body.task_name]);
    res.json({ success: true, checklist: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/checklists/:id', async (req, res) => {
  try {
    await pool.query('UPDATE checklists SET is_completed = $1 WHERE id = $2', [req.body.is_completed, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/checklists/:id', (req, res) => handleResponse(res, pool.query('DELETE FROM checklists WHERE id = $1', [req.params.id])));

app.get('/api/transactions', (req, res) => handleResponse(res, pool.query('SELECT * FROM transactions ORDER BY created_at DESC')));
app.post('/api/transactions', async (req, res) => {
  try {
    const { trans_type, amount, category, creator } = req.body;
    const { rows } = await pool.query('INSERT INTO transactions (trans_type, amount, category, creator) VALUES ($1, $2, $3, $4) RETURNING *', [trans_type, amount, category, creator]);
    res.json({ success: true, transaction: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', (req, res) => handleResponse(res, pool.query('SELECT * FROM daily_orders ORDER BY order_date DESC')));
app.post('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('INSERT INTO daily_orders (order_date, total_orders, notes) VALUES ($1, $2, $3) ON CONFLICT (order_date) DO UPDATE SET total_orders = EXCLUDED.total_orders, notes = EXCLUDED.notes RETURNING *', [req.body.order_date, req.body.total_orders, req.body.notes]);
    res.json({ success: true, order: rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Public Pages ---
app.get('/onboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'onboard.html')));
app.get('/leave-request', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leave.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server chạy tại port \${PORT}\`);
});
