import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // Import thư viện CORS
import { connectDB } from "./config/db.js"; 
import authRoutes from "./routes/auth.js"; 
import questionRoutes from "./routes/question.js";
import assignmentRoutes from "./routes/assignment.js";
import submissionRoutes from "./routes/submission.js";
import adminRoutes from "./routes/admin.js";
import classRoutes from "./routes/classes.js"; // <--- THÊM DÒNG NÀY: Import file API Lớp học
import teacherRoutes from "./routes/teacher.js";

// Khởi tạo dotenv để đọc file .env
dotenv.config();

const PORT = process.env.PORT || 5001;
const app = express();

// ==========================================
// 1. CÁC MIDDLEWARE (GÁC CỔNG) - PHẢI ĐỨNG ĐẦU
// ==========================================

// Bật CORS để cho phép Frontend (Vite chạy ở cổng 5173) gọi được API
app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true
}));

// Bắt buộc phải có để server hiểu được dữ liệu JSON gửi lên
app.use(express.json()); 


// ==========================================
// 2. KẾT NỐI DATABASE
// ==========================================
connectDB();


// ==========================================
// 3. KHAI BÁO CÁC ĐƯỜNG DẪN API (ROUTES)
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes); // <--- THÊM DÒNG NÀY: Kích hoạt đường dẫn API Lớp học
app.use('/uploads', express.static('uploads'));
app.use("/api/teacher", teacherRoutes);
// ==========================================
// 4. CHẠY SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});