import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
    {
        // Bài làm này thuộc về Đề thi/Bài tập nào?
        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assignment",
            required: true,
        },

        // Ai là người làm bài? (ID của Học sinh)
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Chi tiết bài làm: Lưu một mảng các câu trả lời của học sinh
        answers: [
            {
                // Trả lời cho câu hỏi nào?
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                    required: true,
                },
                // Đáp án học sinh chọn (Trắc nghiệm) hoặc gõ vào (Tự luận)
                studentAnswer: {
                    type: String,
                    default: "",
                },
                // Máy tự chấm xem câu này đúng hay sai (rất tiện để tính điểm)
                isCorrect: {
                    type: Boolean,
                    default: false,
                }
            }
        ],

        // Tổng điểm đạt được (Tính trên thang điểm 10)
        score: {
            type: Number,
            default: 0,
        },

        // Trạng thái bài làm (Dùng để phân biệt bài toàn trắc nghiệm máy chấm xong luôn, hay bài có tự luận phải chờ giáo viên chấm)
        status: {
            type: String,
            enum: ["submitted", "graded"], 
            default: "submitted",
        },

        // Lời phê của giáo viên
        feedback: {
            type: String,
            default: "",
        }
    },
    { 
        timestamps: true // Tự động tạo createdAt (chính là thời gian học sinh bấm Nộp bài)
    }
);

export default mongoose.model("Submission", submissionSchema);