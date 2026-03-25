import express from "express";
import Class from "../models/Class.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js"; // Giả định bạn có middleware này

const router = express.Router();

// ==========================================
// 1. [POST] TẠO LỚP HỌC MỚI (Dành cho Admin)
// ==========================================
router.post("/create", verifyToken, async (req, res) => {
    try {
        const { name, grade, academicYear, homeroomTeacher } = req.body;
        
        // Kiểm tra dữ liệu trống
        if (!name || !grade || !academicYear) {
            return res.status(400).json({ message: "Vui lòng nhập đủ Tên lớp, Khối và Năm học!" });
        }

        // Tạo lớp mới
        const newClass = new Class({ 
            name, 
            grade, 
            academicYear, 
            homeroomTeacher: homeroomTeacher || null 
        });
        
        await newClass.save();
        res.status(201).json({ message: `✅ Đã tạo lớp ${name} thành công!`, classInfo: newClass });
    } catch (error) {
        // Lỗi 11000 của MongoDB là lỗi trùng lặp (Unique)
        if (error.code === 11000) {
            return res.status(400).json({ message: "Lớp học này đã tồn tại trong năm học hiện tại!" });
        }
        console.error("Lỗi tạo lớp:", error);
        res.status(500).json({ message: "Lỗi server hệ thống", error: error.message });
    }
});

// ==========================================
// 2. [GET] LẤY DANH SÁCH TẤT CẢ CÁC LỚP
// ==========================================
router.get("/all", verifyToken, async (req, res) => {
    try {
        // Lấy danh sách lớp, sắp xếp theo Năm học -> Khối -> Tên lớp
        const classes = await Class.find()
            .populate("homeroomTeacher", "fullName username")
            .sort({ academicYear: -1, grade: 1, name: 1 });

        // Dùng vòng lặp để đếm xem mỗi lớp đang có bao nhiêu học sinh
        const classesWithStudentCount = await Promise.all(classes.map(async (c) => {
            const studentCount = await User.countDocuments({ classId: c._id, role: "student" });
            return { 
                ...c._doc, // Mở gói dữ liệu mongoose
                studentCount // Thêm biến đếm học sinh vào
            };
        }));

        res.status(200).json({ classes: classesWithStudentCount });
    } catch (error) {
        console.error("Lỗi lấy danh sách lớp:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================
// 3. [GET] LẤY DANH SÁCH HỌC SINH CỦA 1 LỚP (Dành cho Giáo viên/Admin)
// ==========================================
router.get("/:id/students", verifyToken, async (req, res) => {
    try {
        // Tìm tất cả User là học sinh và có classId khớp với ID truyền vào
        const students = await User.find({ classId: req.params.id, role: "student" })
            .select("fullName username") // Chỉ lấy Tên và Tài khoản cho Frontend hiển thị
            .sort({ fullName: 1 }); // Sắp xếp theo tên A-Z

        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================
// 4. [DELETE] XÓA LỚP HỌC
// ==========================================
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        // Ràng buộc an toàn: Không cho xóa nếu lớp đang có học sinh
        const studentCount = await User.countDocuments({ classId: req.params.id });
        if (studentCount > 0) {
            return res.status(400).json({ message: `❌ Không thể xóa! Lớp này đang có ${studentCount} học sinh. Hãy chuyển các em sang lớp khác trước.` });
        }

        await Class.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "🗑️ Đã xóa lớp học thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

export default router;