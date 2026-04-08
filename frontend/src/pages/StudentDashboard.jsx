import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BookOpen, LogOut, Clock, CheckCircle2, AlertCircle, 
  PlayCircle, Trophy, History, Calendar, Loader2, Download, Search, Filter 
} from "lucide-react";

// ==========================================
// COMPONENT NHẬP VÀ CHỌN NGÀY DD/MM/YYYY
// ==========================================
const CustomDateInput = ({ label, value, onChange }) => {
  const [textVal, setTextVal] = useState("");

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      setTextVal(`${d}/${m}/${y}`);
    } else {
      setTextVal("");
    }
  }, [value]);

  const handleTextChange = (e) => {
    let val = e.target.value.replace(/[^0-9/]/g, ""); 
    setTextVal(val);
    
    if (val.length === 10) {
      const [d, m, y] = val.split("/");
      if (d && m && y?.length === 4) onChange(`${y}-${m}-${d}`); 
    } else if (val === "") {
      onChange("");
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <Input 
        type="text" 
        placeholder="dd/mm/yyyy" 
        value={textVal} 
        onChange={handleTextChange} 
        maxLength={10}
        className="h-8 border-0 p-0 text-sm font-bold w-[90px] bg-transparent text-slate-700 focus:ring-0 placeholder:font-normal placeholder:text-slate-400" 
      />
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-200 rounded-md transition-colors">
         <Calendar className="w-4 h-4 text-sky-600 pointer-events-none absolute" />
         <input 
           type="date" 
           value={value} 
           onChange={(e) => onChange(e.target.value)} 
           className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
           title="Mở lịch"
         />
      </div>
    </div>
  );
};

// ==========================================
// HÀM XUẤT EXCEL CÓ MÀU SẮC, KẺ Ô VÀ CĂN DÒNG
// ==========================================
const exportFormalExcel = async (dataList, reportTitle, fileName, studentName) => {
  if (!dataList || dataList.length === 0) {
    return alert("Không có dữ liệu để xuất báo cáo!");
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lịch Sử Học Tập', {
    views: [{ showGridLines: false }] 
  });

  // Tùy chỉnh độ rộng cột cho phù hợp với nội dung học sinh
  sheet.columns = [
    { width: 10 }, { width: 45 }, { width: 20 }, { width: 25 }, { width: 15 }, 
  ];

  // Header Quốc Hiệu, Tiêu Ngữ
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

  // Tiêu đề báo cáo
  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells('A4:E4');
  titleRow.height = 40;
  const titleCell = sheet.getCell('A4');
  titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } }; 
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]); 

  // Tiêu đề các cột dữ liệu (Màu xanh, chữ trắng)
  const tableHeaders = Object.keys(dataList[0]);
  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 30; 
  
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; 
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }; 
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
  });

  // Đổ dữ liệu học sinh
  dataList.forEach(obj => {
    const row = sheet.addRow(Object.values(obj));
    row.height = 25; 
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 12 };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      if(colNumber === 1 || colNumber >= 3) {
         cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Căn giữa STT, Môn, Ngày, Điểm
      } else {
         cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }; // Căn trái Tên bài
      }
    });
  });

  sheet.addRow([]); sheet.addRow([]);
  
  // Footer chữ ký
  const dateRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", dateStr]);
  sheet.mergeCells(`D${dateRowNum}:E${dateRowNum}`);
  sheet.getCell(`D${dateRowNum}`).font = { name: 'Times New Roman', size: 12, italic: true };
  sheet.getCell(`D${dateRowNum}`).alignment = { horizontal: 'center' };

  const signRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", "Học sinh nộp bài tập"]); // Đổi thành Học sinh
  sheet.mergeCells(`D${signRowNum}:E${signRowNum}`);
  sheet.getCell(`D${signRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${signRowNum}`).alignment = { horizontal: 'center' };

  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);

  const nameRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", studentName]);
  sheet.mergeCells(`D${nameRowNum}:E${nameRowNum}`);
  sheet.getCell(`D${nameRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${nameRowNum}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

// ==========================================
// TRANG DASHBOARD HỌC SINH
// ==========================================
const StudentDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Học sinh";
  
  const [activeTab, setActiveTab] = useState("pending"); 
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [allAssignmentsForRef, setAllAssignmentsForRef] = useState([]);

  const [historySearch, setHistorySearch] = useState("");
  const [historySubject, setHistorySubject] = useState("all"); 
  
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const profileRes = await axios.get("/auth/me", config).catch(() => null);
        if (profileRes && profileRes.data) {
          setProfile(profileRes.data);
        }

        const [assignmentsRes, submissionsRes] = await Promise.all([
          axios.get("/assignments/student", config).catch(() => ({ data: [] })),
          axios.get("/submissions/my-submissions", config).catch(() => ({ data: [] }))
        ]);

        const allAssignments = assignmentsRes.data.assignments || assignmentsRes.data || [];
        const mySubmissions = submissionsRes.data.submissions || submissionsRes.data || [];

        setAllAssignmentsForRef(allAssignments);

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

  const getSubject = (sub) => {
      if (sub.assignment?.subject) return sub.assignment.subject;
      const foundAssign = allAssignmentsForRef.find(a => a._id === (sub.assignment?._id || sub.assignment));
      if (foundAssign && foundAssign.subject) return foundAssign.subject;
      return "-";
  };

  const formatDateVN = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear(); 
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const filteredHistory = completedAssignments.filter(sub => {
    const assign = sub.assignment || {};
    const matchSearch = (assign.title || "").toLowerCase().includes(historySearch.toLowerCase());
    
    const subj = getSubject(sub);
    const matchSubject = !historySubject || historySubject === "all" || subj === historySubject;
    
    let matchDate = true;
    const subDate = new Date(sub.createdAt).getTime();
    
    if (historyDateFrom) {
       matchDate = matchDate && (subDate >= new Date(historyDateFrom).setHours(0,0,0,0));
    }
    if (historyDateTo) {
       matchDate = matchDate && (subDate <= new Date(historyDateTo).setHours(23,59,59,999));
    }

    return matchSearch && matchSubject && matchDate;
  });

  const handleExportClick = () => {
    if (filteredHistory.length === 0) return alert("Không có dữ liệu để xuất!");
    
    const dataToExport = filteredHistory.map((sub, idx) => ({
      "STT": idx + 1,
      "Tên Bài Tập": sub.assignment?.title || "Bài tập đã xóa",
      "Môn Học": getSubject(sub),
      "Thời Gian Nộp": formatDateVN(sub.createdAt), 
      "Điểm Số": sub.status === 'pending' ? 'Chờ chấm' : sub.score 
    }));

    exportFormalExcel(
      dataToExport,
      `BẢNG ĐIỂM CÁ NHÂN: LỚP ${profile?.classId?.name || profile?.className || ""}`,
      `Lich_Su_Hoc_Tap_${fullName.replace(/\s+/g, '_')}`,
      fullName
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
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

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="bg-sky-500 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-lg shadow-sky-200 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">Chào {fullName.split(" ").pop()}! 👋</h1>
            <p className="text-sky-100 text-sm sm:text-base lg:text-lg font-medium max-w-xl leading-relaxed">
              Hôm nay bạn có <strong className="text-white bg-sky-600 px-2 py-0.5 rounded-lg mx-1">{pendingAssignments.length}</strong> bài tập cần hoàn thành. Hãy sắp xếp thời gian hợp lý nhé!
            </p>
          </div>
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48 sm:w-64 sm:h-64" />
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full sm:w-max overflow-x-auto no-scrollbar">
          <Button 
            onClick={() => setActiveTab("pending")} 
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === 'pending' ? 'bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200' : 'bg-transparent text-slate-500 hover:bg-slate-50 shadow-none'}`}
          >
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> <span className="text-sm sm:text-base">Cần làm ({pendingAssignments.length})</span>
          </Button>
          <Button 
            onClick={() => setActiveTab("completed")} 
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === 'completed' ? 'bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200' : 'bg-transparent text-slate-500 hover:bg-slate-50 shadow-none'}`}
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> <span className="text-sm sm:text-base">Lịch sử ({completedAssignments.length})</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold text-sm sm:text-base">Đang tải dữ liệu học tập...</p>
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pendingAssignments.length === 0 ? (
                  <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200 px-4">
                    <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-sky-400 mx-auto mb-4" />
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

            {activeTab === "completed" && (
              <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden mb-10">
                <div className="p-6 bg-sky-100 border-b border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div>
                     <h3 className="text-xl sm:text-2xl font-black text-sky-900 flex items-center"><History className="w-6 h-6 mr-2 text-sky-600"/> Lịch Sử Học Tập</h3>
                     <p className="text-sky-700 font-medium text-sm mt-1">Bảng Điểm Cá Nhân</p>
                   </div>
                   <Button onClick={handleExportClick} variant="outline" className="bg-white text-sky-700 border-sky-300 hover:bg-sky-50 font-bold rounded-xl h-11 shadow-sm">
                     <Download className="w-4 h-4 mr-2"/> Xuất Excel
                   </Button>
                </div>

                <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Tìm tên bài tập..." 
                      className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-sky-500 shadow-sm text-sm"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0">
                    <Select value={historySubject} onValueChange={setHistorySubject}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium shadow-sm w-[150px] shrink-0 text-sm">
                        <div className="flex items-center">
                           <Filter className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                           <SelectValue placeholder="Tất cả môn" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả môn</SelectItem>
                        <SelectItem value="Toán">Toán</SelectItem>
                        <SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem>
                        <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <CustomDateInput 
                       label="Từ" 
                       value={historyDateFrom} 
                       onChange={setHistoryDateFrom} 
                    />
                    <CustomDateInput 
                       label="Đến" 
                       value={historyDateTo} 
                       onChange={setHistoryDateTo} 
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-6 overflow-x-auto">
                  <Table className="min-w-[700px] border border-slate-100 rounded-2xl overflow-hidden">
                    <TableHeader className="bg-sky-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-sky-800 w-16 text-center rounded-tl-2xl">STT</TableHead>
                        <TableHead className="font-bold text-sky-800">Tên Bài Tập</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-32">Môn Học</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-48">Thời Gian Nộp</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-32 rounded-tr-2xl">Điểm Số</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-16">
                            <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map((sub, idx) => (
                          <TableRow key={sub._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                            <TableCell className="font-medium text-slate-500 text-center">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-800 py-4">
                               {sub.assignment?.title || <span className="text-slate-400 italic font-normal">Bài tập đã bị xóa</span>}
                            </TableCell>
                            <TableCell className="text-center">
                               <span className="text-sm font-medium text-slate-600">{getSubject(sub)}</span>
                            </TableCell>
                            <TableCell className="text-center font-medium text-slate-600 text-sm">
                               {formatDateVN(sub.createdAt)}
                            </TableCell>
                            <TableCell className="text-center">
                               {sub.status === 'pending' ? (
                                  <Badge className="font-bold text-sm px-3 py-1 shadow-none border-0 bg-amber-100 text-amber-700">
                                    Chờ chấm
                                  </Badge>
                               ) : (
                                  <Badge 
                                    className={`font-black text-sm px-3 py-1 shadow-none border-0
                                      ${sub.score >= 8 ? 'bg-emerald-100 text-emerald-700' : 
                                        sub.score >= 5 ? 'bg-amber-100 text-amber-700' : 
                                        'bg-rose-100 text-rose-700'}`}
                                  >
                                    {sub.score}
                                  </Badge>
                               )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;