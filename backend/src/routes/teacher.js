import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import bcrypt from "bcryptjs"; // 👉 IMPORT BỔ SUNG ĐỂ MÃ HÓA MẬT KHẨU

const router = express.Router();

// [GET] Lấy thông tin cá nhân của Giáo viên (Kèm danh sách lớp đang dạy)
router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("assignedClasses");
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// [PUT] Giáo viên TỰ CHỌN lớp phụ trách
router.put("/my-classes", verifyToken, async (req, res) => {
    try {
        const { assignedClasses } = req.body;
        
        // Cập nhật lại danh sách lớp cho Giáo viên này
        const updatedTeacher = await User.findByIdAndUpdate(
            req.user.id,
            { assignedClasses },
            { new: true }
        ).populate("assignedClasses");

        res.status(200).json({ message: "Đã cập nhật danh sách lớp thành công!", user: updatedTeacher });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// =========================================================================
// 👉 [MỚI] API: GIÁO VIÊN SỬA THÔNG TIN & ĐẶT LẠI MẬT KHẨU CHO HỌC SINH
// =========================================================================
router.put("/update-student/:studentId", verifyToken, async (req, res) => {
    try {
        // 1. Phân quyền: Đảm bảo người gọi API là Giáo viên (hoặc Admin)
        if (req.user.role !== "teacher" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này!" });
        }

        const { studentId } = req.params;
        // 👉 ĐÃ XÓA dateOfBirth, gender
        const { fullName, phone, address, newPassword } = req.body;

        const targetStudent = await User.findById(studentId);
        if (!targetStudent) return res.status(404).json({ message: "Không tìm thấy học sinh này!" });

        // 2. Bảo mật bổ sung: Đảm bảo tài khoản bị sửa phải là Học sinh
        if (targetStudent.role !== "student") {
            return res.status(403).json({ message: "Bạn chỉ được phép chỉnh sửa thông tin của Học sinh!" });
        }

        // 3. Cập nhật thông tin cơ bản
        if (fullName) targetStudent.fullName = fullName;
        if (phone !== undefined) targetStudent.phone = phone;
        if (address !== undefined) targetStudent.address = address;

        // 4. Nếu giáo viên nhập mật khẩu mới -> Mã hóa và đổi mật khẩu cho học sinh
        if (newPassword && newPassword.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            targetStudent.password = await bcrypt.hash(newPassword, salt);
        }

        await targetStudent.save();
        res.status(200).json({ message: "✅ Cập nhật thông tin học sinh thành công!" });

    } catch (error) {
        console.error("Lỗi giáo viên sửa học sinh:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

export default router;