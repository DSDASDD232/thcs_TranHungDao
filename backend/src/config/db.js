import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Cấu hình để lấy đường dẫn thư mục hiện tại (Dành cho ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TỰ ĐỘNG TÌM FILE .ENV: 
// Thử tìm ở thư mục gốc dự án hoặc thư mục backend
dotenv.config({ path: path.join(__dirname, "../../.env") }); 

export const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_CONNECTIONSTRING;

        // Kiểm tra nếu biến môi trường bị trống
        if (!uri) {
            throw new Error("Biến MONGODB_CONNECTIONSTRING chưa được định nghĩa trong file .env!");
        }

        await mongoose.connect(uri);
        console.log("✅ Liên kết CSDL thành công!");
    } catch (error) {
        console.error("❌ Lỗi khi kết nối CSDL:", error.message);
        // Không thoát tiến trình ngay lập tức nếu đang build, 
        // nhưng thoát nếu đang chạy server thật
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
    }
};