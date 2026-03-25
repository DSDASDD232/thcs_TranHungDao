import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import path from "path";
import { fileURLToPath } from 'url';
import { connectDB } from "./config/db.js"; 

// --- 1. IMPORT ROUTES ---
import authRoutes from "./routes/auth.js"; 
import questionRoutes from "./routes/question.js";
import assignmentRoutes from "./routes/assignment.js";
import submissionRoutes from "./routes/submission.js";
import adminRoutes from "./routes/admin.js";
import classRoutes from "./routes/classes.js"; 
import teacherRoutes from "./routes/teacher.js";

// --- 2. CẤU HÌNH CƠ BẢN ---
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

// Kết nối Cơ sở dữ liệu
connectDB();

// --- 3. CẤU HÌNH CORS (SỬA LỖI 500) ---
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5001",
  "https://thcs-tranhungdao.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép nếu không có origin (như Postman) hoặc nằm trong danh sách/domain Render
        if (!origin || allowedOrigins.includes(origin) || origin.includes("onrender.com")) {
            callback(null, true);
        } else {
            console.error("❌ CORS chặn nguồn:", origin);
            callback(new Error("Chặn bởi CORS: Origin này không được cho phép!"));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

// Cấu hình thư mục uploads (dùng đường dẫn tuyệt đối từ gốc dự án)
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// --- 4. CÁC ROUTES API (QUAN TRỌNG: PHẢI ĐẶT TRƯỚC FRONTEND) ---
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); 
app.use("/api/teacher", teacherRoutes);

// --- 5. PHỤC VỤ FRONTEND (SỬA LỖI TRẮNG TRANG / MIME TYPE) ---
const rootDir = process.cwd(); // Lấy thư mục gốc trên Render (/opt/render/project/src)
const frontendPath = path.join(rootDir, "frontend", "dist");

// Chỉ chạy phần này nếu đang ở môi trường production (Render)
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    console.log("📂 Đang phục vụ Frontend từ đường dẫn:", frontendPath);
    
    // Cung cấp các file tĩnh (js, css, hình ảnh)
    app.use(express.static(frontendPath));
    
    // Xử lý React Router (Cho mọi request không phải API)
    app.get("*", (req, res) => {
        // Nếu là request gọi API mà sai đường dẫn thì trả về JSON lỗi 404
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: "API endpoint không tồn tại" });
        }
        
        // Trả về file index.html cho giao diện
        res.sendFile(path.join(frontendPath, "index.html"), (err) => {
            if (err) {
                console.error("❌ Không tìm thấy index.html:", err.message);
                res.status(500).send("Lỗi: Không tìm thấy thư mục build của Frontend.");
            }
        });
    });
} else {
    // Chế độ Development
    app.get("/", (req, res) => {
        res.send("🚀 API THCS Trần Hưng Đạo đang chạy ở chế độ Dev...");
    });
}

// --- 6. KHỞI CHẠY SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server khởi chạy thành công trên cổng: ${PORT}`);
    console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});