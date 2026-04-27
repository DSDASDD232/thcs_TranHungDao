import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Mặc định nếu vào trang chủ sẽ tự chuyển sang trang Login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Các trang Dashboard */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        
        {/* Trang Học sinh làm bài */}
        <Route path="/take-quiz/:id" element={<TakeQuiz />} />
        
        {/* Nhóm trang Giáo viên quản lý bài tập */}
        <Route path="/teacher/create-assignment" element={<CreateAssignment />} />
        <Route path="/teacher/edit-assignment/:id" element={<CreateAssignment />} />
        
        {/* TRANG DANH SÁCH NỘP BÀI CỦA 1 BÀI TẬP */}
        <Route path="/teacher/assignment/:id/grades" element={<AssignmentGrades />} />
        <Route path="/teacher/question-bank" element={<QuestionBank />} />
        {/* [MỚI THÊM] TRANG CHẤM ĐIỂM CHI TIẾT CỦA 1 HỌC SINH */}
        <Route path="/teacher/grade/:id" element={<GradeStudent />} />
        <Route path="/student/submission/:id" element={<StudentSubmissionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;