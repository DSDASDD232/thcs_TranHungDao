// Đường dẫn: backend/src/routes/questionSet.js
import express from 'express';
import QuestionSet from '../models/QuestionSet.js';
import Question from '../models/Question.js'; 
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// API 1: Tạo thư mục mới
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { setName, subject, grade } = req.body;
    const teacherId = req.user.id; 

    const finalSetName = setName ? setName.trim() : "";

    if (!finalSetName) {
        return res.status(400).json({ message: "Tên Kho câu hỏi không được để trống!" });
    }

    const existingSet = await QuestionSet.findOne({ setName: finalSetName, teacherId });
    if (existingSet) {
      return res.status(400).json({ message: "Tên Kho câu hỏi này đã tồn tại!" });
    }

    const newSet = new QuestionSet({ setName: finalSetName, subject, grade, teacherId });
    await newSet.save();

    res.status(201).json({ message: "Tạo kho thành công!", set: newSet });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo kho", error });
  }
});

// API 2: Lấy tất cả thư mục KÈM câu hỏi bên trong
router.get('/all', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // 1. Lấy tất cả thư mục của giáo viên này (Model QuestionSet dùng trường teacherId)
    const sets = await QuestionSet.find({ teacherId }).sort({ createdAt: -1 }).lean();
    
    // 👉 ĐÂY LÀ CHỖ VỪA FIX LỖI: Model Question của bạn dùng trường `teacher`
    // Sửa thành { teacher: teacherId, isBank: true }
    const allQuestions = await Question.find({ teacher: teacherId, isBank: true }).lean(); 

    // 3. Gom câu hỏi vào đúng thư mục
    const groupedSets = sets.map(set => {
       const questionsInSet = allQuestions.filter(q => 
           q.questionSet && q.questionSet.trim() === set.setName.trim()
       );
       
       return { ...set, questions: questionsInSet };
    });

    res.status(200).json({ groupedSets });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu kho", error });
  }
});

export default router;