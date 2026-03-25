import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import path from "path";
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
// Render cấp PORT qua biến môi trường, thường là 10000
const PORT = process.env.PORT || 10000;

// ==========================================
// 1. CẤU HÌNH CORS (SỬA LỖI CHẶN ORIGIN)
// ==========================================
const allowedOrigins = [
    "http://localhost:5173", 
    "http://localhost:5001",
    "https://thcs-tranhungdao.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép request không có origin (như Postman) hoặc nằm trong danh sách
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".onrender.com")) {
            callback(null, true);
        } else {
            console.error("❌ CORS chặn nguồn:", origin);
            callback(new Error("Chặn bởi CORS: Origin này không được phép!"));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

// Cấu hình thư mục Uploads (Dùng đường dẫn tuyệt đối từ gốc dự án)
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// ==========================================
// 2. KẾT NỐI DATABASE
// ==========================================
connectDB();

// ==========================================
// 3. CÁC ROUTES API (PHẢI ĐẶT TRƯỚC FRONTEND)
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); 
app.use("/api/teacher", teacherRoutes);

// ==========================================
// 4. PHỤC VỤ FRONTEND (DỨT ĐIỂM LỖI TRẮNG TRANG)
// ==========================================
const rootDir = process.cwd();
const frontendPath = path.join(rootDir, "frontend", "dist");

// Trên Render, luôn phục vụ frontend nếu đã build xong
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    console.log("📂 Đang phục vụ Frontend từ:", frontendPath);
    
    // Cung cấp các file tĩnh (.js, .css, .png...)
    app.use(express.static(frontendPath));
    
    // Xử lý React Router (Wildcard route)
    app.get("*", (req, res) => {
        // Tránh trả về index.html cho các lỗi API 404
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: "API endpoint không tồn tại" });
        }
        
        res.sendFile(path.join(frontendPath, "index.html"), (err) => {
            if (err) {
                console.error("❌ Không tìm thấy index.html:", err.message);
                res.status(500).send("Lỗi: Thư mục build của Frontend bị thiếu.");
            }
        });
    });
} else {
    app.get("/", (req, res) => {
        res.send("🚀 API Server đang chạy ở chế độ Dev...");
    });
}

// ==========================================
// 5. CHẠY SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server đang khởi chạy trên cổng: ${PORT}`);
});