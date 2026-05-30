// Đường dẫn: backend/src/routes/questionSet.js
import express from 'express';
import QuestionSet from '../models/QuestionSet.js';
import Question from '../models/Question.js'; 
import { verifyToken } from '../middleware/auth.js'; 

const router = express.Router();

// ==========================================================
// 1. LẤY TOÀN BỘ THƯ MỤC, ĐỀ THI & CÂU HỎI (API: /all)
// ==========================================================
router.get('/all', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // 1. Lấy tất cả thư mục của giáo viên này
    const folders = await QuestionSet.find({ teacherId }).sort({ createdAt: -1 }).lean();
    
    // 2. Lấy tất cả câu hỏi của giáo viên (Đã lọc những câu trong kho isBank: true)
    const allQuestions = await Question.find({ teacher: teacherId, isBank: true }).lean(); 

    // 3. Gom câu hỏi vào đúng đề thi và thư mục
    const groupedSets = folders.map(folder => {
       // Quét qua các đề thi (exams) bên trong thư mục
       const examsWithQuestions = (folder.exams || []).map(exam => {
           // Lọc các câu hỏi khớp tên thư mục VÀ tên đề thi
           const examQuestions = allQuestions.filter(q => 
               q.folderName === folder.folderName && q.examName === exam.examName
           );
           
           return {
               ...exam,
               examName: exam.examName,
               questions: examQuestions
           };
       });
       
       return { 
           ...folder, 
           exams: examsWithQuestions 
       };
    });

    res.status(200).json({ groupedSets });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu kho", error: error.message });
  }
});

// ==========================================================
// 2. TẠO THƯ MỤC MỚI (API: /create-folder)
// ==========================================================
router.post('/create-folder', verifyToken, async (req, res) => {
  try {
    const { folderName, subject, grade, semester } = req.body;
    const teacherId = req.user.id; 

    const finalFolderName = folderName ? folderName.trim() : "";

    if (!finalFolderName) {
        return res.status(400).json({ message: "Tên Thư mục không được để trống!" });
    }

    const existingFolder = await QuestionSet.findOne({ folderName: finalFolderName, teacherId });
    if (existingFolder) {
      return res.status(400).json({ message: "Tên Thư mục này đã tồn tại!" });
    }

    // Tạo thư mục kèm mảng exams rỗng
    const newFolder = new QuestionSet({ 
        folderName: finalFolderName, 
        subject, 
        grade, 
        semester: semester || "1",
        teacherId,
        exams: [] 
    });
    
    await newFolder.save();

    res.status(201).json({ message: "Tạo Thư mục thành công!", folder: newFolder });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo Thư mục", error: error.message });
  }
});

// ==========================================================
// 3. TẠO ĐỀ THI MỚI BÊN TRONG THƯ MỤC (API: /create-exam)
// ==========================================================
router.post('/create-exam', verifyToken, async (req, res) => {
  try {
    const { folderName, examName } = req.body;
    const teacherId = req.user.id;
    
    const finalExamName = examName ? examName.trim() : "";
    if (!finalExamName) return res.status(400).json({ message: "Tên Đề thi không được để trống!" });

    // Tìm thư mục để kiểm tra
    const folder = await QuestionSet.findOne({ folderName, teacherId });
    if (!folder) return res.status(404).json({ message: "Không tìm thấy thư mục!" });

    // Kiểm tra xem đề thi đã tồn tại trong thư mục chưa
    const isExist = folder.exams.some(e => e.examName.toLowerCase() === finalExamName.toLowerCase());
    if (isExist) return res.status(400).json({ message: "Tên Đề thi này đã tồn tại trong thư mục!" });

    // Push đề thi mới vào mảng exams của thư mục
    folder.exams.push({ examName: finalExamName });
    await folder.save();

    res.status(201).json({ message: "Tạo Đề thi thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo Đề thi", error: error.message });
  }
});

// ==========================================================
// 4. XÓA THƯ MỤC (API: /delete-folder/:folderName)
// ==========================================================
router.delete('/delete-folder/:folderName', verifyToken, async (req, res) => {
  try {
    const { folderName } = req.params;
    const teacherId = req.user.id;

    // Xóa Thư mục trong Collection QuestionSet
    await QuestionSet.findOneAndDelete({ folderName, teacherId });
    
    // Xóa TẤT CẢ câu hỏi thuộc về Thư mục này
    await Question.deleteMany({ folderName, teacher: teacherId });
    
    res.json({ message: "Xóa Thư mục thành công" });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa Thư mục', error: error.message });
  }
});

// ==========================================================
// 5. XÓA ĐỀ THI (API: /delete-exam/:folderName/:examName)
// ==========================================================
router.delete('/delete-exam/:folderName/:examName', verifyToken, async (req, res) => {
  try {
    const { folderName, examName } = req.params;
    const teacherId = req.user.id;

    // Kéo (Pull) Đề thi ra khỏi mảng exams của Thư mục
    await QuestionSet.findOneAndUpdate(
      { folderName, teacherId },
      { $pull: { exams: { examName } } }
    );
    
    // Xóa TẤT CẢ câu hỏi thuộc về Đề thi này
    await Question.deleteMany({ folderName, examName, teacher: teacherId });
    
    res.json({ message: "Xóa Đề thi thành công" });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa Đề thi', error: error.message });
  }
});

export default router;