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
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ==========================================================
// 1. [POST] Thêm câu hỏi mới (BẢN FIX LỖI 500)
// ==========================================================
router.post("/add", verifyToken, isTeacherOrAdmin, upload.single("image"), async (req, res) => {
    try {
        const { content, subject, difficulty, grade, options, correctAnswer } = req.body;

        // BẢO VỆ 1: Kiểm tra xem các trường bắt buộc có bị trống không
        if (!content || !options || !correctAnswer) {
            return res.status(400).json({ message: "Thiếu thông tin câu hỏi, đáp án hoặc nội dung!" });
        }

        // BẢO VỆ 2: Xử lý Parse JSON cho options một cách an toàn
        let parsedOptions;
        try {
            parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
            if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
                throw new Error("Options phải là một mảng ít nhất 2 đáp án");
            }
        } catch (e) {
            console.error("Lỗi Parse Options:", e.message);
            return res.status(400).json({ message: "Định dạng danh sách đáp án không hợp lệ!" });
        }

        // Xử lý ảnh
        let finalImageUrl = "";
        if (req.file) {
            finalImageUrl = `/uploads/${req.file.filename}`;
        }

        const newQuestion = new Question({
            content,
            subject,
            difficulty,
            grade: grade || "6",
            options: parsedOptions,
            correctAnswer,
            imageUrl: finalImageUrl, 
            teacher: req.user.id
        });

        await newQuestion.save();
        res.status(201).json({ message: "✅ Đã thêm câu hỏi thành công!", question: newQuestion });

    } catch (error) {
        console.error("LỖI BACKEND CHI TIẾT:", error);
        res.status(500).json({ message: "Lỗi server hệ thống", error: error.message });
    }
});

// ==========================================================
// 2. [GET] Lấy toàn bộ câu hỏi
// ==========================================================
router.get("/all", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const questions = await Question.find()
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
// 3. [PUT] Cập nhật câu hỏi
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
// 4. [DELETE] Xóa câu hỏi (Fix đường dẫn xóa file vật lý)
// ==========================================================
router.delete("/delete/:id", verifyToken, isTeacherOrAdmin, async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) return res.status(404).json({ message: "Không tìm thấy câu hỏi!" });

        // Xóa file ảnh trong thư mục uploads để tránh đầy rác máy chủ
        if (deletedQuestion.imageUrl) {
            // Chuyển /uploads/abc.jpg thành đường dẫn tuyệt đối trên máy tính
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