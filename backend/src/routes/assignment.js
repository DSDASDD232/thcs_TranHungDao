import express from "express";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import Question from "../models/Question.js"; 
import Submission from "../models/Submission.js"; // Đã thêm để xóa lịch sử
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import multer from "multer"; 
import mammoth from "mammoth";
import fs from "fs";
import path from "path";

const router = express.Router();

const uploadWord = multer({ storage: multer.memoryStorage() });
const storageImage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = "uploads/";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '-'));
    }
});
const uploadImage = multer({ storage: storageImage });

// ==========================================================
// 1. [POST] BÓC TÁCH FILE WORD 
// ==========================================================
router.post("/extract-word", verifyToken, isTeacherOrAdmin, uploadWord.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Không tìm thấy file Word!" });
        const { value: rawText } = await mammoth.extractRawText({ buffer: req.file.buffer });
        const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let parsedQuestions = [];
        let currentQ = null;
        let defaultSubject = req.body.subject || "Toán";
        let defaultGrade = req.body.grade || "6";

        for (let line of lines) {
            if (/^Câu\s+\d+[\:\.]/i.test(line)) {
                if (currentQ) parsedQuestions.push(currentQ);
                currentQ = {
                    tempId: Date.now() + Math.random(),
                    content: line.replace(/^Câu\s+\d+[\:\.]\s*/i, '').trim(),
                    type: "multiple_choice",
                    options: [],
                    correctAnswer: "A", 
                    subject: defaultSubject,
                    grade: defaultGrade,
                    difficulty: "medium",
                    imageFile: null,
                    previewUrl: ""
                };
            } else if (currentQ) {
                if (/^[A-D][\.\:]\s*/i.test(line)) {
                    currentQ.options.push(line.replace(/^[A-D][\.\:]\s*/i, '').trim());
                } else if (/^Đáp án\s*[\:\.]/i.test(line)) {
                    let ans = line.replace(/^Đáp án\s*[\:\.]\s*/i, '').trim().toUpperCase();
                    if (['A', 'B', 'C', 'D'].includes(ans)) currentQ.correctAnswer = ans;
                }
            }
        }
        if (currentQ) parsedQuestions.push(currentQ);

        if (parsedQuestions.length === 0) return res.status(400).json({ message: "Định dạng file Word không hợp lệ." });
        res.status(200).json({ message: "Bóc tách thành công!", questions: parsedQuestions });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi bóc tách file Word.", error });
    }
});

// ==========================================================
// 2. [POST] LƯU TỪ TAB "NHẬP THỦ CÔNG" (CÓ 2 LUỒNG: LƯU KHO / GIAO BÀI)
// ==========================================================
router.post("/create-manual", verifyToken, isTeacherOrAdmin, uploadImage.any(), async (req, res) => {
    try {
        const { title, targetClass, subject, duration, dueDate, status, action, saveToBank, questionsData } = req.body;
        
        // FIX: Đảm bảo parse JSON cẩn thận để Mongoose không bị lỗi Cast Error
        const parsedQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
        
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ message: "Phải có ít nhất 1 câu hỏi!" });
        }

        // LUỒNG 1: QUYẾT ĐỊNH CÂU HỎI CÓ ĐƯỢC VÀO KHO KHÔNG
        const isBankFlag = (action === "bank_only" || saveToBank === "true");

        const grade = targetClass ? targetClass.replace(/\D/g, '').substring(0, 1) : "6";
        const questionsWithPoints = [];

        for (const q of parsedQuestions) {
            const imageFile = req.files.find(f => f.fieldname === `image_${q.tempId}`);
            const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : (q.existingImageUrl || "");

            // FIX: Xử lý mặc định cho câu tự luận để không dính ValidationError
            let actualCorrectAnswer = "Chưa có đáp án"; 
            if (q.type === "multiple_choice") {
                const optIndex = q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : 3;
                actualCorrectAnswer = q.options[optIndex] || q.options[0] || "Đáp án trống";
            } else if (q.type === "essay") {
                actualCorrectAnswer = "Tự luận"; // Cứu cánh cho Mongoose
            }

            const newQ = new Question({
                content: q.content,
                subject: q.subject || subject,
                grade: grade,
                difficulty: q.difficulty,
                type: q.type, 
                options: q.type === "multiple_choice" ? q.options : [], 
                correctAnswer: actualCorrectAnswer, 
                imageUrl: imageUrl,
                teacher: req.user.id,
                isBank: isBankFlag 
            });
            await newQ.save();
            
            // Ép kiểu points về Number cho chắc ăn
            questionsWithPoints.push({ questionId: newQ._id, points: Number(q.points) || 1 });
        }

        // LUỒNG 2: NẾU CHỈ LƯU KHO -> DỪNG LẠI, KHÔNG TẠO BÀI TẬP
        if (action === "bank_only") {
            return res.status(201).json({ message: "✅ Đã lưu các câu hỏi vào Kho thành công!" });
        }

        // LUỒNG 3: NẾU GIAO BÀI HOẶC LƯU NHÁP BÀI TẬP
        if (!title || !targetClass || !dueDate) {
            return res.status(400).json({ message: "Vui lòng điền đủ thông tin bài tập!" });
        }

        const newAssignment = new Assignment({
            title, 
            targetClass, 
            subject, 
            questions: questionsWithPoints, 
            duration: duration || 45, 
            dueDate, 
            status: status || "published", 
            teacher: req.user.id
        });

        await newAssignment.save();
        res.status(201).json({ message: "✅ Giao bài thành công!", assignment: newAssignment });

    } catch (error) {
        console.error("Lỗi tạo bài thủ công:", error);
        res.status(500).json({ message: "Lỗi server khi lưu bài tập", error });
    }
});

// ==========================================================
// 3. [POST] LƯU BÀI TẬP TỪ TAB "CHỌN TỪ KHO"
// ==========================================================
router.post("/create", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { title, description, targetClass, questions, status, startTime, dueDate, duration } = req.body;
        
        // FIX LỖI CAST: Phải parse JSON trước khi đẩy mảng object vào Model
        const formattedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

        const newAssignment = new Assignment({ 
            title, 
            description, 
            targetClass, 
            questions: formattedQuestions, 
            status: status || "published", 
            startTime, 
            dueDate, 
            duration, 
            teacher: req.user.id 
        });
        
        await newAssignment.save();
        res.status(201).json({ message: "✅ Giao bài tập thành công!", assignment: newAssignment });
    } catch (error) { 
        console.error("Lỗi tạo bài từ kho:", error);
        res.status(500).json({ message: "Lỗi server khi tạo bài tập", error }); 
    }
});

router.get("/my-assignments", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("classId");
        if (user.role === "student") {
            const studentClassName = user.classId ? user.classId.name : user.className;
            if (!studentClassName) return res.status(200).json({ assignments: [] }); 
            const assignments = await Assignment.find({ targetClass: studentClassName, status: "published" }).sort({ createdAt: -1 }).populate("teacher", "fullName");
            return res.status(200).json({ assignments });
        } else {
            const myAssignments = await Assignment.find({ teacher: req.user.id }).sort({ createdAt: -1 }).populate("questions.questionId", "content difficulty type points"); 
            return res.status(200).json({ assignments: myAssignments });
        }
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

router.get("/student", verifyToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.id).populate("classId");
        const studentClassName = student.classId ? student.classId.name : student.className;
        if (!studentClassName) return res.status(200).json({ assignments: [] }); 
        const assignments = await Assignment.find({ targetClass: studentClassName, status: "published" }).sort({ createdAt: -1 }).populate("teacher", "fullName");
        res.status(200).json({ assignments });
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

router.get("/:id", verifyToken, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate("questions.questionId").populate("teacher", "fullName");
        if (!assignment) return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        res.status(200).json(assignment);
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

// Chỉ thay đổi đoạn xóa bài tập này
router.delete("/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const assignmentId = req.params.id;

        // Xóa bài tập
        await Assignment.findByIdAndDelete(assignmentId);
        
        // Xóa sạch mọi lịch sử làm bài (submissions) liên quan
        await Submission.deleteMany({ assignment: assignmentId });
        
        res.status(200).json({ message: "🗑️ Đã xóa bài tập và toàn bộ lịch sử thành công!" });
    } catch (error) { 
        res.status(500).json({ message: "Lỗi server khi xóa", error }); 
    }
});

// ==========================================================
// [PUT] CẬP NHẬT BÀI TẬP (HOÀN THIỆN BÀI NHÁP HOẶC SỬA LỖI)
// ==========================================================
router.put("/update/:id", verifyToken, isTeacherOrAdmin, uploadImage.any(), async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { title, targetClass, subject, duration, dueDate, status, saveToBank, questionsData } = req.body;

        // 1. Tìm bài tập cũ xem có tồn tại không
        const existingAssignment = await Assignment.findById(assignmentId);
        if (!existingAssignment) return res.status(404).json({ message: "Không tìm thấy bài tập!" });

        // Chốt bảo mật: Chỉ giáo viên tạo ra bài này mới được quyền sửa
        if (existingAssignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: "⛔ Bạn không có quyền sửa bài tập này!" });
        }

        const parsedQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ message: "Phải có ít nhất 1 câu hỏi!" });
        }

        const isBankFlag = (saveToBank === "true");
        const grade = targetClass ? targetClass.replace(/\D/g, '').substring(0, 1) : "6";
        const questionsWithPoints = [];

        // 2. Xử lý danh sách câu hỏi (Vừa cập nhật câu cũ, vừa tạo câu mới nếu có thêm)
        for (const q of parsedQuestions) {
            // Tìm file ảnh nếu giáo viên có thay ảnh mới
            const imageFile = req.files.find(f => f.fieldname === `image_${q.tempId}` || f.fieldname === `image_${q._id}`);
            const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : (q.existingImageUrl || "");

            let actualCorrectAnswer = "Chưa có đáp án";
            if (q.type === "multiple_choice") {
                const optIndex = q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : 3;
                actualCorrectAnswer = q.options[optIndex] || q.options[0] || "Đáp án trống";
            } else if (q.type === "essay") {
                actualCorrectAnswer = "Tự luận";
            }

            // Nhận diện câu hỏi CŨ (đã có _id 24 ký tự) hay MỚI (chỉ có tempId)
            const isExistingQuestion = q._id && q._id.length === 24;
            let finalQuestionId;

            if (isExistingQuestion) {
                // Cập nhật đè lên câu hỏi cũ
                await Question.findByIdAndUpdate(q._id, {
                    content: q.content,
                    subject: q.subject || subject,
                    grade: grade,
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    isBank: isBankFlag
                });
                finalQuestionId = q._id;
            } else {
                // Tạo mới (trường hợp giáo viên bấm "Thêm câu hỏi tiếp theo" lúc đang sửa)
                const newQ = new Question({
                    content: q.content,
                    subject: q.subject || subject,
                    grade: grade,
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    teacher: req.user.id,
                    isBank: isBankFlag
                });
                await newQ.save();
                finalQuestionId = newQ._id;
            }

            // Đưa ID và Điểm vào mảng bài tập
            questionsWithPoints.push({
                questionId: finalQuestionId,
                points: Number(q.points) || 1
            });
        }

        // 3. Cập nhật thông tin vỏ bài tập (Assignment)
        existingAssignment.title = title || existingAssignment.title;
        existingAssignment.targetClass = targetClass || existingAssignment.targetClass;
        existingAssignment.subject = subject || existingAssignment.subject;
        existingAssignment.duration = duration || existingAssignment.duration;
        existingAssignment.dueDate = dueDate || existingAssignment.dueDate;
        existingAssignment.status = status || existingAssignment.status; // Biến Nháp thành Phát hành ở đây!
        existingAssignment.questions = questionsWithPoints;

        await existingAssignment.save();

        res.status(200).json({ message: "✅ Cập nhật bài tập thành công!", assignment: existingAssignment });

    } catch (error) {
        console.error("Lỗi cập nhật bài tập:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật bài tập", error: error.message });
    }
});

export default router;