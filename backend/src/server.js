import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { connectDB } from "./config/db.js"; 

// --- IMPORT ROUTES ---
import authRoutes from "./routes/auth.js"; 
import questionRoutes from "./routes/question.js";
import assignmentRoutes from "./routes/assignment.js";
import submissionRoutes from "./routes/submission.js";
import adminRoutes from "./routes/admin.js";
import classRoutes from "./routes/classes.js"; 
import teacherRoutes from "./routes/teacher.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// 1. KẾT NỐI DATABASE
// ==========================================
connectDB();

// ==========================================
// 2. PHỤC VỤ FILE GIAO DIỆN (ĐẶT LÊN ĐẦU TIÊN)
// ==========================================
// Tránh việc CORS chặn tải file CSS/JS của Vite
const rootDir = process.cwd();
const frontendPath = path.join(rootDir, "frontend", "dist");

// Cung cấp file tĩnh của Frontend (css, js, ảnh)
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

// Cung cấp file Uploads
const uploadsPath = path.join(rootDir, 'backend', 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// ==========================================
// 3. CẤU HÌNH CORS CHO CÁC API KHÔNG BỊ LỖI 500
// ==========================================
// Mở toang cửa CORS để tránh hoàn toàn mọi lỗi ngăn chặn kết nối
app.use(cors({
    origin: "*", // Cho phép mọi nguồn (Rất an toàn cho project thực hành)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

// ==========================================
// 4. CÁC ROUTES API
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); 
app.use("/api/teacher", teacherRoutes);

// ==========================================
// 5. CATCH-ALL CHO REACT ROUTER (ĐẶT CUỐI CÙNG)
// ==========================================
app.get("*", (req, res) => {
    // Phân biệt rõ: gọi sai API thì báo lỗi JSON, gọi sai Link thì trả về giao diện
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: "API endpoint không tồn tại" });
    }
    
    const indexPath = path.join(frontendPath, "index.html");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(500).send("Server đang chạy nhưng chưa tìm thấy thư mục build frontend.");
    }
});

// ==========================================
// 6. CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang khởi chạy trên cổng: ${PORT}`);
});