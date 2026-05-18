import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Loader2, GraduationCap } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/auth/login", formData);
      
      const token = response.data.token;
      const role = response.data.role || response.data.user?.role;
      const fullName = response.data.fullName || response.data.user?.fullName || "Người dùng";

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", fullName);

      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "teacher") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }

    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 p-4 font-sans">
      {/* 👉 GHI CHÚ CHỈNH MÀU: Nền tổng của trang Đăng nhập (bg-blue-50) ở thẻ div trên */}
      
      <Card className="w-full max-w-lg shadow-2xl rounded-xl border border-blue-100 bg-white/95 backdrop-blur-sm overflow-hidden">
        {/* 👉 GHI CHÚ CHỈNH MÀU: Nền khung Card đăng nhập (bg-white/95), Viền (border-blue-100) ở thẻ Card trên */}
        
        <CardHeader className="space-y-2 text-center bg-blue-100/50 pb-8 pt-10 border-b border-blue-100">
          {/* 👉 GHI CHÚ CHỈNH MÀU: Nền phần Header chứa Tiêu đề (bg-blue-100/50), Viền dưới (border-blue-100) ở CardHeader trên */}
          
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 border-4 border-white shadow-inner">
            {/* 👉 GHI CHÚ CHỈNH MÀU: Nền (bg-blue-100) và Viền (border-white) của vòng tròn bọc Icon ở thẻ div trên */}
            <GraduationCap className="h-9 w-9 text-blue-600" />
            {/* 👉 GHI CHÚ CHỈNH MÀU: Màu Icon mũ tốt nghiệp (text-blue-600) ở thẻ GraduationCap trên */}
          </div>
          
          <CardTitle className="text-3xl font-extrabold text-blue-900 tracking-tight pt-3">
            {/* 👉 GHI CHÚ CHỈNH MÀU: Chữ Tiêu đề "Hệ Thống Quản Lý Học Tập" (text-blue-900) ở thẻ CardTitle trên */}
            Hệ Thống Quản Lý Học Tập
          </CardTitle>
          
          <CardDescription className="text-base text-blue-700 font-medium px-6">
            {/* 👉 GHI CHÚ CHỈNH MÀU: Chữ Mô tả phụ (text-blue-700) ở thẻ CardDescription trên */}
            Trường THCS Trần Hưng Đạo - Chào mừng bạn quay trở lại
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin} className="pt-6 px-2">
          <CardContent className="grid gap-6">
            {error && (
              <div className="text-sm font-semibold text-destructive bg-destructive/10 p-3 rounded-lg text-center border border-destructive/20">
                {/* 👉 GHI CHÚ CHỈNH MÀU: Khung báo lỗi (text-destructive, bg-destructive/10, border-destructive/20) ở thẻ div trên */}
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 pl-1" htmlFor="username">
                {/* 👉 GHI CHÚ CHỈNH MÀU: Chữ nhãn "Tên đăng nhập" (text-blue-900) ở thẻ label trên */}
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-blue-400" />
                {/* 👉 GHI CHÚ CHỈNH MÀU: Icon User trong ô nhập (text-blue-400) ở thẻ User trên */}
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập của bạn"
                  className="pl-12 h-12 text-base rounded-lg border-blue-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-400"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
                {/* 👉 GHI CHÚ CHỈNH MÀU: Viền ô nhập Tên đăng nhập (border-blue-200), Viền lúc Click (focus:border-blue-400), Viền sáng mờ (focus:ring-blue-100) ở thẻ Input trên */}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 pl-1" htmlFor="password">
                {/* 👉 GHI CHÚ CHỈNH MÀU: Chữ nhãn "Mật khẩu" (text-blue-900) ở thẻ label trên */}
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-blue-400" />
                {/* 👉 GHI CHÚ CHỈNH MÀU: Icon Ổ khóa trong ô nhập (text-blue-400) ở thẻ Lock trên */}
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  className="pl-12 h-12 text-base rounded-lg border-blue-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-400"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                {/* 👉 GHI CHÚ CHỈNH MÀU: Viền ô nhập Mật khẩu (border-blue-200), Viền lúc Click (focus:border-blue-400), Viền sáng mờ (focus:ring-blue-100) ở thẻ Input trên */}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pb-10 pt-4 px-6">
            <Button 
              className="w-full h-12 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-md focus:ring-2 focus:ring-blue-300 focus:ring-offset-2" 
              type="submit" 
              disabled={loading}
            >
              {/* 👉 GHI CHÚ CHỈNH MÀU: Nền nút Đăng nhập (bg-blue-600), Nền khi trỏ chuột (hover:bg-blue-700), Viền sáng mờ lúc click (focus:ring-blue-300) ở thẻ Button trên */}
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đăng nhập vào hệ thống"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;