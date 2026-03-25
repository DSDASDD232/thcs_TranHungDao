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
// 1. CẤU HÌNH CORS (SỬA LỖI CHẶN ORIGIN 500)
// ==========================================
// Mở rộng CORS để chấp nhận mọi yêu cầu từ chính tên miền của bạn
app.use(cors({
    origin: function (origin, callback) {
        // Cho phép: 1. Không có origin (Postman), 2. Localhost, 3. Mọi sub-domain của Render
        if (!origin || origin.includes("localhost") || origin.includes("onrender.com")) {
            callback(null, true);
        } else {
            console.log("⚠️ CORS chặn nguồn:", origin);
            callback(null, true); // Tạm thời cho phép tất cả để web chạy được đã
        }
    },
    credentials: true
}));

app.use(express.json()); 

// Cấu hình thư mục Uploads
const uploadsPath = path.join(process.cwd(), 'backend', 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// ==========================================
// 2. KẾT NỐI DATABASE
// ==========================================
connectDB();

// ==========================================
// 3. CÁC ROUTES API
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); 
app.use("/api/teacher", teacherRoutes);

// ==========================================
// 4. PHỤC VỤ FRONTEND (DỨT ĐIỂM TRẮNG TRANG)
// ==========================================
const rootDir = process.cwd();
// Render build frontend vào thư mục này:
const frontendPath = path.join(rootDir, "frontend", "dist");

console.log("📂 Kiểm tra thư mục Frontend tại:", frontendPath);

if (fs.existsSync(frontendPath)) {
    // 1. Phục vụ file tĩnh
    app.use(express.static(frontendPath));
    
    // 2. Route xử lý React Router
    app.get("*", (req, res) => {
        // Nếu là request API bị sai, trả về JSON 404 chứ không trả về HTML
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: "API không tồn tại" });
        }
        res.sendFile(path.join(frontendPath, "index.html"));
    });
} else {
    console.log("❌ Cảnh báo: Thư mục frontend/dist không tồn tại!");
    app.get("/", (req, res) => {
        res.send("Server đang chạy nhưng không tìm thấy file giao diện (dist).");
    });
}

// ==========================================
// 5. CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng: ${PORT}`);
});