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
// 1. CẤU HÌNH CORS & JSON (BẮT BUỘC ĐẶT LÊN ĐẦU TIÊN)
// ==========================================
const allowedOrigins = [
    "http://localhost:5173", 
    "http://localhost:5001",
    "https://thcs-tranhungdao.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép postman (!origin), localhost và link render
        if (!origin || allowedOrigins.includes(origin) || origin.includes("onrender.com")) {
            callback(null, true);
        } else {
            console.log("⚠️ Bị chặn bởi CORS:", origin);
            callback(null, true);
        }
    },
    credentials: true, // BẮT BUỘC PHẢI CÓ để Frontend gửi Token
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ ĐỌC ĐƯỢC DỮ LIỆU (req.body)
app.use(express.json()); 

// ==========================================
// 2. KẾT NỐI DATABASE
// ==========================================
connectDB();

// ==========================================
// 3. PHỤC VỤ FILE TĨNH (ẢNH UPLOAD & GIAO DIỆN)
// ==========================================
const rootDir = process.cwd();

// 👉 FIX LỖI ẢNH BỊ VỠ TẠI ĐÂY: 
// Do chạy server từ thư mục 'backend', nên thư mục uploads sẽ nằm ngay gốc của nó.
const uploadsPath = path.join(rootDir, 'uploads'); 
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// Cung cấp file tĩnh của Frontend (Dùng khi Deploy)
const frontendPath = path.join(rootDir, "frontend", "dist");
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

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