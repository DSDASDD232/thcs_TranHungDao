import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import * as XLSX from "xlsx"; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShieldCheck, Users, GraduationCap, School, LogOut, TrendingUp, UserPlus, 
  CheckCircle, Loader2, Trash2, Edit, Search, Filter, UploadCloud, FileCheck, 
  FileSpreadsheet, Sparkles, PenTool, Download, Trophy, Medal, BarChart, Calendar, 
  Menu, X, Key, Lock, Unlock, Library, Database, ChevronLeft, ChevronRight,
  DownloadCloud // 👉 ĐÃ THÊM ICON SAO LƯU
} from "lucide-react";

import AdminClassManagement from "./AdminClassManagement";
import AdminDepartmentManagement from "./AdminDepartmentManagement";
import AdminQuestionBank from "./AdminQuestionBank";

const exportFormalExcel = async (dataList, reportTitle, fileName, adminName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu để xuất báo cáo!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Báo Cáo', { views: [{ showGridLines: false }] });

  sheet.columns = [ { width: 10 }, { width: 30 }, { width: 30 }, { width: 25 }, { width: 40 } ];

  sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "Độc lập - Tự do - Hạnh phúc"]);
  sheet.mergeCells('A1:C1'); sheet.mergeCells('A2:C2'); sheet.mergeCells('D1:E1'); sheet.mergeCells('D2:E2');

  const formatGovHeader = (rowNum, isBold) => {
    const row = sheet.getRow(rowNum); row.height = 25; 
    row.eachCell(cell => { cell.font = { name: 'Times New Roman', size: 12, bold: isBold }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
  };
  formatGovHeader(1, true); formatGovHeader(2, true);
  sheet.getCell('D2').font = { name: 'Times New Roman', size: 13, bold: true, underline: true }; 

  sheet.addRow([]); 
  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells('A4:E4'); titleRow.height = 40;
  const titleCell = sheet.getCell('A4');
  titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } }; 
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]); 
  const tableHeaders = Object.keys(dataList[0]);
  const headerRow = sheet.addRow(tableHeaders); headerRow.height = 30; 
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; 
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }; 
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
  });

  dataList.forEach(obj => {
    const row = sheet.addRow(Object.values(obj)); row.height = 25; 
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 12 };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      if(colNumber === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      else cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    });
  });

  sheet.addRow([]); sheet.addRow([]);
  const dateRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", dateStr]);
  sheet.mergeCells(`D${dateRowNum}:E${dateRowNum}`);
  sheet.getCell(`D${dateRowNum}`).font = { name: 'Times New Roman', size: 12, italic: true };
  sheet.getCell(`D${dateRowNum}`).alignment = { horizontal: 'center' };

  const signRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", "Quản trị viên"]);
  sheet.mergeCells(`D${signRowNum}:E${signRowNum}`);
  sheet.getCell(`D${signRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${signRowNum}`).alignment = { horizontal: 'center' };

  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);
  const nameRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", adminName]);
  sheet.mergeCells(`D${nameRowNum}:E${nameRowNum}`);
  sheet.getCell(`D${nameRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`D${nameRowNum}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Quản trị viên";
  const accountFileRef = useRef(null);
  const backupFileInputRef = useRef(null); // 👉 REF CHO FILE INPUT RESTORE

  const [activeTab, setActiveTab] = useState("overview"); 
  const [subTab, setSubTab] = useState("all"); 

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [recentUsers, setRecentUsers] = useState([]); 
  const [classesList, setClassesList] = useState([]); 
  const [teachersList, setTeachersList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ students: 0, teachers: 0, assignments: 0, submissions: 0 });

  const [adminLeaderboard, setAdminLeaderboard] = useState([]);
  const [lbTimeFilter, setLbTimeFilter] = useState("month"); 
  const [lbGradeFilter, setLbGradeFilter] = useState("all");
  const [isLoadingLb, setIsLoadingLb] = useState(false);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [createMethod, setCreateMethod] = useState("manual"); 
  const [newUser, setNewUser] = useState({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "" });
  const [editUser, setEditUser] = useState(null); 
  const [searchName, setSearchName] = useState("");
  const [filterUserGrade, setFilterUserGrade] = useState("all");
  const [filterUserClass, setFilterUserClass] = useState("all");

  const [accountFile, setAccountFile] = useState(null);
  const [previewData, setPreviewData] = useState([]); 
  const [uploadGrade, setUploadGrade] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");

  // 👉 CÁC STATE CHO BACKUP / RESTORE
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    "/slide1.jpg", 
    "/slide2.jpg", 
    "/slide3.jpg", 
    "/slide4.jpg",
    "/slide5.jpg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  const nextSlide = () => setCurrentImageIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentImageIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const config = getHeader();
      const [statsRes, usersRes, classRes] = await Promise.all([
        axios.get("/admin/stats", config),
        axios.get("/admin/users/recent", config),
        axios.get("/classes/all", config)
      ]);

      setDashboardStats(statsRes.data.data || statsRes.data);
      const usersData = usersRes.data;
      const allUsrs = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
      setRecentUsers(allUsrs);
      setClassesList(classRes.data.classes || []);
      setTeachersList(allUsrs.filter(u => u.role === 'teacher'));
    } catch (error) { 
        if (error.response?.status === 403 || error.response?.status === 401) handleLogout(); 
    } finally { 
        setIsLoadingData(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchAdminLeaderboard = async () => {
      setIsLoadingLb(true);
      try {
        const res = await axios.get(`/admin/leaderboard?timeframe=${lbTimeFilter}&grade=${lbGradeFilter}`, getHeader());
        setAdminLeaderboard(res.data.leaderboard || []);
      } catch (error) {
        console.error("Lỗi tải bảng thi đua:", error);
      } finally {
        setIsLoadingLb(false);
      }
    };
    if (activeTab === "leaderboard") fetchAdminLeaderboard();
  }, [activeTab, lbTimeFilter, lbGradeFilter]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };
  const handleSubTabChange = (tab) => { setSubTab(tab); setSearchName(""); setFilterUserGrade("all"); setFilterUserClass("all"); };
  const handleMenuClick = (tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };

  // 👉 HÀM SAO LƯU DỮ LIỆU
  const handleBackupDatabase = async () => {
    if (!window.confirm("Hệ thống sẽ đóng gói toàn bộ dữ liệu thành file JSON. Bạn có muốn tải về?")) return;
    setIsBackingUp(true);
    try {
      const res = await axios.get('/admin/backup', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
      link.setAttribute('download', `Database_Backup_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert("✅ Sao lưu thành công!");
    } catch (error) { alert("Lỗi khi tạo bản sao lưu!"); } finally { setIsBackingUp(false); }
  };

  // 👉 HÀM PHỤC HỒI DỮ LIỆU
  const handleRestoreDatabase = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("⚠️ CẢNH BÁO ĐỎ: Toàn bộ dữ liệu hiện tại trên web sẽ bị XÓA và thay thế bằng dữ liệu từ file này. Bạn có chắc chắn?")) {
      e.target.value = ''; return;
    }
    setIsRestoring(true);
    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      await axios.post('/admin/restore', formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert("✅ Phục hồi dữ liệu thành công! Hệ thống sẽ tải lại trang.");
      window.location.reload();
    } catch (error) { 
      alert(error.response?.data?.message || "Lỗi khi phục hồi dữ liệu!"); 
    } finally { setIsRestoring(false); e.target.value = ''; }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.role === "student" && (!newUser.grade || !newUser.classId)) return alert("Vui lòng chọn đầy đủ Khối và Lớp cho học sinh!");
    setLoading(true);
    try {
      await axios.post("/auth/register", newUser, getHeader());
      setIsUserDialogOpen(false); 
      setNewUser({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "" }); 
      fetchData(); 
      alert("✅ Tạo tài khoản thành công!");
    } catch (err) { 
        alert(err.response?.data?.message || "❌ Lỗi tạo tài khoản!"); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editUser.role === "student" && (!editUser.grade || !editUser.classId)) return alert("Vui lòng chọn đầy đủ Khối và Lớp!");
    setLoading(true);
    try {
      await axios.put(`/admin/users/${editUser._id}`, editUser, getHeader());
      setIsEditUserDialogOpen(false); 
      fetchData(); 
      alert("✅ Cập nhật thành công!");
    } catch (err) { 
        alert("❌ Lỗi cập nhật!"); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Xóa hoàn toàn tài khoản: ${userName}? Hành động này không thể hoàn tác.`)) return;
    try { 
        await axios.delete(`/admin/users/${userId}`, getHeader()); 
        fetchData(); 
        alert("✅ Đã xóa tài khoản thành công!");
    } catch (err) { 
        alert("Lỗi xóa tài khoản!"); 
    }
  };

  const handleResetPassword = async (userId, username) => {
    const newPassword = window.prompt(`Nhập mật khẩu mới cho tài khoản ${username}:\n(Để trống nếu muốn đặt mật khẩu mặc định là 1)`, "1");
    if (newPassword === null) return; 
    
    try {
      await axios.put(`/admin/users/${userId}`, { password: newPassword }, getHeader());
      alert(`✅ Đã khôi phục mật khẩu cho tài khoản ${username} thành công!`);
    } catch (err) {
      alert("Lỗi khi khôi phục mật khẩu!");
    }
  };

  const handleToggleLock = async (userId, currentLockStatus) => {
    const actionName = currentLockStatus ? "MỞ KHÓA" : "KHÓA";
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này?`)) return;
    
    try {
      await axios.put(`/admin/users/${userId}`, { isLocked: !currentLockStatus }, getHeader());
      fetchData(); 
      alert(`✅ Đã ${actionName.toLowerCase()} tài khoản thành công!`);
    } catch (err) {
      alert(`Lỗi khi ${actionName.toLowerCase()} tài khoản!`);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ "STT": 1, "Tên học sinh": "Nguyễn Văn A", "Năm sinh": "2012" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };

  const handleAccountFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAccountFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
        setPreviewData(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleUploadExcel = async () => {
    if (!uploadClassId) return alert("Vui lòng chọn Lớp tiếp nhận học sinh trước!");
    if (previewData.length === 0) return alert("File Excel không có dữ liệu hợp lệ!");
    setLoading(true);
    try {
      const selectedClassObj = classesList.find(c => String(c._id) === String(uploadClassId));
      const payload = { classId: uploadClassId, className: selectedClassObj.name, grade: selectedClassObj.grade, students: previewData };

      const res = await axios.post("/admin/users/import-json", payload, getHeader());

      alert(`✅ Thành công! Đã tạo ${res.data.successCount} tài khoản. ${res.data.failedCount > 0 ? `(Bỏ qua ${res.data.failedCount} dòng lỗi)` : ''}\n\nĐang tự động tải file tài khoản .xlsx về máy...`);

      if (res.data.accounts && res.data.accounts.length > 0) {
        const ws = XLSX.utils.json_to_sheet(res.data.accounts);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "TaiKhoan");
        XLSX.writeFile(wb, `Danh_Sach_Tai_Khoan_Lop_${selectedClassObj.name}.xlsx`);
      }

      setIsUserDialogOpen(false); setAccountFile(null); setPreviewData([]); setUploadGrade(""); setUploadClassId(""); fetchData(); 
    } catch (error) { 
        alert(error.response?.data?.message || "Lỗi xử lý. Vui lòng kiểm tra lại file."); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleExportClassList = () => {
    if (filterUserClass === "all") return alert("Vui lòng chọn 1 Lớp cụ thể ở bộ lọc để tải danh sách!");
    const classUsers = filteredUsers.filter(u => String(u.classId?._id || u.classId) === String(filterUserClass));
    if (classUsers.length === 0) return alert("Lớp này hiện chưa có học sinh nào!");

    const dataToExport = classUsers.map((u, i) => ({ 
        "STT": i + 1, 
        "Tài Khoản": u.username, 
        "Họ và Tên": u.fullName, 
        "Vai Trò": "Học sinh" 
    }));
    const className = classesList.find(c => String(c._id) === String(filterUserClass))?.name || "Lop";
    
    exportFormalExcel(dataToExport, `DANH SÁCH TÀI KHOẢN LỚP ${className}`, `DS_Tai_Khoan_Lop_${className}`, fullName);
  };

  const renderClassName = (user) => {
    if (user.role !== "student") return "-";
    if (user.classId) {
      if (typeof user.classId === 'object' && user.classId.name) return user.classId.name;
      const matchedClass = classesList.find(c => String(c._id) === String(user.classId));
      if (matchedClass) return matchedClass.name;
    }
    return user.className || "Chưa phân lớp";
  };

  const renderTeacherAssignments = (user) => {
    if (!user.assignedClasses || user.assignedClasses.length === 0) return <span className="text-slate-400 italic text-xs mt-1">Chưa phân công lớp</span>;
    
    const classNames = user.assignedClasses.map(c => {
       const classId = typeof c === 'object' ? c._id : c;
       const matched = classesList.find(cls => String(cls._id) === String(classId));
       return matched ? matched.name : null;
    }).filter(Boolean);

    return classNames.length > 0 ? (
       <div className="flex flex-wrap gap-1 mt-1">
          {classNames.map((name, idx) => (
             <Badge key={idx} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-xs">{name}</Badge>
          ))}
       </div>
    ) : <span className="text-slate-400 italic text-xs mt-1">Chưa phân công</span>;
  };

  const currentGrade = isUserDialogOpen ? newUser.grade : (isEditUserDialogOpen ? editUser?.grade : "");
  const filteredClassesForDropdown = classesList.filter(c => String(c.grade) === String(currentGrade));
  const filteredUploadClasses = classesList.filter(c => String(c.grade) === String(uploadGrade));

  const filteredUsers = recentUsers.filter(user => {
    if (subTab !== "all" && user.role !== subTab) return false;
    if (searchName && !user.fullName.toLowerCase().includes(searchName.toLowerCase()) && !user.username.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (subTab === "student" || (subTab === "all" && user.role === "student")) {
      if (filterUserGrade !== "all" && String(user.grade) !== filterUserGrade) return false;
      const uClassId = user.classId?._id || user.classId;
      if (filterUserClass !== "all" && String(uClassId) !== filterUserClass) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 relative">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col h-screen shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-[4px_0_24px_rgba(15,23,42,0.04)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-xl text-sky-600"><ShieldCheck className="h-6 w-6" /></div>
            <span className="font-black text-xl text-slate-800 tracking-tight">Hệ Thống<br/>Admin</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          <Button onClick={() => handleMenuClick("overview")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'overview' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><TrendingUp className="mr-3 h-5 w-5" /> Tổng quan</Button>
          <Button onClick={() => handleMenuClick("classes")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'classes' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><School className="mr-3 h-5 w-5" /> Quản lý Lớp học</Button>
          <Button onClick={() => handleMenuClick("departments")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'departments' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Library className="mr-3 h-5 w-5" /> Quản lý Tổ chuyên môn</Button>
          <Button onClick={() => handleMenuClick("questions")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'questions' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Database className="mr-3 h-5 w-5" /> Quản lý Kho câu hỏi</Button>
          <Button onClick={() => handleMenuClick("accounts")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'accounts' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Users className="mr-3 h-5 w-5" /> Quản lý Tài khoản</Button>
          <Button onClick={() => handleMenuClick("leaderboard")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Trophy className="mr-3 h-5 w-5" /> Thi đua toàn trường</Button>
        </nav>
        <div className="p-5 border-t border-slate-50"><Button onClick={handleLogout} variant="ghost" className="w-full h-11 rounded-xl text-rose-500 hover:bg-rose-50 font-bold"><LogOut className="mr-2 h-5 w-5" /> Đăng xuất</Button></div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full overflow-y-auto overflow-x-hidden max-w-[100vw]">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden bg-white shadow-sm rounded-xl border border-slate-200" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-slate-800" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === "overview" ? "Tổng quan hệ thống" : 
               activeTab === "classes" ? "Quản lý Lớp học" : 
               activeTab === "departments" ? "Quản lý Tổ chuyên môn" : 
               activeTab === "questions" ? "Kho câu hỏi hệ thống" : 
               activeTab === "leaderboard" ? "Bảng Thi Đua Tổng" : "Quản lý Tài khoản"}
            </h1>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {activeTab === "accounts" && (
              <Button onClick={() => setIsUserDialogOpen(true)} className="bg-sky-500 hover:bg-sky-600 whitespace-nowrap text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold"><UserPlus className="mr-2 h-5 w-5" /> Tạo tài khoản</Button>
            )}
          </div>
        </header>

        {activeTab === "overview" && (
          <div className="space-y-6 sm:space-y-8">
            
            {/* 👉 THÊM KHU VỰC BACKUP VÀ RESTORE TẠI TAB TỔNG QUAN */}
            <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-3 rounded-2xl"><Database className="h-6 w-6 text-emerald-600" /></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Dữ liệu hệ thống</h3>
                    <p className="text-slate-500 text-sm font-medium">Sao lưu và bảo mật dữ liệu toàn trang web.</p>
                  </div>
               </div>
               <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={handleBackupDatabase} 
                    disabled={isBackingUp || isRestoring}
                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 px-6 rounded-xl shadow-md shadow-emerald-100 transition-all active:scale-95"
                  >
                    {isBackingUp ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <DownloadCloud className="w-5 h-5 mr-2" />}
                    Sao lưu JSON
                  </Button>

                  <div className="relative flex-1 sm:flex-none">
                    <input type="file" ref={backupFileInputRef} onChange={handleRestoreDatabase} accept=".json" className="hidden" />
                    <Button 
                      onClick={() => backupFileInputRef.current.click()} 
                      disabled={isBackingUp || isRestoring}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 px-6 rounded-xl shadow-md shadow-rose-100 transition-all active:scale-95"
                    >
                      {isRestoring ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UploadCloud className="w-5 h-5 mr-2" />}
                      Phục hồi
                    </Button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[2rem] bg-white overflow-hidden relative group cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-sky-300 rounded-bl-full z-0 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <CardContent className="p-6 flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0 group-hover:-translate-y-1 transition-transform">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Học sinh</p>
                    <h3 className="text-3xl font-black text-slate-800">{dashboardStats.students}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[2rem] bg-white overflow-hidden relative group cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-300 rounded-bl-full z-0 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <CardContent className="p-6 flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0 group-hover:-translate-y-1 transition-transform">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Giáo viên</p>
                    <h3 className="text-3xl font-black text-slate-800">{dashboardStats.teachers}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[2rem] bg-white overflow-hidden relative group cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-300 rounded-bl-full z-0 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <CardContent className="p-6 flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0 group-hover:-translate-y-1 transition-transform">
                    <School className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Lớp học</p>
                    <h3 className="text-3xl font-black text-slate-800">{classesList.length}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[2rem] bg-white overflow-hidden relative group cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-400 to-pink-300 rounded-bl-full z-0 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <CardContent className="p-6 flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 shrink-0 group-hover:-translate-y-1 transition-transform">
                    <FileCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Lượt nộp bài</p>
                    <h3 className="text-3xl font-black text-slate-800">{dashboardStats.submissions}</h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* HIỆU ỨNG ẢNH MỜ TRÀN VIỀN - GIỮ NGUYÊN TỈ LỆ ẢNH CHÍNH */}
            <div className="relative w-full h-[350px] sm:h-[450px] lg:h-[550px] rounded-3xl overflow-hidden shadow-sm border border-sky-100 bg-white group">
              <div 
                className="w-full h-full flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]" 
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {carouselImages.map((src, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 relative flex items-center justify-center bg-slate-100 overflow-hidden">
                     <img 
                       src={src} 
                       className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-60 scale-110 pointer-events-none" 
                       alt="Nền mở ảo" 
                       onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000&auto=format&fit=crop'; }}
                     />
                     <img 
                       src={src} 
                       alt={`Slide ${idx + 1}`} 
                       className="relative z-10 w-full h-full object-contain" 
                       onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000&auto=format&fit=crop'; }}
                     />
                  </div>
                ))}
              </div>

              <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white text-sky-900 p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md">
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/70 hover:bg-white text-sky-900 p-2 sm:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md">
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {carouselImages.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`h-2 sm:h-2.5 rounded-full transition-all duration-500 ease-in-out ${idx === currentImageIndex ? 'bg-sky-500 w-6 sm:w-8 shadow-sm' : 'bg-white/70 w-2 sm:w-2.5 hover:bg-white'}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <AdminClassManagement 
            classesList={classesList} 
            teachersList={teachersList} 
            fetchData={fetchData} 
          />
        )}

        {activeTab === "departments" && (
          <AdminDepartmentManagement 
            teachersList={teachersList} 
            fetchData={fetchData} 
          />
        )}

        {activeTab === "questions" && (
          <AdminQuestionBank />
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Thi đua toàn trường</h2>
              </div>
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <Select value={lbTimeFilter} onValueChange={setLbTimeFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-slate-50 min-w-[120px] border-none font-bold text-slate-700 shadow-sm"><Calendar className="w-4 h-4 mr-2" /><span className="truncate">{lbTimeFilter === 'week' ? 'Tuần này' : lbTimeFilter === 'month' ? 'Tháng này' : lbTimeFilter === 'year' ? 'Năm nay' : 'Tất cả'}</span></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="week">Tuần này</SelectItem><SelectItem value="month">Tháng này</SelectItem><SelectItem value="year">Năm nay</SelectItem></SelectContent>
                </Select>
                <Select value={lbGradeFilter} onValueChange={setLbGradeFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-slate-50 min-w-[120px] border-none font-bold text-slate-700 shadow-sm"><Filter className="w-4 h-4 mr-2" /><span className="truncate">{lbGradeFilter === "all" ? "Tất cả Khối" : `Khối ${lbGradeFilter}`}</span></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingLb ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
            ) : adminLeaderboard.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chưa có dữ liệu</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Lớp xuất sắc nhất</h3>
                  {adminLeaderboard.slice(0, 3).map((cls, idx) => (
                    <Card key={cls._id} className={`border-none shadow-md rounded-2xl ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                           {idx === 0 ? <Medal className="w-6 h-6 text-amber-400" /> : idx === 1 ? <Medal className="w-6 h-6 text-slate-300" /> : <Medal className="w-6 h-6 text-orange-400" />}
                         </div><div><p className="font-black text-slate-800 text-lg">Lớp {cls.className}</p><p className="text-xs font-bold text-slate-500">{cls.totalTests} bài</p></div></div>
                         <div className="text-right"><p className="font-black text-2xl leading-none">{cls.averageScore}</p><p className="text-[10px] font-black uppercase opacity-60">Điểm TB</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader><TableRow><TableHead className="w-16 text-center">Hạng</TableHead><TableHead>Tên Lớp</TableHead><TableHead className="text-center">Khối</TableHead><TableHead className="text-center">Đã nộp</TableHead><TableHead className="text-right pr-6">Điểm TB</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {adminLeaderboard.map((cls, idx) => (
                          <TableRow key={cls._id}>
                            <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-black text-slate-700">Lớp {cls.className}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline">Khối {cls.grade}</Badge></TableCell>
                            <TableCell className="text-center font-medium">{cls.totalTests} bài</TableCell>
                            <TableCell className="text-right pr-6 font-black text-sky-600">{cls.averageScore}</TableCell>
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

        {activeTab === "accounts" && (
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="bg-white border-b border-slate-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Button onClick={() => handleSubTabChange("all")} variant={subTab === "all" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "all" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Tất cả</Button>
                <Button onClick={() => handleSubTabChange("teacher")} variant={subTab === "teacher" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "teacher" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Giáo viên</Button>
                <Button onClick={() => handleSubTabChange("student")} variant={subTab === "student" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "student" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Học sinh</Button>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {subTab === "teacher" && (
                  <Button onClick={() => {
                    const data = filteredUsers.map((u, i) => {
                      let assignedStr = "Chưa phân công";
                      if (u.assignedClasses && u.assignedClasses.length > 0) {
                        assignedStr = u.assignedClasses.map(c => {
                          const classId = typeof c === 'object' ? c._id : c;
                          const matched = classesList.find(cls => String(cls._id) === String(classId));
                          return matched ? matched.name : null;
                        }).filter(Boolean).join(", ");
                      }
                      return {
                        "STT": i + 1, 
                        "Tài Khoản": u.username, 
                        "Họ và Tên": u.fullName, 
                        "Tổ chuyên môn": u.subject ? `Tổ ${u.subject}` : "Chưa phân tổ",
                        "Lớp phụ trách": assignedStr
                      };
                    });
                    exportFormalExcel(data, "DANH SÁCH GIÁO VIÊN", "DS_GiaoVien", fullName);
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-10 flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2"/> Xuất DS Giáo viên
                  </Button>
                )}
                
                {subTab === "student" && (
                  <Button onClick={handleExportClassList} className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-10 flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2"/> Xuất Excel Lớp
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-slate-50/40 border-b border-slate-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Tìm tên/tài khoản..." className="pl-10 rounded-xl bg-white h-11" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              </div>

              {(subTab === "student" || subTab === "all") && (
                <div className="flex gap-2">
                  <Select value={filterUserGrade} onValueChange={(val) => { setFilterUserGrade(val); setFilterUserClass("all"); }}>
                    <SelectTrigger className="w-[110px] sm:w-[120px] rounded-xl bg-white h-11"><span className="truncate">{filterUserGrade === "all" ? "Khối" : `Khối ${filterUserGrade}`}</span></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                  </Select>
                  <Select value={filterUserClass} onValueChange={setFilterUserClass} disabled={filterUserGrade === "all"}>
                    <SelectTrigger className="w-[110px] sm:w-[140px] rounded-xl bg-white h-11"><span className="truncate">{filterUserClass === "all" ? "Lớp" : classesList.find(c => String(c._id) === filterUserClass)?.name || "Lớp"}</span></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả Lớp</SelectItem>{classesList.filter(c => String(c.grade) === filterUserGrade).map(c => (<SelectItem key={c._id} value={String(c._id)}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-4 sm:pl-8 font-bold text-slate-700">Tên ĐN</TableHead><TableHead className="font-bold text-slate-700">Họ và tên</TableHead><TableHead className="font-bold text-slate-700">Vai trò</TableHead><TableHead className="font-bold text-slate-700">Phân công</TableHead><TableHead className="text-right pr-4 sm:pr-8 font-bold text-slate-700 w-[180px]">Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} className={user.isLocked ? 'bg-slate-50 opacity-60' : ''}>
                      <TableCell className="font-bold text-sky-600 pl-4 sm:pl-8">
                         {user.username}
                         {user.isLocked && <Badge variant="destructive" className="ml-2 text-[10px] uppercase">Đã khóa</Badge>}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{user.fullName}</TableCell>
                      <TableCell><Badge className={`${user.role === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-sky-100 text-sky-700'} shadow-none border-0`}>{user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</Badge></TableCell>
                      
                      <TableCell className="text-slate-500 font-medium">
                         {user.role === 'student' ? (
                            user.grade ? `Khối ${user.grade} - ${renderClassName(user)}` : "Chưa phân lớp"
                         ) : (
                            <div className="flex flex-col gap-1 items-start">
                               <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                                  {user.subject ? `Tổ ${user.subject}` : "Chưa phân tổ"}
                               </Badge>
                               {renderTeacherAssignments(user)}
                            </div>
                         )}
                      </TableCell>
                      
                      <TableCell className="text-right pr-4 sm:pr-8">
                        <div className="flex justify-end gap-1">
                          <Button onClick={() => handleResetPassword(user._id, user.username)} variant="ghost" size="icon" title="Khôi phục mật khẩu (1)" className="h-8 w-8 text-amber-500 rounded-xl hover:bg-amber-50"><Key className="h-4 w-4" /></Button>
                          <Button onClick={() => handleToggleLock(user._id, user.isLocked)} variant="ghost" size="icon" title={user.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"} className={`h-8 w-8 rounded-xl ${user.isLocked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                             {user.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button onClick={() => { setEditUser({ ...user, grade: user.grade || "", classId: user.classId?._id || user.classId || "" }); setIsEditUserDialogOpen(true); }} variant="ghost" size="icon" className="h-8 w-8 text-sky-500 rounded-xl hover:bg-sky-100"><Edit className="h-4 w-4" /></Button>
                          <Button onClick={() => handleDeleteUser(user._id, user.fullName)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

      </main>

      {/* DIALOG TẠO USER */}
      <Dialog open={isUserDialogOpen} onOpenChange={(val) => { setIsUserDialogOpen(val); if(!val) {setAccountFile(null); setPreviewData([]); setUploadClassId(""); setUploadGrade("");} }}>
        <DialogContent className="sm:max-w-[700px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950">Thêm người dùng mới</DialogTitle></DialogHeader>

          <div className="flex bg-slate-100 rounded-xl w-full p-1 mt-4">
            <button onClick={() => setCreateMethod("manual")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'manual' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><PenTool className="w-4 h-4"/> Nhập thủ công</button>
            <button onClick={() => setCreateMethod("upload")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><FileSpreadsheet className="w-4 h-4"/> Bằng Excel</button>
          </div>

          {createMethod === "manual" ? (
            <form onSubmit={handleCreateUser} className="space-y-4 mt-6">
              <Input placeholder="Họ và tên..." className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Tên đăng nhập" className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} required />
                <Input type="password" placeholder="Mật khẩu" className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
              </div>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({...newUser, role: val, grade: "", classId: ""})}>
                <SelectTrigger className="h-11 rounded-xl font-medium border-sky-100 bg-white"><span className="truncate">{newUser.role === "student" ? "Học sinh" : "Giáo viên"}</span></SelectTrigger>
                <SelectContent><SelectItem value="student">Học sinh</SelectItem><SelectItem value="teacher">Giáo viên</SelectItem></SelectContent>
              </Select>
              {newUser.role === "student" && (
                <div className="p-4 bg-sky-50/50 rounded-xl border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select value={newUser.grade} onValueChange={(val) => setNewUser({...newUser, grade: val, classId: ""})}>
                      <SelectTrigger className="h-11 rounded-xl border-sky-100 bg-white"><span className="truncate">{newUser.grade ? `Khối ${newUser.grade}` : "Chọn Khối"}</span></SelectTrigger>
                      <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                    </Select>
                    <Select value={newUser.classId ? String(newUser.classId) : undefined} onValueChange={(val) => setNewUser({...newUser, classId: val})} disabled={!newUser.grade}>
                      <SelectTrigger className="h-11 rounded-xl border-sky-100 bg-white"><span className="truncate">{newUser.classId ? classesList.find(c => String(c._id) === String(newUser.classId))?.name : "Chọn Lớp"}</span></SelectTrigger>
                      <SelectContent>{filteredClassesForDropdown.length === 0 ? <SelectItem value="none" disabled>Chưa có lớp</SelectItem> : filteredClassesForDropdown.map(c => (<SelectItem key={c._id} value={String(c._id)}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 shadow-md text-white font-bold">{loading ? <Loader2 className="animate-spin" /> : "Lưu tài khoản"}</Button>
            </form>
          ) : (
            <div className="space-y-4 mt-4 overflow-y-auto pr-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-sky-50 p-4 rounded-xl gap-3 border border-sky-100">
                <div><h4 className="font-bold text-sky-900 text-sm">1. Tải file mẫu</h4><p className="text-xs text-slate-500">File Excel có sẵn cột STT, Tên.</p></div>
                <Button onClick={handleDownloadTemplate} variant="outline" className="bg-white border-sky-200 text-sky-600 hover:bg-sky-100 w-full sm:w-auto"><Download className="w-4 h-4 mr-2"/> Tải mẫu</Button>
              </div>

              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                <h4 className="font-bold text-sky-900 text-sm mb-3">2. Chọn Lớp nhận học sinh</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select value={uploadGrade} onValueChange={(val) => { setUploadGrade(val); setUploadClassId(""); }}>
                    <SelectTrigger className="h-11 rounded-xl border-sky-100 bg-white shadow-sm font-medium"><span className="truncate">{uploadGrade ? `Khối ${uploadGrade}` : "Chọn Khối"}</span></SelectTrigger>
                    <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                  </Select>
                  <Select value={uploadClassId} onValueChange={setUploadClassId} disabled={!uploadGrade}>
                    <SelectTrigger className="h-11 rounded-xl border-sky-100 bg-white shadow-sm font-medium"><span className="truncate">{uploadClassId ? classesList.find(c => String(c._id) === uploadClassId)?.name : "Chọn Lớp"}</span></SelectTrigger>
                    <SelectContent>{filteredUploadClasses.length === 0 ? <SelectItem value="none" disabled>Chưa có lớp</SelectItem> : filteredUploadClasses.map(c => (<SelectItem key={c._id} value={String(c._id)}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 text-center">
                <h4 className="font-bold text-sky-900 text-sm mb-3"><UploadCloud className="w-4 h-4 inline mr-2"/>3. Kéo thả file Excel</h4>
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) handleAccountFileChange({target:{files:[f]}}); }} onClick={() => accountFileRef.current.click()} className={`border-2 border-dashed rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 ${accountFile ? 'border-sky-500 bg-sky-100' : 'border-slate-300 bg-white'}`}>
                  <input type="file" ref={accountFileRef} onChange={handleAccountFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                  {accountFile ? <><FileSpreadsheet className="h-6 w-6 text-teal-600" /><p className="font-bold text-sky-900 text-sm">{accountFile.name}</p></> : <><UploadCloud className="h-6 w-6 text-sky-400" /><p className="text-xs font-bold text-slate-500">Bấm hoặc kéo thả file</p></>}
                </div>
              </div>

              {previewData.length > 0 && (
                <div className="border border-sky-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-sky-50 px-3 py-2 flex justify-between items-center"><span className="font-bold text-sm text-sky-800">Xem trước ({previewData.length} em)</span></div>
                  <div className="max-h-[150px] overflow-x-auto p-1">
                    <Table className="text-sm min-w-[300px]"><TableHeader><TableRow><TableHead className="w-12 text-center py-1">STT</TableHead><TableHead className="py-1">Họ và Tên</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {previewData.slice(0, 5).map((row, idx) => (<TableRow key={idx}><TableCell className="text-center py-1.5">{row["STT"] || idx+1}</TableCell><TableCell className="py-1.5 font-medium">{row["Tên học sinh"] || row["Họ và tên"] || row["Họ tên"] || "-"}</TableCell></TableRow>))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button onClick={handleUploadExcel} disabled={previewData.length === 0 || !uploadClassId || loading} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold h-12 rounded-xl">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />} Tạo {previewData.length} tài khoản
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG SỬA USER */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-2xl border-none">
          <DialogHeader><DialogTitle className="text-2xl font-bold flex items-center gap-2 text-sky-900"><Edit className="h-5 w-5"/> Sửa tài khoản</DialogTitle></DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              <Input value={editUser.username} disabled className="h-11 rounded-xl bg-slate-50 text-slate-400" />
              <Input value={editUser.fullName} onChange={(e) => setEditUser({...editUser, fullName: e.target.value})} required className="h-11 rounded-xl bg-white" />
              <Select value={editUser.role} onValueChange={(val) => setEditUser({...editUser, role: val, grade: "", classId: ""})}>
                <SelectTrigger className="h-11 rounded-xl bg-white"><span className="truncate">{editUser.role === "student" ? "Học sinh" : "Giáo viên"}</span></SelectTrigger>
                <SelectContent><SelectItem value="student">Học sinh</SelectItem><SelectItem value="teacher">Giáo viên</SelectItem></SelectContent>
              </Select>
              {editUser.role === "student" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select value={editUser.grade || ""} onValueChange={(val) => setEditUser({...editUser, grade: val, classId: ""})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><span className="truncate">{editUser.grade ? `Khối ${editUser.grade}` : "Chọn khối"}</span></SelectTrigger>
                    <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                  </Select>
                  <Select value={editUser.classId ? String(editUser.classId) : undefined} onValueChange={(val) => setEditUser({...editUser, classId: val})} disabled={!editUser.grade}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><span className="truncate">{editUser.classId ? classesList.find(c => String(c._id) === String(editUser.classId))?.name : "Chọn Lớp"}</span></SelectTrigger>
                    <SelectContent>{filteredClassesForDropdown.length === 0 ? <SelectItem value="none" disabled>Chưa có lớp</SelectItem> : filteredClassesForDropdown.map(c => (<SelectItem key={c._id} value={String(c._id)}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold">{loading ? <Loader2 className="animate-spin" /> : "Cập nhật"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;