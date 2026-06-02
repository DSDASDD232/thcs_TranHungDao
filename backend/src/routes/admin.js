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
// 7. [PUT] CẬP NHẬT TÀI KHOẢN (ĐÃ UPDATE HỖ TRỢ ĐA MÔN HỌC)
// ==========================================
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, role, grade, classId, assignedClasses, isLocked, password, subject, department, subjects, qualification, status, phone, address, note } = req.body;
        
        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        let updateFields = {};

        if (existingUser.role === "teacher") {
            const isAssigned = existingUser.assignedClasses && existingUser.assignedClasses.length > 0;
            const targetDepartment = department !== undefined ? department : existingUser.department;

            if (department !== undefined) {
                if (existingUser.department !== department && isAssigned) {
                    return res.status(400).json({ 
                        message: `Thầy/Cô đang phụ trách ${existingUser.assignedClasses.length} lớp. Vui lòng vào "Quản lý Lớp học" gỡ quyền phụ trách trước khi đổi tổ bộ môn!` 
                    });
                }
                updateFields.department = department; 
            }

            if (subjects !== undefined) {
                const normalizedSubjects = Array.isArray(subjects) ? subjects : (typeof subjects === "string" ? subjects.split(",").map(s => s.trim()).filter(Boolean) : []);

                if (targetDepartment) {
                    const allowedSubjects = await Subject.find({ department: targetDepartment }).select("name");
                    const allowedSubjectNames = new Set(allowedSubjects.map(s => s.name));
                    const invalidSubjects = normalizedSubjects.filter(s => !allowedSubjectNames.has(s));
                    if (invalidSubjects.length > 0) {
                        return res.status(400).json({
                            message: `Môn không hợp lệ với tổ ${targetDepartment}: ${invalidSubjects.join(", ")}`
                        });
                    }
                }

                updateFields.subjects = targetDepartment ? normalizedSubjects : [];
            }

            if (subject !== undefined) {
                updateFields.subject = subject;
            }

            if (qualification !== undefined) {
                updateFields.qualification = qualification;
            }
        }

        if (fullName) updateFields.fullName = fullName;
        if (role) updateFields.role = role;
        if (grade !== undefined) updateFields.grade = grade;
        if (status !== undefined) updateFields.status = status;
        if (phone !== undefined) {
            const phoneStr = String(phone).trim();
            if (phoneStr === "") {
                updateFields.phone = "";
            } else if (!/^\d{1,15}$/.test(phoneStr)) {
                return res.status(400).json({ message: "Số điện thoại nếu nhập thì là số (1-15 ký tự), không được nhập chữ." });
            } else {
                updateFields.phone = phoneStr;
            }
        }
        if (address !== undefined) updateFields.address = address;
        if (note !== undefined) updateFields.note = note;
        
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
// 8. [GET] BẢNG XẾP HẠNG THI ĐUA CÁC LỚP
// ======================================================================
router.get("/leaderboard", verifyToken, isAdmin, async (req, res) => {
    try {
        const { timeframe, grade, year, month, day, startDate, endDate } = req.query;
        const getDaysInMonthUtc = (y, mZeroBased) => new Date(Date.UTC(y, mZeroBased + 1, 0)).getUTCDate();

        let classQuery = {};
        if (grade && grade !== 'all' && grade !== "") {
            classQuery.grade = grade;
        }
        const classes = await Class.find(classQuery);

        let dateFilter = {};
        const now = new Date();
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
        } else if (timeframe === 'week') {
            const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfWeek } };
        } else if (timeframe === 'month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfMonth } };
        } else if (timeframe === 'year') {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            firstDayOfYear.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfYear } };
        } else if (year && year !== 'all') {
            const y = parseInt(year, 10);
            if (!isNaN(y)) {
                if (month && month !== 'all') {
                    const m = parseInt(month, 10) - 1;
                    if (!isNaN(m) && m >= 0 && m <= 11) {
                        if (day && day !== 'all') {
                            const d = parseInt(day, 10);
                            const maxDay = getDaysInMonthUtc(y, m);
                            if (!isNaN(d) && d >= 1 && d <= maxDay) {
                                // Sử dụng UTC để tránh vấn đề timezone
                                const startDate = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
                                const endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
                                dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                            } else {
                                return res.status(200).json({ leaderboard: [] });
                            }
                        } else {
                            // Nguyên tháng - lấy từ ngày 1 đến cuối tháng
                            const startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
                            const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
                            dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                        }
                    }
                } else {
                    // Nguyên năm - lấy từ 1/1 đến 31/12
                    const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
                    const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
                    dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                }
            }
        }

        console.log("📊 Leaderboard Filter:", { year, month, day, dateFilter });

        let leaderboard = await Promise.all(classes.map(async (cls) => {
            const students = await User.find({ classId: cls._id, role: 'student' }).select('_id fullName leaderboardOverride');
            const studentIds = students.map(s => s._id);

            const submissions = await Submission.find({
                student: { $in: studentIds },
                status: "graded",
                ...dateFilter
            });

            const submissionsByStudent = submissions.reduce((map, sub) => {
                const key = String(sub.student);
                if (!map[key]) map[key] = [];
                map[key].push(sub);
                return map;
            }, {});

            let totalTests = 0;
            let weightedScoreSum = 0;
            let effectiveWeight = 0;

            students.forEach((student) => {
                const studentSubs = submissionsByStudent[String(student._id)] || [];
                const computedTotalTests = studentSubs.length;
                const computedAverageScore = computedTotalTests > 0 ? studentSubs.reduce((sum, sub) => sum + sub.score, 0) / computedTotalTests : 0;

                const override = student.leaderboardOverride || {};
                const hasComputedDataInRange = computedTotalTests > 0;
                const useOverrideInRange = hasComputedDataInRange && override.isOverridden;
                const finalTotalTests = useOverrideInRange && override.totalTests !== null && override.totalTests !== undefined ? override.totalTests : computedTotalTests;
                const finalAverageScore = useOverrideInRange && override.averageScore !== null && override.averageScore !== undefined ? override.averageScore : computedAverageScore;

                totalTests += finalTotalTests;

                const weightForAverage = finalTotalTests > 0 ? finalTotalTests : (override.averageScore !== null && override.averageScore !== undefined ? 1 : 0);
                weightedScoreSum += finalAverageScore * weightForAverage;
                effectiveWeight += weightForAverage;
            });

            const averageScore = effectiveWeight > 0 ? parseFloat((weightedScoreSum / effectiveWeight).toFixed(2)) : 0;

            return {
                _id: cls._id,
                className: cls.name,
                grade: cls.grade,
                studentCount: students.length,
                studentNames: students.map(s => s.fullName),
                totalTests,
                averageScore,
                effectiveTests: effectiveWeight,
            };
        }));

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
// 8.1 [GET] LẤY CÁC NĂM CÓ DỮ LIỆU THI ĐUA
// ======================================================================
router.get("/leaderboard/years", verifyToken, isAdmin, async (req, res) => {
    try {
        const years = await Submission.aggregate([
            { $match: { createdAt: { $type: "date" } } },
            {
                $group: {
                    _id: { $year: "$createdAt" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const availableYears = years
            .map(item => String(item._id))
            .filter(Boolean);

        res.status(200).json({ years: availableYears });
    } catch (error) {
        console.error("Lỗi lấy danh sách năm thi đua:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// [GET] LẤY THỐNG KÊ LỚP VÀ SỐ HỌC SINH THEO KHỐI (KHÔNG XEM HOẠT ĐỘNG)
// ======================================================================
router.get("/leaderboard/stats", verifyToken, isAdmin, async (req, res) => {
    try {
        // Aggregate classes and student counts per grade
        const grades = ["6", "7", "8", "9"];

        const gradeStats = await Promise.all(grades.map(async (g) => {
            const classes = await Class.find({ grade: g }).select("_id name grade");
            const classIds = classes.map(c => c._id);
            const studentCount = await User.countDocuments({ role: 'student', classId: { $in: classIds } });
            return {
                grade: g,
                classes: classes.length,
                students: studentCount
            };
        }));

        const totalClasses = gradeStats.reduce((s, g) => s + g.classes, 0);
        const totalStudents = gradeStats.reduce((s, g) => s + g.students, 0);

        res.status(200).json({ totalClasses, totalStudents, grades: gradeStats });
    } catch (error) {
        console.error("Lỗi lấy thống kê lớp/học sinh:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 9. [GET] LẤY CHI TIẾT THI ĐUA HỌC SINH TRONG 1 LỚP (CHO ADMIN GHI ĐÈ)
// ======================================================================
router.get("/leaderboard/class/:classId/students", verifyToken, isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const { timeframe, subject, year, month, day, startDate, endDate } = req.query;
        const getDaysInMonthUtc = (y, mZeroBased) => new Date(Date.UTC(y, mZeroBased + 1, 0)).getUTCDate();

        const classInfo = await Class.findById(classId).select("name grade");
        if (!classInfo) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        const students = await User.find({ classId: classId, role: "student" }).select("fullName username leaderboardOverride");
        if (students.length === 0) {
            return res.status(200).json({ classInfo, students: [] });
        }
        const studentIds = students.map(s => s._id);

        let dateFilter = {};
        const now = new Date();
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
        } else if (timeframe === 'week') {
            const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfWeek } };
        } else if (timeframe === 'month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { createdAt: { $gte: firstDayOfMonth } };
        } else if (year && year !== 'all') {
            const y = parseInt(year, 10);
            if (!isNaN(y)) {
                if (month && month !== 'all') {
                    const m = parseInt(month, 10) - 1;
                    if (!isNaN(m) && m >= 0 && m <= 11) {
                        if (day && day !== 'all') {
                            const d = parseInt(day, 10);
                            const maxDay = getDaysInMonthUtc(y, m);
                            if (!isNaN(d) && d >= 1 && d <= maxDay) {
                                const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
                                const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
                                dateFilter = { createdAt: { $gte: start, $lte: end } };
                            } else {
                                return res.status(200).json({ classInfo, students: [] });
                            }
                        } else {
                            const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
                            const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
                            dateFilter = { createdAt: { $gte: start, $lte: end } };
                        }
                    }
                } else {
                    const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
                    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
                    dateFilter = { createdAt: { $gte: start, $lte: end } };
                }
            }
        }

        let assignmentFilter = {};
        if (subject && subject !== "all") {
            const assignmentsOfSubject = await Assignment.find({ subject: subject }).select("_id");
            const assignmentIds = assignmentsOfSubject.map(a => a._id);
            assignmentFilter = { assignment: { $in: assignmentIds } };
        }

        const submissions = await Submission.find({
            student: { $in: studentIds },
            status: "graded",
            ...dateFilter,
            ...assignmentFilter
        });

        const studentStats = students.map(student => {
            const studentSubs = submissions.filter(sub => sub.student.toString() === student._id.toString());
            const computedTotalScore = studentSubs.reduce((sum, sub) => sum + sub.score, 0);
            const computedAverageScore = studentSubs.length > 0 ? parseFloat((computedTotalScore / studentSubs.length).toFixed(1)) : 0;

            const computed = {
                totalTests: studentSubs.length,
                averageScore: computedAverageScore,
            };

            const final = { ...computed };
            const overridden = { totalTests: false, averageScore: false };

            const hasComputedDataInRange = computed.totalTests > 0;
            if (hasComputedDataInRange && student.leaderboardOverride?.isOverridden) {
                if (student.leaderboardOverride.totalTests !== null) {
                    final.totalTests = student.leaderboardOverride.totalTests;
                    overridden.totalTests = true;
                }
                if (student.leaderboardOverride.averageScore !== null) {
                    final.averageScore = student.leaderboardOverride.averageScore;
                    overridden.averageScore = true;
                }
            }

            return {
                _id: student._id,
                fullName: student.fullName,
                username: student.username,
                computed, // Điểm hệ thống tính
                final,    // Điểm cuối cùng (sau khi áp dụng ghi đè)
                overridden, // Cờ cho biết trường nào bị ghi đè
                note: student.leaderboardOverride?.note || "",
            };
        });

        // Sắp xếp theo điểm trung bình cuối cùng (final.averageScore) giảm dần, sau đó là số bài làm (final.totalTests) giảm dần
        studentStats.sort((a, b) => {
            if (b.final.averageScore !== a.final.averageScore) {
                return b.final.averageScore - a.final.averageScore;
            }
            return b.final.totalTests - a.final.totalTests;
        });

        res.status(200).json({ classInfo, students: studentStats });
    } catch (error) {
        console.error("Lỗi lấy chi tiết thi đua lớp cho admin:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 10. [PUT] CẬP NHẬT ĐIỂM THI ĐUA CỦA HỌC SINH (ADMIN GHI ĐÈ)
// ======================================================================
router.put("/leaderboard/class/:classId/students/:studentId", verifyToken, isAdmin, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { totalTests, averageScore, note, resetOverride } = req.body;

        let updateFields = {};
        if (resetOverride) {
            updateFields = {
                "leaderboardOverride.totalTests": null,
                "leaderboardOverride.averageScore": null,
                "leaderboardOverride.note": "",
                "leaderboardOverride.isOverridden": false,
            };
        } else {
            updateFields = {
                "leaderboardOverride.totalTests": totalTests !== undefined ? totalTests : null,
                "leaderboardOverride.averageScore": averageScore !== undefined ? averageScore : null,
                "leaderboardOverride.note": note !== undefined ? note : "",
                "leaderboardOverride.isOverridden": true,
            };
        }

        const updatedStudent = await User.findByIdAndUpdate(studentId, updateFields, { new: true });

        if (!updatedStudent) {
            return res.status(404).json({ message: "Không tìm thấy học sinh!" });
        }

        res.status(200).json({ message: "Cập nhật chỉ số thi đua thành công!", student: updatedStudent });
    } catch (error) {
        console.error("Lỗi cập nhật chỉ số thi đua học sinh:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ==========================================
// [MÔN HỌC] - ĐÃ SỬA LẠI ĐỂ NHẬN DEPARTMENT
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
        // Bắt lỗi nếu thiếu department
        if (!name || !department) return res.status(400).json({ message: "Vui lòng nhập tên môn và chọn Tổ chuyên môn!" });

        const existing = await Subject.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ message: "Môn học này đã tồn tại trong hệ thống!" });

        // Tạo môn học mới kèm department
        const newSubject = new Subject({ 
            name: name.trim(),
            department: department // Thêm dòng này
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
