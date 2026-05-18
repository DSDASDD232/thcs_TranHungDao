import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // 👉 THÊM TRƯỜNG NÀY: Để lưu môn học này thuộc Tổ nào (KHTN hay KHXH)
    department: {
        type: String,
        enum: ["KHTN", "KHXH"], 
        required: true
    }
}, { timestamps: true });

export default mongoose.model("Subject", subjectSchema);