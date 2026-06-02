import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 
import User from "../models/User.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import { verifyToken } from "../middleware/auth.js"; // <--- Bổ sung middleware để xác thực

const hasSpecialChar = (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

const removeAccents = (str) => {
    if (!str) return "";
    // Chuẩn hóa, bỏ dấu, và xóa các ký tự không phải chữ/số để làm username an toàn
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '');
};

const router = express.Router();

// ==========================================
// [POST] API Đăng ký tài khoản (Tạo User mới)
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { username, password, fullName, role, grade, classId, subject, assignedClasses, department, subjects, qualification, status, phone, address, note } = req.body;

        // Kiểm tra xem tài khoản này đã tồn tại trong DB chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác." });
        }

        if (!password) {
            return res.status(400).json({ message: "Mật khẩu không được để trống." });
        }
        if (!hasSpecialChar(password)) {
            return res.status(400).json({ message: "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt." });
        }

        // Mã hóa mật khẩu (Băm 10 vòng)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let normalizedSubjects = Array.isArray(subjects)
            ? subjects
            : (typeof subjects === "string" ? subjects.split(",").map(s => s.trim()).filter(Boolean) : []);

        if (role === "teacher") {
            if (department) {
                const allowedSubjects = await Subject.find({ department }).select("name");
                const allowedSubjectNames = new Set(allowedSubjects.map(s => s.name));
                const invalidSubjects = normalizedSubjects.filter(s => !allowedSubjectNames.has(s));
                if (invalidSubjects.length > 0) {
                    return res.status(400).json({
                        message: `Môn không hợp lệ với tổ ${department}: ${invalidSubjects.join(", ")}`
                    });
                }
            } else {
                normalizedSubjects = [];
            }
        }

        // Validate phone: tùy chọn, nếu nhập thì phải là số 1-15 ký tự
        const phoneStr = String(phone ?? "").trim();
        if (phoneStr !== "" && !/^\d{1,15}$/.test(phoneStr)) {
            return res.status(400).json({
                message: "Số điện thoại nếu nhập thì là số (1-15 ký tự), không được nhập chữ."
            });
        }

        // Tạo User mới
        const newUser = new User({
            username,
            password: hashedPassword,
            fullName,
            role,
            grade,
            classId: classId || null,
            subject,
            assignedClasses: assignedClasses || [],
            department: department || "",
            subjects: normalizedSubjects,
            qualification: qualification || "",
            status: status || "active",
            phone: phoneStr,
            address: address || "",
            note: note || "",
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

        // 👉 CHỐT CHẶN: Kiểm tra xem tài khoản có bị khóa không?
        if (user.isLocked) {
            return res.status(403).json({ 
                message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để biết thêm chi tiết!" 
            });
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
