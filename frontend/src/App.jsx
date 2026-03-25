import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TakeQuiz from "./pages/TakeQuiz";
import AdminDashboard from "./pages/AdminDashboard";
import ViewGrades from "./pages/ViewGrades";
import CreateAssignment from "./pages/CreateAssignment";

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
        
        {/* ĐÃ FIX LỖI Ở ĐÂY: Đổi từ /quiz/:id thành /take-quiz/:id */}
        <Route path="/take-quiz/:id" element={<TakeQuiz />} />
        
        <Route path="/teacher/assignment/:assignmentId/grades" element={<ViewGrades />} />

        <Route path="/teacher/create-assignment" element={<CreateAssignment />} />
      </Routes>
    </Router>
  );
}

export default App;