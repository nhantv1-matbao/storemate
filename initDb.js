require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
        birthday VARCHAR(20),
        start_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'Đang làm việc'
      );
    `);

    // 2. Shifts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        work_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        assigned_employees JSONB DEFAULT '[]'
      );
    `);

    // 3. Leave Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        request_date DATE NOT NULL,
        reason TEXT,
        shift_time VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Chờ duyệt',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Checklists Table (Store Tasks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id SERIAL PRIMARY KEY,
        branch VARCHAR(100) NOT NULL,
        task_name VARCHAR(200) NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE
      );
    `);

    // 5. Inventory Table
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

    // 6. Transactions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        trans_type VARCHAR(10) NOT NULL, -- 'Thu' or 'Chi'
        amount NUMERIC(12, 2) NOT NULL,
        category VARCHAR(100),
        creator VARCHAR(100),
        trans_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Daily Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_orders (
        id SERIAL PRIMARY KEY,
        order_date DATE NOT NULL UNIQUE,
        total_orders INTEGER DEFAULT 0,
        notes TEXT
      );
    `);

    // Xóa sạch dữ liệu cũ để nạp lại dữ liệu tiếng Việt (tùy chọn, ở đây mình check count)
    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) < 10) {
      console.log('Seeding Vietnamese mock data...');
      
      // Xóa để seed lại cho sạch nếu ít hơn 10
      await client.query('TRUNCATE employees, shifts, leave_requests, checklists, inventory, transactions, daily_orders RESTART IDENTITY CASCADE');

      // Employees (12 Nhân viên)
      const mockEmps = [
        ['Nguyễn Văn An', 'Chi nhánh Hoàng Hoa Thám', 'Sáng (06h - 14h)', '0901234567', 'Cửa hàng trưởng', '1995-05-15', 'Đang làm việc'],
        ['Trần Thị Bình', 'Chi nhánh Hoàng Hoa Thám', 'Chiều (14h - 22h)', '0902234567', 'Phục vụ', '1998-08-20', 'Đang làm việc'],
        ['Lê Hoàng Cường', 'Chi nhánh Hoàng Hoa Thám', 'Sáng (06h - 14h)', '0903234567', 'Pha chế', '1999-11-03', 'Đang làm việc'],
        ['Phạm Thu Dung', 'Chi nhánh Nguyễn Sơn Hà', 'Full ca (08h - 20h)', '0904234567', 'Quản lý', '1992-02-14', 'Đang làm việc'],
        ['Hoàng Khắc Ân', 'Chi nhánh Nguyễn Sơn Hà', 'Chiều (14h - 22h)', '0905234567', 'Phục vụ', '2001-07-22', 'Đang làm việc'],
        ['Đinh Văn Phong', 'Chi nhánh Nguyễn Sơn Hà', 'Sáng (06h - 14h)', '0906234567', 'Pha chế', '2000-09-10', 'Đang làm việc'],
        ['Ngô Thị Yến', 'Chi nhánh Kỳ Đồng', 'Sáng (06h - 14h)', '0907234567', 'Cửa hàng phó', '1996-12-05', 'Đang làm việc'],
        ['Bùi Anh Tuấn', 'Chi nhánh Kỳ Đồng', 'Chiều (14h - 22h)', '0908234567', 'Pha chế', '1997-04-18', 'Đang làm việc'],
        ['Vũ Ngọc Hoa', 'Xưởng', 'Hành chính (08h - 17h)', '0909234567', 'Thợ làm bánh', '1990-01-25', 'Đang làm việc'],
        ['Đặng Minh Trí', 'Xưởng', 'Hành chính (08h - 17h)', '0910234567', 'Thợ chính', '1988-10-12', 'Đang làm việc'],
        ['Lý Quốc Bảo', 'Chi nhánh Đường số 65', 'Full ca (08h - 20h)', '0911234567', 'Quản lý', '1994-06-30', 'Đang làm việc'],
        ['Mai Thúy Hạnh', 'Chi nhánh Đường số 65', 'Chiều (14h - 22h)', '0912234567', 'Phục vụ', '2002-03-08', 'Đang làm việc']
      ];
      for (const emp of mockEmps) {
        await client.query('INSERT INTO employees (name, branch, shift, phone, position, birthday, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', emp);
      }

      // Inventory (15 món)
      const mockInventory = [
        ['Cà phê Robusta (Hạt)', 'Nguyên liệu', 50, 'kg', 'Chi nhánh Hoàng Hoa Thám'],
        ['Cà phê Arabica (Hạt)', 'Nguyên liệu', 20, 'kg', 'Chi nhánh Hoàng Hoa Thám'],
        ['Sữa tươi thanh trùng', 'Thức uống', 35, 'hộp', 'Chi nhánh Hoàng Hoa Thám'],
        ['Đường cát trắng', 'Gia vị', 15, 'kg', 'Chi nhánh Hoàng Hoa Thám'],
        ['Ly nhựa chữ U 500ml', 'Bao bì', 1000, 'cái', 'Chi nhánh Hoàng Hoa Thám'],
        
        ['Trà Ô Long', 'Nguyên liệu', 10, 'kg', 'Chi nhánh Nguyễn Sơn Hà'],
        ['Sữa đặc Ngôi Sao', 'Thức uống', 50, 'lon', 'Chi nhánh Nguyễn Sơn Hà'],
        ['Syrup Vanilla', 'Nguyên liệu', 5, 'chai', 'Chi nhánh Nguyễn Sơn Hà'],
        ['Ống hút giấy', 'Bao bì', 2000, 'cái', 'Chi nhánh Nguyễn Sơn Hà'],
        
        ['Bột matcha Nhật', 'Nguyên liệu', 3, 'kg', 'Chi nhánh Kỳ Đồng'],
        ['Bánh Croissant đông lạnh', 'Thực phẩm', 40, 'cái', 'Chi nhánh Kỳ Đồng'],
        ['Giấy ăn', 'Vật tư', 50, 'bịch', 'Chi nhánh Kỳ Đồng'],

        ['Bột mì đa dụng', 'Nguyên liệu', 100, 'kg', 'Xưởng'],
        ['Bơ lạt Anchor', 'Nguyên liệu', 20, 'kg', 'Xưởng'],
        ['Men nở', 'Nguyên liệu', 2, 'kg', 'Xưởng']
      ];
      for (const inv of mockInventory) {
        await client.query('INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5)', inv);
      }
      
      // Checklists
      const mockChecklists = [
        ['Chi nhánh Hoàng Hoa Thám', 'Vệ sinh máy pha cà phê cuối ngày', false],
        ['Chi nhánh Hoàng Hoa Thám', 'Kiểm đếm tiền mặt ca sáng', true],
        ['Chi nhánh Hoàng Hoa Thám', 'Lau dọn khu vực khách ngồi', true],
        ['Chi nhánh Nguyễn Sơn Hà', 'Nhập sữa tươi từ nhà cung cấp', false],
        ['Chi nhánh Nguyễn Sơn Hà', 'Đổ rác cuối ngày', false],
        ['Chi nhánh Kỳ Đồng', 'Kiểm kê kho hàng', false],
        ['Xưởng', 'Vệ sinh lò nướng', true]
      ];
      for (const chk of mockChecklists) {
        await client.query('INSERT INTO checklists (branch, task_name, is_completed) VALUES ($1, $2, $3)', chk);
      }
      
      // Leave Requests
      const mockLeaves = [
        [2, "CURRENT_DATE + INTERVAL '1 days'", 'Về quê có việc gia đình', 'Ca Chiều', 'Chờ duyệt'],
        [5, "CURRENT_DATE + INTERVAL '2 days'", 'Đi khám bệnh', 'Ca Chiều', 'Chờ duyệt'],
        [7, "CURRENT_DATE - INTERVAL '1 days'", 'Ốm đột xuất', 'Ca Sáng', 'Đã duyệt'],
        [10, "CURRENT_DATE + INTERVAL '5 days'", 'Đám cưới bạn thân', 'Full ca', 'Từ chối']
      ];
      for (const lv of mockLeaves) {
        await client.query(`INSERT INTO leave_requests (employee_id, request_date, reason, shift_time, status) VALUES (${lv[0]}, ${lv[1]}, '${lv[2]}', '${lv[3]}', '${lv[4]}')`);
      }

      // Transactions
      const mockTrans = [
        ['Thu', 1500000, 'Doanh thu Ca Sáng', 'Nguyễn Văn An', "CURRENT_DATE"],
        ['Thu', 2200000, 'Doanh thu Ca Chiều', 'Trần Thị Bình', "CURRENT_DATE"],
        ['Chi', 350000, 'Mua đá bi, bao nilon', 'Nguyễn Văn An', "CURRENT_DATE"],
        ['Thu', 1800000, 'Doanh thu Ca Sáng', 'Phạm Thu Dung', "CURRENT_DATE"],
        ['Chi', 500000, 'Trả tiền điện nước', 'Quản lý', "CURRENT_DATE - INTERVAL '1 days'"],
        ['Thu', 3100000, 'Doanh thu cả ngày', 'Lý Quốc Bảo', "CURRENT_DATE - INTERVAL '1 days'"]
      ];
      for (const tr of mockTrans) {
        await client.query(`INSERT INTO transactions (trans_type, amount, category, creator, trans_date) VALUES ('${tr[0]}', ${tr[1]}, '${tr[2]}', '${tr[3]}', ${tr[4]})`);
      }

      // Orders
      await client.query("INSERT INTO daily_orders (order_date, total_orders, notes) VALUES (CURRENT_DATE, 125, 'Ngày thường')");
      await client.query("INSERT INTO daily_orders (order_date, total_orders, notes) VALUES (CURRENT_DATE - INTERVAL '1 days', 180, 'Cuối tuần đông khách')");
      await client.query("INSERT INTO daily_orders (order_date, total_orders, notes) VALUES (CURRENT_DATE - INTERVAL '2 days', 95, 'Trời mưa')");
      
      // Shifts 
      await client.query(`INSERT INTO shifts (work_date, start_time, end_time, assigned_employees) VALUES (CURRENT_DATE, '06:00', '14:00', '["Nguyễn Văn An", "Lê Hoàng Cường"]')`);
      await client.query(`INSERT INTO shifts (work_date, start_time, end_time, assigned_employees) VALUES (CURRENT_DATE, '14:00', '22:00', '["Trần Thị Bình"]')`);

    }

    console.log('Database initialization and seeding completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.end();
  }
}

initDb();
