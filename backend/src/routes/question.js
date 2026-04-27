import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import Question from "../models/Question.js";
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";

// 👉 1. IMPORT CẤU HÌNH CLOUDINARY
import cloudinary, { uploadCloud } from "../config/cloudinary.js";

const router = express.Router();

// Chỉ giữ lại memoryStorage cho Word vì thuật toán bóc tách cần đọc buffer trực tiếp
const uploadWord = multer({ storage: multer.memoryStorage() });

// ==========================================================
// HÀM HỖ TRỢ: Lấy public_id từ Link Cloudinary để xóa ảnh
// ==========================================================
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
// 2. [POST] Thêm 1 câu hỏi lẻ (THÊM VÀO KHO)
// ==========================================================
// 👉 Dùng uploadCloud.any()
router.post("/add", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const { content, subject, difficulty, grade, type, options, correctAnswer, questionSet, essayAnswerText } = req.body;

        if (!content || !type) {
            return res.status(400).json({ message: "Thiếu nội dung hoặc loại câu hỏi!" });
        }

        const finalSetName = questionSet ? questionSet.trim() : "Ngân hàng chung";
        const normalizedContent = content.trim().toLowerCase();

        const isDuplicate = await Question.findOne({
            teacher: req.user.id,
            questionSet: finalSetName,
            content: { $regex: new RegExp(`^${normalizedContent}$`, 'i') } 
        });

        if (isDuplicate) {
            return res.status(400).json({ message: "Câu hỏi này đã tồn tại trong kho của bạn!" });
        }

        let parsedOptions = [];
        let finalCorrectAnswer = "";

        if (type === "multiple_choice") {
            try {
                parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
                if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
                    throw new Error("Options phải là một mảng ít nhất 2 đáp án");
                }
                finalCorrectAnswer = correctAnswer;
            } catch (e) {
                return res.status(400).json({ message: "Định dạng danh sách đáp án không hợp lệ!" });
            }
        }

        // 👉 Nhận link Cloudinary trả về thay vì lưu ổ cứng
        let finalImageUrl = "";
        const imageFile = req.files?.find(f => f.fieldname === 'image');
        if (imageFile) finalImageUrl = imageFile.path; // Lấy link Cloudinary

        let finalEssayAnswerImageUrl = "";
        const essayImageFile = req.files?.find(f => f.fieldname === 'essayAnswerImage');
        if (essayImageFile) finalEssayAnswerImageUrl = essayImageFile.path;

        const newQuestion = new Question({
            content: content.trim(),
            subject,
            difficulty,
            grade: grade || "6",
            type: type,
            options: parsedOptions,
            correctAnswer: finalCorrectAnswer,
            imageUrl: finalImageUrl, 
            teacher: req.user.id,
            isBank: true,
            questionSet: finalSetName,
            essayAnswerText: essayAnswerText || "",
            essayAnswerImageUrl: finalEssayAnswerImageUrl
        });

        await newQuestion.save();
        res.status(201).json({ message: "✅ Đã thêm câu hỏi vào Kho thành công!", question: newQuestion });

    } catch (error) {
        console.error("LỖI BACKEND CHI TIẾT:", error);
        res.status(500).json({ message: "Lỗi server hệ thống", error: error.message });
    }
});

// ======================================================================
// 3. [POST] LƯU HÀNG LOẠT CÂU HỎI THÀNH "BỘ ĐỀ" / KHO
// ======================================================================
router.post("/create-set", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const { setName, subject, grade, questionsData } = req.body;
        
        const finalSetName = setName ? setName.trim() : "Ngân hàng chung";
        const finalSubject = subject ? subject.trim() : "Chung";
        const finalGrade = grade ? grade.trim() : "Chung";
        
        let parsedQuestions = [];
        try {
            parsedQuestions = JSON.parse(questionsData);
        } catch (e) {
            return res.status(400).json({ message: "Dữ liệu danh sách câu hỏi không hợp lệ!" });
        }
        
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ message: "Không có câu hỏi nào để lưu!" });
        }

        const existingDbQuestions = await Question.find({
            teacher: req.user.id,
            questionSet: finalSetName
        }).select('content').lean();

        const existingContents = new Set(existingDbQuestions.map(q => q.content.trim().toLowerCase()));
        const incomingContents = new Set(); 
        const questionsToSave = [];

        for (let q of parsedQuestions) {
            const normalizedContent = q.content.trim().toLowerCase();

            if (existingContents.has(normalizedContent)) {
                return res.status(400).json({ message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." đã có sẵn trong kho này!` });
            }
            if (incomingContents.has(normalizedContent)) {
                return res.status(400).json({ message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." bị trùng lặp trong danh sách!` });
            }

            incomingContents.add(normalizedContent);

            let imageUrl = q.existingImageUrl || "";
            const imageFile = req.files?.find(f => f.fieldname === `image_${q.tempId}`);
            if (imageFile) imageUrl = imageFile.path; // Lấy link Cloudinary

            let essayAnswerImageUrl = "";
            const essayImageFile = req.files?.find(f => f.fieldname === `essayImage_${q.tempId}`);
            if (essayImageFile) essayAnswerImageUrl = essayImageFile.path; // Lấy link Cloudinary

            questionsToSave.push({
                content: q.content.trim(),
                type: q.type || "multiple_choice",
                options: q.type === 'multiple_choice' ? q.options : [],
                correctAnswer: q.type === 'multiple_choice' ? q.correctAnswer : "",
                difficulty: q.difficulty || "medium",
                subject: finalSubject,
                grade: finalGrade,
                questionSet: finalSetName,
                teacher: req.user.id,
                imageUrl: imageUrl,
                points: q.points || 0,
                essayAnswerText: q.essayAnswerText || "",
                essayAnswerImageUrl: essayAnswerImageUrl,
                isBank: true
            });
        }

        await Question.insertMany(questionsToSave);
        res.status(201).json({ message: `✅ Đã lưu thành công ${questionsToSave.length} câu hỏi vào Bộ đề: ${finalSetName}` });

    } catch (error) {
        console.error("Lỗi lưu Bộ đề:", error);
        res.status(500).json({ message: "Lỗi server khi lưu bộ đề", error: error.message });
    }
});

// ==========================================================
// 4. [GET] Lấy toàn bộ câu hỏi (CHỈ LẤY CÂU TRONG KHO)
// ==========================================================
router.get("/all", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const queryFilter = { isBank: true };
        if (req.user.role === "teacher") {
            queryFilter.teacher = req.user.id;
        }

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
// 5. [PUT] Cập nhật câu hỏi
// ==========================================================
router.put("/update/:id", verifyToken, isTeacherOrAdmin, uploadCloud.any(), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Cập nhật ảnh đề bài (Nếu up ảnh mới thì lấy link Cloudinary)
        const imageFile = req.files?.find(f => f.fieldname === 'image');
        if (imageFile) {
            updateData.imageUrl = imageFile.path;
        } else if (req.body.imageUrl === "") {
            updateData.imageUrl = ""; // Xóa ảnh
        }

        // Cập nhật ảnh đáp án
        const essayImageFile = req.files?.find(f => f.fieldname === 'essayAnswerImage');
        if (essayImageFile) {
            updateData.essayAnswerImageUrl = essayImageFile.path;
        } else if (req.body.essayAnswerImageUrl === "") {
            updateData.essayAnswerImageUrl = "";
        }

        // 👉 ĐÃ SỬA: Gỡ bỏ lệnh reset lời giải nếu là Trắc nghiệm! 
        if (updateData.type === 'multiple_choice') {
             if (updateData.options) {
                try {
                    updateData.options = typeof updateData.options === 'string' ? JSON.parse(updateData.options) : updateData.options;
                } catch (e) {
                    return res.status(400).json({ message: "Định dạng options không hợp lệ" });
                }
            }
        } else if (updateData.type === 'essay') {
            updateData.options = [];
            updateData.correctAnswer = "";
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

// ==========================================================
// 6. [DELETE] Xóa câu hỏi (XÓA CẢ ẢNH TRÊN CLOUDINARY)
// ==========================================================
router.delete("/delete/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const question = await Question.findById(questionId);

        if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        // 👉 DỌN DẸP TRÊN CLOUDINARY
        if (question.imageUrl) {
            const publicId = getCloudinaryPublicId(question.imageUrl);
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }
        
        if (question.essayAnswerImageUrl) {
            const essayPublicId = getCloudinaryPublicId(question.essayAnswerImageUrl);
            if (essayPublicId) await cloudinary.uploader.destroy(essayPublicId);
        }

        // Xóa trong DB
        await Question.findByIdAndDelete(questionId);

        res.status(200).json({ message: "🗑️ Đã xóa câu hỏi và dọn ảnh trên Cloudinary thành công!" });
    } catch (error) {
        console.error("Lỗi xóa:", error);
        res.status(500).json({ message: "Lỗi server khi xóa", error: error.message });
    }
});
    
export default router;