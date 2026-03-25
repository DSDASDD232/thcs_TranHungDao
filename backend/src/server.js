import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import path from "path";
import { fileURLToPath } from 'url';
import { connectDB } from "./config/db.js"; 

// Import các routes
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
// Render sử dụng biến PORT (thường là 10000)
const PORT = process.env.PORT || 10000;

// ==========================================
// 1. CẤU HÌNH CORS (Sửa lỗi 500 khi gọi API)
// ==========================================
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5001",
  "https://thcs-tranhungdao.onrender.com" // Link Render chính thức của bạn
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép request từ các nguồn trong danh sách hoặc không có origin (như Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Chặn bởi CORS: Origin này không được phép!"));
        }
    },
    credentials: true
}));

app.use(express.json()); 

// Cấu hình xem ảnh upload - Sử dụng process.cwd() để chuẩn hóa đường dẫn trên Render
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

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
// 4. PHỤC VỤ FRONTEND (SỬA LỖI TRẮNG TRANG & MIME TYPE)
// ==========================================

// Sử dụng process.cwd() để lấy thư mục gốc của dự án trên Render (/opt/render/project/src)
const rootDir = process.cwd();
const frontendPath = path.join(rootDir, "frontend", "dist");

// Luôn phục vụ file tĩnh nếu ở môi trường production
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    console.log("📂 Đang phục vụ Frontend từ:", frontendPath);
    
    // 1. Phục vụ các file tĩnh (css, js, img)
    app.use(express.static(frontendPath));
    
    // 2. Xử lý mọi route còn lại để trả về index.html (cho React Router)
    app.get("*", (req, res) => {
        // Nếu là request gọi API mà không khớp thì báo lỗi 404 cho API đó
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: "API endpoint không tồn tại" });
        }
        
        // Gửi file index.html cho các trường hợp còn lại
        res.sendFile(path.join(frontendPath, "index.html"), (err) => {
            if (err) {
                console.error("❌ Lỗi gửi file index.html:", err.message);
                res.status(500).send("Không tìm thấy file giao diện. Hãy kiểm tra lệnh build.");
            }
        });
    });
} else {
    app.get("/", (req, res) => {
        res.send("🚀 API Server THCS Trần Hưng Đạo đang chạy ở chế độ Development...");
    });
}

// ==========================================
// 5. CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang khởi chạy trên cổng ${PORT}`);
    console.log(`🌐 Chế độ: ${process.env.NODE_ENV || 'development'}`);
});