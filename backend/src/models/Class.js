import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
    {
        // Tên lớp (VD: 8A, 9A1)
        name: {
            type: String,
            required: true,
        },
        // Thuộc khối nào
        grade: {
            type: String,
            required: true,
            enum: ["6", "7", "8", "9"],
        },
        // Năm học (VD: 2023-2024)
        academicYear: {
            type: String,
            required: true,
        },
        // (Tùy chọn) Lưu ID của giáo viên chủ nhiệm
        homeroomTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

// Đảm bảo không tạo trùng lớp trong cùng 1 năm học (VD: Không thể có 2 lớp 8A trong năm 23-24)
classSchema.index({ name: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Class", classSchema);