import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

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

export default router;