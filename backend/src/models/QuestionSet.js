// Đường dẫn: backend/src/models/QuestionSet.js
import mongoose from 'mongoose';

const questionSetSchema = new mongoose.Schema({
  // Tên thư mục (Thay thế cho setName cũ)
  folderName: { type: String, required: true },
  
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  
  // Học kỳ
  semester: {
    type: String,
    default: "1"
  },
  
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Mảng chứa các Đề thi bên trong Thư mục này
  exams: [{
    examName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('QuestionSet', questionSetSchema);