import axios from "axios";

const axiosInstance = axios.create({
    // Khi chạy dưới máy (Local) là localhost, khi lên Render sẽ là link Render của bạn
    baseURL: import.meta.env.MODE === "development" 
        ? "http://localhost:5001/api" 
        : "/api", 
    withCredentials: true, // Quan trọng để gửi Cookie/Token xác thực
});

export default axiosInstance;