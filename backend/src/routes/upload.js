import express from 'express';
import { uploadCloud } from '../config/cloudinary.js';

const router = express.Router();

// API: POST /api/upload/editor
// Jodit Editor gửi ảnh trong field tên là 'files[0]'
router.post('/editor', uploadCloud.single('files[0]'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, msg: 'Không tìm thấy file' });
    }

    // req.file.path chính là đường link xịn từ Cloudinary (https://res.cloudinary.com/...)
    const fileUrl = req.file.path;
    
    // Trả về cho Jodit theo đúng format nó cần
    res.json({
      success: true,
      url: fileUrl,
      msg: 'Upload lên Cloudinary thành công'
    });
  } catch (error) {
    console.error("Lỗi upload Jodit:", error);
    res.status(500).json({ error: true, msg: 'Lỗi server upload' });
  }
});

export default router;