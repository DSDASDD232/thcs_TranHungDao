import express from "express";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import Question from "../models/Question.js"; 
import Submission from "../models/Submission.js"; 
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import multer from "multer"; 
import mammoth from "mammoth";

// 👉 1. IMPORT CẤU HÌNH CLOUDINARY
import cloudinary, { uploadCloud } from "../config/cloudinary.js";

const router = express.Router();

const uploadWord = multer({ storage: multer.memoryStorage() });

// Hàm bóc tách Public ID từ link Cloudinary để dùng cho việc xóa
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

// Phân biệt resource_type (image hay video/audio) để Cloudinary xóa cho đúng
const getCloudinaryResourceType = (url) => {
    if (!url) return 'image';
    if (url.includes('/video/upload/')) return 'video'; // Audio (mp3) cũng tính là video trong Cloudinary
    if (url.includes('/raw/upload/')) return 'raw';
    return 'image';
};

const extractCloudinaryUrlsFromHtml = (htmlContent) => {
    if (!htmlContent) return [];
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
        // 👉 ĐÃ THÊM LẤY BIẾN assignmentType TỪ REQ.BODY
        const { title, targetClass, subject, duration, dueDate, status, action, saveToBank, questionsData, password, semester, assignmentType } = req.body;
        
        const parsedQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
        
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ message: "Phải có ít nhất 1 câu hỏi!" });
        }

        const isBankFlag = (action === "bank_only" || saveToBank === "true");
        const grade = targetClass ? targetClass.replace(/\D/g, '').substring(0, 1) : "6";
        const questionsWithPoints = [];

        for (const q of parsedQuestions) {
            let imageUrl = q.existingImageUrl || "";
            let essayImageUrl = q.existingEssayAnswerImageUrl || "";
            let videoUrl = q.videoUrl || ""; 

            if (req.files && req.files.length > 0) {
                const imageFile = req.files.find(f => f.fieldname === `image_${q.tempId}`);
                if (imageFile) imageUrl = imageFile.path;

                const essayImageFile = req.files.find(f => f.fieldname === `essayImage_${q.tempId}`);
                if (essayImageFile) essayImageUrl = essayImageFile.path;

                const videoFile = req.files.find(f => f.fieldname === `video_${q.tempId}`);
                if (videoFile) videoUrl = videoFile.path;
            }

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
                semester: q.semester || semester || "1",
                difficulty: q.difficulty,
                type: q.type, 
                options: q.type === "multiple_choice" ? q.options : [], 
                correctAnswer: actualCorrectAnswer, 
                imageUrl: imageUrl, 
                videoUrl: videoUrl, 
                essayAnswerText: q.essayAnswerText || "",
                essayAnswerImageUrl: essayImageUrl, 
                teacher: req.user.id,
                isBank: isBankFlag,
                points: Number(q.points) || 1
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
            semester: semester || "1",
            assignmentType: assignmentType || "homework", // 👉 LƯU LOẠI BÀI VÀO DB
            questions: questionsWithPoints, 
            duration: duration || 45, 
            dueDate, 
            status: status || "published", 
            password: password || "", 
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
        const { title, description, targetClass, questions, status, startTime, dueDate, duration, semester, assignmentType } = req.body;
        
        const formattedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

        const newAssignment = new Assignment({ 
            title, 
            description, 
            targetClass, 
            subject: req.body.subject,
            semester: semester || "1",
            assignmentType: assignmentType || "homework", // 👉 LƯU LOẠI BÀI VÀO DB
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

// ==========================================================
// 4. [GET] LẤY DANH SÁCH BÀI TẬP & ĐẾM ĐÚNG LƯỢT NỘP / CHỜ CHẤM
// ==========================================================
router.get("/my-assignments", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("classId");
        
        if (user.role === "student") {
            const studentClassName = user.classId ? user.classId.name : user.className;
            if (!studentClassName) return res.status(200).json({ assignments: [] }); 
            const assignments = await Assignment.find({ targetClass: studentClassName, status: "published" }).sort({ createdAt: -1 }).populate("teacher", "fullName");
            return res.status(200).json({ assignments });
        } else {
            const myAssignments = await Assignment.find({ teacher: req.user.id })
                .sort({ createdAt: -1 })
                .populate("questions.questionId", "content difficulty type points")
                .lean(); 
            
            const assignmentIds = myAssignments.map(a => a._id);
            const allSubmissions = await Submission.find({ assignment: { $in: assignmentIds } }).select("assignment student status");

            const classesInvolved = [...new Set(myAssignments.map(a => a.targetClass))];
            const classStudentCounts = {};
            for (const className of classesInvolved) {
                const count = await User.countDocuments({ role: "student", $or: [{ className: className }, { "classId.name": className }] }); 
                classStudentCounts[className] = count || 0; 
            }

            const assignmentsWithCounts = myAssignments.map(assig => {
                const submissionsForThisAssignment = allSubmissions.filter(sub => sub.assignment.toString() === assig._id.toString());
                
                const uniqueStudents = new Set(submissionsForThisAssignment.map(sub => sub.student.toString()));
                const pendingSubs = submissionsForThisAssignment.filter(sub => sub.status === 'pending');
                const uniquePendingStudents = new Set(pendingSubs.map(sub => sub.student.toString()));

                return {
                    ...assig,
                    submittedCount: uniqueStudents.size, 
                    pendingCount: uniquePendingStudents.size, 
                    totalStudents: classStudentCounts[assig.targetClass] || 0
                };
            });

            return res.status(200).json({ assignments: assignmentsWithCounts });
        }
    } catch (error) { 
        res.status(500).json({ message: "Lỗi server", error }); 
    }
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
// 5. LOGIC DỌN RÁC CLOUDINARY KHI XÓA BÀI TẬP
// ==========================================================
router.delete("/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const assignmentId = req.params.id;

        const assignment = await Assignment.findById(assignmentId).populate('questions.questionId');
        
        if (!assignment) {
            return res.status(404).json({ message: "Không tìm thấy bài tập!" });
        }

        for (const item of assignment.questions) {
            const question = item.questionId;
            
            if (question && question.isBank === false) {
                if (question.imageUrl && question.imageUrl.includes('cloudinary.com')) {
                    const publicId = getCloudinaryPublicId(question.imageUrl);
                    if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: getCloudinaryResourceType(question.imageUrl) });
                }

                if (question.essayAnswerImageUrl && question.essayAnswerImageUrl.includes('cloudinary.com')) {
                    const essayPublicId = getCloudinaryPublicId(question.essayAnswerImageUrl);
                    if (essayPublicId) await cloudinary.uploader.destroy(essayPublicId, { resource_type: getCloudinaryResourceType(question.essayAnswerImageUrl) });
                }
                
                if (question.videoUrl && question.videoUrl.includes('cloudinary.com')) {
                    const videoPublicId = getCloudinaryPublicId(question.videoUrl);
                    if (videoPublicId) await cloudinary.uploader.destroy(videoPublicId, { resource_type: getCloudinaryResourceType(question.videoUrl) });
                }

                const hiddenUrls = [
                    ...extractCloudinaryUrlsFromHtml(question.content),
                    ...extractCloudinaryUrlsFromHtml(question.essayAnswerText)
                ];

                for (const url of hiddenUrls) {
                    const hiddenPublicId = getCloudinaryPublicId(url);
                    if (hiddenPublicId) {
                        await cloudinary.uploader.destroy(hiddenPublicId, { resource_type: getCloudinaryResourceType(url) });
                    }
                }

                await Question.findByIdAndDelete(question._id);
            }
        }

        await Assignment.findByIdAndDelete(assignmentId);
        await Submission.deleteMany({ assignment: assignmentId });
        
        res.status(200).json({ message: " Đã xóa bài tập và dọn dẹp sạch sẽ tài nguyên rác thành công!" });
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
        // 👉 ĐÃ THÊM BIẾN assignmentType
        const { title, targetClass, subject, duration, dueDate, status, saveToBank, questionsData, password, semester, assignmentType } = req.body;

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
            let imageUrl = q.existingImageUrl || "";
            let essayImageUrl = q.existingEssayAnswerImageUrl || "";
            let videoUrl = q.videoUrl || "";

            if (req.files && req.files.length > 0) {
                const imageFile = req.files.find(f => f.fieldname === `image_${q.tempId}` || f.fieldname === `image_${q._id}`);
                if (imageFile) imageUrl = imageFile.path;

                const essayImageFile = req.files.find(f => f.fieldname === `essayImage_${q.tempId}` || f.fieldname === `essayImage_${q._id}`);
                if (essayImageFile) essayImageUrl = essayImageFile.path;
                
                const videoFile = req.files.find(f => f.fieldname === `video_${q.tempId}` || f.fieldname === `video_${q._id}`);
                if (videoFile) videoUrl = videoFile.path;
            }

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
                    semester: q.semester || semester || existingAssignment.semester || "1", 
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    videoUrl: videoUrl,
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
                    semester: q.semester || semester || "1",
                    difficulty: q.difficulty,
                    type: q.type,
                    options: q.type === "multiple_choice" ? q.options : [],
                    correctAnswer: actualCorrectAnswer,
                    imageUrl: imageUrl,
                    videoUrl: videoUrl, 
                    essayAnswerText: q.essayAnswerText || "",
                    essayAnswerImageUrl: essayImageUrl,
                    teacher: req.user.id,
                    isBank: isBankFlag,
                    points: Number(q.points) || 1
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
        existingAssignment.semester = semester || existingAssignment.semester || "1"; 
        existingAssignment.dueDate = dueDate || existingAssignment.dueDate;
        existingAssignment.status = status || existingAssignment.status;
        
        // 👉 CẬP NHẬT LOẠI BÀI TẬP NẾU CÓ THAY ĐỔI
        if (assignmentType) {
            existingAssignment.assignmentType = assignmentType;
        }

        if (password !== undefined) existingAssignment.password = password; 
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

// [PUT] API ĐỔI MẬT KHẨU VÀO ĐỀ
router.put("/update-password/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        const assignment = await Assignment.findById(req.params.id);
        
        if (!assignment) return res.status(404).json({ message: "Không tìm thấy bài tập!" });
        
        if (assignment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: "Bạn không có quyền sửa bài này!" });
        }

        assignment.password = password || "";
        await assignment.save();

        res.status(200).json({ message: "✅ Cập nhật mật khẩu thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi cập nhật mật khẩu", error });
    }
});

export default router;