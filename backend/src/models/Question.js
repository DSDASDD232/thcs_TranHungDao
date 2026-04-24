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
            default: "multiple_choice"
        },

        // Mảng chứa các đáp án (dành cho trắc nghiệm)
        options: [String],

        // Đáp án đúng (Chỉ bắt buộc điền nếu là câu trắc nghiệm)
        correctAnswer: {
            type: String,
            required: function() {
                return this.type === "multiple_choice";
            },
        },

        // Đáp án tự luận dạng chữ
        essayAnswerText: {
            type: String,
            default: ""
        },

        // Đáp án tự luận dạng ảnh (Ảnh phụ)
        essayAnswerImageUrl: {
            type: String,
            default: ""
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

        // Đường dẫn ảnh đề bài (Ảnh chính)
        imageUrl: {
            type: String,
            default: "" 
        },

        // Phân loại bộ đề trong kho
        questionSet: { 
            type: String, 
            default: "Ngân hàng chung" 
        },
        
        // Người tạo (Giáo viên)
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
        },

        // Điểm số của câu hỏi
        points: {
            type: Number,
            default: 0
        },

        // Đánh dấu câu hỏi này có nằm trong Kho vĩnh viễn hay không
        isBank: { 
            type: Boolean, 
            default: false 
        }
    },
    { timestamps: true }
);

export default mongoose.model("Question", questionSchema);