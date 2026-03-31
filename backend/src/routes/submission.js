import express from "express";
import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";
import Question from "../models/Question.js";
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import User from "../models/User.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// ==========================================================
// CẤU HÌNH LƯU TRỮ ẢNH HỌC SINH NỘP (MULTER)
// ==========================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads/submissions/";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadSubmission = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn ảnh 10MB
});

// ======================================================================
// 1. [POST] API NỘP BÀI VÀ TỰ ĐỘNG CHẤM ĐIỂM (LAI TRẮC NGHIỆM & TỰ LUẬN)
// ======================================================================
router.post("/submit", verifyToken, uploadSubmission.any(), async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Chỉ học sinh mới được nộp bài!" });
        }

        const { assignmentId, studentAnswers } = req.body;
        
        // Cần parse string JSON về dạng Array (do gửi bằng FormData có đính kèm File)
        let parsedAnswers = [];
        try {
            parsedAnswers = JSON.parse(studentAnswers);
        } catch (e) {
            return res.status(400).json({ message: "Dữ liệu câu trả lời không hợp lệ" });
        }

        // 1. Tìm bài tập
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        }

        // 2. Kiểm tra Deadline
        const now = new Date();
        if (now > new Date(assignment.dueDate)) {
            return res.status(400).json({ message: "⏳ Đã hết hạn nộp bài!" });
        }

        // 3. Chống nộp 2 lần
        const existingSubmission = await Submission.findOne({
            assignment: assignmentId,
            student: req.user.id
        });
        if (existingSubmission) {
            return res.status(400).json({ message: "Bạn đã nộp bài này rồi, không thể nộp lại!" });
        }

        // 4. BẮT ĐẦU CHẤM ĐIỂM
        let totalScore = 0;
        let processedAnswers = [];
        let hasEssayQuestion = false; // Cờ theo dõi xem bài này có câu tự luận không

        // Lấy dữ liệu gốc của tất cả câu hỏi
        const questionIds = assignment.questions.map(q => q.questionId);
        const questionsInDb = await Question.find({ _id: { $in: questionIds } });

        for (let ans of parsedAnswers) {
            const questionDoc = questionsInDb.find(q => q._id.toString() === ans.question);
            // Lấy mức điểm tối đa của câu hỏi này từ Assignment
            const assignmentQuestion = assignment.questions.find(q => q.questionId.toString() === ans.question);
            const maxPoints = assignmentQuestion ? assignmentQuestion.points : 0;

            let isCorrect = false;
            let pointsAwarded = 0;
            let finalImageUrl = "";

            if (questionDoc) {
                // TÌNH HUỐNG 1: CÂU HỎI TRẮC NGHIỆM -> MÁY CHẤM LIỀN
                if (questionDoc.type === "multiple_choice") {
                    
                    // Parse options để lấy text tương ứng với A, B, C, D
                    let parsedOptions = [];
                    try {
                        parsedOptions = typeof questionDoc.options === 'string' ? JSON.parse(questionDoc.options) : questionDoc.options;
                    } catch (e) {
                        parsedOptions = questionDoc.options || [];
                    }

                    // Tìm index tương ứng với A, B, C, D
                    const optIndex = ans.studentAnswer === 'A' ? 0 : ans.studentAnswer === 'B' ? 1 : ans.studentAnswer === 'C' ? 2 : ans.studentAnswer === 'D' ? 3 : -1;
                    let studentAnswerText = optIndex !== -1 ? parsedOptions[optIndex] : "";
                    
                    // LOGIC CHẤM ĐIỂM: So khớp Text HOẶC so khớp A,B,C,D
                    if (
                        (studentAnswerText && questionDoc.correctAnswer && studentAnswerText.trim().toLowerCase() === questionDoc.correctAnswer.trim().toLowerCase()) ||
                        (ans.studentAnswer && ans.studentAnswer.toUpperCase() === questionDoc.correctAnswer.toUpperCase())
                    ) {
                        isCorrect = true;
                        pointsAwarded = maxPoints; 
                        totalScore += maxPoints; 
                    }
                } 
                // TÌNH HUỐNG 2: CÂU HỎI TỰ LUẬN -> LƯU ẢNH LẠI CHỜ GIÁO VIÊN
                else if (questionDoc.type === "essay") {
                    hasEssayQuestion = true; 
                    const imageFile = req.files.find(f => f.fieldname === `image_${ans.question}`);
                    if (imageFile) {
                        finalImageUrl = `/uploads/submissions/${imageFile.filename}`;
                    }
                }
            }

            processedAnswers.push({
                question: ans.question,
                type: questionDoc ? questionDoc.type : "multiple_choice",
                studentAnswer: ans.studentAnswer || "", // Text trả lời trắc nghiệm hoặc gõ tự luận
                studentImage: finalImageUrl, // Link ảnh học sinh chụp (tự luận)
                isCorrect: isCorrect,
                pointsAwarded: pointsAwarded,
                maxPoints: maxPoints
            });
        }

        // 5. Xác định Trạng thái bài nộp
        const finalStatus = hasEssayQuestion ? "pending" : "graded";

        const newSubmission = new Submission({
            assignment: assignmentId,
            student: req.user.id,
            answers: processedAnswers, 
            score: Number(totalScore.toFixed(2)), 
            status: finalStatus
        });

        await newSubmission.save();

        res.status(201).json({
            message: "✅ Nộp bài thành công!",
            status: finalStatus,
            score: finalStatus === "graded" ? newSubmission.score : null, 
            submission: newSubmission
        });

    } catch (error) {
        console.error("Lỗi nộp bài:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 2. [GET] API XEM DANH SÁCH ĐIỂM CỦA 1 BÀI TẬP (DÀNH CHO GIÁO VIÊN & ADMIN)
// ======================================================================
router.get("/assignment/:id/grades", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const assignmentId = req.params.id;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        }

        const submissions = await Submission.find({ assignment: assignmentId })
            .populate({
                path: "student", 
                select: "fullName username classId", 
                populate: { path: "classId", select: "name" } 
            })
            .populate("answers.question") 
            .sort({ status: -1, score: -1 }); 

        res.status(200).json({ assignment, submissions });

    } catch (error) {
        console.error("Lỗi lấy danh sách điểm:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// [MỚI] API LƯU ĐIỂM CHẤM THỦ CÔNG CỦA GIÁO VIÊN (CHẤM TỰ LUẬN)
// ======================================================================
router.put("/grade/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { grades } = req.body; 

        const submission = await Submission.findById(id).populate("answers.question");
        if (!submission) return res.status(404).json({ message: "Không tìm thấy bài nộp!" });

        let newTotalScore = 0;

        submission.answers.forEach(ans => {
            const qIdStr = ans.question._id.toString();
            if (grades[qIdStr] !== undefined) {
                ans.pointsAwarded = Number(grades[qIdStr]);
            }
            newTotalScore += ans.pointsAwarded;
        });

        submission.score = Number(newTotalScore.toFixed(2));
        submission.status = "graded"; 

        await submission.save();

        res.status(200).json({ message: "✅ Chấm bài thành công!", submission });
    } catch (error) {
        console.error("Lỗi chấm bài:", error);
        res.status(500).json({ message: "Lỗi server khi chấm bài", error });
    }
});

// ======================================================================
// 3. [GET] API XEM LỊCH SỬ ĐIỂM SỐ CÁ NHÂN (DÀNH CHO HỌC SINH)
// ======================================================================
router.get("/my-submissions", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Chỉ học sinh mới có lịch sử điểm cá nhân!" });
        }

        const mySubmissions = await Submission.find({ student: req.user.id })
            .populate("assignment", "title subject dueDate") 
            .sort({ createdAt: -1 }); 

        res.status(200).json({
            message: "✅ Lấy lịch sử điểm số thành công!",
            total: mySubmissions.length,
            submissions: mySubmissions
        });

    } catch (error) {
        console.error("Lỗi lấy lịch sử điểm:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 4. [GET] API LẤY BẢNG XẾP HẠNG THI ĐUA CỦA 1 LỚP (CÓ BỘ LỌC THỜI GIAN VÀ MÔN)
// ======================================================================
router.get("/class/:classId/leaderboard", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const classId = req.params.classId;
        const { timeframe, subject } = req.query; // 👉 Đã thêm subject

        const students = await User.find({ classId: classId, role: "student" }).select("fullName username");
        if (students.length === 0) return res.status(200).json({ leaderboard: [] });
        const studentIds = students.map(s => s._id);

        let dateFilter = {};
        const now = new Date();

        if (timeframe === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
            const firstDayOfWeek = new Date(now.setDate(diff));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfWeek } };
        } else if (timeframe === 'month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
            dateFilter = { createdAt: { $gte: firstDayOfMonth } };
        } else if (timeframe === 'year') {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1); 
            dateFilter = { createdAt: { $gte: firstDayOfYear } };
        }

        // 👉 Xử lý lọc theo môn học (tìm các Assignment có môn tương ứng trước)
        let assignmentFilter = {};
        if (subject && subject !== "all") {
            const assignmentsOfSubject = await Assignment.find({ subject: subject }).select("_id");
            const assignmentIds = assignmentsOfSubject.map(a => a._id);
            assignmentFilter = { assignment: { $in: assignmentIds } };
        }

        const submissions = await Submission.find({ 
            student: { $in: studentIds },
            status: "graded", // Thi đua chỉ tính các bài đã chấm xong
            ...dateFilter,
            ...assignmentFilter // 👉 Gắn bộ lọc môn học vào đây
        }).sort({ createdAt: -1 }); 

        let leaderboard = students.map(student => {
            const studentSubs = submissions.filter(sub => sub.student.toString() === student._id.toString());
            const totalScore = studentSubs.reduce((sum, sub) => sum + sub.score, 0);
            const averageScore = studentSubs.length > 0 ? (totalScore / studentSubs.length).toFixed(1) : 0;
            const lastSubmission = studentSubs.length > 0 ? studentSubs[0].createdAt : null;

            return {
                _id: student._id,
                fullName: student.fullName,
                username: student.username,
                totalTests: studentSubs.length, 
                averageScore: parseFloat(averageScore), 
                lastSubmission: lastSubmission 
            };
        });

        // 👉 ƯU TIÊN SẮP XẾP: Số lượt nộp bài > Điểm Trung Bình
        leaderboard.sort((a, b) => {
            if (b.totalTests !== a.totalTests) {
                return b.totalTests - a.totalTests;
            }
            return b.averageScore - a.averageScore;
        });

        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error("Lỗi lấy bảng xếp hạng:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

// ======================================================================
// 5. [GET] API XEM CHI TIẾT LỊCH SỬ LÀM BÀI CỦA 1 HỌC SINH (Cho Giáo viên)
// ======================================================================
router.get("/student/:studentId", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { studentId } = req.params;
        const submissions = await Submission.find({ student: studentId })
            .populate("assignment", "title") 
            .sort({ createdAt: -1 }); 

        res.status(200).json({ submissions });
    } catch (error) {
        console.error("Lỗi lấy lịch sử học sinh:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

export default router;