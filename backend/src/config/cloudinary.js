import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình tài khoản
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình thư mục lưu trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'thcs_tranhungdao/uploads', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mp3', 'wav'], // 👉 THÊM FORMAT VIDEO/AUDIO
    resource_type: "auto", // 👉 QUAN TRỌNG: Cho phép Cloudinary tự nhận dạng cả Image và Video
  },
});

export const uploadCloud = multer({ storage });
export default cloudinary;