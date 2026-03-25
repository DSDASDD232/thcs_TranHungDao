import jwt from "jsonwebtoken";

// Hàm 1: Kiểm tra xem người dùng có mang theo Token hợp lệ không
export const verifyToken = (req, res, next) => {
    // Đọc token từ header của request
    const authHeader = req.header("Authorization");
    if (!authHeader) return res.status(401).json({ message: "Từ chối truy cập! Không tìm thấy Token." });

    try {
        // Token thường có chữ "Bearer " ở đầu, ta cắt bỏ chữ đó đi để lấy mã thực sự
        const token = authHeader.split(" ")[1]; 
        
        // Dùng chìa khóa bí mật để giải mã Token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Gắn thông tin (id, role) vừa giải mã được vào req để các hàm sau dùng
        req.user = verified; 
        next(); // Cho phép đi tiếp
    } catch (error) {
        res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
    }
};

// Hàm 2: Kiểm tra xem có phải là Giáo viên hoặc Admin không
export const isTeacherOrAdmin = (req, res, next) => {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Bạn không có quyền thêm câu hỏi!" });
    }
    next(); // Đúng quyền thì cho đi tiếp
};

export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Chỉ Admin mới có quyền xem thông tin này!" });
    }
    next();
};