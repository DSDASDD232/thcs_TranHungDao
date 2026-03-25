import express from "express";
import dotenv from "dotenv";
import cors from "cors"; 
import { connectDB } from "./config/db.js"; 
import authRoutes from "./routes/auth.js"; 
import questionRoutes from "./routes/question.js";
import assignmentRoutes from "./routes/assignment.js";
import submissionRoutes from "./routes/submission.js";
import adminRoutes from "./routes/admin.js";
import classRoutes from "./routes/classes.js"; 
import teacherRoutes from "./routes/teacher.js";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

// 1. XỬ LÝ __DIRNAME CHUẨN XÁC CHO ES MODULE
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5001;
const app = express();

// ==========================================
// 1. CÁC MIDDLEWARE (GÁC CỔNG)
// ==========================================
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5001",
  "https://thcs-tranhungdao.vercel.app", // Thay bằng link thật của bạn khi có
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Chặn bởi CORS: Origin này không được phép!"));
        }
    },
    credentials: true
}));

app.use(express.json()); 

// Cấu hình xem ảnh upload (Đảm bảo folder backend/uploads tồn tại)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// 2. KẾT NỐI DATABASE
// ==========================================
connectDB();

// ==========================================
// 3. CÁC ROUTES API (PHẢI ĐẶT TRƯỚC PHẦN PHỤC VỤ FRONTEND)
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); 
app.use("/api/teacher", teacherRoutes);

// ==========================================
// 4. PHỤC VỤ FRONTEND (DÙNG CHO PRODUCTION)
// ==========================================
if (process.env.NODE_ENV === "production") {
    // Chỉ định đường dẫn tuyệt đối tới thư mục frontend/dist
    // __dirname là backend/src -> lùi 2 cấp là ra gốc -> vào frontend/dist
    const frontendPath = path.resolve(__dirname, "../../frontend/dist");
    
    // In ra để kiểm tra trên Terminal/Render log
    console.log("📂 Đang phục vụ Frontend từ đường dẫn tuyệt đối:", frontendPath);
    
    // PHẢI đặt static trước wildcard '*'
    app.use(express.static(frontendPath));
    
    app.get("*", (req, res) => {
        // Nếu là request gọi file assets mà bị lọt vào đây tức là static phía trên tìm không thấy file
        const indexPath = path.join(frontendPath, "index.html");
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error("❌ Lỗi không tìm thấy file index.html:", err.message);
                res.status(404).send("❌ Lỗi: Không tìm thấy thư mục build (dist) của Frontend.");
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
    console.log(`🚀 Server đang khởi chạy trên cổng ${PORT} với môi trường: ${process.env.NODE_ENV}`);
});