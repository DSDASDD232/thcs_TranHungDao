// Đường dẫn: backend/src/models/QuestionSet.js
import mongoose from 'mongoose';

const questionSetSchema = new mongoose.Schema({
  setName: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('QuestionSet', questionSetSchema);