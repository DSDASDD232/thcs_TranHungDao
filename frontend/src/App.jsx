import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "./lib/axios";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TakeQuiz from "./pages/TakeQuiz";
import AdminDashboard from "./pages/AdminDashboard";
import CreateAssignment from "./pages/CreateAssignment";
import AssignmentGrades from "./pages/AssignmentGrades";
import QuestionBank from "./pages/QuestionBank";
import GradeStudent from "./pages/GradeStudent"; 
import StudentSubmissionDetail from "./pages/StudentSubmissionDetail"; 

const SessionHeartbeat = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/login") return;

    const pingSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await axios.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // Interceptor sẽ xử lý logout/redirect cho token không hợp lệ, khóa hoặc bị đổi quyền.
      }
    };

    pingSession();
    const timer = setInterval(pingSession, 5000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isActive = true;

    const validateSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.clear();
        if (isActive) {
          setIsAllowed(false);
          setIsChecking(false);
        }
        return;
      }

      try {
        await axios.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isActive) {
          setIsAllowed(true);
          setIsChecking(false);
        }
      } catch (error) {
        localStorage.clear();
        if (isActive) {
          setIsAllowed(false);
          setIsChecking(false);
        }
      }
    };

    setIsChecking(true);
    setIsAllowed(false);
    validateSession();

    return () => {
      isActive = false;
    };
  }, [location.pathname]);

  if (isChecking) return null;
  if (!isAllowed) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <Router>
      <SessionHeartbeat />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Mặc định nếu vào trang chủ sẽ tự chuyển sang trang Login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Các trang Dashboard */}
        <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/teacher-dashboard" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        
        {/* Trang Học sinh làm bài */}
        <Route path="/take-quiz/:id" element={<ProtectedRoute><TakeQuiz /></ProtectedRoute>} />
        
        {/* Nhóm trang Giáo viên quản lý bài tập */}
        <Route path="/teacher/create-assignment" element={<ProtectedRoute><CreateAssignment /></ProtectedRoute>} />
        <Route path="/teacher/edit-assignment/:id" element={<ProtectedRoute><CreateAssignment /></ProtectedRoute>} />
        
        {/* TRANG DANH SÁCH NỘP BÀI CỦA 1 BÀI TẬP */}
        <Route path="/teacher/assignment/:id/grades" element={<ProtectedRoute><AssignmentGrades /></ProtectedRoute>} />
        <Route path="/teacher/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
        {/* [MỚI THÊM] TRANG CHẤM ĐIỂM CHI TIẾT CỦA 1 HỌC SINH */}
        <Route path="/teacher/grade/:id" element={<ProtectedRoute><GradeStudent /></ProtectedRoute>} />
        <Route path="/student/submission/:id" element={<ProtectedRoute><StudentSubmissionDetail /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;