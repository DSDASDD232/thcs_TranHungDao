import express from "express";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import Question from "../models/Question.js"; 
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
// 2. [POST] LƯU BÀI TẬP TỪ TAB "NHẬP THỦ CÔNG"
// ==========================================================
router.post("/create-manual", verifyToken, isTeacherOrAdmin, uploadImage.any(), async (req, res) => {
    try {
        const { title, targetClass, subject, duration, dueDate, questionsData } = req.body;
        
        if (!title || !targetClass || !dueDate || !questionsData) {
            return res.status(400).json({ message: "Vui lòng điền đủ thông tin bài tập!" });
        }

        const parsedQuestions = JSON.parse(questionsData);
        if (parsedQuestions.length === 0) return res.status(400).json({ message: "Phải có ít nhất 1 câu hỏi!" });

        const grade = targetClass.replace(/\D/g, '').substring(0, 1) || "6";
        const savedQuestionIds = [];

        for (const q of parsedQuestions) {
            const imageFile = req.files.find(f => f.fieldname === `image_${q.tempId}`);
            const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : "";

            let actualCorrectAnswer = "";
            if (q.type === "multiple_choice") {
                const optIndex = q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : 3;
                actualCorrectAnswer = q.options[optIndex] || q.options[0];
            }

            const newQ = new Question({
                content: q.content,
                subject: q.subject || subject,
                grade: grade,
                difficulty: q.difficulty,
                type: q.type, // Đã bổ sung loại câu hỏi
                options: q.type === "multiple_choice" ? q.options : [], // <--- FIX LỖI Ở ĐÂY: Loại bỏ JSON.stringify
                correctAnswer: actualCorrectAnswer,
                imageUrl: imageUrl,
                teacher: req.user.id
            });
            await newQ.save();
            savedQuestionIds.push(newQ._id);
        }

        const newAssignment = new Assignment({
            title, targetClass, subject, questions: savedQuestionIds, duration: duration || 45, dueDate, teacher: req.user.id
        });

        await newAssignment.save();
        res.status(201).json({ message: "✅ Giao bài thành công!", assignment: newAssignment });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi lưu bài tập", error });
    }
});

// Các API cũ giữ nguyên bên dưới...
router.post("/create", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { title, description, targetClass, questions, startTime, dueDate, duration } = req.body;
        const newAssignment = new Assignment({ title, description, targetClass, questions, startTime, dueDate, duration, teacher: req.user.id });
        await newAssignment.save();
        res.status(201).json({ message: "✅ Giao bài tập thành công!", assignment: newAssignment });
    } catch (error) { res.status(500).json({ message: "Lỗi server khi tạo bài tập", error }); }
});

router.get("/my-assignments", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("classId");
        if (user.role === "student") {
            const studentClassName = user.classId ? user.classId.name : user.className;
            if (!studentClassName) return res.status(200).json({ assignments: [] }); 
            const assignments = await Assignment.find({ targetClass: studentClassName }).sort({ createdAt: -1 }).populate("teacher", "fullName");
            return res.status(200).json({ assignments });
        } else {
            const myAssignments = await Assignment.find({ teacher: req.user.id }).sort({ createdAt: -1 }).populate("questions", "content difficulty type");
            return res.status(200).json({ assignments: myAssignments });
        }
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

router.get("/student", verifyToken, async (req, res) => {
    try {
        const student = await User.findById(req.user.id).populate("classId");
        const studentClassName = student.classId ? student.classId.name : student.className;
        if (!studentClassName) return res.status(200).json({ assignments: [] }); 
        const assignments = await Assignment.find({ targetClass: studentClassName }).sort({ createdAt: -1 }).populate("teacher", "fullName");
        res.status(200).json({ assignments });
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

router.get("/:id", verifyToken, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate("questions").populate("teacher", "fullName");
        if (!assignment) return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        res.status(200).json(assignment);
    } catch (error) { res.status(500).json({ message: "Lỗi server", error }); }
});

router.delete("/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        await Assignment.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "🗑️ Đã xóa bài tập thành công!" });
    } catch (error) { res.status(500).json({ message: "Lỗi server khi xóa", error }); }
});

export default router;