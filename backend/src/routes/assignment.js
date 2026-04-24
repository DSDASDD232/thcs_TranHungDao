import express from "express";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import Question from "../models/Question.js"; 
import Submission from "../models/Submission.js"; 
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import multer from "multer"; 
import mammoth from "mammoth";
import fs from "fs";
import path from "path";

// 👉 1. IMPORT CẤU HÌNH CLOUDINARY
import cloudinary, { uploadCloud } from "../config/cloudinary.js";

const router = express.Router();

const uploadWord = multer({ storage: multer.memoryStorage() });

// Hàm hỗ trợ tách public_id từ URL Cloudinary
const getCloudinaryPublicId = (url) => {
    if (!url || !url.includes("cloudinary.com")) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length !== 2) return null;
        let pathString = parts[1];
        const pathParts = pathString.split('/');
        if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
            pathParts.shift();
        }
        const publicIdWithExt = pathParts.join('/');
        return publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
    } catch (error) {
        return null;
    }
};

// 👉 THÊM HÀM NÀY: Quét chuỗi HTML để moi tất cả các link ảnh Cloudinary ẩn bên trong (dán từ Jodit)
const extractCloudinaryUrlsFromHtml = (htmlContent) => {
    if (!htmlContent) return [];
    // Quét tìm tất cả các đoạn text bắt đầu bằng https://res.cloudinary.com/...
    const regex = /https:\/\/res\.cloudinary\.com\/[^\s"'>]+/g;
    return htmlContent.match(regex) || [];
};

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
// 2. [POST] LƯU TỪ TAB "NHẬP THỦ CÔNG"
// ==========================================================
router.post("/create-manual", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const { title, targetClass, subject, duration, dueDate, status, action, saveToBank, questionsData } = req.body;
        
        const parsedQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
        
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ message: "Phải có ít nhất 1 câu hỏi!" });
        }

        const isBankFlag = (action === "bank_only" || saveToBank === "true");
        const grade = targetClass ? targetClass.replace(/\D/g, '').substring(0, 1) : "6";
        const questionsWithPoints = [];

        for (const q of parsedQuestions) {
            const imageFile = req.files && req.files.find(f => f.fieldname === `image_${q.tempId}`);
            const imageUrl = imageFile ? imageFile.path : (q.existingImageUrl || "");

            const essayImageFile = req.files && req.files.find(f => f.fieldname === `essayImage_${q.tempId}`);
            const essayImageUrl = essayImageFile ? essayImageFile.path : (q.existingEssayAnswerImageUrl || "");

            let actualCorrectAnswer = "Chưa có đáp án"; 
            if (q.type === "multiple_choice") {
                const optIndex = q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : 3;
                actualCorrectAnswer = q.options[optIndex] || q.options[0] || "Đáp án trống";
            } else if (q.type === "essay") {
                actualCorrectAnswer = "Tự luận"; 
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
                essayAnswerText: q.essayAnswerText || "",
                essayAnswerImageUrl: essayImageUrl, 
                teacher: req.user.id,
                isBank: isBankFlag 
            });
            await newQ.save();
            
            questionsWithPoints.push({ questionId: newQ._id, points: Number(q.points) || 1 });
        }

        if (action === "bank_only") {
            return res.status(201).json({ message: "✅ Đã lưu các câu hỏi vào Kho thành công!" });
        }

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

// ==========================================================
// 👉 5. THÊM LOGIC DỌN RÁC CLOUDINARY KHI XÓA BÀI TẬP (BAO GỒM NỘI SOI ẢNH TRONG JODIT)
// ==========================================================
router.delete("/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const assignmentId = req.params.id;

        const assignment = await Assignment.findById(assignmentId).populate('questions.questionId');
        
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập!" });
        }

        // Duyệt qua từng câu hỏi trong bài tập
        for (const item of assignment.questions) {
            const question = item.questionId;
            
            // Chỉ xóa ảnh và xóa câu hỏi nếu nó KHÔNG LƯU TRONG KHO (câu hỏi nháp)
            if (question && question.isBank === false) {
                
                // 1. Dọn ảnh đính kèm (Ảnh chính & Ảnh phụ)
                if (question.imageUrl) {
                    const publicId = getCloudinaryPublicId(question.imageUrl);
                    if (publicId) await cloudinary.uploader.destroy(publicId);
                }

                if (question.essayAnswerImageUrl) {
                    const essayPublicId = getCloudinaryPublicId(question.essayAnswerImageUrl);
                    if (essayPublicId) await cloudinary.uploader.destroy(essayPublicId);
                }

                // 2. Dọn ảnh nấp trong đoạn HTML (Dán từ Jodit Editor)
                const hiddenUrls = [
                    ...extractCloudinaryUrlsFromHtml(question.content),
                    ...extractCloudinaryUrlsFromHtml(question.essayAnswerText)
                ];

                for (const url of hiddenUrls) {
                    const hiddenPublicId = getCloudinaryPublicId(url);
                    if (hiddenPublicId) {
                        await cloudinary.uploader.destroy(hiddenPublicId);
                        console.log("-> Đã tiêu diệt ảnh ẩn trong Jodit:", hiddenPublicId);
                    }
                }

                // 3. Xóa câu hỏi
                await Question.findByIdAndDelete(question._id);
            }
        }

        // Xóa bài tập và lịch sử
        await Assignment.findByIdAndDelete(assignmentId);
        await Submission.deleteMany({ assignment: assignmentId });
        
        res.status(200).json({ message: " Đã xóa bài tập và dọn dẹp sạch sẽ ảnh rác thành công!" });
    } catch (error) { 
        res.status(500).json({ message: "Lỗi server khi xóa", error: error.message }); 
    }
});

// ==========================================================
// [PUT] CẬP NHẬT BÀI TẬP
// ==========================================================
router.put("/update/:id", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { title, targetClass, subject, duration, dueDate, status, saveToBank, questionsData } = req.body;

        const existingAssignment = await Assignment.findById(assignmentId);
        if (!existingAssignment) return res.status(404).json({ message: "Không tìm thấy bài tập!" });

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

        for (const q of parsedQuestions) {
            const imageFile = req.files && req.files.find(f => f.fieldname === `image_${q.tempId}` || f.fieldname === `image_${q._id}`);
            const imageUrl = imageFile ? imageFile.path : (q.existingImageUrl || "");

            const essayImageFile = req.files && req.files.find(f => f.fieldname === `essayImage_${q.tempId}` || f.fieldname === `essayImage_${q._id}`);
            const essayImageUrl = essayImageFile ? essayImageFile.path : (q.existingEssayAnswerImageUrl || "");

            let actualCorrectAnswer = "Chưa có đáp án";
            if (q.type === "multiple_choice") {
                const optIndex = q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : 3;
                actualCorrectAnswer = q.options[optIndex] || q.options[0] || "Đáp án trống";
            } else if (q.type === "essay") {
                actualCorrectAnswer = "Tự luận";
            }

            const isExistingQuestion = q._id && q._id.length === 24;
            let finalQuestionId;

            if (isExistingQuestion) {
                await Question.findByIdAndUpdate(q._id, {
                    content: q.content,
                    subject: q.subject || subject,
                    grade: grade,
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    essayAnswerText: q.essayAnswerText || "",
                    essayAnswerImageUrl: essayImageUrl,
                    isBank: isBankFlag
                });
                finalQuestionId = q._id;
            } else {
                const newQ = new Question({
                    content: q.content,
                    subject: q.subject || subject,
                    grade: grade,
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    essayAnswerText: q.essayAnswerText || "",
                    essayAnswerImageUrl: essayImageUrl,
                    teacher: req.user.id,
                    isBank: isBankFlag
                });
                await newQ.save();
                finalQuestionId = newQ._id;
            }

            questionsWithPoints.push({
                questionId: finalQuestionId,
                points: Number(q.points) || 1
            });
        }

        existingAssignment.title = title || existingAssignment.title;
        existingAssignment.targetClass = targetClass || existingAssignment.targetClass;
        existingAssignment.subject = subject || existingAssignment.subject;
        existingAssignment.duration = duration || existingAssignment.duration;
        existingAssignment.dueDate = dueDate || existingAssignment.dueDate;
        existingAssignment.status = status || existingAssignment.status; 
        existingAssignment.questions = questionsWithPoints;

        await existingAssignment.save();

        res.status(200).json({ message: "✅ Cập nhật bài tập thành công!", assignment: existingAssignment });

    } catch (error) {
        console.error("Lỗi cập nhật bài tập:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật bài tập", error: error.message });
    }
});
// [PATCH] CẬP NHẬT NHANH HẠN NỘP BÀI
router.patch("/update-deadline/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { newDueDate } = req.body;
        const assignment = await Assignment.findById(req.params.id);
        
        if (!assignment) return res.status(404).json({ message: "Không tìm thấy bài tập!" });
        
        // Kiểm tra quyền giáo viên (nếu cần)
        if (assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: "Bạn không có quyền sửa bài này!" });
        }

        assignment.dueDate = newDueDate;
        await assignment.save();

        res.status(200).json({ message: "✅ Cập nhật hạn nộp thành công!", dueDate: assignment.dueDate });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi cập nhật hạn nộp", error });
    }
});
export default router;