import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import * as XLSX from "xlsx"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShieldCheck, Users, GraduationCap, School, LogOut, TrendingUp, UserPlus, 
  CheckCircle, Loader2, Trash2, Edit, PlusCircle, Search, Filter, UploadCloud, 
  FileSpreadsheet, Sparkles, PenTool, Download, Table as TableIcon, Trophy, 
  Medal, BarChart, Calendar, Menu, X 
} from "lucide-react"; // Đã thêm Menu và X

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Quản trị viên";
  const accountFileRef = useRef(null);

  const [activeTab, setActiveTab] = useState("overview"); 
  const [subTab, setSubTab] = useState("all"); 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  
  // STATE CHO MOBILE MENU
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]); 
  const [classesList, setClassesList] = useState([]); 
  const [dashboardStats, setDashboardStats] = useState({ students: 0, teachers: 0, assignments: 0, submissions: 0 });

  const [adminLeaderboard, setAdminLeaderboard] = useState([]);
  const [lbTimeFilter, setLbTimeFilter] = useState("month"); 
  const [lbGradeFilter, setLbGradeFilter] = useState("all");
  const [isLoadingLb, setIsLoadingLb] = useState(false);

  const [createMethod, setCreateMethod] = useState("manual"); 
  const [newUser, setNewUser] = useState({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "" });
  
  const [accountFile, setAccountFile] = useState(null);
  const [previewData, setPreviewData] = useState([]); 
  const [uploadGrade, setUploadGrade] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");

  const [editUser, setEditUser] = useState(null); 
  const [newClass, setNewClass] = useState({ name: "", grade: "6", academicYear: "2023-2024" });

  const [searchName, setSearchName] = useState("");
  const [filterUserGrade, setFilterUserGrade] = useState("all");
  const [filterUserClass, setFilterUserClass] = useState("all");

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
      setRecentUsers(Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []));
      setClassesList(classRes.data.classes || []);
    } catch (error) { 
        if (error.response?.status === 403) handleLogout(); 
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

  // Đổi tab trên mobile sẽ tự động đóng menu
  const handleMenuClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name.startsWith(newClass.grade)) return alert(`❌ Sai định dạng!\nTên lớp phải bắt đầu bằng số Khối.\nVí dụ: Khối ${newClass.grade} -> Lớp ${newClass.grade}A1`);
    setLoading(true);
    try {
      await axios.post("/classes/create", newClass, getHeader());
      alert("✅ Đã tạo lớp học thành công!"); 
      setIsClassDialogOpen(false); 
      setNewClass({ name: "", grade: "6", academicYear: "2023-2024" }); 
      fetchData(); 
    } catch (error) { 
        alert(error.response?.data?.message || "Lỗi tạo lớp!"); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Xóa lớp: ${className}?`)) return;
    try {
      await axios.delete(`/classes/${classId}`, getHeader());
      fetchData();
      alert("✅ Đã xóa lớp thành công!");
    } catch (err) {
      alert("Lỗi xóa lớp học!");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.role === "student" && (!newUser.grade || !newUser.classId)) return alert("Vui lòng chọn đầy đủ Khối và Lớp cho học sinh!");
    setLoading(true);
    try {
      await axios.post("/auth/register", newUser, getHeader());
      setIsDialogOpen(false); 
      setNewUser({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "" }); 
      fetchData(); 
      alert("✅ Tạo tài khoản thành công!");
    } catch (err) { 
        alert(err.response?.data?.message || "❌ Lỗi tạo tài khoản!"); 
    } finally { 
        setLoading(false); 
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

      setIsDialogOpen(false); setAccountFile(null); setPreviewData([]); setUploadGrade(""); setUploadClassId(""); fetchData(); 
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

    const dataToExport = classUsers.map((u, i) => ({ "STT": i + 1, "Tài Khoản": u.username, "Họ và Tên": u.fullName, "Vai Trò": "Học sinh" }));
    const className = classesList.find(c => String(c._id) === String(filterUserClass))?.name || "Lop";
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Lop_${className}`);
    XLSX.writeFile(wb, `Danh_Sach_Hoc_Sinh_Lop_${className}.xlsx`);
  };

  const openEditDialog = (user) => { setEditUser({ ...user, grade: user.grade || "", classId: user.classId?._id || user.classId || "" }); setIsEditDialogOpen(true); };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editUser.role === "student" && (!editUser.grade || !editUser.classId)) return alert("Vui lòng chọn đầy đủ Khối và Lớp!");
    setLoading(true);
    try {
      await axios.put(`/admin/users/${editUser._id}`, editUser, getHeader());
      setIsEditDialogOpen(false); 
      fetchData(); 
      alert("✅ Cập nhật thành công!");
    } catch (err) { 
        alert("❌ Lỗi cập nhật!"); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Xóa tài khoản: ${userName}?`)) return;
    try { 
        await axios.delete(`/admin/users/${userId}`, getHeader()); 
        fetchData(); 
    } catch (err) { 
        alert("Lỗi xóa tài khoản!"); 
    }
  };

  const getRankMedal = (index) => {
    if (index === 0) return <Medal className="w-8 h-8 text-amber-400 drop-shadow-md" fill="currentColor" />;
    if (index === 1) return <Medal className="w-8 h-8 text-slate-300 drop-shadow-md" fill="currentColor" />;
    if (index === 2) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-md" fill="currentColor" />;
    return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">{index + 1}</div>;
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

  const currentGrade = isDialogOpen ? newUser.grade : (isEditDialogOpen ? editUser?.grade : "");
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
    <div className="min-h-screen bg-sky-50/40 flex font-sans text-slate-800 relative">
      
      {/* OVERLAY CHO MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-sky-100 flex flex-col h-screen shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-[4px_0_24px_rgba(14,165,233,0.05)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-sky-50">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-xl text-sky-600"><ShieldCheck className="h-6 w-6" /></div>
            <span className="font-black text-xl text-sky-950 tracking-tight">Hệ Thống<br/>Admin</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          <Button onClick={() => handleMenuClick("overview")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'overview' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600'}`}><TrendingUp className="mr-3 h-5 w-5" /> Tổng quan</Button>
          <Button onClick={() => handleMenuClick("classes")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'classes' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600'}`}><School className="mr-3 h-5 w-5" /> Quản lý Khối/Lớp</Button>
          <Button onClick={() => handleMenuClick("accounts")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'accounts' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600'}`}><Users className="mr-3 h-5 w-5" /> Quản lý Tài khoản</Button>
          <Button onClick={() => handleMenuClick("leaderboard")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}><Trophy className="mr-3 h-5 w-5" /> Thi đua toàn trường</Button>
        </nav>
        <div className="p-5 border-t border-sky-50"><Button onClick={handleLogout} variant="ghost" className="w-full h-11 rounded-xl text-rose-500 hover:bg-rose-50 font-bold"><LogOut className="mr-2 h-5 w-5" /> Đăng xuất</Button></div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full overflow-y-auto overflow-x-hidden max-w-[100vw]">
        
        {/* HEADER RESPONSIVE */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden bg-white shadow-sm rounded-xl border border-sky-100" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-sky-900" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-950 tracking-tight">
              {activeTab === "overview" ? "Tổng quan" : activeTab === "classes" ? "Lớp học" : activeTab === "leaderboard" ? "Bảng Thi Đua" : "Tài khoản"}
            </h1>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {activeTab === "classes" && (
              <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                <DialogTrigger asChild><Button className="bg-sky-500 whitespace-nowrap hover:bg-sky-600 text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold"><PlusCircle className="mr-2 h-5 w-5" /> Tạo lớp học mới</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[500px] w-[95%] rounded-2xl border-none">
                  <DialogHeader><DialogTitle className="text-2xl font-black text-sky-900">Thêm Lớp Học</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateClass} className="space-y-5 pt-4">
                    <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Tên Lớp</label><Input placeholder="VD: 9A1" className="h-12 rounded-xl border-sky-100 focus-visible:ring-sky-500 text-lg font-bold uppercase bg-white" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value.toUpperCase()})} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Khối</label><Select value={newClass.grade} onValueChange={(v) => setNewClass({...newClass, grade: v})}><SelectTrigger className="h-12 rounded-xl font-bold border-sky-100 bg-white"><span className="truncate">{newClass.grade ? `Khối ${newClass.grade}` : "Chọn Khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Năm học</label><Select value={newClass.academicYear} onValueChange={(v) => setNewClass({...newClass, academicYear: v})}><SelectTrigger className="h-12 rounded-xl font-bold border-sky-100 bg-white"><span className="truncate">{newClass.academicYear || "Chọn năm học"}</span></SelectTrigger><SelectContent><SelectItem value="2023-2024">2023 - 2024</SelectItem><SelectItem value="2024-2025">2024 - 2025</SelectItem></SelectContent></Select></div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-600 font-black text-lg text-white mt-4">{loading ? <Loader2 className="animate-spin" /> : "Xác nhận tạo lớp"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {(activeTab === "overview" || activeTab === "accounts") && (
              <Dialog open={isDialogOpen} onOpenChange={(val) => { setIsDialogOpen(val); if(!val) {setAccountFile(null); setPreviewData([]); setUploadClassId(""); setUploadGrade("");} }}>
                <DialogTrigger asChild><Button className="bg-sky-500 hover:bg-sky-600 whitespace-nowrap text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold"><UserPlus className="mr-2 h-5 w-5" /> Tạo tài khoản</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[700px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none p-4 sm:p-6">
                  <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950">Thêm người dùng mới</DialogTitle></DialogHeader>

                  <div className="flex bg-slate-100 rounded-xl w-full p-1 mt-4">
                    <button onClick={() => setCreateMethod("manual")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'manual' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><PenTool className="w-4 h-4"/> Nhập thủ công</button>
                    <button onClick={() => setCreateMethod("upload")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><FileSpreadsheet className="w-4 h-4"/> Bằng Excel</button>
                  </div>

                  {/* CÁC PHẦN FORM Ở ĐÂY GIỮ NGUYÊN NHƯ CŨ, CHỈ CHỈNH RESPONSIVE THÊM CHÚT LỚP */}
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
                        <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            )}

            {/* DIALOG SỬA USER */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                    <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-sky-500 text-white font-bold">{loading ? <Loader2 className="animate-spin" /> : "Cập nhật"}</Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* THỐNG KÊ OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="border-sky-100/50 shadow-sm rounded-2xl sm:rounded-3xl bg-white"><CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center text-center sm:text-left"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-100 rounded-2xl flex items-center justify-center"><Users className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600" /></div><div><p className="text-xs sm:text-sm font-semibold text-slate-400">Học sinh</p><h3 className="text-xl sm:text-2xl font-black text-sky-950">{dashboardStats.students}</h3></div></CardContent></Card>
            <Card className="border-sky-100/50 shadow-sm rounded-2xl sm:rounded-3xl bg-white"><CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center text-center sm:text-left"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-2xl flex items-center justify-center"><GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-teal-600" /></div><div><p className="text-xs sm:text-sm font-semibold text-slate-400">Giáo viên</p><h3 className="text-xl sm:text-2xl font-black text-sky-950">{dashboardStats.teachers}</h3></div></CardContent></Card>
            <Card className="border-sky-100/50 shadow-sm rounded-2xl sm:rounded-3xl bg-white"><CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center text-center sm:text-left"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-2xl flex items-center justify-center"><School className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" /></div><div><p className="text-xs sm:text-sm font-semibold text-slate-400">Lớp học</p><h3 className="text-xl sm:text-2xl font-black text-sky-950">{classesList.length}</h3></div></CardContent></Card>
            <Card className="border-sky-100/50 shadow-sm rounded-2xl sm:rounded-3xl bg-white"><CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center text-center sm:text-left"><div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-100 rounded-2xl flex items-center justify-center"><CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" /></div><div><p className="text-xs sm:text-sm font-semibold text-slate-400">Lượt nộp bài</p><h3 className="text-xl sm:text-2xl font-black text-sky-950">{dashboardStats.submissions}</h3></div></CardContent></Card>
          </div>
        )}

        {/* THI ĐUA */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-sky-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-sky-950 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Thi đua toàn trường</h2>
              </div>
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <Select value={lbTimeFilter} onValueChange={setLbTimeFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[120px] border-none font-bold text-sky-800 shadow-sm"><Calendar className="w-4 h-4 mr-2" /><span className="truncate">{lbTimeFilter === 'week' ? 'Tuần này' : lbTimeFilter === 'month' ? 'Tháng này' : lbTimeFilter === 'year' ? 'Năm nay' : 'Tất cả'}</span></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="week">Tuần này</SelectItem><SelectItem value="month">Tháng này</SelectItem><SelectItem value="year">Năm nay</SelectItem></SelectContent>
                </Select>
                <Select value={lbGradeFilter} onValueChange={setLbGradeFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[120px] border-none font-bold text-sky-800 shadow-sm"><Filter className="w-4 h-4 mr-2" /><span className="truncate">{lbGradeFilter === "all" ? "Tất cả Khối" : `Khối ${lbGradeFilter}`}</span></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingLb ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-sky-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
            ) : adminLeaderboard.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chưa có dữ liệu</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-black text-sky-900 text-lg uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Lớp xuất sắc nhất</h3>
                  {adminLeaderboard.slice(0, 3).map((cls, idx) => (
                    <Card key={cls._id} className={`border-none shadow-md rounded-2xl ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">{getRankMedal(idx)}</div><div><p className="font-black text-slate-800 text-lg">Lớp {cls.className}</p><p className="text-xs font-bold text-slate-500">{cls.totalTests} bài</p></div></div>
                         <div className="text-right"><p className="font-black text-2xl leading-none">{cls.averageScore}</p><p className="text-[10px] font-black uppercase opacity-60">Điểm TB</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-sky-100 overflow-hidden">
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

        {/* CÁC LỚP HỌC */}
        {activeTab === "classes" && (
          <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader className="bg-sky-50/80"><TableRow><TableHead className="pl-4 sm:pl-8 font-bold text-sky-800">Tên Lớp</TableHead><TableHead className="font-bold text-center text-sky-800">Khối</TableHead><TableHead className="font-bold text-center text-sky-800">Năm học</TableHead><TableHead className="font-bold text-center text-sky-800">Sĩ số</TableHead><TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>
                  {classesList.map(cls => (
                    <TableRow key={cls._id}>
                      <TableCell className="font-black text-base sm:text-lg pl-4 sm:pl-8 text-sky-900">{cls.name}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-sky-100 text-sky-700">Khối {cls.grade}</Badge></TableCell>
                      <TableCell className="text-center font-bold text-slate-600">{cls.academicYear}</TableCell>
                      <TableCell className="text-center"><span className="font-black px-3 py-1 rounded-lg bg-slate-50 text-slate-600">{cls.studentCount || 0}</span></TableCell>
                      <TableCell className="text-right pr-4 sm:pr-8"><Button onClick={() => handleDeleteClass(cls._id, cls.name)} variant="ghost" className="text-rose-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-5 w-5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* QUẢN LÝ TÀI KHOẢN */}
        {activeTab === "accounts" && (
          <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="bg-white border-b border-sky-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Button onClick={() => handleSubTabChange("all")} variant={subTab === "all" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "all" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Tất cả</Button>
                <Button onClick={() => handleSubTabChange("teacher")} variant={subTab === "teacher" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "teacher" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Giáo viên</Button>
                <Button onClick={() => handleSubTabChange("student")} variant={subTab === "student" ? "default" : "ghost"} className={`rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold ${subTab === "student" ? "bg-sky-500 text-white" : "text-slate-500"}`}>Học sinh</Button>
              </div>
              
              {(subTab === "student" || subTab === "all") && (
                <Button onClick={handleExportClassList} className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-10 w-full sm:w-auto"><Download className="w-4 h-4 mr-2"/> Xuất Excel Lớp</Button>
              )}
            </div>

            <div className="bg-slate-50/40 border-b border-sky-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row gap-4">
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
              <Table className="min-w-[600px]">
                <TableHeader className="bg-sky-50/50"><TableRow><TableHead className="pl-4 sm:pl-8 font-bold text-sky-800">Tên ĐN</TableHead><TableHead className="font-bold text-sky-800">Họ và tên</TableHead><TableHead className="font-bold text-sky-800">Vai trò</TableHead><TableHead className="font-bold text-sky-800">Phân công</TableHead><TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-bold text-sky-600 pl-4 sm:pl-8">{user.username}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{user.fullName}</TableCell>
                      <TableCell><Badge className={`${user.role === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-sky-100 text-sky-700'}`}>{user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</Badge></TableCell>
                      <TableCell className="text-slate-500 font-medium">{user.role === 'student' ? (user.grade ? `Khối ${user.grade} - ${renderClassName(user)}` : "Chưa phân lớp") : (user.subject || "Chưa phân công")}</TableCell>
                      <TableCell className="text-right pr-4 sm:pr-8">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button onClick={() => openEditDialog(user)} variant="ghost" size="icon" className="h-8 w-8 text-sky-500 rounded-xl"><Edit className="h-4 w-4" /></Button>
                          <Button onClick={() => handleDeleteUser(user._id, user.fullName)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
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
    </div>
  );
};

export default AdminDashboard;