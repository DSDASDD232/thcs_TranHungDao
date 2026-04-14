import express from "express";
import User from "../models/User.js";
import Class from "../models/Class.js"; 
import Question from "../models/Question.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import multer from "multer";
import xlsx from "xlsx";
import bcrypt from "bcryptjs"; 
import Subject from "../models/Subject.js";
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
// 4. [DELETE] XÓA TÀI KHOẢN VÀ BÀI NỘP LIÊN QUAN
// ==========================================
router.delete("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản!" });
        }

        if (userToDelete.role === "student") {
            await Submission.deleteMany({ student: userId }); 
        }

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "Đã xóa tài khoản và mọi dữ liệu liên quan thành công!" });
    } catch (error) {
        console.error("Lỗi xóa tài khoản:", error);
        res.status(500).json({ message: "Lỗi server khi xóa tài khoản", error });
    }
});

// ==========================================
// 5. [PUT] CẬP NHẬT TÀI KHOẢN (Thông tin, Khóa acc, Reset Mật khẩu, Tổ chuyên môn)
// ==========================================
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, role, grade, classId, assignedClasses, isLocked, password, subject } = req.body;
        
        // BƯỚC KIỂM TRA: Tìm user hiện tại trong DB
        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        let updateFields = {};

        // RÀNG BUỘC: Nếu là giáo viên và đang muốn đổi môn học
        if (subject !== undefined && existingUser.role === "teacher") {
            // Nếu đổi môn mới KHÁC môn cũ, VÀ giáo viên đang có lớp phụ trách -> Chặn lại
            if (existingUser.subject !== subject && existingUser.assignedClasses && existingUser.assignedClasses.length > 0) {
                return res.status(400).json({ 
                    message: `Thầy/Cô đang phụ trách ${existingUser.assignedClasses.length} lớp. Vui lòng vào "Quản lý Lớp học" gỡ quyền phụ trách trước khi đổi tổ bộ môn!` 
                });
            }
            updateFields.subject = subject; // Nếu an toàn thì cho đổi
        }

        // ... (Các phần cập nhật fullName, role, grade, password, isLocked giữ nguyên như cũ)
        if (fullName) updateFields.fullName = fullName;
        if (role) updateFields.role = role;
        if (grade !== undefined) updateFields.grade = grade;
        
        if (role === "student") {
            if (classId !== undefined) updateFields.classId = classId || null;
            updateFields.$unset = { assignedClasses: "" }; 
        } else if (role === "teacher") {
            if (assignedClasses) updateFields.assignedClasses = assignedClasses;
            updateFields.classId = null; 
        }

        if (isLocked !== undefined) updateFields.isLocked = isLocked;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { returnDocument: 'after' } 
        ).populate("classId", "name grade").populate("assignedClasses", "name");

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

        let classQuery = {};
        if (grade && grade !== 'all') {
            classQuery.grade = grade;
        }
        const classes = await Class.find(classQuery);

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

        let leaderboard = await Promise.all(classes.map(async (cls) => {
            const students = await User.find({ classId: cls._id, role: 'student' }).select('_id');
            const studentIds = students.map(s => s._id);

            const submissions = await Submission.find({
                student: { $in: studentIds },
                ...dateFilter
            });

            const totalTests = submissions.length;
            const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
            
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

        leaderboard = leaderboard.filter(cls => cls.totalTests > 0);

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



// ==========================================
// [GET] LẤY DANH MỤC MÔN HỌC CHUNG
// ==========================================
router.get("/subjects", verifyToken, async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ createdAt: 1 });
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách môn học" });
    }
});

// ==========================================
// [POST] THÊM MÔN HỌC MỚI VÀO HỆ THỐNG
// ==========================================
router.post("/subjects", verifyToken, isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Vui lòng nhập tên môn học!" });

        const existing = await Subject.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ message: "Môn học này đã tồn tại trong hệ thống!" });

        const newSubject = new Subject({ name: name.trim() });
        await newSubject.save();
        res.status(201).json({ message: "Thêm môn học thành công!", subject: newSubject });
    } catch (error) {
        res.status(500).json({ message: "Lỗi thêm môn học" });
    }
});

// ==========================================
// [DELETE] XÓA MÔN HỌC KHỎI HỆ THỐNG
// ==========================================
router.delete("/subjects/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        await Subject.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Đã xóa môn học khỏi danh mục chung!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa môn học" });
    }
});


export default router;