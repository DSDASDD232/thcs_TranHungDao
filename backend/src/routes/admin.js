import express from "express";
import mongoose from "mongoose"; 
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
import fs from "fs"; 

const router = express.Router();
// Cấu hình Multer lưu file tạm cho Restore và memoryStorage cho import Excel
const upload = multer({ dest: 'uploads/temp_backups/' });
const excelUpload = multer({ storage: multer.memoryStorage() });

// ==========================================
// HÀM HỖ TRỢ: Lọc thời gian (Năm, Tháng, Tuần)
// ==========================================
const buildDateFilter = (year, month, week) => {
    if (!year) return {};
    let startDate, endDate;
    const y = parseInt(year);

    if (!month || month === "all") {
        // Lọc cả năm
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
        const m = parseInt(month) - 1; // Trong JS tháng bắt đầu từ 0
        if (!week || week === "all") {
            // Lọc cả tháng
            startDate = new Date(y, m, 1);
            endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
        } else {
            // Lọc theo tuần
            const w = parseInt(week);
            const startDay = (w - 1) * 7 + 1;
            let endDay = w * 7;
            const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
            
            if (endDay > lastDayOfMonth || w === 5) {
                endDay = lastDayOfMonth;
            }
            startDate = new Date(y, m, startDay);
            endDate = new Date(y, m, endDay, 23, 59, 59, 999);
        }
    }
    return { createdAt: { $gte: startDate, $lte: endDate } };
};

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

// ======================================================================
// 2. [GET] API SAO LƯU TOÀN BỘ DATABASE (BACKUP)
// ======================================================================
router.get("/backup", verifyToken, isAdmin, async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        let backupData = {};

        for (let coll of collections) {
            const collectionName = coll.name;
            if (collectionName.startsWith('system.')) continue;
            
            const data = await db.collection(collectionName).find({}).toArray();
            backupData[collectionName] = data;
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `Backup_THCS_TranHungDao_${dateStr}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        console.error("Lỗi sao lưu:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tạo bản sao lưu!" });
    }
});

// ======================================================================
// 3. [POST] API PHỤC HỒI DỮ LIỆU TỪ FILE JSON (RESTORE)
// ======================================================================
router.post("/restore", verifyToken, isAdmin, upload.single('backupFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Vui lòng đính kèm file .json!" });

        const rawData = fs.readFileSync(req.file.path, 'utf8');
        const backupData = JSON.parse(rawData);

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const existingCollectionNames = collections.map(c => c.name);

        for (const [collectionName, dataArray] of Object.entries(backupData)) {
            if (existingCollectionNames.includes(collectionName)) {
                await db.collection(collectionName).deleteMany({});
                
                if (Array.isArray(dataArray) && dataArray.length > 0) {
                    
                    // Xử lý chuẩn hóa lại cấu trúc ObjectId và Date bị biến dạng khi chuyển qua JSON
                    const sanitizedData = dataArray.map(doc => {
                        // Khôi phục _id chính
                        if (doc._id && doc._id.$oid) {
                             doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
                        } else if (doc._id && typeof doc._id === 'string') {
                             doc._id = new mongoose.Types.ObjectId(doc._id);
                        }

                        // Khôi phục các trường tham chiếu (Khóa ngoại) để không đứt link
                        const referenceFields = ['classId', 'teacher', 'assignment', 'student'];
                        referenceFields.forEach(field => {
                            if (doc[field]) {
                                if (doc[field].$oid) doc[field] = new mongoose.Types.ObjectId(doc[field].$oid);
                                else if (typeof doc[field] === 'string' && mongoose.Types.ObjectId.isValid(doc[field])) {
                                    doc[field] = new mongoose.Types.ObjectId(doc[field]);
                                }
                            }
                        });

                        // Khôi phục mảng ID (VD: assignedClasses)
                        if (doc.assignedClasses && Array.isArray(doc.assignedClasses)) {
                            doc.assignedClasses = doc.assignedClasses.map(id => {
                                if (id && id.$oid) return new mongoose.Types.ObjectId(id.$oid);
                                if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
                                return id;
                            });
                        }

                        // Khôi phục ngày tháng
                        for (let key in doc) {
                            if (doc[key] && typeof doc[key] === 'object' && doc[key].$date) {
                                doc[key] = new Date(doc[key].$date);
                            }
                        }
                        return doc;
                    });

                    await db.collection(collectionName).insertMany(sanitizedData, { ordered: false });
                }
            }
        }

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.status(200).json({ message: "✅ Phục hồi toàn bộ dữ liệu thành công! Khóa liên kết đã được giữ nguyên." });
    } catch (error) {
        console.error("Lỗi phục hồi:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: "Lỗi cấu trúc file hoặc lỗi server khi phục hồi!" });
    }
});

// ==========================================
// 4. [GET] Lấy danh sách tài khoản
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
// 5. [POST] TẠO TÀI KHOẢN HỌC SINH TỪ FILE EXCEL
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
// 6. [DELETE] XÓA TÀI KHOẢN VÀ BÀI NỘP LIÊN QUAN
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
// 7. [PUT] CẬP NHẬT TÀI KHOẢN
// ==========================================
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, role, grade, classId, assignedClasses, isLocked, password, subject, department, subjects } = req.body;
        
        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        let updateFields = {};

        if (existingUser.role === "teacher") {
            const isAssigned = existingUser.assignedClasses && existingUser.assignedClasses.length > 0;

            if (department !== undefined) {
                if (existingUser.department !== department && isAssigned) {
                    return res.status(400).json({ 
                        message: `Thầy/Cô đang phụ trách ${existingUser.assignedClasses.length} lớp. Vui lòng vào "Quản lý Lớp học" gỡ quyền phụ trách trước khi đổi tổ bộ môn!` 
                    });
                }
                updateFields.department = department; 
            }

            if (subjects !== undefined) {
                updateFields.subjects = subjects;
            }

            if (subject !== undefined) {
                updateFields.subject = subject;
            }
        }

        if (fullName) updateFields.fullName = fullName;
        if (role) updateFields.role = role;
        if (grade !== undefined) updateFields.grade = grade;
        
        if (role === "student") {
            if (classId !== undefined) updateFields.classId = classId || null;
            updateFields.$unset = { assignedClasses: "" }; 
        } 
        else if (role === "teacher") {
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
// 8. [GET] BẢNG XẾP HẠNG THI ĐUA TỔNG CỦA CÁC LỚP
// ======================================================================
router.get("/leaderboard", verifyToken, isAdmin, async (req, res) => {
    try {
        const { year, month, week, grade } = req.query;

        let classQuery = {};
        if (grade && grade !== 'all') {
            classQuery.grade = grade;
        }
        const classes = await Class.find(classQuery);

        // Sử dụng bộ lọc thời gian mới
        const dateFilter = buildDateFilter(year, month, week);

        let leaderboard = await Promise.all(classes.map(async (cls) => {
            const students = await User.find({ classId: cls._id, role: 'student' }).select('_id');
            const studentIds = students.map(s => s._id);

            const submissions = await Submission.find({
                student: { $in: studentIds },
                ...dateFilter
            });

            const totalTests = submissions.length;
            const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
            
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

// ======================================================================
// 9. [GET] CHI TIẾT THI ĐUA CỦA HỌC SINH TRONG 1 LỚP CỤ THỂ
// ======================================================================
router.get("/leaderboard/class/:classId", verifyToken, isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const { year, month, week } = req.query;

        // 1. Tìm tất cả học sinh thuộc lớp này
        const students = await User.find({ classId: classId, role: 'student' }).select('fullName username');

        if (!students || students.length === 0) {
            return res.json({ students: [] });
        }

        // 2. Lấy ID học sinh và xây dựng bộ lọc thời gian
        const studentIds = students.map(s => s._id);
        const dateFilter = buildDateFilter(year, month, week);

        // 3. Truy vấn các bài tập đã nộp của các học sinh này trong khoảng thời gian trên
        const submissions = await Submission.find({
            student: { $in: studentIds },
            ...dateFilter
        });

        // 4. Map dữ liệu để tính toán tổng bài nộp & điểm TB cho từng cá nhân
        const studentStats = students.map(student => {
            const studentSubs = submissions.filter(sub => String(sub.student) === String(student._id));
            const totalTests = studentSubs.length;
            
            let averageScore = 0;
            if (totalTests > 0) {
                const totalScore = studentSubs.reduce((sum, sub) => sum + Number(sub.score || 0), 0);
                averageScore = (totalScore / totalTests).toFixed(2);
            }

            return {
                _id: student._id,
                fullName: student.fullName,
                username: student.username,
                totalTests: totalTests,
                averageScore: parseFloat(averageScore)
            };
        });

        res.status(200).json({ students: studentStats });

    } catch (error) {
        console.error("Lỗi API chi tiết thi đua lớp:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
});

// ==========================================
// 10. [GET & POST & DELETE] MÔN HỌC (SUBJECTS)
// ==========================================
router.get("/subjects", verifyToken, async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ createdAt: 1 });
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách môn học" });
    }
});

router.post("/subjects", verifyToken, isAdmin, async (req, res) => {
    try {
        const { name, department } = req.body;
        if (!name || !department) return res.status(400).json({ message: "Vui lòng nhập tên môn và chọn Tổ chuyên môn!" });

        const existing = await Subject.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ message: "Môn học này đã tồn tại trong hệ thống!" });

        const newSubject = new Subject({ 
            name: name.trim(),
            department: department 
        });
        
        await newSubject.save();
        res.status(201).json({ message: "Thêm môn học thành công!", subject: newSubject });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi thêm môn học" });
    }
});

router.delete("/subjects/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        await Subject.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Đã xóa môn học khỏi danh mục chung!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa môn học" });
    }
});

export default router;