import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Question from "../models/Question.js";
import { verifyToken, isTeacherOrAdmin } from "../middleware/auth.js";

const router = express.Router();

// ==========================================================
// CẤU HÌNH LƯU TRỮ FILE (MULTER)
// ==========================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads/";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '-'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// ==========================================================
// 1. [POST] Thêm 1 câu hỏi lẻ (THÊM VÀO KHO)
// ==========================================================
router.post("/add", verifyToken, isTeacherOrAdmin, upload.single("image"), async (req, res) => {
    try {
        const { content, subject, difficulty, grade, type, options, correctAnswer, questionSet } = req.body;

        if (!content || !options || !correctAnswer) {
            return res.status(400).json({ message: "Thiếu thông tin câu hỏi, đáp án hoặc nội dung!" });
        }

        const finalSetName = questionSet ? questionSet.trim() : "Ngân hàng chung";
        const normalizedContent = content.trim().toLowerCase();

        // 👉 KIỂM TRA TRÙNG LẶP: So sánh với các câu đã có trong kho này
        const isDuplicate = await Question.findOne({
            teacher: req.user.id,
            questionSet: finalSetName,
            // Regex tìm chính xác nội dung (không phân biệt hoa thường)
            content: { $regex: new RegExp(`^${normalizedContent}$`, 'i') } 
        });

        if (isDuplicate) {
            return res.status(400).json({ message: "Câu hỏi này đã tồn tại trong kho của bạn!" });
        }

        let parsedOptions;
        try {
            parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
            if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
                throw new Error("Options phải là một mảng ít nhất 2 đáp án");
            }
        } catch (e) {
            return res.status(400).json({ message: "Định dạng danh sách đáp án không hợp lệ!" });
        }

        let finalImageUrl = "";
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`;
        }

        const newQuestion = new Question({
            content: content.trim(),
            subject,
            difficulty,
            grade: grade || "6",
            type: type || "multiple_choice",
            options: parsedOptions,
            correctAnswer,
            imageUrl: finalImageUrl, 
            teacher: req.user.id,
            isBank: true,
            questionSet: finalSetName
        });

        await newQuestion.save();
        res.status(201).json({ message: "✅ Đã thêm câu hỏi vào Kho thành công!", question: newQuestion });

    } catch (error) {
        console.error("LỖI BACKEND CHI TIẾT:", error);
        res.status(500).json({ message: "Lỗi server hệ thống", error: error.message });
    }
});

// ======================================================================
// 2. [POST] LƯU HÀNG LOẠT CÂU HỎI THÀNH "BỘ ĐỀ" / KHO
// ======================================================================
router.post("/create-set", verifyToken, isTeacherOrAdmin, upload.any(), async (req, res) => {
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

        // 👉 BƯỚC 1: LẤY CÁC CÂU HỎI CŨ ĐÃ CÓ TRONG KHO RA ĐỂ ĐỐI CHIẾU
        const existingDbQuestions = await Question.find({
            teacher: req.user.id,
            questionSet: finalSetName
        }).select('content').lean();

        // Tạo 1 mảng Set chứa nội dung đã LowerCase để đối chiếu siêu nhanh (O(1))
        const existingContents = new Set(existingDbQuestions.map(q => q.content.trim().toLowerCase()));
        
        // Mảng Set để lưu tạm các câu hỏi đang lặp qua (Chống trùng lặp nội bộ trong danh sách mới gửi lên)
        const incomingContents = new Set(); 
        const questionsToSave = [];

        // 👉 BƯỚC 2: DUYỆT QUA CÁC CÂU MỚI VÀ KIỂM TRA
        for (let q of parsedQuestions) {
            const normalizedContent = q.content.trim().toLowerCase();

            // Rào chắn 1: Trùng với Database
            if (existingContents.has(normalizedContent)) {
                return res.status(400).json({ 
                    message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." đã có sẵn trong kho này!` 
                });
            }

            // Rào chắn 2: Trùng với câu phía trên vừa lặp qua
            if (incomingContents.has(normalizedContent)) {
                return res.status(400).json({ 
                    message: `Lỗi: Câu hỏi "${q.content.substring(0, 30)}..." bị trùng lặp nhiều lần trong danh sách bạn đang soạn!` 
                });
            }

            // Nếu an toàn, cho phép đi tiếp
            incomingContents.add(normalizedContent);

            let imageUrl = q.existingImageUrl || "";
            const imageFile = req.files?.find(f => f.fieldname === `image_${q.tempId}`);
            if (imageFile) {
                imageUrl = `/uploads/${imageFile.filename}`;
            }

            questionsToSave.push({
                content: q.content.trim(), // Xóa khoảng trắng thừa khi lưu
                type: q.type || "multiple_choice",
                options: q.options,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty || "medium",
                subject: finalSubject,
                grade: finalGrade,
                questionSet: finalSetName,
                teacher: req.user.id,
                imageUrl: imageUrl,
                isBank: true
            });
        }

        // Lưu toàn bộ vào DB
        await Question.insertMany(questionsToSave);

        res.status(201).json({ message: `✅ Đã lưu thành công ${questionsToSave.length} câu hỏi vào Bộ đề: ${finalSetName}` });

    } catch (error) {
        console.error("Lỗi lưu Bộ đề:", error);
        res.status(500).json({ message: "Lỗi server khi lưu bộ đề", error: error.message });
    }
});

// ==========================================================
// 3. [GET] Lấy toàn bộ câu hỏi (CHỈ LẤY CÂU TRONG KHO)
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
// 4. [PUT] Cập nhật câu hỏi
// ==========================================================
router.put("/update/:id", verifyToken, isTeacherOrAdmin, upload.single("image"), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }

        if (updateData.options) {
            try {
                updateData.options = typeof updateData.options === 'string' ? JSON.parse(updateData.options) : updateData.options;
            } catch (e) {
                return res.status(400).json({ message: "Định dạng options không hợp lệ" });
            }
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true } 
        );

        if (!updatedQuestion) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        res.status(200).json({ message: "✅ Cập nhật thành công!", question: updatedQuestion });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ==========================================================
// 5. [DELETE] Xóa câu hỏi
// ==========================================================
router.delete("/delete/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        if (deletedQuestion.imageUrl) {
            const fileName = deletedQuestion.imageUrl.replace('/uploads/', '');
            const filePath = path.join(process.cwd(), 'uploads', fileName);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(200).json({ message: "🗑️ Đã xóa câu hỏi vĩnh viễn!" });
    } catch (error) {
        console.error("Lỗi xóa:", error);
        res.status(500).json({ message: "Lỗi server khi xóa", error: error.message });
    }
});
    
export default router;