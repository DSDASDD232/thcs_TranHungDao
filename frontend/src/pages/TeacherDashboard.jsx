import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, FileQuestion, LogOut, CheckSquare, School,
  Loader2, PlusCircle, Eye, Trash2, Pencil,
  Search, Filter, Image as ImageIcon, UploadCloud, X,
  Settings, Users, Download, BarChart, UserCircle, Trophy, Medal,
  CheckCircle2, Sparkles, Calendar 
} from "lucide-react";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const fullName = localStorage.getItem("fullName") || "Giáo viên";

  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  const [activeTab, setActiveTab] = useState("my-classes"); 
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]); 

  const [isSelectClassDialogOpen, setIsSelectClassDialogOpen] = useState(false); 
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [selectedLeaderboardClass, setSelectedLeaderboardClass] = useState("");
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState("all");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  const initialQuestionState = { content: "", subject: "Toán", type: "multiple_choice", difficulty: "medium", grade: "6", optA: "", optB: "", optC: "", optD: "", correctAnswer: "A" };
  const [newQuestion, setNewQuestion] = useState(initialQuestionState);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(initialQuestionState);

  const getHeader = (isMultipart = false) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    return { headers };
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const config = getHeader();
      if (!config.headers.Authorization.split(" ")[1]) return navigate("/login");
      
      const [profRes, classRes, questionsRes, assignmentsRes] = await Promise.all([
        axios.get("/teacher/me", config),
        axios.get("/classes/all", config),
        axios.get("/questions/all", config),
        axios.get("/assignments/my-assignments", config)
      ]);
      
      setTeacherProfile(profRes.data);
      if (profRes.data.assignedClasses) setSelectedClassIds(profRes.data.assignedClasses.map(c => c._id || c));
      setAllClasses(classRes.data.classes || []);
      setQuestions(questionsRes.data?.questions || []);
      setAssignments(assignmentsRes.data?.assignments || []);
    } catch (error) { 
      console.error("Lỗi tải dữ liệu:", error); 
    } finally { 
      setIsLoadingData(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchLeaderboard = async (classId, timeFilter) => {
      if (!classId) return;
      setIsLoadingLeaderboard(true);
      try {
        const res = await axios.get(`/submissions/class/${classId}/leaderboard?timeframe=${timeFilter}`, getHeader());
        setLeaderboardData(res.data.leaderboard || []);
      } catch (error) { 
        setLeaderboardData([]); 
      } finally { 
        setIsLoadingLeaderboard(false); 
      }
    };
    if (activeTab === "leaderboard" && selectedLeaderboardClass) {
        fetchLeaderboard(selectedLeaderboardClass, leaderboardTimeFilter);
    }
  }, [activeTab, selectedLeaderboardClass, leaderboardTimeFilter]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const handleSaveMyClasses = async () => {
    setLoading(true);
    try {
      await axios.put("/teacher/my-classes", { assignedClasses: selectedClassIds }, getHeader());
      alert("✅ Đã cập nhật danh sách quản lý lớp thành công!");
      setIsSelectClassDialogOpen(false); 
      fetchData(); 
    } catch (error) { 
      alert("Lỗi lưu danh sách quản lý lớp!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCheckboxChange = (classId) => { setSelectedClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };
  const handleRemoveImage = () => {
    setSelectedFile(null); setPreviewUrl("");
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    return matchesSearch && matchesGrade && matchesSubject;
  });

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (newQuestion.type === "multiple_choice" && !newQuestion.correctAnswer) return alert("Vui lòng chọn đáp án đúng!");
    const formData = new FormData();
    formData.append("content", newQuestion.content); formData.append("subject", newQuestion.subject); 
    formData.append("difficulty", newQuestion.difficulty); formData.append("grade", newQuestion.grade); 
    formData.append("type", newQuestion.type);
    
    if (newQuestion.type === "multiple_choice") {
      formData.append("correctAnswer", newQuestion[`opt${newQuestion.correctAnswer}`]);
      formData.append("options", JSON.stringify([newQuestion.optA, newQuestion.optB, newQuestion.optC, newQuestion.optD]));
    } else {
      formData.append("correctAnswer", ""); formData.append("options", "[]");
    }

    if (selectedFile) formData.append("image", selectedFile);

    setLoading(true);
    try {
      await axios.post("/questions/add", formData, getHeader(true));
      alert("✅ Thêm thành công!");
      setIsQuestionDialogOpen(false); setPreviewUrl(""); setSelectedFile(null); setNewQuestion(initialQuestionState); fetchData();
    } catch (err) { 
      alert(err.response?.data?.message || "Lỗi lưu câu hỏi!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleEditClick = (q) => {
    setEditingQuestionId(q._id);
    
    let parsedOptions = ["", "", "", ""];
    if (q.options && q.options.length > 0) {
      if (typeof q.options[0] === 'string' && q.options[0].startsWith('[')) {
        try { parsedOptions = JSON.parse(q.options[0]); } catch (e) { parsedOptions = [q.options[0], "", "", ""]; }
      } else if (typeof q.options === 'string') {
        try { parsedOptions = JSON.parse(q.options); } catch (e) { parsedOptions = [q.options, "", "", ""]; }
      } else {
        parsedOptions = q.options;
      }
    }

    let correctKey = "A";
    if (parsedOptions && parsedOptions.length > 0) {
      if (q.correctAnswer === parsedOptions[0]) correctKey = "A";
      else if (q.correctAnswer === parsedOptions[1]) correctKey = "B";
      else if (q.correctAnswer === parsedOptions[2]) correctKey = "C";
      else if (q.correctAnswer === parsedOptions[3]) correctKey = "D";
    }

    setEditQuestionData({
      content: q.content, subject: q.subject, difficulty: q.difficulty, grade: q.grade || "6", type: q.type || "multiple_choice",
      optA: parsedOptions[0] || "", optB: parsedOptions[1] || "", 
      optC: parsedOptions[2] || "", optD: parsedOptions[3] || "",
      correctAnswer: correctKey
    });
    setPreviewUrl(q.imageUrl ? `${serverUrl}${q.imageUrl}` : "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("content", editQuestionData.content); formData.append("subject", editQuestionData.subject); 
    formData.append("difficulty", editQuestionData.difficulty); formData.append("grade", editQuestionData.grade); 
    formData.append("type", editQuestionData.type);
    
    if (editQuestionData.type === "multiple_choice") {
      formData.append("correctAnswer", editQuestionData[`opt${editQuestionData.correctAnswer}`]);
      formData.append("options", JSON.stringify([editQuestionData.optA, editQuestionData.optB, editQuestionData.optC, editQuestionData.optD]));
    } else {
      formData.append("correctAnswer", ""); formData.append("options", "[]");
    }
    
    if (selectedFile) formData.append("image", selectedFile);

    setLoading(true);
    try {
      await axios.put(`/questions/update/${editingQuestionId}`, formData, getHeader(true));
      alert("✅ Cập nhật thành công!");
      setIsEditDialogOpen(false); setPreviewUrl(""); setSelectedFile(null); fetchData();
    } catch (err) { 
      alert("Lỗi cập nhật!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteAssignment = async (id, title) => {
    if (!window.confirm(`Xóa bài "${title}"?`)) return;
    try { 
      await axios.delete(`/assignments/${id}`, getHeader()); 
      fetchData(); 
    } catch (err) { 
      alert("Lỗi!"); 
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Xóa câu hỏi này?")) return;
    try { 
      await axios.delete(`/questions/delete/${id}`, getHeader()); 
      fetchData(); 
    } catch (err) { 
      alert("Lỗi xóa!"); 
    }
  };

  const handleViewStudentList = async (classId, className) => {
    setSelectedClassName(className); setClassStudents([]); setIsStudentListOpen(true);
    try {
      const res = await axios.get(`/classes/${classId}/students`, getHeader());
      setClassStudents(res.data.students || []);
    } catch (error) { 
      console.error("Lỗi:", error); 
    }
  };

  const getRankMedal = (index) => {
    if (index === 0) return <Medal className="w-8 h-8 text-amber-400 drop-shadow-md" fill="currentColor" />;
    if (index === 1) return <Medal className="w-8 h-8 text-slate-300 drop-shadow-md" fill="currentColor" />;
    if (index === 2) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-md" fill="currentColor" />;
    return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">{index + 1}</div>;
  };

  return (
    <div className="min-h-screen bg-sky-50/40 flex font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-sky-100 flex flex-col sticky top-0 h-screen shadow-[4px_0_24px_rgba(14,165,233,0.05)] z-10">
        <div className="p-6 flex items-center gap-3 border-b border-sky-50">
          <div className="bg-sky-100 p-2 rounded-xl"><BookOpen className="h-6 w-6 text-sky-600" /></div>
          <span className="font-extrabold text-xl text-sky-950 tracking-tight">Khu vực<br/>Giáo viên</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2">
          <Button onClick={() => setActiveTab("my-classes")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'my-classes' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><School className="mr-3 h-5 w-5" /> Quản lý Lớp</Button>
          <Button onClick={() => {setActiveTab("leaderboard"); if(!selectedLeaderboardClass && teacherProfile?.assignedClasses?.length > 0) setSelectedLeaderboardClass(String(teacherProfile.assignedClasses[0]._id || teacherProfile.assignedClasses[0]));}} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><Trophy className="mr-3 h-5 w-5" /> Bảng thi đua</Button>
          <Button onClick={() => setActiveTab("assignments")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'assignments' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><CheckSquare className="mr-3 h-5 w-5" /> Bài tập đã giao</Button>
          <Button onClick={() => setActiveTab("questions")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'questions' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><FileQuestion className="mr-3 h-5 w-5" /> Kho câu hỏi</Button>
        </nav>
        <div className="p-5 border-t border-sky-50"><Button onClick={handleLogout} variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold h-11 rounded-xl"><LogOut className="mr-2 h-4 w-4" /> Đăng xuất</Button></div>
      </aside>

      <main className="flex-1 p-8 lg:p-10 max-w-7xl mx-auto overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div><h1 className="text-3xl font-extrabold text-sky-950 tracking-tight">Trường THCS Trần Hưng Đạo</h1><p className="text-slate-500 mt-2 font-medium">Chào thầy/cô {fullName} 👋</p></div>
          <div className="flex gap-3">
            {activeTab === "assignments" && (
              <Button onClick={() => navigate("/teacher/create-assignment")} className="bg-sky-500 hover:bg-sky-600 text-white h-11 px-6 rounded-xl shadow-md shadow-sky-200 flex items-center font-bold transition-all active:scale-95 cursor-pointer">
                <PlusCircle className="mr-2 h-5 w-5" /> Giao bài mới
              </Button>
            )}

            {/* MODAL THÊM CÂU HỎI MỚI */}
            {activeTab === "questions" && (
               <Dialog open={isQuestionDialogOpen} onOpenChange={(val) => { setIsQuestionDialogOpen(val); if(!val) {setPreviewUrl(""); setSelectedFile(null);}}}>
               <DialogTrigger asChild>
                 <Button className="bg-sky-500 hover:bg-sky-600 text-white h-11 px-6 rounded-xl shadow-md shadow-sky-200 flex items-center font-bold transition-all active:scale-95">
                   <PlusCircle className="mr-2 h-5 w-5" /> Soạn câu hỏi
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[700px] rounded-3xl border-none shadow-2xl overflow-y-auto max-h-[95vh] p-8">
                 <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 border-b border-sky-100 pb-3">Thêm câu hỏi mới</DialogTitle></DialogHeader>
                 <form onSubmit={handleCreateQuestion} className="space-y-5 pt-2">
                   
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({...newQuestion, type: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{newQuestion.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger>
                        <SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                      </Select>
                      <Select value={newQuestion.grade} onValueChange={(v) => setNewQuestion({...newQuestion, grade: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{newQuestion.grade ? `Khối ${newQuestion.grade}` : "Chọn khối"}</span></SelectTrigger>
                        <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                      </Select>
                      <Select value={newQuestion.subject} onValueChange={(v) => setNewQuestion({...newQuestion, subject: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{newQuestion.subject || "Chọn môn"}</span></SelectTrigger>
                        <SelectContent><SelectItem value="Toán">Toán</SelectItem><SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem><SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem></SelectContent>
                      </Select>
                      <Select value={newQuestion.difficulty} onValueChange={(v) => setNewQuestion({...newQuestion, difficulty: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{newQuestion.difficulty === 'easy' ? 'Dễ' : newQuestion.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger>
                        <SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <Textarea placeholder="Nhập nội dung câu hỏi..." className="flex-1 rounded-xl min-h-[140px] border-sky-100 font-medium bg-slate-50 text-base" value={newQuestion.content} onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})} required />
                      <div className="w-full md:w-40 shrink-0 h-[140px]">
                        {previewUrl ? (
                          <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group">
                            <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={handleRemoveImage} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50 cursor-pointer transition-all">
                            <ImageIcon className="w-8 h-8 text-sky-400 mb-2" />
                            <span className="text-sm font-bold text-sky-600 text-center px-1">Đính kèm ảnh</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    {newQuestion.type === "multiple_choice" && (
                      <div className="bg-sky-50/50 p-5 rounded-2xl border border-sky-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {['A', 'B', 'C', 'D'].map(k => (
                            <div key={k} className="flex items-center gap-2">
                               <span className="font-bold text-sky-800 w-5">{k}.</span>
                               <Input placeholder={`Nhập đáp án ${k}`} className="h-12 rounded-xl bg-white border-sky-100 font-medium" value={newQuestion[`opt${k}`]} onChange={(e) => setNewQuestion({...newQuestion, [`opt${k}`]: e.target.value})} required />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-sky-100">
                          <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                          <Select value={newQuestion.correctAnswer} onValueChange={(v) => setNewQuestion({...newQuestion, correctAnswer: v})}>
                            <SelectTrigger className="h-11 w-32 bg-white text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{newQuestion.correctAnswer ? `Câu ${newQuestion.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                            <SelectContent><SelectItem value="A">Câu A</SelectItem><SelectItem value="B">Câu B</SelectItem><SelectItem value="C">Câu C</SelectItem><SelectItem value="D">Câu D</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 mt-2">Lưu vào kho câu hỏi</Button>
                 </form>
               </DialogContent>
             </Dialog>
            )}
          </div>
        </header>

        {/* MODAL CHỈNH SỬA CÂU HỎI */}
        <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setPreviewUrl(""); setSelectedFile(null);}}}>
          <DialogContent className="sm:max-w-[700px] rounded-3xl border-none shadow-2xl overflow-y-auto max-h-[95vh] p-8">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-2 border-b border-sky-100 pb-3"><Pencil className="h-6 w-6 text-sky-500"/> Chỉnh sửa câu hỏi</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger>
                  <SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                </Select>
                <Select value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger>
                  <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                </Select>
                <Select value={editQuestionData.subject} onValueChange={(v) => setEditQuestionData({...editQuestionData, subject: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.subject || "Chọn môn"}</span></SelectTrigger>
                  <SelectContent><SelectItem value="Toán">Toán</SelectItem><SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem><SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem></SelectContent>
                </Select>
                <Select value={editQuestionData.difficulty} onValueChange={(v) => setEditQuestionData({...editQuestionData, difficulty: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.difficulty === 'easy' ? 'Dễ' : editQuestionData.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger>
                  <SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Textarea placeholder="Nhập nội dung câu hỏi..." className="flex-1 rounded-xl min-h-[140px] border-sky-100 font-medium bg-slate-50 text-base" value={editQuestionData.content} onChange={(e) => setEditQuestionData({...editQuestionData, content: e.target.value})} required />
                <div className="w-full md:w-40 shrink-0 h-[140px]">
                  {previewUrl ? (
                    <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group">
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={handleRemoveImage} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50 cursor-pointer transition-all">
                      <ImageIcon className="w-8 h-8 text-sky-400 mb-2" />
                      <span className="text-sm font-bold text-sky-600 text-center px-1">Thay ảnh mới</span>
                      <input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>

              {editQuestionData.type === "multiple_choice" && (
                <div className="bg-sky-50/50 p-5 rounded-2xl border border-sky-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map((k, index) => (
                      <div key={k} className="flex items-center gap-2">
                         <span className="font-bold text-sky-800 w-5">{k}.</span>
                         <Input placeholder={`Nhập đáp án ${k}`} className="h-12 rounded-xl bg-white border-sky-100 font-medium" value={editQuestionData[`opt${k}`]} onChange={(e) => setEditQuestionData({...editQuestionData, [`opt${k}`]: e.target.value})} required />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-sky-100">
                    <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                    <Select value={editQuestionData.correctAnswer} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}>
                      <SelectTrigger className="h-11 w-32 bg-white text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                      <SelectContent><SelectItem value="A">Câu A</SelectItem><SelectItem value="B">Câu B</SelectItem><SelectItem value="C">Câu C</SelectItem><SelectItem value="D">Câu D</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 mt-2">Cập nhật thay đổi</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL THAY ĐỔI LỚP PHỤ TRÁCH VÀ XEM DS HỌC SINH */}
        <Dialog open={isSelectClassDialogOpen} onOpenChange={setIsSelectClassDialogOpen}>
          <DialogContent className="sm:max-w-[700px] rounded-3xl border-none">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950">Chọn Lớp Quản Lý</DialogTitle></DialogHeader>
            <div className="p-4">
              <p className="text-sky-700 text-sm mb-4">Đánh dấu vào các lớp mà thầy/cô đang trực tiếp giảng dạy.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                {['6', '7', '8', '9'].map(grade => {
                  const classesInGrade = allClasses.filter(c => c.grade === grade);
                  if (classesInGrade.length === 0) return null;
                  return (
                    <div key={grade} className="border border-sky-100 rounded-xl p-3 bg-slate-50/50">
                      <h4 className="font-bold text-slate-700 mb-2 border-b border-sky-100 pb-1">Khối {grade}</h4>
                      <div className="space-y-2">
                        {classesInGrade.map(cls => (
                          <label key={cls._id} className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-white border border-transparent hover:border-sky-100 transition-all">
                            <input type="checkbox" className="w-4 h-4 accent-sky-500 rounded" checked={selectedClassIds.includes(cls._id)} onChange={() => handleCheckboxChange(cls._id)} />
                            <span className="font-bold text-slate-700">{cls.name} <span className="text-xs font-normal text-slate-400 ml-1">({cls.academicYear})</span></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button onClick={handleSaveMyClasses} disabled={loading} className="w-full h-12 mt-6 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md shadow-sky-200">{loading ? <Loader2 className="animate-spin" /> : "Lưu thay đổi"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl border-none">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-2"><UserCircle className="w-6 h-6 text-sky-500"/> Danh sách Lớp {selectedClassName}</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-2 mt-2">
              {classStudents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><Users className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 font-medium">Lớp này chưa có học sinh nào.</p></div>
              ) : (
                <Table><TableHeader className="bg-sky-50/50"><TableRow><TableHead className="font-bold text-sky-800 w-16">STT</TableHead><TableHead className="font-bold text-sky-800">Họ và Tên</TableHead><TableHead className="font-bold text-sky-800 text-right">Tài khoản</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {classStudents.map((student, idx) => (
                      <TableRow key={student._id} className="hover:bg-sky-50/50 border-sky-50">
                        <TableCell className="font-medium text-slate-400 text-center">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-sky-900">{student.fullName}</TableCell>
                        <TableCell className="text-right text-slate-500 font-medium">{student.username}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* TAB 1: QUẢN LÝ LỚP */}
        {activeTab === "my-classes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><h2 className="text-2xl font-bold text-sky-950">Tiến độ & Thi đua</h2><p className="text-slate-500 text-sm mt-1">Báo cáo tổng quan các lớp thầy/cô đang phụ trách.</p></div>
              <Button onClick={() => setIsSelectClassDialogOpen(true)} className="bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 h-11 px-5 rounded-xl shadow-sm font-bold"><Settings className="w-4 h-4 mr-2" /> Thay đổi lớp phụ trách</Button>
            </div>
            {isLoadingData ? <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500"/></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
                   <div className="col-span-full bg-white border border-dashed border-sky-200 rounded-3xl p-12 text-center"><School className="w-16 h-16 text-sky-200 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-600 mb-2">Chưa có dữ liệu lớp học</h3><p className="text-slate-400">Hãy bấm nút "Thay đổi lớp phụ trách" ở góc trên để chọn lớp thầy/cô đang dạy nhé.</p></div>
                ) : (
                  teacherProfile.assignedClasses.map(cls => {
                    const classStats = allClasses.find(c => c._id === cls._id || c._id === cls) || {};
                    return (
                      <Card key={cls._id || cls} className="border-sky-100 shadow-sm rounded-3xl bg-white hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-sky-50 bg-sky-50/30 pb-4 pt-5 px-6"><CardTitle className="flex justify-between items-center"><span className="text-2xl font-black text-sky-950">{cls.name}</span><Badge className="bg-sky-100 text-sky-700 shadow-none font-bold">Khối {cls.grade}</Badge></CardTitle></CardHeader>
                        <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3"><div className="flex items-center text-slate-500"><Users className="w-4 h-4 mr-2"/> Sĩ số</div><span className="font-black text-slate-700 text-lg">{classStats.studentCount || 0} em</span></div>
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3"><div className="flex items-center text-slate-500"><CheckSquare className="w-4 h-4 mr-2"/> Làm bài</div><span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md text-sm">Đang cập nhật</span></div>
                            <div className="flex justify-between items-center"><div className="flex items-center text-slate-500"><BarChart className="w-4 h-4 mr-2"/> ĐTB Lớp</div><span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm">Đang cập nhật</span></div>
                          </div>
                          <div className="pt-2 flex gap-2">
                            <Button onClick={() => handleViewStudentList(cls._id || cls, cls.name)} className="flex-1 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 font-bold shadow-none">Xem DS</Button>
                            <Button className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-sm"><Download className="w-4 h-4 mr-2"/> Báo cáo</Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB BẢNG THI ĐUA (LEADERBOARD) */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-sky-100">
              <div>
                <h2 className="text-2xl font-bold text-sky-950 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Bảng Xếp Hạng Thi Đua</h2>
                <p className="text-slate-500 text-sm mt-1">Theo dõi điểm trung bình của học sinh theo từng lớp.</p>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Select value={leaderboardTimeFilter} onValueChange={setLeaderboardTimeFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-sky-50 border-none font-bold text-sky-800 shadow-sm border border-sky-100 w-[140px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="truncate">
                      {leaderboardTimeFilter === 'week' ? 'Tuần này' : 
                       leaderboardTimeFilter === 'month' ? 'Tháng này' : 
                       leaderboardTimeFilter === 'year' ? 'Năm nay' : 'Tất cả'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="week">Tuần này</SelectItem>
                    <SelectItem value="month">Tháng này</SelectItem>
                    <SelectItem value="year">Năm nay</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLeaderboardClass} onValueChange={setSelectedLeaderboardClass}>
                  <SelectTrigger className="h-12 rounded-xl bg-sky-50 border-none font-bold text-sky-800 shadow-sm border border-sky-100 w-[180px]">
                    <span className="truncate">
                      {selectedLeaderboardClass ? (
                        (() => {
                          const matched = allClasses.find(c => String(c._id) === String(selectedLeaderboardClass));
                          return matched ? `Lớp ${matched.name}` : "Đang tải...";
                        })()
                      ) : "-- Chọn lớp --"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
                      <SelectItem value="none" disabled>Bạn chưa quản lý lớp</SelectItem>
                    ) : (
                      teacherProfile.assignedClasses.map(c => {
                        const classId = String(c._id || c);
                        const matchedClass = allClasses.find(cls => String(cls._id) === classId);
                        const className = matchedClass ? matchedClass.name : "Đang tải...";
                        
                        return <SelectItem key={classId} value={classId} className="font-bold">Lớp {className}</SelectItem>
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingLeaderboard ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-sky-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/><p className="font-bold text-slate-500">Đang tính toán điểm số...</p></div>
            ) : !selectedLeaderboardClass ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Vui lòng chọn một lớp ở menu phía trên để xem xếp hạng.</p></div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có dữ liệu</h3><p className="text-slate-500 font-medium">Chưa có học sinh nào làm bài trong khoảng thời gian này.</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-black text-sky-900 text-lg uppercase tracking-wider mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Bảng Vàng</h3>
                  {leaderboardData.slice(0, 3).map((student, idx) => (
                    <Card key={student._id} className={`border-none shadow-md rounded-2xl overflow-hidden ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}>
                      <CardContent className="p-5 flex items-center justify-between">
                         <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">{getRankMedal(idx)}</div><div><p className="font-black text-slate-800 text-lg leading-tight">{student.fullName}</p><p className="text-xs font-bold text-slate-500 mt-0.5">{student.totalTests} bài đã làm</p></div></div>
                         <div className="text-right"><p className="font-black text-3xl leading-none" style={{ color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : '#9a3412' }}>{student.averageScore}</p><p className="text-[10px] font-black uppercase tracking-wider opacity-60">Điểm TB</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-sky-100 overflow-hidden">
                  <div className="bg-sky-50/50 p-5 border-b border-sky-100"><h3 className="font-black text-sky-900 text-lg">Danh sách toàn lớp</h3></div>
                  <div className="max-h-[500px] overflow-y-auto p-2">
                    <Table>
                      <TableHeader><TableRow className="border-b border-sky-50 hover:bg-transparent"><TableHead className="w-16 font-bold text-slate-400 text-center">Hạng</TableHead><TableHead className="font-bold text-slate-400">Họ và Tên</TableHead><TableHead className="font-bold text-slate-400 text-center">Đã làm</TableHead><TableHead className="font-bold text-sky-700 text-right pr-6">Điểm TB</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {leaderboardData.map((student, idx) => (
                          <TableRow key={student._id} className="hover:bg-sky-50/50 border-sky-50 transition-colors">
                            <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-700">{student.fullName}</TableCell>
                            <TableCell className="text-center text-slate-500 font-medium">{student.totalTests}</TableCell>
                            <TableCell className="text-right pr-6 font-black text-lg text-sky-600">{student.averageScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB BÀI TẬP ĐÃ GIAO */}
        {activeTab === "assignments" && (
          <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-sky-50/80"><TableRow><TableHead className="pl-8 font-bold h-14 text-sky-800">Tên bài tập</TableHead><TableHead className="text-center font-bold text-sky-800">Lớp</TableHead><TableHead className="text-center font-bold text-sky-800">Số câu</TableHead><TableHead className="font-bold text-sky-800">Hạn nộp</TableHead><TableHead className="text-right pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoadingData ? <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-sky-500 h-10 w-10" /></TableCell></TableRow> : assignments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-24 text-slate-400 italic">Chưa có bài tập nào.</TableCell></TableRow> : assignments.map(assig => (
                  <TableRow key={assig._id} className="hover:bg-sky-50/50 transition-colors border-sky-50">
                    <TableCell className="font-bold text-sky-700 pl-8">{assig.title}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-sky-100 text-sky-700 font-bold px-3 shadow-none hover:bg-sky-200">{assig.targetClass}</Badge></TableCell>
                    <TableCell className="font-semibold text-center text-slate-600">{assig.questions?.length || 0}</TableCell>
                    <TableCell className="text-slate-500 text-sm font-medium">{new Date(assig.dueDate).toLocaleString("vi-VN")}</TableCell>
                    <TableCell className="text-right pr-8"><div className="flex justify-end gap-2"><Button onClick={() => navigate(`/teacher/assignment/${assig._id}/grades`)} variant="ghost" className="h-9 w-9 p-0 text-sky-600 hover:bg-sky-100 rounded-xl"><Eye className="h-4 w-4" /></Button><Button onClick={() => handleDeleteAssignment(assig._id, assig.title)} variant="ghost" className="h-9 w-9 p-0 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB KHO CÂU HỎI */}
        {activeTab === "questions" && (
          <>
            <Card className="mb-6 border-none shadow-sm rounded-2xl bg-white p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Tìm câu hỏi..." className="pl-10 rounded-xl bg-slate-50 border-none h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Select value={filterGrade} onValueChange={setFilterGrade}><SelectTrigger className="w-[120px] rounded-xl bg-slate-50 border-none h-11 font-semibold"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Khối" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                  <Select value={filterSubject} onValueChange={setFilterSubject}><SelectTrigger className="w-[120px] rounded-xl bg-slate-50 border-none h-11 font-semibold"><SelectValue placeholder="Môn" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả Môn</SelectItem><SelectItem value="Toán">Toán</SelectItem><SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem><SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem></SelectContent></Select>
                </div>
              </div>
            </Card>

            <Card className="border-sky-100/50 shadow-xl rounded-3xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-sky-50/80"><TableRow><TableHead className="pl-8 font-bold h-14 w-1/2 text-sky-800">Nội dung câu hỏi</TableHead><TableHead className="font-bold text-center text-sky-800">Khối</TableHead><TableHead className="font-bold text-sky-800">Môn</TableHead><TableHead className="font-bold text-sky-800">Độ khó</TableHead><TableHead className="text-right pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-sky-500 h-10 w-10" /></TableCell></TableRow> : filteredQuestions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-24 text-slate-400 italic">Không tìm thấy câu hỏi.</TableCell></TableRow> : filteredQuestions.map(q => (
                    <TableRow key={q._id} className="hover:bg-sky-50/50 transition-colors border-sky-50">
                      <TableCell className="pl-8 py-4"><div className="flex items-center gap-3">{q.imageUrl ? (<img src={`${serverUrl}${q.imageUrl}`} className="h-12 w-12 object-cover rounded-lg border bg-white shadow-sm" />) : (<div className="h-12 w-12 bg-slate-50 rounded-lg border border-dashed flex items-center justify-center shrink-0"><ImageIcon className="h-4 w-4 text-slate-300" /></div>)}<span className="font-semibold text-slate-700 line-clamp-2">{q.content}</span></div></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-sky-100 text-sky-700 border-0 font-black px-3 hover:bg-sky-200">Khối {q.grade || "?"}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="bg-slate-100 text-slate-600 border-0 hover:bg-slate-200">{q.subject}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`${q.difficulty === 'easy' ? 'text-teal-600 bg-teal-50' : q.difficulty === 'hard' ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'} border-0`}>{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'TB'}</Badge></TableCell>
                      <TableCell className="text-right pr-8">
                         <div className="flex justify-end gap-2">
                            <Button onClick={() => handleEditClick(q)} variant="ghost" className="h-9 w-9 p-0 text-sky-500 hover:bg-sky-100 rounded-xl"><Pencil className="h-4 w-4" /></Button>
                            <Button onClick={() => handleDeleteQuestion(q._id)} variant="ghost" className="h-9 w-9 p-0 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;