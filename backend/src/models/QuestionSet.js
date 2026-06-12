import mongoose from 'mongoose';

const questionSetSchema = new mongoose.Schema({
  // Tên của Tập/Bộ câu hỏi
  examName: { 
    type: String, 
    required: true,
    trim: true // Tự động xóa khoảng trắng thừa ở 2 đầu
  },
  
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  
  // Học kỳ
  semester: {
    type: String,
    default: "1"
  },
  
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  // Tự động sinh ra 2 trường createdAt và updatedAt
  timestamps: true 
});

// Đảm bảo 1 giáo viên không tạo 2 tập câu hỏi trùng tên trong cùng 1 môn
questionSetSchema.index({ examName: 1, teacherId: 1, subject: 1 }, { unique: true });

export default mongoose.model('QuestionSet', questionSetSchema);