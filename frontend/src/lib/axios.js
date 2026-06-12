import axios from "axios";

const axiosInstance = axios.create({
    // Khi chạy dưới máy (Local) là localhost, khi lên Render sẽ là link Render của bạn
    baseURL: import.meta.env.MODE === "development" 
        ? "http://localhost:5001/api" 
        : "/api", 
    withCredentials: true, // Quan trọng để gửi Cookie/Token xác thực
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const message = String(error?.response?.data?.message || "");
        const shouldForceLogout =
            status === 401 ||
            (status === 403 && /khóa|đăng nhập|token/i.test(message));

        if (shouldForceLogout) {
            const currentPath = window.location.pathname;
            if (currentPath !== "/login") {
                localStorage.clear();
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;