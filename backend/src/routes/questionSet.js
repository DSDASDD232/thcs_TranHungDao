import express from 'express';
import QuestionSet from '../models/QuestionSet.js';
import Question from '../models/Question.js'; 
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// 1. LẤY TOÀN BỘ TẬP CÂU HỎI VÀ CÂU HỎI BÊN TRONG
router.get('/all', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    const questionSets = await QuestionSet.find({ teacherId }).sort({ createdAt: -1 }).lean();
    
    // 👉 FIX Ở ĐÂY: Đổi { teacherId } thành { teacher: teacherId } cho khớp với Model Question
    const allQuestions = await Question.find({ teacher: teacherId }).lean(); 

    const groupedSets = questionSets.map(set => {
        const setQuestions = allQuestions.filter(q => String(q.questionSetId) === String(set._id));
        return { ...set, questions: setQuestions };
    });

    res.status(200).json({ groupedSets });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu", error: error.message });
  }
});

// 2. TẠO TẬP CÂU HỎI MỚI
router.post('/create-set', verifyToken, async (req, res) => {
  try {
    const { examName, subject, grade, semester } = req.body;
    const teacherId = req.user.id || req.user._id; 
    const finalExamName = examName ? examName.trim() : "";

    if (!finalExamName) return res.status(400).json({ message: "Tên Tập câu hỏi không được để trống!" });

    const existingSet = await QuestionSet.findOne({ examName: finalExamName, teacherId, subject });
    if (existingSet) return res.status(400).json({ message: "Tên Tập câu hỏi này đã tồn tại trong môn học!" });

    const newSet = new QuestionSet({ examName: finalExamName, subject, grade, semester: semester || "1", teacherId });
    await newSet.save();

    res.status(201).json({ message: "Tạo Tập câu hỏi thành công!", questionSet: newSet });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo Tập", error: error.message });
  }
});

// 3. XÓA TẬP CÂU HỎI VÀ CÁC CÂU HỎI BÊN TRONG
router.delete('/delete-set/:id', verifyToken, async (req, res) => {
  try {
    const setId = req.params.id;
    const teacherId = req.user.id || req.user._id;

    const deletedSet = await QuestionSet.findOneAndDelete({ _id: setId, teacherId });
    if (!deletedSet) return res.status(404).json({ message: "Không tìm thấy Tập câu hỏi để xóa!" });
    
    // 👉 FIX Ở ĐÂY NỮA: Đổi { teacherId } thành { teacher: teacherId }
    await Question.deleteMany({ questionSetId: setId, teacher: teacherId });
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa', error: error.message });
  }
});

// 4. SỬA THÔNG TIN TẬP CÂU HỎI
router.put('/update-set/:id', verifyToken, async (req, res) => {
  try {
    const setId = req.params.id;
    const teacherId = req.user.id || req.user._id;
    const { examName, subject, grade, semester } = req.body;
    const finalExamName = examName ? examName.trim() : "";

    if (!finalExamName) return res.status(400).json({ message: "Tên Tập câu hỏi không được để trống!" });

    // Đảm bảo tên mới không bị trùng với tập khác của GV này
    const existingSet = await QuestionSet.findOne({ _id: { $ne: setId }, examName: finalExamName, teacherId, subject });
    if (existingSet) return res.status(400).json({ message: "Tên Tập câu hỏi này đã tồn tại!" });

    const updatedSet = await QuestionSet.findOneAndUpdate(
        { _id: setId, teacherId },
        { examName: finalExamName, subject, grade, semester },
        { new: true }
    );
    if (!updatedSet) return res.status(404).json({ message: "Không tìm thấy Tập câu hỏi để sửa!" });

    // Đồng bộ tên Tập, Khối, Học kỳ, Môn mới cho TẤT CẢ câu hỏi bên trong
    await Question.updateMany(
        { questionSetId: setId },
        { examName: finalExamName, subject: subject, grade: grade, semester: semester }
    );

    res.status(200).json({ message: "Cập nhật thành công!", questionSet: updatedSet });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật", error: error.message });
  }
});

export default router;