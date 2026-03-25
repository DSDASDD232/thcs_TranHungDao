import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
      // Gọi API Backend
      const response = await axios.post("http://localhost:5001/api/auth/login", formData);
      
      // BÍ QUYẾT SỬA LỖI Ở ĐÂY: 
      // Dùng '?.' để lấy dữ liệu an toàn dù Backend trả về nằm thẳng ở ngoài hay bọc trong object 'user'
      const token = response.data.token;
      const role = response.data.role || response.data.user?.role;
      const fullName = response.data.fullName || response.data.user?.fullName || "Người dùng";

      // Lưu Token và thông tin vào localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", fullName);

      // Chuyển hướng chính xác dựa trên quyền (Role)
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "teacher") {
        navigate("/teacher-dashboard");
      } else {
        navigate("/student-dashboard");
      }

    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 p-4 font-sans">
      
      <Card className="w-full max-w-lg shadow-2xl rounded-xl border border-blue-100 bg-white/95 backdrop-blur-sm overflow-hidden">
        
        <CardHeader className="space-y-2 text-center bg-blue-100/50 pb-8 pt-10 border-b border-blue-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 border-4 border-white shadow-inner">
            <GraduationCap className="h-9 w-9 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-blue-900 tracking-tight pt-3">
            Hệ Thống Quản Lý Học Tập
          </CardTitle>
          <CardDescription className="text-base text-blue-700 font-medium px-6">
            Trường THCS Trần Hưng Đạo - Chào mừng bạn quay trở lại
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin} className="pt-6 px-2">
          <CardContent className="grid gap-6">
            {error && (
              <div className="text-sm font-semibold text-destructive bg-destructive/10 p-3 rounded-lg text-center border border-destructive/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 pl-1" htmlFor="username">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-blue-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập của bạn"
                  className="pl-12 h-12 text-base rounded-lg border-blue-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-400"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 pl-1" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-blue-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  className="pl-12 h-12 text-base rounded-lg border-blue-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-400"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pb-10 pt-4 px-6">
            <Button 
              className="w-full h-12 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-md focus:ring-2 focus:ring-blue-300 focus:ring-offset-2" 
              type="submit" 
              disabled={loading}
            >
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