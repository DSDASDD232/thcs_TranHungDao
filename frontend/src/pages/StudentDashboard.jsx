import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios"; // ĐÃ SỬA: Import axiosInstance
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
        
        // ĐÃ SỬA: Rút gọn các đường dẫn API
        // 1. Lấy thông tin cá nhân (Để biết học sinh thuộc Lớp nào)
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

        // Lọc bài tập: Tách ra Bài chưa làm và Bài đã làm
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2 rounded-xl"><BookOpen className="h-6 w-6 text-white" /></div>
            <span className="font-extrabold text-xl text-sky-950 hidden sm:block">Học Sinh Panel</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-bold text-slate-800 leading-tight">{fullName}</p>
              <p className="text-xs font-semibold text-sky-600">
                {profile?.classId?.name ? `Lớp ${profile.classId.name}` : profile?.className ? `Lớp ${profile.className}` : "Chưa phân lớp"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border-2 border-sky-200">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-rose-500 hover:bg-rose-50 rounded-xl px-3">
              <LogOut className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline font-bold">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        {/* HERO SECTION */}
        <div className="bg-sky-500 rounded-3xl p-8 sm:p-10 text-white shadow-lg shadow-sky-200 mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black mb-2">Chào {fullName.split(" ").pop()}! 👋</h1>
            <p className="text-sky-100 text-lg font-medium max-w-xl">
              Hôm nay bạn có <strong className="text-white bg-sky-600 px-2 py-0.5 rounded-lg">{pendingAssignments.length}</strong> bài tập cần hoàn thành. Hãy sắp xếp thời gian hợp lý nhé!
            </p>
          </div>
          {/* Họa tiết trang trí */}
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Trophy className="w-64 h-64" />
          </div>
        </div>

        {/* TABS CONTROLS */}
        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-sky-50 inline-flex">
          <Button 
            onClick={() => setActiveTab("pending")} 
            className={`rounded-xl px-6 h-12 font-bold transition-all ${activeTab === 'pending' ? 'bg-sky-100 text-sky-700 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <AlertCircle className="w-5 h-5 mr-2" /> Bài tập cần làm ({pendingAssignments.length})
          </Button>
          <Button 
            onClick={() => setActiveTab("completed")} 
            className={`rounded-xl px-6 h-12 font-bold transition-all ${activeTab === 'completed' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <History className="w-5 h-5 mr-2" /> Lịch sử điểm số ({completedAssignments.length})
          </Button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">Đang tải dữ liệu học tập...</p>
          </div>
        ) : (
          <>
            {/* TAB BÀI TẬP CẦN LÀM */}
            {activeTab === "pending" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingAssignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">Tuyệt vời!</h3>
                    <p className="text-slate-500 mt-1">Bạn đã hoàn thành tất cả bài tập được giao.</p>
                  </div>
                ) : (
                  pendingAssignments.map(assig => {
                    const status = getStatusColor(assig.dueDate);
                    const isOverdue = new Date(assig.dueDate) < new Date();
                    return (
                      <Card key={assig._id} className="rounded-3xl border-sky-100 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                        <CardHeader className="pb-3 border-b border-slate-50">
                          <div className="flex justify-between items-start mb-2">
                            <Badge className={`${status.bg} ${status.text} border-0 shadow-none font-bold px-3 py-1`}>
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold border-slate-200">
                              {assig.questions?.length || 0} Câu
                            </Badge>
                          </div>
                          <CardTitle className="text-xl font-black text-sky-950 leading-tight line-clamp-2">
                            {assig.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1">
                          <div className="space-y-3">
                            <div className="flex items-center text-sm font-semibold text-slate-600">
                              <Clock className="w-4 h-4 mr-2 text-sky-500" /> Thời gian làm bài: <span className="ml-1 text-slate-800">{assig.duration} phút</span>
                            </div>
                            <div className="flex items-center text-sm font-semibold text-slate-600">
                              <Calendar className="w-4 h-4 mr-2 text-amber-500" /> Hạn nộp: <span className="ml-1 text-slate-800">{new Date(assig.dueDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Button 
                            onClick={() => navigate(`/take-quiz/${assig._id}`)}
                            disabled={isOverdue}
                            className={`w-full h-12 rounded-xl font-black text-base shadow-sm ${isOverdue ? 'bg-slate-100 text-slate-400' : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200 transition-all active:scale-95'}`}
                          >
                            {isOverdue ? "Đã khóa" : <><PlayCircle className="w-5 h-5 mr-2" /> Bắt đầu làm bài</>}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedAssignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200">
                    <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Bạn chưa nộp bài tập nào.</p>
                  </div>
                ) : (
                  completedAssignments.map(sub => (
                    <Card key={sub._id} className="rounded-3xl border-emerald-100 shadow-sm bg-white overflow-hidden">
                      <div className="flex flex-row items-stretch">
                        {/* Cột Điểm */}
                        <div className="w-28 bg-emerald-50 border-r border-emerald-100 flex flex-col items-center justify-center p-4">
                          <span className="text-4xl font-black text-emerald-600 leading-none">{sub.score}</span>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mt-1">Điểm số</span>
                        </div>
                        {/* Cột Thông tin */}
                        <div className="flex-1 p-5 flex flex-col justify-center">
                          <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1">{sub.assignment?.title || "Bài tập đã xóa"}</h3>
                          <div className="flex items-center text-sm font-medium text-slate-500 mb-1">
                            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" /> Nộp lúc: {new Date(sub.createdAt).toLocaleString('vi-VN')}
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