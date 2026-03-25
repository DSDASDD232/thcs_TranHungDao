import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js"; // <--- Bổ sung middleware để xác thực

const router = express.Router();

// ==========================================
// [POST] API Đăng ký tài khoản (Tạo User mới)
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { username, password, fullName, role, grade, classId, subject, assignedClasses } = req.body;

        // Kiểm tra xem tài khoản này đã tồn tại trong DB chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác." });
        }

        // Mã hóa mật khẩu (Băm 10 vòng)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo User mới
        const newUser = new User({
            username,
            password: hashedPassword,
            fullName,
            role,
            grade,
            classId: classId || null,
            subject,
            assignedClasses: assignedClasses || [] 
        });
        await newUser.save();

        res.status(201).json({ message: "🎉 Tạo tài khoản thành công!", user: newUser });

    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ==========================================
// [POST] API Đăng nhập
// ==========================================
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        const payload = {
            id: user._id,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(200).json({
            message: "Đăng nhập thành công!",
            token: token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ==========================================
// [GET] API Lấy thông tin người dùng đang đăng nhập
// Cực kỳ quan trọng để Học sinh/Giáo viên lấy được thông tin Lớp học
// ==========================================
router.get("/me", verifyToken, async (req, res) => {
    try {
        // Dùng populate để dịch ID lớp sang tên Lớp (VD: 9A1)
        const user = await User.findById(req.user.id)
            .select("-password")
            .populate("classId", "name grade academicYear") 
            .populate("assignedClasses", "name grade"); 

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        res.status(200).json(user);
    } catch (error) {
        console.error("Lỗi lấy thông tin user:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

export default router;