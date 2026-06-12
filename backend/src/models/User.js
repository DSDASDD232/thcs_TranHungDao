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
        
        // Dành cho Giáo viên (Cũ: Lưu môn giảng dạy đơn lẻ)
        subject: {
            type: String,
            default: "",
        },

        // =========================================================================
        // 👉 THÊM MỚI: PHÂN BỔ TỔ CHUYÊN MÔN LỚN VÀ ĐA MÔN HỌC CHO GIÁO VIÊN
        // =========================================================================
        
        // Lưu Tổ lớn: Chỉ nhận giá trị "KHTN", "KHXH" hoặc trống ""
        department: {
            type: String,
            enum: ["KHTN", "KHXH", ""],
            default: "",
        },

        // Lưu danh sách nhiều môn học giảng dạy dưới dạng mảng các chuỗi text
        // Ví dụ: ["Toán", "Tin học", "Công nghệ"]
        subjects: {
            type: [String],
            default: [],
        },

        // Trình độ chuyên môn của giáo viên
        qualification: {
            type: String,
            enum: ["Đại học", "Thạc sĩ", "Tiến sĩ", ""],
            default: "",
        },

        // Chức vụ trong tổ (KHTN / KHXH): Tổ trưởng, Tổ phó, Giáo viên thường
        departmentPosition: {
            type: String,
            enum: ["Tổ trưởng", "Tổ phó", "Giáo viên thường", ""],
            default: "Giáo viên thường",
        },
        // =========================================================================
        
        // Dành cho giáo viên (Danh sách các lớp được phân công giảng dạy)
        assignedClasses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class"
        }],

        // Trạng thái chung của tài khoản (chủ yếu dùng cho học sinh)
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        // Thông tin liên lạc chung
        phone: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },

        // Ghi chú hồ sơ dùng cho quản lý tài khoản
        note: {
            type: String,
            default: "",
        },

        // Trạng thái khóa tài khoản (Cấm đăng nhập)
        isLocked: {
            type: Boolean,
            default: false, // Mặc định tài khoản mới tạo sẽ không bị khóa
        },
        // Mỗi lần admin thay đổi thông tin tài khoản, token phiên cũ sẽ bị vô hiệu hóa
        tokenVersion: {
            type: Number,
            default: 0,
        },
        // 👉 THÊM MỚI: Dành cho Admin ghi đè điểm thi đua của học sinh
        leaderboardOverride: {
            totalTests: { type: Number, default: null },
            averageScore: { type: Number, default: null },
            note: { type: String, default: "" },
            appliedAt: { type: Date, default: null },
            scopeType: { type: String, enum: ["year", "month", "semester", ""], default: "" },
            scopeYear: { type: String, default: "" },
            scopeMonth: { type: String, default: "" },
            scopeSemester: { type: String, default: "" },
            // Cờ để biết liệu điểm này có bị ghi đè thủ công hay không
            isOverridden: { type: Boolean, default: false },
        }
    },
    { 
        timestamps: true 
    }
);

// Tạo model từ schema và export để dùng ở các file khác
const User = mongoose.model("User", userSchema);

export default User;