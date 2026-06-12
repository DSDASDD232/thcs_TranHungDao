import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import Question from "../models/Question.js";
import QuestionSet from "../models/QuestionSet.js"; 
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";
import cloudinary, { uploadCloud } from "../config/cloudinary.js";

const router = express.Router();
const uploadWord = multer({ storage: multer.memoryStorage() });

const getCloudinaryPublicId = (url) => {
    if (!url || !url.includes("cloudinary.com")) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length !== 2) return null;
        let pathString = parts[1];
        const pathParts = pathString.split('/');
        if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) pathParts.shift();
        const publicIdWithExt = pathParts.join('/');
        return publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
    } catch (error) { return null; }
};

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
                    tempId: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
                    content: line.replace(/^Câu\s+\d+[\:\.]\s*/i, '').trim(),
                    type: "multiple_choice",
                    options: [], correctAnswer: "A", subject: defaultSubject, grade: defaultGrade, difficulty: "medium", imageFile: null, previewUrl: ""
                };
            } else if (currentQ) {
                if (/^[A-D][\.\:]\s*/i.test(line)) currentQ.options.push(line.replace(/^[A-D][\.\:]\s*/i, '').trim());
                else if (/^Đáp án\s*[\:\.]/i.test(line)) {
                    let ans = line.replace(/^Đáp án\s*[\:\.]\s*/i, '').trim().toUpperCase();
                    if (['A', 'B', 'C', 'D'].includes(ans)) currentQ.correctAnswer = ans;
                }
            }
        }
        if (currentQ) parsedQuestions.push(currentQ);

        if (parsedQuestions.length === 0) return res.status(400).json({ message: "Định dạng file Word không hợp lệ." });
        res.status(200).json({ message: "Bóc tách thành công!", questions: parsedQuestions });
    } catch (error) { res.status(500).json({ message: "Lỗi server khi bóc tách file Word.", error }); }
});

router.post("/add", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const { content, subject, difficulty, grade, type, options, correctAnswer, examName, essayAnswerText, semester, videoUrl } = req.body;
        const teacherId = req.user.id || req.user._id;

        if (!content || !type) return res.status(400).json({ message: "Thiếu nội dung hoặc loại câu hỏi!" });

        const finalExamName = examName ? examName.trim() : "Đề chung";
        const normalizedContent = content.trim().toLowerCase();

        let questionSet = await QuestionSet.findOne({ examName: finalExamName, teacherId: teacherId, subject });
        if (!questionSet) {
            questionSet = new QuestionSet({ examName: finalExamName, subject, grade: grade || "6", semester: semester || "1", teacherId: teacherId });
            await questionSet.save();
        }

        const isDuplicate = await Question.findOne({
            teacher: teacherId, questionSetId: questionSet._id, content: { $regex: new RegExp(`^${normalizedContent}$`, 'i') } 
        });

        if (isDuplicate) return res.status(400).json({ message: "Câu hỏi này đã tồn tại trong đề thi này!" });

        let parsedOptions = [];
        let finalCorrectAnswer = "";

        if (type === "multiple_choice") {
            try {
                parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
                if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) throw new Error("Options phải là một mảng ít nhất 2 đáp án");
                finalCorrectAnswer = correctAnswer;
            } catch (e) { return res.status(400).json({ message: "Định dạng danh sách đáp án không hợp lệ!" }); }
        }

        let finalEssayAnswerImageUrl = "";
        const essayImageFile = req.files?.find(f => f.fieldname === 'essayAnswerImage');
        if (essayImageFile) finalEssayAnswerImageUrl = essayImageFile.path;

        let finalVideoUrl = videoUrl || "";
        const videoFile = req.files?.find(f => f.fieldname === 'video');
        if (videoFile) finalVideoUrl = videoFile.path;

        const newQuestion = new Question({
            content: content.trim(), subject, difficulty, grade: grade || "6", semester: semester || "1", type: type,
            options: parsedOptions, correctAnswer: finalCorrectAnswer, teacher: teacherId, isBank: true,
            questionSetId: questionSet._id, examName: questionSet.examName, essayAnswerText: essayAnswerText || "",
            essayAnswerImageUrl: finalEssayAnswerImageUrl, videoUrl: finalVideoUrl
        });

        await newQuestion.save();
        res.status(201).json({ message: "✅ Đã thêm câu hỏi vào Đề thi thành công!", question: newQuestion });
    } catch (error) { res.status(500).json({ message: "Lỗi server hệ thống", error: error.message }); }
});

router.post("/create-exam-questions", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const { examName, subject, grade, questionsData, semester } = req.body;
        const teacherId = req.user.id || req.user._id;
        
        if (!questionsData) return res.status(400).json({ message: "Dữ liệu gửi lên bị thiếu (không có questionsData)!" });

        const finalExamName = examName ? examName.trim() : "Đề chung";
        const finalSubject = subject ? subject.trim() : "Chung";
        const finalGrade = grade ? grade.trim() : "Chung";
        
        let parsedQuestions = [];
        try { parsedQuestions = JSON.parse(questionsData); } catch (e) { return res.status(400).json({ message: "Dữ liệu danh sách câu hỏi không hợp lệ!" }); }
        
        if (!parsedQuestions || parsedQuestions.length === 0) return res.status(400).json({ message: "Không có câu hỏi nào để lưu!" });

        let questionSet = await QuestionSet.findOne({ examName: finalExamName, teacherId: teacherId, subject: finalSubject });
        if (!questionSet) {
            questionSet = new QuestionSet({ examName: finalExamName, subject: finalSubject, grade: finalGrade, semester: semester || "1", teacherId: teacherId });
            await questionSet.save();
        }

        const existingDbQuestions = await Question.find({ teacher: teacherId, questionSetId: questionSet._id }).select('content').lean();
        const existingContents = new Set(existingDbQuestions.map(q => q.content.trim().toLowerCase()));
        const incomingContents = new Set(); 
        const questionsToSave = [];

        for (let q of parsedQuestions) {
            const normalizedContent = q.content.trim().toLowerCase();

            const isAutoFill = normalizedContent.includes("dựa vào dữ liệu đính kèm bên dưới");

            if (!isAutoFill) {
                if (existingContents.has(normalizedContent)) {
                    return res.status(400).json({ message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." đã có sẵn trong kho học liệu!` });
                }
                if (incomingContents.has(normalizedContent)) {
                    return res.status(400).json({ message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." bị trùng lặp trong danh sách bạn đang soạn!` });
                }
                incomingContents.add(normalizedContent);
            }

            if (q.type === 'essay' && (!q.points || Number(q.points) <= 0)) {
                return res.status(400).json({ message: `Lỗi: Câu tự luận bắt buộc phải có điểm lớn hơn 0!` });
            }

            let imageUrl = q.existingImageUrl || "";
            const imageFile = req.files?.find(f => f.fieldname === `image_${q.tempId}`);
            if (imageFile) imageUrl = imageFile.path; 

            let essayAnswerImageUrl = "";
            const essayImageFile = req.files?.find(f => f.fieldname === `essayImage_${q.tempId}`);
            if (essayImageFile) essayAnswerImageUrl = essayImageFile.path; 

            let videoUrl = q.videoUrl || "";
            const videoFile = req.files?.find(f => f.fieldname === `video_${q.tempId}`);
            if (videoFile) videoUrl = videoFile.path; 

            questionsToSave.push({
                content: q.content.trim(), type: q.type || "multiple_choice", options: q.type === 'multiple_choice' ? q.options : [],
                correctAnswer: q.type === 'multiple_choice' ? q.correctAnswer : "", difficulty: q.difficulty || "medium",
                subject: finalSubject, grade: finalGrade, semester: q.semester || semester || "1",
                questionSetId: questionSet._id, examName: questionSet.examName, teacher: teacherId,
                imageUrl: imageUrl, videoUrl: videoUrl, points: q.type === 'essay' ? Number(q.points) : 0,
                essayAnswerText: q.essayAnswerText || "", essayAnswerImageUrl: essayAnswerImageUrl, isBank: true
            });
        }

        await Question.insertMany(questionsToSave);
        res.status(201).json({ message: `✅ Đã lưu thành công ${questionsToSave.length} câu hỏi vào Đề thi: ${finalExamName}` });

    } catch (error) {
        console.error("Lỗi lưu Đề thi:", error);
        res.status(500).json({ message: "Lỗi server khi lưu câu hỏi vào đề thi", error: error.message });
    }
});

router.get("/all", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const queryFilter = { isBank: true };
        const questions = await Question.find(queryFilter)
            .sort({ createdAt: -1 }) 
            .populate("teacher", "fullName username");

        res.status(200).json({
            message: "Lấy danh sách thành công!",
            total: questions.length,
            questions: questions
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================================
// 👉 [PUT] ADMIN KHÓA / MỞ KHÓA CÂU HỎI ĐÃ ĐƯỢC THÊM VÀO ĐÂY
// ==========================================================
router.put("/toggle-status/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const question = await Question.findById(questionId);
        
        if (!question) {
            return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });
        }

        question.isActive = question.isActive === false ? true : false;
        await question.save();

        res.status(200).json({ 
            message: question.isActive ? "✅ Đã MỞ KHÓA câu hỏi thành công!" : "🔒 Đã KHÓA câu hỏi thành công!",
            isActive: question.isActive
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi đổi trạng thái", error: error.message });
    }
});

router.put("/update/:id", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        const imageFile = req.files?.find(f => f.fieldname === 'image');
        if (imageFile) {
            updateData.imageUrl = imageFile.path;
        } else if (req.body.imageUrl === "") {
            updateData.imageUrl = ""; 
        }

        const essayImageFile = req.files?.find(f => f.fieldname === 'essayAnswerImage');
        if (essayImageFile) {
            updateData.essayAnswerImageUrl = essayImageFile.path;
        } else if (req.body.essayAnswerImageUrl === "") {
            updateData.essayAnswerImageUrl = "";
        }

        const videoFile = req.files?.find(f => f.fieldname === 'video');
        if (videoFile) {
            updateData.videoUrl = videoFile.path;
        } else if (req.body.videoUrl !== undefined) {
            updateData.videoUrl = req.body.videoUrl;
        }

        if (updateData.type === 'multiple_choice') {
             if (updateData.options) {
                try {
                    updateData.options = typeof updateData.options === 'string' ? JSON.parse(updateData.options) : updateData.options;
                } catch (e) {
                    return res.status(400).json({ message: "Định dạng options không hợp lệ" });
                }
            }
            updateData.points = 0; 
        } else if (updateData.type === 'essay') {
            updateData.options = [];
            updateData.correctAnswer = "";
            updateData.points = Number(updateData.points) || 0;
            if (updateData.points <= 0) {
                return res.status(400).json({ message: "Lỗi: Câu tự luận bắt buộc phải có điểm lớn hơn 0!" });
            }
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { returnDocument: 'after' } 
        );

        if (!updatedQuestion) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        res.status(200).json({ message: "✅ Cập nhật thành công!", question: updatedQuestion });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

router.delete("/delete/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const question = await Question.findById(questionId);

        if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        if (question.imageUrl) {
            const publicId = getCloudinaryPublicId(question.imageUrl);
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }
        
        if (question.essayAnswerImageUrl) {
            const essayPublicId = getCloudinaryPublicId(question.essayAnswerImageUrl);
            if (essayPublicId) await cloudinary.uploader.destroy(essayPublicId);
        }

        if (question.videoUrl && question.videoUrl.includes("cloudinary.com")) {
            const videoPublicId = getCloudinaryPublicId(question.videoUrl);
            if (videoPublicId) await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });
        }

        await Question.findByIdAndDelete(questionId);

        res.status(200).json({ message: "🗑️ Đã xóa câu hỏi và dọn sạch dữ liệu thành công!" });
    } catch (error) {
        console.error("Lỗi xóa:", error);
        res.status(500).json({ message: "Lỗi server khi xóa", error: error.message });
    }
});
    
export default router;