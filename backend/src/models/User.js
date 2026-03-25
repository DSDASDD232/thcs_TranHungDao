import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        // Tên đăng nhập (VD: mã học sinh, mã giáo viên)
        username: {
            type: String,
            required: true, // Bắt buộc phải có
            unique: true,   // Không được trùng lặp
            trim: true,     // Tự động xóa khoảng trắng ở 2 đầu
        },
        
        // Mật khẩu (Sau này sẽ phải mã hóa trước khi lưu)
        password: {
            type: String,
            required: true,
        },
        
        // Họ và tên người dùng (Ví dụ: Dương Thị Sơi)
        fullName: {
            type: String,
            required: true,
        },
        
        // Phân quyền: Cực kỳ quan trọng để chia luồng Admin/Giáo viên/Học sinh
        role: {
            type: String,
            enum: ["admin", "teacher", "student"], // Chỉ được phép nhập 1 trong 3 giá trị này
            default: "student", // Nếu không truyền role, mặc định sẽ là học sinh
            required: true,
        },

        // --- CÁC TRƯỜNG THÔNG TIN MỞ RỘNG TÙY THEO ROLE ---
        
        // Dành cho Học sinh (Lưu Khối, ví dụ: "6", "7", "8", "9")
        grade: {
            type: String,
            enum: ["6", "7", "8", "9", ""], // Giới hạn chặt chẽ các khối cấp 2
            default: "",
        },

        // Dành cho Học sinh (Liên kết khóa ngoại tới bảng Class - Quản lý lớp chuyên sâu)
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            default: null
        },

        // Dành cho Học sinh (Giữ lại tạm thời để tương thích ngược với code cũ, sau này sẽ bỏ)
        className: {
            type: String,
            default: "",
        },
        
        // Dành cho Giáo viên (Lưu môn giảng dạy, ví dụ: "Toán", "Ngữ Văn")
        subject: {
            type: String,
            default: "",
        },
        assignedClasses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class"
        }]
    },
    { 
        timestamps: true 
    }
);

// Tạo model từ schema và export để dùng ở các file khác
const User = mongoose.model("User", userSchema);

export default User;