import express from "express";
import User from "../models/User.js";
import Class from "../models/Class.js"; // <--- Đã thêm dòng này để gọi model Lớp học
import Question from "../models/Question.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import multer from "multer";
import xlsx from "xlsx";
import bcrypt from "bcryptjs"; 

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. [GET] Lấy thống kê tổng quan toàn trường
// ==========================================
router.get("/stats", verifyToken, isAdmin, async (req, res) => {
    try {
        const [
            totalStudents,
            totalTeachers,
            totalQuestions,
            totalAssignments,
            totalSubmissions
        ] = await Promise.all([
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "teacher" }),
            Question.countDocuments(),
            Assignment.countDocuments(),
            Submission.countDocuments()
        ]);

        res.status(200).json({
            message: "✅ Lấy dữ liệu thống kê thành công!",
            data: {
                students: totalStudents,
                teachers: totalTeachers,
                questions: totalQuestions,
                assignments: totalAssignments,
                submissions: totalSubmissions
            }
        });
    } catch (error) {
        console.error("Lỗi lấy thống kê Admin:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ==========================================
// 2. [GET] Lấy danh sách tài khoản
// ==========================================
router.get("/users/recent", verifyToken, isAdmin, async (req, res) => {
    try {
        const recentUsers = await User.find({ role: { $ne: "admin" } })
            .sort({ createdAt: -1 })
            .populate("classId", "name grade") 
            .populate("assignedClasses", "name");

        res.status(200).json(recentUsers);
    } catch (error) {
        console.error("Lỗi lấy danh sách tài khoản:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 3. [POST] TẠO TÀI KHOẢN HỌC SINH TỪ FILE EXCEL
// ======================================================================
router.post("/users/import-json", verifyToken, isAdmin, async (req, res) => {
    try {
        const { classId, className, grade, students } = req.body;
        if (!classId || !className || !students || students.length === 0) {
            return res.status(400).json({ message: "Thiếu thông tin hoặc danh sách trống!" });
        }

        let successCount = 0;
        let failedCount = 0;
        let generatedAccounts = []; 

        const removeAccents = (str) => {
            if (!str) return "";
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
        };

        const salt = await bcrypt.genSalt(10);
        const defaultHashedPassword = await bcrypt.hash("1", salt);

        for (let i = 0; i < students.length; i++) {
            const row = students[i];
            const sttRaw = row["STT"] || row["stt"] || row["Stt"];
            const fullNameRaw = row["Tên học sinh"] || row["Họ và tên"] || row["Họ tên"] || row["Họ Tên"]; 

            if (!fullNameRaw) { failedCount++; continue; }

            const nameParts = fullNameRaw.trim().split(" ");
            const firstName = nameParts[nameParts.length - 1]; 
            const cleanFirstName = removeAccents(firstName).toLowerCase();
            const paddedStt = String(sttRaw || (i + 1)).padStart(2, '0');
            const cleanClassName = className.toLowerCase().replace(/\s+/g, ''); 

            const username = `${cleanFirstName}${cleanClassName}${paddedStt}`;

            try {
                const userExists = await User.findOne({ username });
                if (!userExists) {
                    const newUser = new User({
                        fullName: fullNameRaw.trim(),
                        username: username,
                        password: defaultHashedPassword,
                        role: "student",
                        classId: classId,
                        grade: grade || className.replace(/\D/g, '').substring(0, 1) 
                    });
                    await newUser.save();
                    successCount++;
                    generatedAccounts.push({ "STT": paddedStt, "Họ và Tên": fullNameRaw.trim(), "Tài Khoản": username, "Mật Khẩu": "1" });
                } else { failedCount++; }
            } catch (err) { failedCount++; }
        }

        res.status(200).json({ message: "Hoàn tất!", successCount, failedCount, accounts: generatedAccounts });
    } catch (error) {
        console.error("Lỗi import excel:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ==========================================
// 4. [DELETE] Xóa tài khoản
// ==========================================
router.delete("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Đã xóa tài khoản thành công!" });
    } catch (error) {
        console.error("Lỗi xóa tài khoản:", error);
        res.status(500).json({ message: "Lỗi server khi xóa tài khoản", error });
    }
});

// ==========================================
// 5. [PUT] Cập nhật thông tin tài khoản
// ==========================================
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const { fullName, role, grade, className, subject, classId, assignedClasses } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { 
                fullName, role, grade, className, subject,
                classId: classId || null,
                assignedClasses: assignedClasses || [] 
            },
            { new: true }
        ).populate("classId", "name grade").populate("assignedClasses", "name");

        if (!updatedUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }

        res.status(200).json({ message: "Cập nhật thành công!", user: updatedUser });
    } catch (error) {
        console.error("Lỗi sửa tài khoản:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật", error });
    }
});

// ======================================================================
// 6. [GET] BẢNG XẾP HẠNG THI ĐUA CÁC LỚP (TOÀN TRƯỜNG / THEO KHỐI)
// ======================================================================
router.get("/leaderboard", verifyToken, isAdmin, async (req, res) => {
    try {
        const { timeframe, grade } = req.query;

        // 1. Lọc Lớp theo Khối (Nếu chọn "Tất cả" thì lấy toàn trường)
        let classQuery = {};
        if (grade && grade !== 'all') {
            classQuery.grade = grade;
        }
        const classes = await Class.find(classQuery);

        // 2. Lọc theo Thời gian (Tuần, Tháng, Năm)
        let dateFilter = {};
        const now = new Date();
        if (timeframe === 'week') {
            const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfWeek } };
        } else if (timeframe === 'month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { createdAt: { $gte: firstDayOfMonth } };
        } else if (timeframe === 'year') {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter = { createdAt: { $gte: firstDayOfYear } };
        }

        // 3. Tính toán điểm thi đua cho từng Lớp
        let leaderboard = await Promise.all(classes.map(async (cls) => {
            // Lấy danh sách ID học sinh thuộc lớp này
            const students = await User.find({ classId: cls._id, role: 'student' }).select('_id');
            const studentIds = students.map(s => s._id);

            // Lấy toàn bộ bài nộp của các học sinh này trong thời gian đã chọn
            const submissions = await Submission.find({
                student: { $in: studentIds },
                ...dateFilter
            });

            const totalTests = submissions.length;
            const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
            
            // Tính điểm trung bình của Lớp
            const averageScore = totalTests > 0 ? (totalScore / totalTests).toFixed(2) : 0;

            return {
                _id: cls._id,
                className: cls.name,
                grade: cls.grade,
                studentCount: students.length,
                totalTests,
                averageScore: parseFloat(averageScore)
            };
        }));

        // Lọc bỏ những lớp chưa có bài làm nào (tùy chọn)
        leaderboard = leaderboard.filter(cls => cls.totalTests > 0);

        // 4. Sắp xếp: Ưu tiên Điểm TB giảm dần -> Số lượt làm bài giảm dần
        leaderboard.sort((a, b) => {
            if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
            return b.totalTests - a.totalTests;
        });

        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error("Lỗi lấy bảng thi đua Admin:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

export default router;