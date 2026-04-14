import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        // Nội dung câu hỏi
        content: {
            type: String,
            required: true,
        },

        // Phân loại: Trắc nghiệm (multiple_choice) hoặc Tự luận (essay)
        type: {
            type: String,
            enum: ["multiple_choice", "essay"],
            required: true,
            default: "multiple_choice" // Mặc định là trắc nghiệm
        },

        // Mảng chứa các đáp án (Cách viết [String] sẽ gọn và chuẩn hơn cho Mongoose)
        options: [String],

        // Đáp án đúng
        correctAnswer: {
            type: String,
            required: true,
        },

        // Môn học (Toán, Ngữ Văn, Tiếng Anh...)
        subject: {
            type: String,
            required: true,
        },

        // Khối lớp (6, 7, 8, 9)
        grade: {
            type: String, 
            required: true,
            enum: ["6", "7", "8", "9"]
        },

        // Độ khó
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },

        // Đường dẫn ảnh (Lưu link từ thư mục /uploads/)
        imageUrl: {
            type: String,
            default: "" 
        },

        questionSet: { 
        type: String, 
        default: "Ngân hàng chung" 
        },
        
        // ĐỔI TÊN TỪ createdBy THÀNH teacher ĐỂ KHỚP VỚI FILE ROUTES
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
        },


        // Thêm dòng này vào trong Schema
        points: {
        type: Number,
         default: 0
            },


        isBank: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export default mongoose.model("Question", questionSchema);