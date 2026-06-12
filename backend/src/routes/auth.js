import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 
import User from "../models/User.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import { verifyToken } from "../middleware/auth.js"; // <--- Bổ sung middleware để xác thực

const isStrongPassword = (password) => {
    const value = String(password ?? "");
    return (
        value.length >= 6 &&
        !/\s/.test(value) &&
        /[A-Z]/.test(value) &&
        /\d/.test(value) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(value)
    );
};

const removeAccents = (str) => {
    if (!str) return "";
    // Chuẩn hóa, bỏ dấu, và xóa các ký tự không phải chữ/số để làm username an toàn
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '');
};

const normalizeDuplicateName = (str) => {
    if (!str) return "";
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
};

const normalizeDuplicatePhone = (str) => {
    if (!str) return "";
    return String(str).trim().replace(/\s+/g, '');
};

const buildDuplicateAccountKey = (fullName, phone) => {
    return `${normalizeDuplicateName(fullName)}|${normalizeDuplicatePhone(phone)}`;
};

const hasDuplicateAccountByNameAndPhone = async (fullName, phone) => {
    const normalizedPhone = normalizeDuplicatePhone(phone);
    if (!normalizedPhone) return false;

    const duplicateAccounts = await User.find({ phone: normalizedPhone })
        .select('fullName phone')
        .lean();

    const incomingKey = buildDuplicateAccountKey(fullName, normalizedPhone);
    return duplicateAccounts.some((account) => buildDuplicateAccountKey(account.fullName, account.phone) === incomingKey);
};

const isValidUsernameFormat = (username) => {
    const value = String(username ?? "").trim();
    if (!value) return false;

    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

    return !/\s/.test(value) && value === normalized;
};

const router = express.Router();

// ==========================================
// [POST] API Đăng ký tài khoản (Tạo User mới)
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { username, password, fullName, role, grade, classId, subject, assignedClasses, department, subjects, qualification, departmentPosition, status, phone, address, note } = req.body;

        // Kiểm tra xem tài khoản này đã tồn tại trong DB chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác." });
        }

        if (!isValidUsernameFormat(username)) {
            return res.status(400).json({ message: "Tên đăng nhập không được có dấu hoặc khoảng trắng." });
        }

        if (!password) {
            return res.status(400).json({ message: "Mật khẩu không được để trống." });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự, gồm 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt." });
        }

        // Mã hóa mật khẩu (Băm 10 vòng)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let normalizedSubjects = Array.isArray(subjects)
            ? subjects
            : (typeof subjects === "string" ? subjects.split(",").map(s => s.trim()).filter(Boolean) : []);

        let teacherPosition = "";

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

            const validPositions = ["Tổ trưởng", "Tổ phó", "Giáo viên thường"];
            teacherPosition = department
                ? (validPositions.includes(String(departmentPosition || "").trim())
                    ? String(departmentPosition).trim()
                    : "Giáo viên thường")
                : "";
        }

        const phoneStr = String(phone ?? "").trim();
        const addressStr = String(address ?? "").trim();
        if (role === "student" || role === "teacher") {
            const roleLabel = role === "teacher" ? "Giáo viên" : "Học sinh";
            if (!phoneStr || !addressStr) {
                return res.status(400).json({ message: `${roleLabel} phải có Số điện thoại và Địa chỉ.` });
            }
        }
        if (phoneStr !== "" && !/^\d{1,15}$/.test(phoneStr)) {
            return res.status(400).json({
                message: "Số điện thoại phải là số (1-15 ký tự), không được nhập chữ."
            });
        }

        if (await hasDuplicateAccountByNameAndPhone(fullName, phoneStr)) {
            return res.status(400).json({
                message: "Tài khoản đã tồn tại vì trùng cả họ tên và SĐT."
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
            qualification: role === "teacher" ? (qualification || "Đại học") : (qualification || ""),
            departmentPosition: teacherPosition,
            status: status || "active",
            phone: phoneStr,
            address: addressStr,
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
        if (user.isLocked || user.status === "inactive") {
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
            role: user.role,
            tokenVersion: user.tokenVersion || 0
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.status(200).json({
            message: "Đăng nhập thành công!",
            token: token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                tokenVersion: user.tokenVersion || 0
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

// ==========================================
// [PUT] Cập nhật thông tin cá nhân & đổi mật khẩu (tùy chọn)
// ==========================================
router.put("/profile", verifyToken, async (req, res) => {
    try {
        const { fullName, phone, address, oldPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        const updateFields = {};

        if (fullName !== undefined) {
            const name = String(fullName).trim();
            if (!name) return res.status(400).json({ message: "Họ và tên không được để trống." });
            updateFields.fullName = name;
        }

        if (phone !== undefined) {
            const phoneStr = String(phone).trim();
            if (phoneStr !== "" && !/^\d{1,15}$/.test(phoneStr)) {
                return res.status(400).json({ message: "Số điện thoại nếu nhập thì là số (1-15 ký tự), không được nhập chữ." });
            }
            updateFields.phone = phoneStr;
        }

        if (address !== undefined) {
            updateFields.address = String(address).trim();
        }

        const wantsPasswordChange = Boolean(oldPassword || newPassword || confirmPassword);
        if (wantsPasswordChange) {
            if (!oldPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu." });
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: "Mật khẩu mới và xác nhận mật khẩu không khớp!" });
            }
            if (!isStrongPassword(newPassword)) {
                return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự, gồm 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt." });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Mật khẩu hiện tại không đúng!" });
            }

            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(newPassword, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateFields,
            { returnDocument: "after" }
        ).select("-password");

        res.status(200).json({
            message: wantsPasswordChange ? "Cập nhật thông tin và đổi mật khẩu thành công!" : "Cập nhật thông tin thành công!",
            user: updatedUser,
            passwordChanged: wantsPasswordChange,
        });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

export default router;