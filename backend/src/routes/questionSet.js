import express from 'express';
import QuestionSet from '../models/QuestionSet.js';
import Question from '../models/Question.js'; 
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// 1. LẤY TOÀN BỘ TẬP CÂU HỎI VÀ CÂU HỎI BÊN TRONG (CÓ THÔNG TIN NGƯỜI TẠO)
router.get('/all', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    const userRole = req.user.role; // Lấy role để xác định quyền hạn

    let setQuery = {};
    let questionQuery = {};

    // 👉 Yêu cầu 4: Cho phép GV thấy được kho câu hỏi của toàn trường (nếu muốn)
    // Nếu bạn muốn chia sẻ chung, bạn có thể comment lại các dòng giới hạn teacherId bên dưới.
    // Tạm thời mình giữ logic cũ: Ai tạo người nấy xem (Nếu muốn xem chung, đổi setQuery = {} là xong)
    // setQuery = { teacherId };
    // questionQuery = { teacher: teacherId };

    // Lấy danh sách Tập câu hỏi, KHÔNG THỂ THIẾU hàm populate('teacherId', 'fullName')
    const questionSets = await QuestionSet.find(setQuery)
        .populate('teacherId', 'fullName') // Móc nối sang bảng User/Teacher lấy Tên
        .sort({ createdAt: -1 })
        .lean();
    
    // Lấy toàn bộ câu hỏi tương ứng, cũng cần populate tên người tạo
    const allQuestions = await Question.find(questionQuery)
        .populate('teacher', 'fullName') // Móc nối sang bảng User/Teacher
        .lean(); 

    // Nhóm câu hỏi vào từng Tập và gán thông tin 'createdBy' để Frontend hiểu
    const groupedSets = questionSets.map(set => {
        const setQuestions = allQuestions.filter(q => String(q.questionSetId) === String(set._id));
        
        // Đóng gói lại đúng chuẩn Frontend đang kỳ vọng:
        // Đổi tên biến teacherId (sau khi đã có fullName) thành createdBy
        return { 
            ...set, 
            createdBy: set.teacherId, // Truyền Object { _id, fullName } ra
            questions: setQuestions.map(q => ({
               ...q,
               createdBy: q.teacher // Gán luôn người tạo cho câu hỏi (Mặc dù ít dùng tới do Frontend đã lấy của Tập)
            }))
        };
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

    // Populate ngay lúc trả về để bảng hiển thị liền tên GV
    await newSet.populate('teacherId', 'fullName');

    res.status(201).json({ 
        message: "Tạo Tập câu hỏi thành công!", 
        questionSet: { ...newSet.toObject(), createdBy: newSet.teacherId } 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo Tập", error: error.message });
  }
});

// 3. XÓA TẬP CÂU HỎI VÀ CÁC CÂU HỎI BÊN TRONG
router.delete('/delete-set/:id', verifyToken, async (req, res) => {
  try {
    const setId = req.params.id;
    
    // Nếu bạn muốn GV có thể XÓA bài của GV khác, hãy bỏ cái teacherId khỏi query này. 
    // Tuy nhiên, vì an toàn, thường chỉ ai tạo mới được xóa.
    // Tạm thời mình giữ quyền bảo vệ:
    const teacherId = req.user.id || req.user._id;
    const deletedSet = await QuestionSet.findOneAndDelete({ _id: setId, teacherId });
    
    if (!deletedSet) return res.status(404).json({ message: "Không tìm thấy Tập câu hỏi để xóa (hoặc bạn không có quyền)!" });
    
    // Xóa luôn các câu con bên trong
    await Question.deleteMany({ questionSetId: setId });
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

    // Đảm bảo tên mới không bị trùng với tập khác
    const existingSet = await QuestionSet.findOne({ _id: { $ne: setId }, examName: finalExamName, teacherId, subject });
    if (existingSet) return res.status(400).json({ message: "Tên Tập câu hỏi này đã tồn tại!" });

    const updatedSet = await QuestionSet.findOneAndUpdate(
        { _id: setId, teacherId }, // Điều kiện phải là người tạo
        { examName: finalExamName, subject, grade, semester },
        { new: true }
    ).populate('teacherId', 'fullName');

    if (!updatedSet) return res.status(404).json({ message: "Không tìm thấy Tập câu hỏi để sửa (hoặc bạn không có quyền)!" });

    // Đồng bộ thông tin mới cho TẤT CẢ câu hỏi bên trong
    await Question.updateMany(
        { questionSetId: setId },
        { examName: finalExamName, subject: subject, grade: grade, semester: semester }
    );

    res.status(200).json({ 
        message: "Cập nhật thành công!", 
        questionSet: { ...updatedSet.toObject(), createdBy: updatedSet.teacherId } 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi cập nhật", error: error.message });
  }
});

export default router;