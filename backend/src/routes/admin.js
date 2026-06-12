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

const getNextExcelAccountSequence = async (counterId = 'excelStudentUsernameSequence') => {
    const counters = mongoose.connection.db.collection('counters');
    const result = await counters.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );

    return result?.value?.seq ?? result?.seq ?? 1;
};

const checkTeacherReplacement = async (teacherId) => {
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") return null;

    const assignedClassIds = teacher.assignedClasses || [];
    const homeroomClasses = await Class.find({ homeroomTeacher: teacherId }).select("_id");
    const homeroomClassIds = homeroomClasses.map(c => c._id);
    
    const allClassIds = [...new Set([
        ...assignedClassIds.map(id => String(id)),
        ...homeroomClassIds.map(id => String(id))
    ])];

    if (allClassIds.length === 0) return null;

    for (const classId of allClassIds) {
        const classObj = await Class.findById(classId);
        if (!classObj) continue;

        const otherTeachers = await User.find({
            _id: { $ne: teacherId },
            role: "teacher",
            status: { $ne: "inactive" },
            isLocked: { $ne: true }
        }).select("_id assignedClasses");

        const otherAssigned = otherTeachers.filter(t => {
            const isAssigned = (t.assignedClasses || []).some(cid => String(cid) === String(classId));
            const isHomeroom = classObj.homeroomTeacher && String(classObj.homeroomTeacher) === String(t._id);
            return isAssigned || isHomeroom;
        });

        if (otherAssigned.length === 0) {
            return classObj.name;
        }
    }

    return null;
};

const normalizeLeaderboardScopeValue = (value) => {
    if (value === undefined || value === null) return "all";
    const normalized = String(value).trim();
    return normalized === "" ? "all" : normalized;
};

const getSemesterFromMonth = (monthIndex) => (monthIndex <= 5 ? "1" : "2");

const doesLeaderboardOverrideApply = (override, filter, appliedAt) => {
    if (!override?.isOverridden) return false;

    const scopeType = String(override.scopeType || "").toLowerCase();
    const queryYear = normalizeLeaderboardScopeValue(filter.year);
    const queryMonth = normalizeLeaderboardScopeValue(filter.month);
    const querySemester = normalizeLeaderboardScopeValue(filter.semester);

    const appliedDate = appliedAt ? new Date(appliedAt) : null;
    const appliedYear = appliedDate && !Number.isNaN(appliedDate.getTime()) ? String(appliedDate.getFullYear()) : "";
    const appliedMonth = appliedDate && !Number.isNaN(appliedDate.getTime()) ? String(appliedDate.getMonth() + 1) : "";
    const appliedSemester = appliedDate && !Number.isNaN(appliedDate.getTime()) ? getSemesterFromMonth(appliedDate.getMonth()) : "";

    const overrideYear = normalizeLeaderboardScopeValue(override.scopeYear);
    const overrideMonth = normalizeLeaderboardScopeValue(override.scopeMonth);
    const overrideSemester = normalizeLeaderboardScopeValue(override.scopeSemester);
    const overrideMonthNumber = Number(overrideMonth);
    const overrideSemesterFromMonth = Number.isFinite(overrideMonthNumber) && overrideMonthNumber >= 1 && overrideMonthNumber <= 12
        ? (overrideMonthNumber <= 6 ? "1" : "2")
        : "";

    const matchesYear = queryYear !== "all" && queryYear === overrideYear;

    if (!scopeType) {
        if (!appliedYear) return false;

        if (queryYear !== "all" && queryMonth !== "all") {
            return queryYear === appliedYear && queryMonth === appliedMonth;
        }

        if (queryYear !== "all" && querySemester !== "all") {
            return queryYear === appliedYear && querySemester === appliedSemester;
        }

        if (queryYear !== "all") {
            return queryYear === appliedYear;
        }

        return false;
    }

    if (scopeType === "year") {
        return matchesYear;
    }

    if (scopeType === "month") {
        if (!matchesYear) return false;
        if (queryMonth !== "all") {
            return queryMonth === overrideMonth;
        }
        if (querySemester !== "all") {
            return querySemester === overrideSemesterFromMonth;
        }
        return true;
    }

    if (scopeType === "semester") {
        if (!matchesYear) return false;
        if (queryMonth !== "all") {
            if (overrideSemester === "" && overrideMonth !== "") {
                return queryMonth === overrideMonth;
            }
            return queryMonth === overrideMonth;
        }
        if (querySemester !== "all") {
            return querySemester === overrideSemester;
        }
        return true;
    }

    return false;
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

// ==========================================
// [GET] Lấy chi tiết một tài khoản
// ==========================================
router.get("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("classId", "name grade")
            .populate("assignedClasses", "name");
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản." });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Lỗi lấy chi tiết tài khoản:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 5. [POST] TẠO TÀI KHOẢN HỌC SINH TỪ FILE EXCEL
// ======================================================================
router.post("/users/import-json", verifyToken, isAdmin, async (req, res) => {
    try {
        const { classId, className, grade, students, role } = req.body;
        const importRole = role === "teacher" ? "teacher" : "student";
        if (!students || students.length === 0) {
            return res.status(400).json({ message: "Thiếu thông tin hoặc danh sách trống!" });
        }

        if (importRole === "student" && (!classId || !className)) {
            return res.status(400).json({ message: "Thiếu thông tin lớp cho import học sinh!" });
        }

        let successCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;
        let generatedAccounts = [];
        const errors = [];
        const duplicates = [];
        const roleLabel = importRole === "teacher" ? "giáo viên" : "học sinh";
        const accountPrefix = importRole === "teacher" ? "gv" : "hs";
        const usernameCounterId = importRole === "teacher" ? "excelTeacherUsernameSequence" : "excelStudentUsernameSequence";

        const removeAccents = (str) => {
            if (!str) return "";
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        const normalizeImportKey = (key) => {
            if (!key) return "";
            return String(key)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D')
                .toLowerCase()
                .trim();
        };

        const compactImportKey = (key) => normalizeImportKey(key).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

        const getRowValue = (row, candidates) => {
            const candidateSet = new Set(candidates.map((candidate) => compactImportKey(candidate)));

            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = compactImportKey(key);
                if (candidateSet.has(normalizedKey) || candidateSet.has(normalizedKey.replace(/\s+/g, ''))) {
                    if (value !== undefined && value !== null && String(value).trim() !== '') {
                        return value;
                    }
                }
            }

            return "";
        };

        const inferStudentName = (row) => {
            const rowValues = Object.values(row)
                .map((value) => String(value ?? "").trim())
                .filter(Boolean);

            const directValue = getRowValue(row, ['Tên học sinh', 'Tên giáo viên', 'Họ và tên', 'Họ tên', 'Họ Tên', 'Tên', 'Họ', 'Full name', 'Name']);
            if (String(directValue || "").trim()) return String(directValue).trim();

            const inferredValue = rowValues.find((value) => {
                const compact = value.replace(/\s+/g, ' ').trim();
                return compact.length >= 3 && /[A-Za-zÀ-ỹ]/.test(compact) && !/^\d+$/.test(compact);
            });

            return inferredValue || "";
        };

        const inferPhoneNumber = (row) => {
            const directValue = getRowValue(row, ['Số điện thoại', 'SĐT', 'SDT', 'Phone', 'phone', 'Điện thoại', 'Dien thoai', 'Số điện thoại phụ huynh']);
            const directPhone = String(directValue || "").replace(/\s+/g, '').trim();
            if (/^\+?\d{8,15}$/.test(directPhone.replace(/[^\d+]/g, ''))) return directPhone;

            const rowValues = Object.values(row)
                .map((value) => String(value ?? "").trim())
                .filter(Boolean);

            const inferredValue = rowValues.find((value) => {
                const digitsOnly = value.replace(/\D/g, '');
                return digitsOnly.length >= 8 && digitsOnly.length <= 15;
            });

            return inferredValue || "";
        };

        const inferAddress = (row) => {
            const directValue = getRowValue(row, ['Địa chỉ', 'Dia chi', 'Address', 'address']);
            if (String(directValue || "").trim()) return String(directValue).trim();

            const rowValues = Object.values(row)
                .map((value) => String(value ?? "").trim())
                .filter(Boolean);

            const inferredValue = [...rowValues].reverse().find((value) => {
                const digitsOnly = value.replace(/\D/g, '');
                return value.length >= 6 && digitsOnly.length !== value.length;
            });

            return inferredValue || rowValues[rowValues.length - 1] || "";
        };

        const normalizeRow = (rawRow) => {
            const normalized = {};
            Object.entries(rawRow).forEach(([key, value]) => {
                const normalizedKey = normalizeImportKey(key);
                if (['stt', 'so thu tu', 'sott'].includes(normalizedKey)) normalized['STT'] = value;
                else if (['ten hoc sinh', 'ten giao vien', 'ho va ten', 'ho ten', 'ho', 'ten'].includes(normalizedKey)) normalized['Tên học sinh'] = value;
                else if (['nam sinh', 'namsinh', 'year'].includes(normalizedKey)) normalized['Năm sinh'] = value;
                else if (['so dien thoai', 'sodienthoai', 'sdt', 'phone', 'dien thoai', 'dienthoai'].includes(normalizedKey)) normalized['Số điện thoại'] = value;
                else if (['dia chi', 'diachi', 'address'].includes(normalizedKey)) normalized['Địa chỉ'] = value;
                else normalized[key] = value;
            });
            return normalized;
        };

        const existingUsers = await User.find({})
            .select('fullName phone username')
            .lean();

        const existingAccountKeys = new Set(
            existingUsers.map((u) => buildDuplicateAccountKey(u.fullName, u.phone))
        );

        const salt = await bcrypt.genSalt(10);
        const defaultHashedPassword = await bcrypt.hash('1', salt);
        const newStudentKeys = new Set();

        for (let i = 0; i < students.length; i++) {
            const row = normalizeRow(students[i]);
            const sttRaw = row['STT'] || row['stt'] || row['Stt'] || i + 1;
            const fullNameRaw = String(
                row['Tên học sinh'] ||
                row['Tên giáo viên'] ||
                row['Họ và tên'] ||
                row['Họ tên'] ||
                row['Họ Tên'] ||
                row['fullName'] ||
                row['full_name'] ||
                inferStudentName(row) ||
                ""
            ).trim();
            const phoneRaw = String(
                row['Số điện thoại'] ||
                row['SĐT'] ||
                row['SDT'] ||
                row['Phone'] ||
                row['phone'] ||
                row['so dien thoai'] ||
                row['phoneNumber'] ||
                inferPhoneNumber(row) ||
                ""
            ).trim();
            const addressRaw = String(
                row['Địa chỉ'] ||
                row['Dia chi'] ||
                row['Address'] ||
                row['address'] ||
                row['diachi'] ||
                inferAddress(row) ||
                ""
            ).trim();
            const yearRaw = String(row['Năm sinh'] || row['Nam sinh'] || row['year'] || '').trim();

            const missingFields = [];
            if (!fullNameRaw) missingFields.push('Họ tên');
            if (!phoneRaw) missingFields.push('SĐT');
            if (!addressRaw) missingFields.push('Địa chỉ');

            if (missingFields.length > 0) {
                failedCount++;
                const excelRow = i + 2;
                errors.push({ row: excelRow, message: `Dòng ${excelRow} thiếu: ${missingFields.join(', ')}` });
                continue;
            }

            const studentKey = buildDuplicateAccountKey(fullNameRaw, phoneRaw);
            if (existingAccountKeys.has(studentKey) || newStudentKeys.has(studentKey)) {
                duplicateCount++;
                duplicates.push({ row: i + 2, message: `${roleLabel} ${fullNameRaw} - ${phoneRaw} đã tồn tại` });
                continue;
            }

            newStudentKeys.add(studentKey);
            const sequence = await getNextExcelAccountSequence(usernameCounterId);
            const username = `${accountPrefix}${String(sequence).padStart(6, '0')}`;

            try {
                const newUser = new User({
                    fullName: fullNameRaw,
                    username,
                    password: defaultHashedPassword,
                    role: importRole,
                    classId: importRole === 'student' ? classId : null,
                    grade: importRole === 'student' ? (grade || String(className).replace(/\D/g, '').substring(0, 1)) : "",
                    phone: phoneRaw,
                    address: addressRaw,
                    department: "",
                    subjects: [],
                    qualification: importRole === 'teacher' ? "Đại học" : "",
                    departmentPosition: importRole === 'teacher' ? "Giáo viên thường" : "",
                });
                await newUser.save();
                successCount++;
                generatedAccounts.push({ 'STT': String(sttRaw).padStart(2, '0'), 'Họ và Tên': fullNameRaw, 'Tài Khoản': username, 'Mật Khẩu': '1' });
            } catch (err) {
                failedCount++;
                errors.push({ row: i + 2, message: `Lỗi tạo tài khoản ${roleLabel} cho dòng ${i + 2}` });
            }
        }

        res.status(200).json({
            message: 'Hoàn tất!',
            successCount,
            duplicateCount,
            failedCount,
            errors,
            duplicates,
            accounts: generatedAccounts,
        });
    } catch (error) {
        console.error('Lỗi import excel:', error);
        res.status(500).json({ message: 'Lỗi server', error });
    }
});

// ==========================================
// 6. [DELETE] XÓÓ TÀI KHOẢN VÀ BÀI NỘP LIÊN QUAN
// ==========================================
router.delete("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản!" });
        }

        if (userToDelete.role === "teacher") {
            const unassignedClassName = await checkTeacherReplacement(userId);
            if (unassignedClassName) {
                return res.status(400).json({
                    message: `Lớp ${unassignedClassName} chỉ còn thầy/cô này phụ trách. Vui lòng phân công giáo viên thay thế vào lớp đó trước khi xóa!`
                });
            }
        }

        if (userToDelete.role === "teacher") {
            await User.updateMany(
                { role: "teacher", assignedClasses: userId },
                { $pull: { assignedClasses: userId } }
            );

            await Class.updateMany(
                { homeroomTeacher: userId },
                { $unset: { homeroomTeacher: "" } }
            );
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

const TEACHER_POSITIONS = ["Tổ trưởng", "Tổ phó", "Giáo viên thường"];

const normalizeDepartmentPosition = (department, position) => {
    if (!department) return "";
    const pos = String(position ?? "").trim();
    if (TEACHER_POSITIONS.includes(pos)) return pos;
    return "Giáo viên thường";
};

// ==========================================
// 7. [PUT] CẬP NHẬT TÀI KHOẢN (ĐÃ UPDATE HỖ TRỢ ĐA MÔN HỌC)
// ==========================================
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, role, grade, classId, assignedClasses, isLocked, password, subject, department, subjects, qualification, departmentPosition, status, phone, address, note } = req.body;
        
        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ message: "Không tìm thấy người dùng!" });

        if (existingUser.role === "teacher") {
            const willLock = (isLocked !== undefined && Boolean(isLocked) && !existingUser.isLocked) || 
                             (status !== undefined && status === "inactive" && existingUser.status !== "inactive");
            const willChangeToStudent = (role !== undefined && role === "student");

            if (willLock || willChangeToStudent) {
                const actionVerb = willLock ? "khóa" : "chuyển vai trò";
                const unassignedClassName = await checkTeacherReplacement(userId);
                if (unassignedClassName) {
                    return res.status(400).json({
                        message: `Lớp ${unassignedClassName} chỉ còn thầy/cô này phụ trách. Vui lòng phân công giáo viên thay thế vào lớp đó trước khi ${actionVerb}!`
                    });
                }
            }
        }

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
                updateFields.qualification = qualification || "Đại học";
            }

            const deptForPos = department !== undefined ? department : existingUser.department;
            if (departmentPosition !== undefined || department !== undefined) {
                updateFields.departmentPosition = normalizeDepartmentPosition(
                    deptForPos,
                    departmentPosition !== undefined ? departmentPosition : existingUser.departmentPosition
                );
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

        const targetRole = role || existingUser.role;
        if (targetRole === "student" || targetRole === "teacher") {
            const finalPhone = phone !== undefined ? String(phone).trim() : String(existingUser.phone || "").trim();
            const finalAddress = address !== undefined ? String(address).trim() : String(existingUser.address || "").trim();
            const roleLabel = targetRole === "teacher" ? "Giáo viên" : "Học sinh";
            if (!finalPhone || !finalAddress) {
                return res.status(400).json({ message: `${roleLabel} phải có Số điện thoại và Địa chỉ.` });
            }
            if (!/^\d{1,15}$/.test(finalPhone)) {
                return res.status(400).json({ message: "Số điện thoại phải là số (1-15 ký tự), không được nhập chữ." });
            }
        }
        
        const incomingClassId = (classId && typeof classId === 'object') ? (classId._id || classId) : classId;

        if (targetRole === "student") {
            if (incomingClassId !== undefined) {
                if (incomingClassId) {
                    if (!mongoose.Types.ObjectId.isValid(incomingClassId)) {
                        return res.status(400).json({ message: "Lớp học không hợp lệ. Vui lòng chọn lại lớp." });
                    }
                    const selectedClass = await Class.findById(incomingClassId);
                    if (!selectedClass) {
                        return res.status(400).json({ message: "Lớp học không hợp lệ. Vui lòng chọn lại lớp." });
                    }
                    updateFields.classId = incomingClassId;
                    updateFields.grade = selectedClass.grade;
                } else {
                    updateFields.classId = null;
                }
            }
            updateFields.$unset = { assignedClasses: "" };
            updateFields.departmentPosition = "";
        } 
        else if (targetRole === "teacher") {
            if (assignedClasses) updateFields.assignedClasses = assignedClasses;
            updateFields.classId = null; 
        }

        if (isLocked !== undefined) {
            const locked = Boolean(isLocked);
            updateFields.isLocked = locked;
            updateFields.status = locked ? "inactive" : "active";
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        updateFields.$inc = { tokenVersion: 1 };

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
        const { timeframe, grade, year, month, day, semester, startDate, endDate, academicYear } = req.query;
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
                const semesterMap = {
                    "1": { startMonth: 0, endMonth: 5 },
                    "2": { startMonth: 6, endMonth: 11 },
                    "hk1": { startMonth: 0, endMonth: 5 },
                    "hk2": { startMonth: 6, endMonth: 11 },
                    "ky1": { startMonth: 0, endMonth: 5 },
                    "ky2": { startMonth: 6, endMonth: 11 },
                };
                const semesterKey = String(semester || "all").toLowerCase();
                const semesterRange = semesterMap[semesterKey];

                if (semesterKey !== "all" && semesterKey !== "" && !semesterRange) {
                    return res.status(200).json({ leaderboard: [] });
                }

                if (month && month !== 'all') {
                    const m = parseInt(month, 10) - 1;
                    if (!isNaN(m) && m >= 0 && m <= 11) {
                        if (semesterRange && (m < semesterRange.startMonth || m > semesterRange.endMonth)) {
                            return res.status(200).json({ leaderboard: [] });
                        }

                        if (day && day !== 'all') {
                            const d = parseInt(day, 10);
                            const maxDay = getDaysInMonthUtc(y, m);
                            if (!isNaN(d) && d >= 1 && d <= maxDay) {
                                const startDate = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
                                const endDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
                                dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                            } else {
                                return res.status(200).json({ leaderboard: [] });
                            }
                        } else {
                            const startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
                            const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
                            dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                        }
                    }
                } else if (semesterRange) {
                    const startDate = new Date(Date.UTC(y, semesterRange.startMonth, 1, 0, 0, 0, 0));
                    const endDate = new Date(Date.UTC(y, semesterRange.endMonth + 1, 0, 23, 59, 59, 999));
                    dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                } else {
                    const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
                    const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
                    dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
                }
            }
        }

        

        let allStudents = [];

        let leaderboard = await Promise.all(classes.map(async (cls) => {
            const students = await User.find({ classId: cls._id, role: 'student' }).select('_id fullName username leaderboardOverride');
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
            let actualTests = 0;
            let overrideEntries = 0;
            let weightedScoreSum = 0;
            let effectiveWeight = 0;

            students.forEach((student) => {
                const studentSubs = submissionsByStudent[String(student._id)] || [];
                const computedTotalTests = studentSubs.length;
                const computedAverageScore = computedTotalTests > 0 ? studentSubs.reduce((sum, sub) => sum + sub.score, 0) / computedTotalTests : 0;

                const override = student.leaderboardOverride || {};
                const useOverrideInRange = doesLeaderboardOverrideApply(override, { year, month, semester }, override.appliedAt);
                const finalTotalTests = useOverrideInRange && override.totalTests !== null && override.totalTests !== undefined ? override.totalTests : computedTotalTests;
                const finalAverageScore = useOverrideInRange && override.averageScore !== null && override.averageScore !== undefined ? override.averageScore : computedAverageScore;

                actualTests += computedTotalTests;
                if (useOverrideInRange && (override.totalTests !== null && override.totalTests !== undefined || override.averageScore !== null && override.averageScore !== undefined)) {
                    overrideEntries += 1;
                }
                totalTests += finalTotalTests;

                const weightForAverage = finalTotalTests > 0 ? finalTotalTests : (override.averageScore !== null && override.averageScore !== undefined ? 1 : 0);
                weightedScoreSum += finalAverageScore * weightForAverage;
                effectiveWeight += weightForAverage;

                // Lưu học sinh có nộp bài hoặc có ghi đè thi đua đúng phạm vi lọc hiện tại
                if (finalTotalTests > 0 || (useOverrideInRange && override.averageScore !== null && override.averageScore !== undefined)) {
                    allStudents.push({
                        _id: student._id,
                        fullName: student.fullName,
                        username: student.username,
                        className: cls.name,
                        grade: cls.grade,
                        totalTests: finalTotalTests,
                        averageScore: parseFloat(finalAverageScore.toFixed(2))
                    });
                }
            });

            const averageScore = effectiveWeight > 0 ? parseFloat((weightedScoreSum / effectiveWeight).toFixed(2)) : 0;


            return {
                _id: cls._id,
                className: cls.name,
                grade: cls.grade,
                academicYear: cls.academicYear,
                studentCount: students.length,
                studentNames: students.map(s => s.fullName),
                actualTests,
                overrideEntries,
                totalTests,
                averageScore,
                effectiveTests: effectiveWeight,
            };
        }));

        leaderboard = leaderboard.filter(Boolean);

        leaderboard.sort((a, b) => {
            if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
            return b.totalTests - a.totalTests;
        });

        // Xếp hạng top 10 học sinh
        const topStudents = allStudents
            .sort((a, b) => b.averageScore - a.averageScore || b.totalTests - a.totalTests)
            .slice(0, 10);

        res.status(200).json({ leaderboard, topStudents });
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
        const { timeframe, subject, year, month, day, semester, startDate, endDate } = req.query;
        const getDaysInMonthUtc = (y, mZeroBased) => new Date(Date.UTC(y, mZeroBased + 1, 0)).getUTCDate();

        const classInfo = await Class.findById(classId).select("name grade");
        if (!classInfo) {
            return res.status(404).json({ message: "Không tìm thấy lớp học!" });
        }

        const students = await User.find({ classId: classId, role: "student" }).select("fullName username isLocked status leaderboardOverride");
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
                const semesterMap = {
                    "1": { startMonth: 0, endMonth: 5 },
                    "2": { startMonth: 6, endMonth: 11 },
                    "hk1": { startMonth: 0, endMonth: 5 },
                    "hk2": { startMonth: 6, endMonth: 11 },
                    "ky1": { startMonth: 0, endMonth: 5 },
                    "ky2": { startMonth: 6, endMonth: 11 },
                };
                const semesterKey = String(semester || "all").toLowerCase();
                const semesterRange = semesterMap[semesterKey];

                if (semesterKey !== "all" && semesterKey !== "" && !semesterRange) {
                    return res.status(200).json({ classInfo, students: [] });
                }

                if (month && month !== 'all') {
                    const m = parseInt(month, 10) - 1;
                    if (!isNaN(m) && m >= 0 && m <= 11) {
                        if (semesterRange && (m < semesterRange.startMonth || m > semesterRange.endMonth)) {
                            return res.status(200).json({ classInfo, students: [] });
                        }

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
                } else if (semesterRange) {
                    const start = new Date(Date.UTC(y, semesterRange.startMonth, 1, 0, 0, 0, 0));
                    const end = new Date(Date.UTC(y, semesterRange.endMonth + 1, 0, 23, 59, 59, 999));
                    dateFilter = { createdAt: { $gte: start, $lte: end } };
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

            if (doesLeaderboardOverrideApply(student.leaderboardOverride, { year, month, semester }, student.leaderboardOverride?.appliedAt)) {
                const override = student.leaderboardOverride || {};
                if (override.totalTests !== null) {
                    final.totalTests = override.totalTests;
                    overridden.totalTests = true;
                }
                if (override.averageScore !== null) {
                    final.averageScore = override.averageScore;
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
        const { totalTests, averageScore, note, resetOverride, scopeType, scopeYear, scopeMonth, scopeSemester } = req.body;

        const normalizedScopeType = ["year", "month", "semester"].includes(String(scopeType || "").toLowerCase())
            ? String(scopeType).toLowerCase()
            : "year";

        let updateFields = {};
        if (resetOverride) {
            updateFields = {
                "leaderboardOverride.totalTests": null,
                "leaderboardOverride.averageScore": null,
                "leaderboardOverride.note": "",
                "leaderboardOverride.appliedAt": null,
                "leaderboardOverride.scopeType": "",
                "leaderboardOverride.scopeYear": "",
                "leaderboardOverride.scopeMonth": "",
                "leaderboardOverride.scopeSemester": "",
                "leaderboardOverride.isOverridden": false,
            };
        } else {
            updateFields = {
                "leaderboardOverride.totalTests": totalTests !== undefined ? totalTests : null,
                "leaderboardOverride.averageScore": averageScore !== undefined ? averageScore : null,
                "leaderboardOverride.note": note !== undefined ? note : "",
                "leaderboardOverride.appliedAt": new Date(),
                "leaderboardOverride.scopeType": normalizedScopeType,
                "leaderboardOverride.scopeYear": scopeYear !== undefined ? String(scopeYear) : "",
                "leaderboardOverride.scopeMonth": scopeMonth !== undefined ? String(scopeMonth) : "",
                "leaderboardOverride.scopeSemester": scopeSemester !== undefined ? String(scopeSemester) : "",
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