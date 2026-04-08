import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, FileQuestion, LogOut, CheckSquare, School,
  Loader2, PlusCircle, Trash2, Pencil, Image as ImageIcon, X,
  UserCircle, Users, CheckCircle2, ArrowUpDown, Menu, Search, Trophy, History, Database
} from "lucide-react";

import { MyClassesTab, LeaderboardTab, AssignmentsTab, QuestionsTab } from "./TeacherTabs";

// ==========================================
// HÀM XUẤT EXCEL CÓ MÀU SẮC, KẺ Ô VÀ CĂN DÒNG
// ==========================================
const exportFormalExcel = async (dataList, reportTitle, fileName, teacherName) => {
  if (!dataList || dataList.length === 0) {
    return alert("Không có dữ liệu để xuất báo cáo!");
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Báo Cáo', {
    views: [{ showGridLines: false }] 
  });

  sheet.columns = [
    { width: 10 }, { width: 35 }, { width: 25 }, { width: 25 }, { width: 20 }, 
  ];

  sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "Độc lập - Tự do - Hạnh phúc"]);
  
  sheet.mergeCells('A1:C1'); sheet.mergeCells('A2:C2');
  sheet.mergeCells('D1:E1'); sheet.mergeCells('D2:E2');

  const formatGovHeader = (rowNum, isBold) => {
    const row = sheet.getRow(rowNum);
    row.height = 25; 
    row.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 12, bold: isBold };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };
  formatGovHeader(1, true);
  formatGovHeader(2, true);
  sheet.getCell('D2').font = { name: 'Times New Roman', size: 13, bold: true, underline: true }; 

  sheet.addRow([]); 

  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells('A4:E4');
  titleRow.height = 40;
  const titleCell = sheet.getCell('A4');
  titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } }; 
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]); 

  const tableHeaders = Object.keys(dataList[0]);
  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 30; 
  
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; 
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }; 
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
  });

  dataList.forEach(obj => {
    const row = sheet.addRow(Object.values(obj));
    row.height = 25; 
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 12 };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      if(colNumber === 1 || colNumber >= 4) {
         cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
         cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      }
    });
  });

  sheet.addRow([]); sheet.addRow([]);
  
  const dateRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", dateStr]);
  sheet.mergeCells(`D${dateRowNum}:E${dateRowNum}`);
  sheet.getCell(`D${dateRowNum}`).font = { name: 'Times New Roman', size: 12, italic: true };
  sheet.getCell(`D${dateRowNum}`).alignment = { horizontal: 'center' };

  const signRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", "Người xuất báo cáo"]);
  sheet.mergeCells(`D${signRowNum}:E${signRowNum}`);
  sheet.getCell(`D${signRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${signRowNum}`).alignment = { horizontal: 'center' };

  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);

  const nameRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", teacherName]);
  sheet.mergeCells(`D${nameRowNum}:E${nameRowNum}`);
  sheet.getCell(`D${nameRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${nameRowNum}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const editFileInputRef = useRef(null);
  const fullName = localStorage.getItem("fullName") || "Giáo viên";

  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  const [activeTab, setActiveTab] = useState("my-classes"); 
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]); 

  const [isSelectClassDialogOpen, setIsSelectClassDialogOpen] = useState(false); 
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSortOption, setStudentSortOption] = useState("name"); 
  
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [selectedLeaderboardClass, setSelectedLeaderboardClass] = useState("");
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState("all");
  const [leaderboardSubjectFilter, setLeaderboardSubjectFilter] = useState("all"); 

  const [searchClassQuery, setSearchClassQuery] = useState("");
  const [classStatsMap, setClassStatsMap] = useState({});
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  const initialQuestionState = { content: "", subject: "Toán", type: "multiple_choice", difficulty: "medium", grade: "6", optA: "", optB: "", optC: "", optD: "", correctAnswer: "A" };
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(initialQuestionState);

  const getHeader = (isMultipart = false) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    return { headers };
  };

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
      return `${serverUrl}${cleanUrl}`;
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
    const fetchAllClassStats = async () => {
      if (activeTab !== "my-classes" || !teacherProfile?.assignedClasses?.length) return;
      setIsFetchingStats(true);
      try {
        const statsObj = {};
        await Promise.all(teacherProfile.assignedClasses.map(async (c) => {
          const classId = c._id || c;
          try {
            const res = await axios.get(`/submissions/class/${classId}/leaderboard?timeframe=all`, getHeader());
            const leaderboard = res.data.leaderboard || [];
            let totalSubmissions = 0, sumScore = 0, studentCountWithScore = 0;
            leaderboard.forEach(st => {
              totalSubmissions += (st.totalTests || 0);
              if (st.totalTests > 0) {
                sumScore += parseFloat(st.averageScore || 0);
                studentCountWithScore++;
              }
            });
            const classAvg = studentCountWithScore > 0 ? (sumScore / studentCountWithScore).toFixed(1) : 0;
            statsObj[classId] = { totalSubmissions, averageScore: classAvg, leaderboard };
          } catch (e) { statsObj[classId] = { totalSubmissions: 0, averageScore: 0, leaderboard: [] }; }
        }));
        setClassStatsMap(statsObj);
      } catch (error) { console.error("Lỗi thống kê:", error); } finally { setIsFetchingStats(false); }
    };
    fetchAllClassStats();
  }, [activeTab, teacherProfile]);

  useEffect(() => {
    const fetchLeaderboard = async (classId, timeFilter, subjectFilter) => {
      if (!classId) return;
      setIsLoadingLeaderboard(true);
      try {
        const [studentsRes, leaderboardRes] = await Promise.all([
          axios.get(`/classes/${classId}/students`, getHeader()),
          axios.get(`/submissions/class/${classId}/leaderboard?timeframe=${timeFilter}&subject=${subjectFilter}`, getHeader()).catch(() => ({ data: { leaderboard: [] } }))
        ]);

        const baseStudents = studentsRes.data.students || [];
        const leaderboardStats = leaderboardRes.data.leaderboard || [];

        const mergedLeaderboard = baseStudents.map(student => {
          const stats = leaderboardStats.find(lb => lb._id === student._id) || {};
          return {
            _id: student._id,
            fullName: student.fullName,
            username: student.username,
            totalTests: stats.totalTests || 0,
            averageScore: stats.averageScore || 0
          };
        });

        mergedLeaderboard.sort((a, b) => {
          if (b.totalTests !== a.totalTests) return b.totalTests - a.totalTests;
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        setLeaderboardData(mergedLeaderboard);
      } catch (error) { 
        console.error("Lỗi tải Bảng thi đua:", error);
        setLeaderboardData([]); 
      } finally { 
        setIsLoadingLeaderboard(false); 
      }
    };

    if (activeTab === "leaderboard" && selectedLeaderboardClass) {
        fetchLeaderboard(selectedLeaderboardClass, leaderboardTimeFilter, leaderboardSubjectFilter);
    }
  }, [activeTab, selectedLeaderboardClass, leaderboardTimeFilter, leaderboardSubjectFilter]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const handleMenuClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleSaveMyClasses = async () => {
    setLoading(true);
    try {
      await axios.put("/teacher/my-classes", { assignedClasses: selectedClassIds }, getHeader());
      alert("✅ Đã cập nhật danh sách quản lý lớp thành công!");
      setIsSelectClassDialogOpen(false); 
      fetchData(); 
    } catch (error) { alert("Lỗi lưu danh sách!"); } finally { setLoading(false); }
  };

  const handleCheckboxChange = (classId) => { setSelectedClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };
  const handleRemoveImage = () => { setSelectedFile(null); setPreviewUrl(""); };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = (q.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    return matchesSearch && matchesGrade && matchesSubject;
  });

  const handleEditClick = (q) => {
    setEditingQuestionId(q._id);
    let parsedOptions = ["", "", "", ""];
    if (q.options && q.options.length > 0) {
      if (typeof q.options[0] === 'string' && q.options[0].startsWith('[')) {
        try { parsedOptions = JSON.parse(q.options[0]); } catch (e) { parsedOptions = [q.options[0], "", "", ""]; }
      } else if (typeof q.options === 'string') {
        try { parsedOptions = JSON.parse(q.options); } catch (e) { parsedOptions = [q.options, "", "", ""]; }
      } else { parsedOptions = q.options; }
    }
    
    let correctKey = "A";
    if (q.type === 'multiple_choice' && parsedOptions.length > 0) {
      if (["A", "B", "C", "D"].includes(q.correctAnswer)) {
          correctKey = q.correctAnswer;
      } else {
          if (q.correctAnswer === parsedOptions[0]) correctKey = "A";
          else if (q.correctAnswer === parsedOptions[1]) correctKey = "B";
          else if (q.correctAnswer === parsedOptions[2]) correctKey = "C";
          else if (q.correctAnswer === parsedOptions[3]) correctKey = "D";
      }
    }

    setEditQuestionData({
      content: q.content, subject: q.subject, difficulty: q.difficulty, grade: q.grade || "6", type: q.type || "multiple_choice",
      optA: parsedOptions[0] || "", optB: parsedOptions[1] || "", optC: parsedOptions[2] || "", optD: parsedOptions[3] || "", correctAnswer: correctKey
    });
    
    setPreviewUrl(getImageUrl(q.imageUrl));
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("content", editQuestionData.content); formData.append("subject", editQuestionData.subject); 
    formData.append("difficulty", editQuestionData.difficulty); formData.append("grade", editQuestionData.grade); formData.append("type", editQuestionData.type);
    
    if (editQuestionData.type === "multiple_choice") {
      formData.append("correctAnswer", editQuestionData.correctAnswer);
      formData.append("options", JSON.stringify([editQuestionData.optA, editQuestionData.optB, editQuestionData.optC, editQuestionData.optD]));
    } else {
      formData.append("correctAnswer", ""); formData.append("options", "[]");
    }

    if (selectedFile) {
       formData.append("image", selectedFile);
    } else if (!previewUrl) {
       formData.append("imageUrl", ""); 
    }

    setLoading(true);
    try {
      await axios.put(`/questions/update/${editingQuestionId}`, formData, getHeader(true));
      alert("✅ Cập nhật thành công!");
      setIsEditDialogOpen(false); setPreviewUrl(""); setSelectedFile(null); fetchData();
    } catch (err) { alert("Lỗi cập nhật!"); } finally { setLoading(false); }
  };

  const handleDeleteAssignment = async (id, title) => {
    if (!window.confirm(`Xóa bài "${title}"?`)) return;
    try { await axios.delete(`/assignments/${id}`, getHeader()); fetchData(); } catch (err) { alert("Lỗi!"); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Xóa câu hỏi này?")) return;
    try { await axios.delete(`/questions/delete/${id}`, getHeader()); fetchData(); } catch (err) { alert("Lỗi xóa!"); }
  };

  const handleViewStudentList = async (classId, className) => {
    setSelectedClassName(className); 
    setClassStudents([]); 
    setStudentSearchQuery(""); 
    setStudentSortOption("name"); 
    setIsStudentListOpen(true);
    
    try {
      const studentsRes = await axios.get(`/classes/${classId}/students`, getHeader());
      let baseStudents = studentsRes.data.students || [];

      let leaderboardStats = [];
      try {
          const leaderboardRes = await axios.get(`/submissions/class/${classId}/leaderboard?timeframe=all`, getHeader());
          leaderboardStats = leaderboardRes.data.leaderboard || [];
      } catch(e) { console.log("Không tải được điểm, hiển thị DS gốc."); }

      const mergedStudents = baseStudents.map(student => {
        const stats = leaderboardStats.find(lb => lb._id === student._id) || {};
        return { ...student, totalTests: stats.totalTests || 0, averageScore: stats.averageScore || 0, lastSubmission: stats.lastSubmission || null };
      });
      setClassStudents(mergedStudents);
    } catch (error) { console.error("Lỗi lấy danh sách học sinh:", error); }
  };

  const handleViewStudentDetails = async (student) => {
    setSelectedStudentDetails(student);
    setIsLoadingHistory(true);
    try {
      const res = await axios.get(`/submissions/student/${student._id}`, getHeader());
      setStudentHistory(res.data.submissions || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleExportClassReport = (classId, className) => {
    const stats = classStatsMap[classId];
    if (!stats || !stats.leaderboard || stats.leaderboard.length === 0) return alert(`Chưa có dữ liệu làm bài của lớp ${className} để xuất báo cáo!`);
    
    const dataToExport = stats.leaderboard.map((st, idx) => ({
      "Hạng": idx + 1, 
      "Họ và Tên": st.fullName, 
      "Tài Khoản": st.username || "", 
      "Số lượt nộp": st.totalTests, 
      "Điểm Trung Bình": parseFloat(st.averageScore || 0)
    }));

    const teacherName = teacherProfile?.fullName || fullName || "Giáo viên phụ trách";

    exportFormalExcel(
      dataToExport, 
      `BÁO CÁO HỌC TẬP LỚP ${className}`, 
      `Bao_Cao_Hoc_Tap_Lop_${className}`, 
      teacherName
    );
  };

  const handleExportLeaderboardExcel = () => {
    if (!leaderboardData || leaderboardData.length === 0) return alert("Không có dữ liệu để xuất!");
    
    const classObj = allClasses.find(c => (c._id || c) === selectedLeaderboardClass);
    const className = classObj ? classObj.name : "Lop";
    
    const dataToExport = leaderboardData.map((st, idx) => ({
      "Hạng": idx + 1,
      "Họ và Tên": st.fullName,
      "Tài Khoản": st.username || "",
      "Số lượt nộp bài": st.totalTests,
      "Điểm Trung Bình": parseFloat(st.averageScore || 0)
    }));
    
    const teacherName = teacherProfile?.fullName || fullName || "Giáo viên phụ trách";

    exportFormalExcel(
      dataToExport, 
      `BẢNG THI ĐUA LỚP ${className}`, 
      `Bang_Thi_Dua_${className}`, 
      teacherName
    );
  };

  const processedStudents = classStudents
    .filter(student => (student.fullName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) || (student.username || "").toLowerCase().includes(studentSearchQuery.toLowerCase()))
    .sort((a, b) => {
      if (studentSortOption === "most_submissions") return (b.totalTests || 0) - (a.totalTests || 0);
      else if (studentSortOption === "latest_submission") return (b.lastSubmission ? new Date(b.lastSubmission).getTime() : 0) - (a.lastSubmission ? new Date(a.lastSubmission).getTime() : 0);
      return (a.fullName || "").localeCompare(b.fullName || "");
    });

  const filteredClasses = (teacherProfile?.assignedClasses || []).filter(c => {
    const classObj = allClasses.find(ac => ac._id === c._id || ac._id === c) || c;
    return (classObj.name || "").toLowerCase().includes(searchClassQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-sky-50/40 flex font-sans text-slate-800 relative">
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-sky-100 flex flex-col h-screen shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-[4px_0_24px_rgba(14,165,233,0.05)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-sky-50">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-xl"><BookOpen className="h-6 w-6 text-sky-600" /></div>
            <span className="font-extrabold text-xl text-sky-950 tracking-tight">Khu vực<br/>Giáo viên</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}><X className="w-5 h-5 text-slate-500" /></Button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          <Button onClick={() => handleMenuClick("my-classes")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'my-classes' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><School className="mr-3 h-5 w-5" /> Quản lý Lớp</Button>
          <Button onClick={() => {handleMenuClick("leaderboard"); if(!selectedLeaderboardClass && teacherProfile?.assignedClasses?.length > 0) setSelectedLeaderboardClass(String(teacherProfile.assignedClasses[0]._id || teacherProfile.assignedClasses[0]));}} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'hover:bg-amber-50 hover:text-amber-600 text-slate-500'}`}><Trophy className="mr-3 h-5 w-5" /> Bảng thi đua</Button>
          <Button onClick={() => handleMenuClick("assignments")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'assignments' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><CheckSquare className="mr-3 h-5 w-5" /> Bài tập đã giao</Button>
          <Button onClick={() => handleMenuClick("questions")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'questions' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><FileQuestion className="mr-3 h-5 w-5" /> Kho câu hỏi</Button>
        </nav>
        <div className="p-5 border-t border-sky-50"><Button onClick={handleLogout} variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold h-11 rounded-xl"><LogOut className="mr-2 h-4 w-4" /> Đăng xuất</Button></div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full overflow-y-auto overflow-x-hidden max-w-[100vw]">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden bg-white shadow-sm rounded-xl border border-sky-100" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-sky-900" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-950 tracking-tight">Trường THCS Trần Hưng Đạo</h1>
              <p className="text-slate-500 mt-1 sm:mt-2 font-medium">Chào thầy/cô {fullName} 👋</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {activeTab === "assignments" && (
              <Button onClick={() => navigate("/teacher/create-assignment")} className="bg-sky-500 hover:bg-sky-600 whitespace-nowrap text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold">
                <PlusCircle className="mr-2 h-5 w-5" /> Giao bài mới
              </Button>
            )}

            {/* ĐỔI TÊN NÚT THÀNH KHO CÂU HỎI */}
            {activeTab === "questions" && (
              <Button onClick={() => navigate("/teacher/question-bank")} className="bg-sky-500 hover:bg-sky-600 whitespace-nowrap text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold">
                <Database className="mr-2 h-5 w-5" /> Quản lý Kho câu hỏi
              </Button>
            )}
          </div>
        </header>

        <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setPreviewUrl(""); setSelectedFile(null);}}}>
          <DialogContent className="sm:max-w-[700px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-4 sm:p-8">
            <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2 border-b border-sky-100 pb-3"><Pencil className="h-5 sm:h-6 w-5 sm:w-6 text-sky-500"/> Chỉnh sửa câu hỏi</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.subject} onValueChange={(v) => setEditQuestionData({...editQuestionData, subject: v})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.subject || "Chọn môn"}</span></SelectTrigger><SelectContent><SelectItem value="Toán">Toán</SelectItem><SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem><SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.difficulty} onValueChange={(v) => setEditQuestionData({...editQuestionData, difficulty: v})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold"><span className="truncate">{editQuestionData.difficulty === 'easy' ? 'Dễ' : editQuestionData.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <Textarea placeholder="Nhập nội dung câu hỏi..." className="flex-1 rounded-xl min-h-[140px] border-sky-100 font-medium bg-slate-50 text-base" value={editQuestionData.content} onChange={(e) => setEditQuestionData({...editQuestionData, content: e.target.value})} required />
                <div className="w-full md:w-40 shrink-0 h-[140px]">
                  {previewUrl ? (
                    <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group">
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={handleRemoveImage} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button></div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50 cursor-pointer transition-all"><ImageIcon className="w-8 h-8 text-sky-400 mb-2" /><span className="text-sm font-bold text-sky-600 text-center px-1">Thay ảnh mới</span><input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} /></label>
                  )}
                </div>
              </div>
              {editQuestionData.type === "multiple_choice" && (
                <div className="bg-sky-50/50 p-4 sm:p-5 rounded-2xl border border-sky-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map((k) => (
                      <div key={k} className="flex items-center gap-2"><span className="font-bold text-sky-800 w-5">{k}.</span><Input placeholder={`Nhập đáp án ${k}`} className="h-12 rounded-xl bg-white border-sky-100 font-medium" value={editQuestionData[`opt${k}`]} onChange={(e) => setEditQuestionData({...editQuestionData, [`opt${k}`]: e.target.value})} required /></div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-100">
                    <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                    <Select value={editQuestionData.correctAnswer} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}><SelectTrigger className="h-11 w-full sm:w-32 bg-white text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span></SelectTrigger><SelectContent><SelectItem value="A">Câu A</SelectItem><SelectItem value="B">Câu B</SelectItem><SelectItem value="C">Câu C</SelectItem><SelectItem value="D">Câu D</SelectItem></SelectContent></Select>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl mt-2">Cập nhật thay đổi</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isSelectClassDialogOpen} onOpenChange={setIsSelectClassDialogOpen}>
          <DialogContent className="sm:max-w-[700px] w-[95%] rounded-3xl border-none">
            <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950">Chọn Lớp Quản Lý</DialogTitle></DialogHeader>
            <div className="p-2 sm:p-4">
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
              <Button onClick={handleSaveMyClasses} disabled={loading} className="w-full h-12 mt-6 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md">{loading ? <Loader2 className="animate-spin" /> : "Lưu thay đổi"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
          <DialogContent className="sm:max-w-[700px] w-[95%] rounded-3xl border-none p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2">
                <UserCircle className="w-6 h-6 text-sky-500"/> Danh sách Lớp {selectedClassName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Tìm theo tên học sinh..." className="pl-10 h-11 rounded-xl bg-slate-50 border-sky-100" value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} />
              </div>
              <Select value={studentSortOption} onValueChange={setStudentSortOption}>
                <SelectTrigger className="h-11 rounded-xl bg-sky-50 border-sky-100 font-bold text-sky-800 sm:w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <span className="truncate">{studentSortOption === "name" ? "Tên A-Z" : studentSortOption === "most_submissions" ? "Nộp nhiều nhất" : "Nộp gần nhất"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Tên A-Z</SelectItem><SelectItem value="most_submissions">Nộp nhiều nhất</SelectItem><SelectItem value="latest_submission">Nộp gần nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[50vh] overflow-y-auto mt-2">
              {classStudents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">Không tìm thấy học sinh nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-sky-100">
                  <Table className="min-w-[500px]">
                    <TableHeader className="bg-sky-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-bold text-sky-800 w-12 text-center">STT</TableHead>
                        <TableHead className="font-bold text-sky-800">Họ và Tên</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center">Đã nộp</TableHead>
                        <TableHead className="font-bold text-sky-800 text-right pr-4">Điểm TB</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-24">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents
                        .filter(student => (student.fullName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) || (student.username || "").toLowerCase().includes(studentSearchQuery.toLowerCase()))
                        .sort((a, b) => {
                          if (studentSortOption === "most_submissions") return (b.totalTests || 0) - (a.totalTests || 0);
                          else if (studentSortOption === "latest_submission") return (b.lastSubmission ? new Date(b.lastSubmission).getTime() : 0) - (a.lastSubmission ? new Date(a.lastSubmission).getTime() : 0);
                          return (a.fullName || "").localeCompare(b.fullName || "");
                        })
                        .map((student, idx) => (
                        <TableRow key={student._id} className="hover:bg-sky-50/50">
                          <TableCell className="font-medium text-slate-400 text-center">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-sky-900">{student.fullName}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-teal-50 text-teal-700 shadow-none border-0">{student.totalTests || 0} bài</Badge></TableCell>
                          <TableCell className="text-right pr-4 font-black text-sky-600">{student.averageScore || "-"}</TableCell>
                          <TableCell className="text-center">
                             <Button onClick={() => handleViewStudentDetails(student)} variant="outline" size="sm" className="h-8 text-sky-600 border-sky-200 hover:bg-sky-50 font-bold">Chi tiết</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedStudentDetails} onOpenChange={(open) => { if (!open) setSelectedStudentDetails(null); }}>
          <DialogContent className="sm:max-w-[600px] w-[95%] rounded-3xl border-none p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-2">
                <History className="w-6 h-6 text-amber-500"/> Lịch sử làm bài: {selectedStudentDetails?.fullName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[50vh] overflow-y-auto mt-2">
              {isLoadingHistory ? (
                <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500"/></div>
              ) : studentHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Học sinh này chưa nộp bài nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentHistory.map(sub => (
                    <div key={sub._id} className="flex justify-between items-center p-4 bg-white border border-sky-100 rounded-2xl shadow-sm hover:border-sky-300 transition-colors">
                       <div>
                         <p className="font-bold text-sky-900 line-clamp-1">{sub.assignment?.title || "Bài tập đã bị xóa"}</p>
                         <p className="text-xs text-slate-500 font-medium mt-1">Nộp lúc: {new Date(sub.createdAt).toLocaleString('vi-VN')}</p>
                       </div>
                       <div className="bg-sky-50 text-sky-700 font-black text-lg px-4 py-2 rounded-xl shrink-0">
                         {sub.score} <span className="text-[10px] font-bold text-sky-500 uppercase">Điểm</span>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {activeTab === "my-classes" && (
          <MyClassesTab 
            isLoadingData={isLoadingData} filteredClasses={filteredClasses} allClasses={allClasses} classStatsMap={classStatsMap} 
            isFetchingStats={isFetchingStats} searchClassQuery={searchClassQuery} setSearchClassQuery={setSearchClassQuery} 
            setIsSelectClassDialogOpen={setIsSelectClassDialogOpen} handleViewStudentList={handleViewStudentList} handleExportClassReport={handleExportClassReport}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardTab 
            leaderboardTimeFilter={leaderboardTimeFilter} setLeaderboardTimeFilter={setLeaderboardTimeFilter} 
            leaderboardSubjectFilter={leaderboardSubjectFilter} setLeaderboardSubjectFilter={setLeaderboardSubjectFilter} 
            selectedLeaderboardClass={selectedLeaderboardClass} setSelectedLeaderboardClass={setSelectedLeaderboardClass} 
            teacherProfile={teacherProfile} allClasses={allClasses} isLoadingLeaderboard={isLoadingLeaderboard} leaderboardData={leaderboardData} 
            handleExportLeaderboardExcel={handleExportLeaderboardExcel} 
            handleViewStudentDetails={handleViewStudentDetails} 
          />
        )}

        {activeTab === "assignments" && (
          <AssignmentsTab 
            isLoadingData={isLoadingData} 
            assignments={assignments} 
            handleDeleteAssignment={handleDeleteAssignment} 
            handleEditAssignment={(id) => navigate(`/teacher/edit-assignment/${id}`)}
          />
        )}

        {activeTab === "questions" && (
          <QuestionsTab 
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterGrade={filterGrade} setFilterGrade={setFilterGrade} 
            filterSubject={filterSubject} setFilterSubject={setFilterSubject} filteredQuestions={filteredQuestions} 
            isLoadingData={isLoadingData} serverUrl={serverUrl} handleEditClick={handleEditClick} handleDeleteQuestion={handleDeleteQuestion} 
          />
        )}

      </main>
    </div>
  );
};

export default TeacherDashboard;