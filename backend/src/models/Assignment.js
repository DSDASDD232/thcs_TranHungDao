import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
    {
        // Tên bài tập / Đề kiểm tra (VD: "Bài kiểm tra 15p Toán 9", "Bài tập về nhà tuần 1")
        title: {
            type: String,
            required: true,
            trim: true,
        },

        // [BỔ SUNG] Môn học (Để hiển thị đúng môn trên giao diện)
        subject: {
            type: String,
            required: true,
            default: "Toán",
        },

        // Lời dặn dò, mô tả của giáo viên (Tùy chọn)
        description: {
            type: String,
            default: "",
        },

        // Giáo viên giao bài (Lưu ID của giáo viên)
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Tham chiếu đến bảng User
            required: true,
        },

        // Giao cho lớp nào (VD: "9A1", "9A2")
        targetClass: {
            type: String,
            required: true,
        },

        // Danh sách các câu hỏi trong bài tập này 
        // Đây là một MẢNG chứa các ID trỏ về Thư viện câu hỏi (Bảng Question)
        questions: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                    required: true
                },
                points: {
                    type: Number,
                    required: true,
                    default: 1
                }
            }
        ],

        // Thời gian bắt đầu mở đề (Mặc định là ngay lúc tạo)
        startTime: {
            type: Date,
            default: Date.now,
        },

        // Hạn nộp bài (Deadline) - Rất quan trọng để khóa không cho học sinh nộp muộn
        dueDate: {
            type: Date,
            required: true,
        },

        // Thời gian làm bài (Tính bằng phút - dùng cho các bài kiểm tra bấm giờ)
        // Nếu chỉ là bài tập về nhà bình thường thì không cần điền
        duration: {
            type: Number, 
            default: null,
        },

        // [BỔ SUNG QUAN TRỌNG] Trạng thái bài tập
        status: {
            type: String,
            enum: ["draft", "published"], 
            default: "published" // Mặc định nếu không gửi gì thì là Đã giao
        }
    },
    { 
        timestamps: true // Tự động lưu ngày tạo (createdAt) và ngày cập nhật (updatedAt)
    }
);

export default mongoose.model("Assignment", assignmentSchema);