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
                // Phân loại để dễ lọc ra câu nào máy chấm, câu nào người chấm
                type: {
                    type: String,
                    enum: ["multiple_choice", "essay"],
                    default: "multiple_choice",
                },
                // Đáp án học sinh chọn (A,B,C,D) hoặc nội dung text tự luận
                studentAnswer: {
                    type: String,
                    default: "",
                },
                // [MỚI] Ảnh học sinh upload cho câu tự luận
                studentImage: {
                    type: String,
                    default: "",
                },
                // Máy tự chấm xem câu này đúng hay sai (Dành cho trắc nghiệm)
                isCorrect: {
                    type: Boolean,
                    default: false,
                },
                // [MỚI] Điểm đạt được của riêng câu này
                pointsAwarded: {
                    type: Number,
                    default: 0,
                },
                // [MỚI] Điểm tối đa của câu này (Copy từ Assignment sang để dễ tính toán)
                maxPoints: {
                    type: Number,
                    default: 0,
                }
            }
        ],

        // Tổng điểm đạt được (Tính trên thang điểm 10)
        score: {
            type: Number,
            default: 0,
        },

        // [SỬA] Thêm trạng thái pending (Chờ chấm)
        status: {
            type: String,
            enum: ["submitted", "pending", "graded"], 
            // submitted: Đã nộp
            // pending: Có câu tự luận, đang chờ giáo viên vào chấm ảnh
            // graded: Đã có điểm chính thức
            default: "submitted",
        },

        // Lời phê của giáo viên cho toàn bài
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