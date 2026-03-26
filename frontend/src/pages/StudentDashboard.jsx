import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, LogOut, Clock, CheckCircle2, AlertCircle, 
  PlayCircle, Trophy, History, Calendar, Loader2 
} from "lucide-react";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Học sinh";
  
  const [activeTab, setActiveTab] = useState("pending"); // pending, completed
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Lấy thông tin cá nhân
        const profileRes = await axios.get("/auth/me", config).catch(() => null);
        if (profileRes && profileRes.data) {
          setProfile(profileRes.data);
        }

        // 2. Lấy danh sách Bài tập và Bài làm
        const [assignmentsRes, submissionsRes] = await Promise.all([
          axios.get("/assignments/student", config).catch(() => ({ data: [] })),
          axios.get("/submissions/my-submissions", config).catch(() => ({ data: [] }))
        ]);

        const allAssignments = assignmentsRes.data.assignments || assignmentsRes.data || [];
        const mySubmissions = submissionsRes.data.submissions || submissionsRes.data || [];

        // Lọc bài tập
        const submittedAssignmentIds = mySubmissions.map(sub => sub.assignment?._id || sub.assignment);
        const pending = allAssignments.filter(a => !submittedAssignmentIds.includes(a._id));
        
        setPendingAssignments(pending);
        setCompletedAssignments(mySubmissions);

      } catch (error) {
        console.error("Lỗi tải dữ liệu học sinh:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getStatusColor = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due - now) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { bg: "bg-rose-50", text: "text-rose-600", label: "Đã quá hạn" };
    if (diffHours < 24) return { bg: "bg-amber-50", text: "text-amber-600", label: "Sắp hết hạn" };
    return { bg: "bg-sky-50", text: "text-sky-600", label: "Đang mở" };
  };

  return (
    <div className="min-h-screen bg-sky-50/40 font-sans text-slate-800">
      {/* HEADER / NAVBAR */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-sky-500 p-2 rounded-xl"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" /></div>
            <span className="font-extrabold text-lg sm:text-xl text-sky-950 truncate max-w-[120px] sm:max-w-none">Học Sinh Panel</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-800 leading-tight">{fullName}</p>
              <p className="text-xs font-semibold text-sky-600">
                {profile?.classId?.name ? `Lớp ${profile.classId.name}` : profile?.className ? `Lớp ${profile.className}` : "Chưa phân lớp"}
              </p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border-2 border-sky-200 shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 rounded-xl sm:w-auto sm:px-3 sm:py-2">
              <LogOut className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline font-bold">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        {/* HERO SECTION */}
        <div className="bg-sky-500 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-lg shadow-sky-200 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">Chào {fullName.split(" ").pop()}! 👋</h1>
            <p className="text-sky-100 text-sm sm:text-base lg:text-lg font-medium max-w-xl leading-relaxed">
              Hôm nay bạn có <strong className="text-white bg-sky-600 px-2 py-0.5 rounded-lg mx-1">{pendingAssignments.length}</strong> bài tập cần hoàn thành. Hãy sắp xếp thời gian hợp lý nhé!
            </p>
          </div>
          {/* Họa tiết trang trí */}
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48 sm:w-64 sm:h-64" />
          </div>
        </div>

        {/* TABS CONTROLS RESPONSIVE */}
        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-sky-50 w-full sm:w-max overflow-x-auto no-scrollbar">
          <Button 
            onClick={() => setActiveTab("pending")} 
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200' : 'bg-transparent text-slate-500 hover:bg-slate-50 shadow-none'}`}
          >
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> <span className="text-sm sm:text-base">Cần làm ({pendingAssignments.length})</span>
          </Button>
          <Button 
            onClick={() => setActiveTab("completed")} 
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === 'completed' ? 'bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-200' : 'bg-transparent text-slate-500 hover:bg-slate-50 shadow-none'}`}
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> <span className="text-sm sm:text-base">Lịch sử ({completedAssignments.length})</span>
          </Button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold text-sm sm:text-base">Đang tải dữ liệu học tập...</p>
          </div>
        ) : (
          <>
            {/* TAB BÀI TẬP CẦN LÀM */}
            {activeTab === "pending" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pendingAssignments.length === 0 ? (
                  <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200 px-4">
                    <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-700">Tuyệt vời!</h3>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Bạn đã hoàn thành tất cả bài tập được giao.</p>
                  </div>
                ) : (
                  pendingAssignments.map(assig => {
                    const status = getStatusColor(assig.dueDate);
                    const isOverdue = new Date(assig.dueDate) < new Date();
                    return (
                      <Card key={assig._id} className="rounded-3xl border-sky-100 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                        <CardHeader className="pb-3 border-b border-slate-50 p-5 sm:p-6">
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <Badge className={`${status.bg} ${status.text} border-0 shadow-none font-bold px-3 py-1 text-xs whitespace-nowrap`}>
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold border-slate-200 text-xs whitespace-nowrap shrink-0">
                              {assig.questions?.length || 0} Câu
                            </Badge>
                          </div>
                          <CardTitle className="text-lg sm:text-xl font-black text-sky-950 leading-snug line-clamp-2">
                            {assig.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 px-5 sm:px-6 flex-1">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center text-xs sm:text-sm font-semibold text-slate-600">
                              <Clock className="w-4 h-4 mr-2 text-sky-500 shrink-0" /> Thời gian: <span className="ml-1 text-slate-800">{assig.duration} phút</span>
                            </div>
                            <div className="flex items-start text-xs sm:text-sm font-semibold text-slate-600">
                              <Calendar className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" /> <span className="shrink-0">Hạn nộp:</span> <span className="ml-1 text-slate-800 line-clamp-1">{new Date(assig.dueDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 pb-5 px-5 sm:px-6">
                          <Button 
                            onClick={() => navigate(`/take-quiz/${assig._id}`)}
                            disabled={isOverdue}
                            className={`w-full h-11 sm:h-12 rounded-xl font-black text-sm sm:text-base shadow-sm ${isOverdue ? 'bg-slate-100 text-slate-400' : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200 transition-all active:scale-95'}`}
                          >
                            {isOverdue ? "Đã khóa" : <><PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Bắt đầu làm bài</>}
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB LỊCH SỬ ĐIỂM SỐ */}
            {activeTab === "completed" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {completedAssignments.length === 0 ? (
                  <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200 px-4">
                    <History className="w-14 h-14 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-sm sm:text-base">Bạn chưa nộp bài tập nào.</p>
                  </div>
                ) : (
                  completedAssignments.map(sub => (
                    <Card key={sub._id} className="rounded-2xl sm:rounded-3xl border-emerald-100 shadow-sm bg-white overflow-hidden">
                      <div className="flex flex-row items-stretch h-full">
                        {/* Cột Điểm */}
                        <div className="w-20 sm:w-28 bg-emerald-50 border-r border-emerald-100 flex flex-col items-center justify-center p-3 sm:p-4 shrink-0">
                          <span className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">{sub.score}</span>
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-wider mt-1 text-center">Điểm số</span>
                        </div>
                        {/* Cột Thông tin */}
                        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-slate-800 mb-1 sm:mb-2 truncate" title={sub.assignment?.title || "Bài tập đã xóa"}>
                            {sub.assignment?.title || "Bài tập đã xóa"}
                          </h3>
                          <div className="flex items-center text-xs sm:text-sm font-medium text-slate-500">
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-emerald-500 shrink-0" /> 
                            <span className="truncate">Nộp lúc: {new Date(sub.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;