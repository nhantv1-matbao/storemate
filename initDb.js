require('dotenv').config();
const { Client } = require('pg');

const dbConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'vays-db-d86f1291-postgresql-5432',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'storemate_db',
      user: process.env.DB_USER || 'user_3485979523c3',
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };

const client = new Client(dbConfig);

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

    const { rows: empRows } = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(empRows[0].count) < 50) {
      console.log('Seeding 50 Employees and 30 Inventory items...');
      
      await client.query('TRUNCATE employees, shifts, leave_requests, checklists, inventory, transactions, daily_orders RESTART IDENTITY CASCADE');

      // Employees (50 Nhân viên)
      const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Đinh', 'Ngô', 'Bùi', 'Vũ', 'Đặng', 'Lý', 'Mai'];
      const dem = ['Văn', 'Thị', 'Hoàng', 'Thu', 'Khắc', 'Ngọc', 'Minh', 'Quốc', 'Anh', 'Thúy', 'Đức', 'Phương'];
      const ten = ['An', 'Bình', 'Cường', 'Dung', 'Ân', 'Phong', 'Yến', 'Tuấn', 'Hoa', 'Trí', 'Bảo', 'Hạnh', 'Linh', 'Quân', 'Nga', 'Đạt'];
      const branches = ['Chi nhánh Quận 1 - Lê Lợi', 'Chi nhánh Gò Vấp - Quang Trung', 'Chi nhánh Quận 7 - Nguyễn Văn Linh', 'Kiosk Sinh Viên - Thủ Đức', 'Kho Tổng Hợp StoreMate'];
      const shifts = ['Sáng (06h - 14h)', 'Chiều (14h - 22h)', 'Full ca (08h - 20h)', 'Hành chính (08h - 17h)'];
      const positions = ['Cửa hàng trưởng', 'Phục vụ', 'Pha chế', 'Quản lý', 'Cửa hàng phó', 'Thợ làm bánh', 'Thủ kho'];
      
      const mockEmps = [];
      for(let i=0; i<50; i++) {
        let name = ho[i%ho.length] + ' ' + dem[i%dem.length] + ' ' + ten[i%ten.length];
        let branch = branches[i%branches.length];
        let shift = shifts[i%shifts.length];
        let phone = '090' + Math.floor(1000000 + Math.random() * 9000000);
        let pos = positions[i%positions.length];
        let year = 1985 + (i % 15);
        let month = (i % 12) + 1;
        let day = (i % 28) + 1;
        let bday = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        mockEmps.push([name, branch, shift, phone, pos, bday, 'Đang làm việc']);
      }

      for (const emp of mockEmps) {
        await client.query('INSERT INTO employees (name, branch, shift, phone, position, birthday, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', emp);
      }

      // Inventory (30 món)
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
        ['Kem béo béo Rich', 'Nguyên liệu', 'hộp'], ['Ly thủy tinh', 'Vật tư', 'cái'],
        ['Khăn lạnh', 'Vật tư', 'cái'], ['Đường phèn', 'Gia vị', 'kg'],
        ['Mứt dâu tây', 'Nguyên liệu', 'hộp'], ['Hạt điều rang', 'Thực phẩm', 'hộp']
      ];
      
      const mockInventory = [];
      for(let i=0; i<30; i++) {
        let item = items[i % items.length];
        let branch = branches[i % branches.length];
        let qty = Math.floor(Math.random() * 100) + 5;
        mockInventory.push([item[0], item[1], qty, item[2], branch]);
      }

      for (const inv of mockInventory) {
        await client.query('INSERT INTO inventory (item_name, category, quantity, unit, branch) VALUES ($1, $2, $3, $4, $5)', inv);
      }
      
      // Checklists
      const mockChecklists = [
        ['Chi nhánh Quận 1 - Lê Lợi', 'Vệ sinh máy pha cà phê cuối ngày', false],
        ['Chi nhánh Quận 1 - Lê Lợi', 'Kiểm đếm tiền mặt ca sáng', true],
        ['Chi nhánh Quận 1 - Lê Lợi', 'Lau dọn khu vực khách ngồi', true],
        ['Chi nhánh Gò Vấp - Quang Trung', 'Nhập sữa tươi từ nhà cung cấp', false],
        ['Chi nhánh Gò Vấp - Quang Trung', 'Đổ rác cuối ngày', false],
        ['Chi nhánh Quận 7 - Nguyễn Văn Linh', 'Kiểm kê kho hàng', false],
        ['Kho Tổng Hợp StoreMate', 'Kiểm kê và xuất hàng tuần', true]
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

module.exports = initDb;
