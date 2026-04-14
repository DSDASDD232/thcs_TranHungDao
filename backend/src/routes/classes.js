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
// 3. [GET] LẤY DANH SÁCH HỌC SINH CỦA 1 LỚP 
// ==========================================
router.get("/:id/students", verifyToken, async (req, res) => {
    try {
        // Tìm tất cả User là học sinh và có classId khớp với ID truyền vào
        const students = await User.find({ classId: req.params.id, role: "student" })
            .select("fullName username") 
            .sort({ fullName: 1 }); 

        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================
// 4. [PUT] CẬP NHẬT THÔNG TIN LỚP HỌC (SỬA LỚP)
// ==========================================
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { name, grade, academicYear } = req.body;
        if (!name || !grade || !academicYear) {
            return res.status(400).json({ message: "Vui lòng nhập đủ Tên lớp, Khối và Năm học!" });
        }

        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            { name, grade, academicYear },
            { new: true } // Trả về thông tin lớp mới sau khi đã lưu
        );

        if (!updatedClass) return res.status(404).json({ message: "Không tìm thấy lớp học!" });

        res.status(200).json({ message: "Cập nhật lớp thành công!", classInfo: updatedClass });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Tên lớp này đã tồn tại trong năm học hiện tại!" });
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================
// 5. [POST] PHÂN CÔNG GIÁO VIÊN CHO LỚP
// ==========================================
router.post("/:id/assign-teachers", verifyToken, async (req, res) => {
    try {
        const classId = req.params.id;
        const { teacherIds } = req.body; // Mảng chứa ID các giáo viên được chọn

        // Bước 1: Gỡ classId này ra khỏi TẤT CẢ giáo viên (Reset trạng thái của lớp này)
        await User.updateMany(
            { role: 'teacher', assignedClasses: classId },
            { $pull: { assignedClasses: classId } }
        );

        // Bước 2: Gắn lại classId này vào những giáo viên mới được tick chọn
        if (teacherIds && teacherIds.length > 0) {
            await User.updateMany(
                { _id: { $in: teacherIds }, role: 'teacher' },
                { $addToSet: { assignedClasses: classId } } // Dùng $addToSet để đảm bảo ID lớp không bị trùng lặp
            );
        }

        res.status(200).json({ message: "Phân công giáo viên thành công!" });
    } catch (error) {
        console.error("Lỗi phân công:", error);
        res.status(500).json({ message: "Lỗi Server nội bộ", error: error.message });
    }
});

// ==========================================
// 6. [DELETE] XÓA LỚP HỌC (Đã sửa lại Route cho chuẩn)
// ==========================================
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        // Ràng buộc an toàn: Không cho xóa nếu lớp đang có học sinh
        const studentCount = await User.countDocuments({ classId: req.params.id });
        if (studentCount > 0) {
            return res.status(400).json({ message: `❌ Không thể xóa! Lớp này đang có ${studentCount} học sinh. Hãy chuyển các em sang lớp khác trước.` });
        }

        // Tùy chọn: Bạn có thể gỡ lớp này khỏi danh sách quản lý của giáo viên trước khi xóa lớp
        await User.updateMany(
            { role: 'teacher', assignedClasses: req.params.id },
            { $pull: { assignedClasses: req.params.id } }
        );

        await Class.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "🗑️ Đã xóa lớp học thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

export default router;