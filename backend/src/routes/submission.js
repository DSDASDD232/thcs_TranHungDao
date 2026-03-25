import express from "express";
import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";
import Question from "../models/Question.js";
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import User from "../models/User.js";
const router = express.Router();

// ======================================================================
// 1. [POST] API NỘP BÀI VÀ TỰ ĐỘNG CHẤM ĐIỂM (DÀNH CHO HỌC SINH)
// ======================================================================
router.post("/submit", verifyToken, async (req, res) => {
    try {
        // Chỉ học sinh mới được nộp bài
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Chỉ học sinh mới được nộp bài!" });
        }

        const { assignmentId, studentAnswers } = req.body;

        // 1. Tìm bài tập xem có tồn tại không
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        }

        // 2. Kiểm tra Deadline (Hạn nộp)
        const now = new Date();
        if (now > new Date(assignment.dueDate)) {
            return res.status(400).json({ message: "⏳ Đã hết hạn nộp bài!" });
        }

        // 3. Kiểm tra xem học sinh này đã nộp bài này chưa (tránh nộp 2 lần)
        const existingSubmission = await Submission.findOne({
            assignment: assignmentId,
            student: req.user.id
        });
        if (existingSubmission) {
            return res.status(400).json({ message: "Bạn đã nộp bài này rồi, không thể nộp lại!" });
        }

        // 4. TỰ ĐỘNG CHẤM ĐIỂM (Auto-grading)
        let correctCount = 0;
        let processedAnswers = [];

        // Lấy tất cả câu hỏi của bài tập này ra để dò đáp án
        const questionsInDb = await Question.find({ _id: { $in: assignment.questions } });

        // Lặp qua từng câu trả lời của học sinh để chấm
        for (let ans of studentAnswers) {
            const questionDoc = questionsInDb.find(q => q._id.toString() === ans.question);
            let isCorrect = false;

            if (questionDoc && ans.studentAnswer === questionDoc.correctAnswer) {
                isCorrect = true;
                correctCount++;
            }

            processedAnswers.push({
                question: ans.question,
                studentAnswer: ans.studentAnswer,
                isCorrect: isCorrect
            });
        }

        // 5. Tính điểm trên thang 10 (Làm tròn 1 chữ số thập phân cho đẹp)
        const totalQuestions = assignment.questions.length;
        let score = 0;
        if (totalQuestions > 0) {
            score = (correctCount / totalQuestions) * 10;
            score = Math.round(score * 10) / 10; // Làm tròn 1 chữ số (VD: 8.5)
        }

        // 6. Tạo bản ghi Submission mới và lưu xuống DB
        const newSubmission = new Submission({
            assignment: assignmentId,
            student: req.user.id,
            studentAnswers: processedAnswers, // Đổi từ answers -> studentAnswers cho khớp DB
            score: score,
            status: "graded"
        });

        await newSubmission.save();

        res.status(201).json({
            message: "✅ Nộp bài thành công!",
            score: score,
            correctAnswers: `${correctCount}/${totalQuestions}`,
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

        // 1. Kiểm tra xem bài tập có tồn tại không
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập này!" });
        }

        // 2. Chốt bảo mật: Nếu là giáo viên, chỉ cho phép xem bài do chính mình giao
        if (req.user.role === "teacher" && assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: "⛔ Bạn chỉ được xem điểm của bài tập do chính mình giao!" });
        }

        // 3. Truy vấn lấy toàn bộ bài nộp của bài tập này
        const submissions = await Submission.find({ assignment: assignmentId })
            .populate({
                path: "student", 
                select: "fullName username classId", // Kéo thêm classId
                populate: { path: "classId", select: "name" } // Dịch classId thành Tên lớp
            }) 
            .sort({ score: -1 }); 

        // 4. Trả về kết quả (Gói trong thuộc tính `submissions` để Frontend dễ đọc)
        res.status(200).json({ submissions });

    } catch (error) {
        console.error("Lỗi lấy danh sách điểm:", error);
        res.status(500).json({ message: "Lỗi server", error });
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
            .populate("assignment", "title targetClass dueDate") 
            .sort({ createdAt: -1 }); 

        // Trả kết quả về
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
// 4. [GET] API LẤY BẢNG XẾP HẠNG THI ĐUA CỦA 1 LỚP (CÓ BỘ LỌC THỜI GIAN)
// ======================================================================
router.get("/class/:classId/leaderboard", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const classId = req.params.classId;
        const { timeframe } = req.query; // Nhận thời gian từ Frontend (all, week, month, year)

        // 1. Tìm tất cả học sinh trong lớp này
        const students = await User.find({ classId: classId, role: "student" }).select("fullName username");
        if (students.length === 0) return res.status(200).json({ leaderboard: [] });
        const studentIds = students.map(s => s._id);

        // 2. Tạo bộ lọc thời gian
        let dateFilter = {};
        const now = new Date();

        if (timeframe === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Tìm ngày Thứ 2 đầu tuần
            const firstDayOfWeek = new Date(now.setDate(diff));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: firstDayOfWeek } };
        } else if (timeframe === 'month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Ngày 1 đầu tháng
            dateFilter = { createdAt: { $gte: firstDayOfMonth } };
        } else if (timeframe === 'year') {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1); // Ngày 1/1 đầu năm
            dateFilter = { createdAt: { $gte: firstDayOfYear } };
        }

        // 3. Tìm các bài nộp của học sinh trong lớp kết hợp LỌC THỜI GIAN
        const submissions = await Submission.find({ 
            student: { $in: studentIds },
            ...dateFilter 
        });

        // 4. Tính điểm trung bình cho từng em
        let leaderboard = students.map(student => {
            // Lọc ra các bài nộp của riêng học sinh này
            const studentSubs = submissions.filter(sub => sub.student.toString() === student._id.toString());
            
            // Tính tổng điểm
            const totalScore = studentSubs.reduce((sum, sub) => sum + sub.score, 0);
            
            // Tính điểm trung bình (làm tròn 1 chữ số)
            const averageScore = studentSubs.length > 0 ? (totalScore / studentSubs.length).toFixed(1) : 0;

            return {
                _id: student._id,
                fullName: student.fullName,
                username: student.username,
                totalTests: studentSubs.length, // Số bài đã làm
                averageScore: parseFloat(averageScore) // Điểm trung bình thi đua
            };
        });

        // 5. CHỈ GIỮ LẠI những học sinh có làm bài (tránh rác bảng xếp hạng với những số 0)
        leaderboard = leaderboard.filter(student => student.totalTests > 0);

        // 6. Sắp xếp: Ưu tiên Điểm TB cao hơn -> Nếu điểm bằng nhau thì ưu tiên Chăm chỉ (Số bài làm nhiều hơn)
        leaderboard.sort((a, b) => {
            if (b.averageScore !== a.averageScore) {
                return b.averageScore - a.averageScore;
            }
            return b.totalTests - a.totalTests;
        });

        res.status(200).json({ leaderboard });
    } catch (error) {
        console.error("Lỗi lấy bảng xếp hạng:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});

export default router;