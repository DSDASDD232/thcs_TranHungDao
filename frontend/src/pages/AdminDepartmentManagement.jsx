import React, { useState, useEffect } from "react";
import axios from "../lib/axios";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, UserCog, Search, Download, Layers, Unlock, Save, Plus, X, BookOpen, ShieldAlert, Lock } from "lucide-react";

// CẤU HÌNH TỔ (Chỉ giữ lại tên Tổ lớn, loại bỏ hoàn toàn môn học cứng)
const DEPARTMENT_CONFIG = {
  KHTN: { name: "Tổ KHTN" },
  KHXH: { name: "Tổ KHXH" }
};

const AdminDepartmentManagement = ({ teachersList, fetchData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Quản lý danh mục môn học
  const [subjectList, setSubjectList] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDept, setNewSubjectDept] = useState("KHTN");
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  
  // State Khóa/Mở khóa Xóa môn học hệ thống
  const [isSubjectEditMode, setIsSubjectEditMode] = useState(false);

  // State Quản lý chế độ Sửa (Edit Mode) cho từng Giáo viên
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [tempEditData, setTempEditData] = useState({ department: "", subjects: [] });
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ================== LẤY DANH MỤC MÔN HỌC TỪ DB ==================
  const fetchSubjects = async () => {
    try {
        const res = await axios.get("/admin/subjects", getHeader());
        setSubjectList(res.data);
    } catch (error) {
        console.error("Lỗi lấy danh mục môn học:", error);
    }
  };

  useEffect(() => {
      fetchSubjects();
  }, []);

  const handleAddSubject = async () => {
      if (!newSubjectName.trim() || !newSubjectDept) return alert("Vui lòng nhập tên và chọn tổ!");
      setIsLoadingSubjects(true);
      try {
          await axios.post("/admin/subjects", { name: newSubjectName, department: newSubjectDept }, getHeader());
          setNewSubjectName("");
          await fetchSubjects();
      } catch (error) {
          alert(error.response?.data?.message || "Lỗi thêm môn học!");
      } finally {
          setIsLoadingSubjects(false);
      }
  };

  // Hàm xóa môn học với Cảnh báo mạnh
  const handleDeleteSubject = async (id, name) => {
      const confirmMsg = `🚨 CẢNH BÁO NGUY HIỂM:\n\nBạn đang chuẩn bị xóa môn "${name}" khỏi hệ thống!\nNếu có giáo viên nào đang được phân công môn này, dữ liệu của họ có thể bị ảnh hưởng.\n\nBạn có CHẮC CHẮN muốn xóa?`;
      if (!window.confirm(confirmMsg)) return;
      
      try {
          await axios.delete(`/admin/subjects/${id}`, getHeader());
          await fetchSubjects();
          // Cập nhật lại danh sách giáo viên để clear môn đã xóa khỏi giao diện
          await fetchData(); 
      } catch (error) {
          alert("Lỗi khi xóa môn học!");
      }
  };

  // ================== LOGIC GIÁO VIÊN ==================
  const getTeacherSubjects = (teacher) => {
    if (Array.isArray(teacher.subjects)) return teacher.subjects;
    if (teacher.subject) return [teacher.subject]; 
    return [];
  };

  const handleOpenEdit = (teacher) => {
    setEditingTeacherId(teacher._id);
    setTempEditData({
      department: teacher.department || "",
      subjects: getTeacherSubjects(teacher)
    });
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
    setTempEditData({ department: "", subjects: [] });
  };

  const handleSaveTeacher = async (teacherId) => {
    setIsSavingTeacher(true);
    try {
      await axios.put(`/admin/users/${teacherId}`, { 
        department: tempEditData.department === "none" ? "" : tempEditData.department, 
        subjects: tempEditData.subjects 
      }, getHeader());
      
      await fetchData(); 
      setEditingTeacherId(null);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật tổ bộ môn!");
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const toggleSubjectSelect = (subName) => {
    const isSelected = tempEditData.subjects.includes(subName);
    setTempEditData(prev => ({
      ...prev,
      subjects: isSelected ? prev.subjects.filter(s => s !== subName) : [...prev.subjects, subName]
    }));
  };

  // ================== XUẤT EXCEL ==================
  const handleExportExcel = async () => {
    if (filteredTeachers.length === 0) return alert("Không có dữ liệu để xuất!");

    const adminName = localStorage.getItem("fullName") || "Quản trị viên";
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Phân bổ chuyên môn', { views: [{ showGridLines: false }] });

    sheet.columns = [ { width: 10 }, { width: 25 }, { width: 30 }, { width: 25 }, { width: 35 }, { width: 35 } ];

    sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
    sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "Độc lập - Tự do - Hạnh phúc"]);
    sheet.mergeCells('A1:C1'); sheet.mergeCells('A2:C2');
    sheet.mergeCells('D1:F1'); sheet.mergeCells('D2:F2');

    const formatHeader = (rowNum) => {
      const row = sheet.getRow(rowNum);
      row.eachCell(cell => {
        cell.font = { name: 'Times New Roman', size: 12, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    };
    formatHeader(1); formatHeader(2);
    sheet.getCell('D2').font = { name: 'Times New Roman', size: 12, bold: true, underline: true };

    sheet.addRow([]);

    const titleRow = sheet.addRow(["DANH SÁCH PHÂN BỔ TỔ CHUYÊN MÔN & MÔN HỌC GIÁO VIÊN"]);
    sheet.mergeCells('A4:F4');
    titleRow.height = 35;
    const titleCell = sheet.getCell('A4');
    titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow([]); 

    const tableHeaders = ["STT", "Tài khoản", "Họ và tên", "Tổ chuyên môn", "Môn giảng dạy", "Lớp đang phụ trách"];
    const headerRow = sheet.addRow(tableHeaders);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    filteredTeachers.forEach((t, index) => {
      const assignedStr = t.assignedClasses && t.assignedClasses.length > 0 
        ? t.assignedClasses.map(c => c.name || c).join(", ") 
        : "Chưa có lớp";

      const subs = getTeacherSubjects(t);
      const rowData = [
        index + 1,
        t.username,
        t.fullName,
        t.department ? (t.department === "KHTN" ? "Tổ KHTN" : "Tổ KHXH") : "Chưa phân tổ",
        subs.length > 0 ? subs.join(", ") : "Chưa đăng ký môn",
        assignedStr
      ];

      const row = sheet.addRow(rowData);
      row.height = 25;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 12 };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        if (colNumber === 1 || colNumber === 4 || colNumber === 5) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        else cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      });
    });

    sheet.addRow([]); 

    const today = new Date();
    const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;
    
    const signDateRow = sheet.addRow(["", "", "", "", "", dateStr]);
    sheet.mergeCells(`E${signDateRow.number}:F${signDateRow.number}`);
    sheet.getCell(`E${signDateRow.number}`).font = { name: 'Times New Roman', size: 12, italic: true };
    sheet.getCell(`E${signDateRow.number}`).alignment = { horizontal: 'center' };

    const roleRow = sheet.addRow(["", "", "", "", "", "Quản trị viên"]);
    sheet.mergeCells(`E${roleRow.number}:F${roleRow.number}`);
    sheet.getCell(`E${roleRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`E${roleRow.number}`).alignment = { horizontal: 'center' };

    sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); 

    const nameRow = sheet.addRow(["", "", "", "", "", adminName]);
    sheet.mergeCells(`E${nameRow.number}:F${nameRow.number}`);
    sheet.getCell(`E${nameRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`E${nameRow.number}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Bao_Cao_Phan_Bo_To_Chuyen_Mon.xlsx`);
  };

  // ================== FILTER & STATS ==================
  const filteredTeachers = teachersList.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return ((t.fullName && t.fullName.toLowerCase().includes(term)) || (t.username && t.username.toLowerCase().includes(term)));
  });

  const khtnCount = teachersList.filter(t => t.department === "KHTN").length;
  const khxhCount = teachersList.filter(t => t.department === "KHXH").length;
  
  // CHỈ LẤY MÔN TỪ DATABASE (Loại bỏ mảng fix cứng)
  const khtnSubjects = subjectList.filter(s => s.department === "KHTN");
  const khxhSubjects = subjectList.filter(s => s.department === "KHXH");

  return (
    <div className="space-y-6">
      
      {/* 1. KHU VỰC THỐNG KÊ SỐ LƯỢNG GIÁO VIÊN THEO TỔ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* TỔ KHTN */}
        <Card className="bg-white border-blue-100 shadow-sm rounded-3xl overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-5 text-white flex justify-between items-center">
             <div>
                <h3 className="text-xl font-black flex items-center gap-2"><Layers className="w-6 h-6 opacity-80" /> TỔ KHOA HỌC TỰ NHIÊN</h3>
                <p className="text-blue-100 font-medium text-sm mt-1">Đang có {khtnCount} giáo viên</p>
             </div>
          </div>
          <CardContent className="p-5 flex-1 flex flex-col bg-slate-50/30">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Danh sách môn học</p>
              <div className="flex flex-wrap gap-2">
                  {khtnSubjects.length === 0 && <span className="text-sm text-slate-400 italic">Chưa có môn nào. Hãy thêm ở bên dưới!</span>}
                  {khtnSubjects.map(sub => (
                      <Badge key={sub._id} className="bg-white text-blue-700 border-blue-200 px-3 py-1.5 text-sm font-medium shadow-sm flex items-center gap-2 transition-all">
                          {sub.name}
                          {isSubjectEditMode && (
                             <div onClick={() => handleDeleteSubject(sub._id, sub.name)} className="bg-rose-100 text-rose-500 rounded-full p-1 cursor-pointer hover:bg-rose-500 hover:text-white transition-colors" title="Xóa môn này">
                               <X className="w-3 h-3" />
                             </div>
                          )}
                      </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TỔ KHXH */}
        <Card className="bg-white border-orange-100 shadow-sm rounded-3xl overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-5 text-white flex justify-between items-center">
             <div>
                <h3 className="text-xl font-black flex items-center gap-2"><Layers className="w-6 h-6 opacity-80" /> TỔ KHOA HỌC XÃ HỘI</h3>
                <p className="text-orange-100 font-medium text-sm mt-1">Đang có {khxhCount} giáo viên</p>
             </div>
          </div>
          <CardContent className="p-5 flex-1 flex flex-col bg-slate-50/30">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Danh sách môn học</p>
              <div className="flex flex-wrap gap-2">
                  {khxhSubjects.length === 0 && <span className="text-sm text-slate-400 italic">Chưa có môn nào. Hãy thêm ở bên dưới!</span>}
                  {khxhSubjects.map(sub => (
                      <Badge key={sub._id} className="bg-white text-orange-700 border-orange-200 px-3 py-1.5 text-sm font-medium shadow-sm flex items-center gap-2 transition-all">
                          {sub.name}
                          {isSubjectEditMode && (
                             <div onClick={() => handleDeleteSubject(sub._id, sub.name)} className="bg-rose-100 text-rose-500 rounded-full p-1 cursor-pointer hover:bg-rose-500 hover:text-white transition-colors" title="Xóa môn này">
                               <X className="w-3 h-3" />
                             </div>
                          )}
                      </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FORM THÊM MÔN & NÚT MỞ KHÓA XÓA MÔN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row w-full lg:w-auto items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600 font-bold shrink-0">
               <BookOpen className="w-5 h-5 text-sky-500" /> Quản lý danh mục Môn:
            </div>
            <div className="flex w-full sm:w-auto gap-2">
               <Select value={newSubjectDept} onValueChange={setNewSubjectDept}>
                  <SelectTrigger className="w-[140px] bg-slate-50 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="KHTN">Tổ KHTN</SelectItem><SelectItem value="KHXH">Tổ KHXH</SelectItem></SelectContent>
               </Select>
               <Input 
                  placeholder="Nhập tên môn..." 
                  value={newSubjectName} 
                  onChange={(e) => setNewSubjectName(e.target.value)} 
                  className="flex-1 sm:w-[200px] bg-slate-50" 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
               />
               <Button onClick={handleAddSubject} disabled={isLoadingSubjects} className="bg-sky-500 hover:bg-sky-600 text-white font-bold shrink-0">
                 {isLoadingSubjects ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 sm:mr-1" />} <span className="hidden sm:inline">Thêm</span>
               </Button>
            </div>
          </div>
          
          {/* NÚT KHÓA / MỞ KHÓA CHẾ ĐỘ XÓA MÔN */}
          <div className="w-full lg:w-auto flex justify-end border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-4">
             <Button 
                onClick={() => setIsSubjectEditMode(!isSubjectEditMode)} 
                variant="outline"
                className={`font-bold transition-all w-full sm:w-auto ${isSubjectEditMode ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
             >
                {isSubjectEditMode ? <><Unlock className="w-4 h-4 mr-2"/> Đang mở khóa Xóa</> : <><Lock className="w-4 h-4 mr-2"/> Mở khóa xóa môn</>}
             </Button>
          </div>
      </div>

      {/* 2. BẢNG PHÂN BỔ NHÂN SỰ CHÍNH */}
      <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-slate-500" /> Bảng phân công nhiệm vụ Giáo viên
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm tên hoặc tài khoản GV..." 
                className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleExportExcel} className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-sm px-6">
              <Download className="w-4 h-4 mr-2" /> Xuất Excel
            </Button>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto p-4">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center font-bold text-slate-500">STT</TableHead>
                <TableHead className="font-bold text-slate-500 w-56">Thông tin Giáo viên</TableHead>
                <TableHead className="font-bold text-slate-500 w-44">Tổ chuyên môn</TableHead>
                <TableHead className="font-bold text-slate-500">Môn giảng dạy</TableHead>
                <TableHead className="font-bold text-slate-500 text-right w-32 pr-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500">Không tìm thấy giáo viên nào.</TableCell></TableRow>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const isAssigned = teacher.assignedClasses && teacher.assignedClasses.length > 0;
                  const isEditing = editingTeacherId === teacher._id;
                  const teacherSubs = isEditing ? tempEditData.subjects : getTeacherSubjects(teacher);
                  const teacherDept = isEditing ? tempEditData.department : teacher.department;
                  
                  // Lấy danh sách môn tương ứng với Tổ để cho phép GV tích chọn
                  const availableSubjects = teacherDept === 'KHTN' ? khtnSubjects : teacherDept === 'KHXH' ? khxhSubjects : [];

                  return (
                    <TableRow key={teacher._id} className={`transition-colors ${isEditing ? 'bg-sky-50/50' : 'hover:bg-slate-50/50'}`}>
                      <TableCell className="text-center font-bold text-slate-400 align-top pt-5">{index + 1}</TableCell>
                      
                      {/* THÔNG TIN GV */}
                      <TableCell className="align-top pt-4">
                         <p className="font-bold text-slate-700">{teacher.fullName}</p>
                         <p className="text-sky-600 font-medium text-xs mt-0.5">{teacher.username}</p>
                      </TableCell>
                      
                      {/* CỘT 1: CHỌN TỔ LỚN */}
                      <TableCell className="align-top pt-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <Select 
                              value={teacherDept || "none"} 
                              onValueChange={(val) => setTempEditData({ department: val === "none" ? "" : val, subjects: [] })}
                              disabled={isAssigned}
                            >
                              <SelectTrigger className={`w-full h-10 rounded-xl bg-white border-slate-200 font-bold ${
                                teacherDept === 'KHTN' ? 'text-blue-600 border-blue-200' : 
                                teacherDept === 'KHXH' ? 'text-orange-600 border-orange-200' : 'text-slate-500'
                              } ${isAssigned ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}>
                                <SelectValue>
                                  {teacherDept === "KHTN" ? "Tổ KHTN" : teacherDept === "KHXH" ? "Tổ KHXH" : "Chưa chọn Tổ"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-rose-500 font-medium">-- Rút khỏi Tổ --</SelectItem>
                                <SelectItem value="KHTN" className="font-bold text-blue-600">Tổ KHTN</SelectItem>
                                <SelectItem value="KHXH" className="font-bold text-orange-600">Tổ KHXH</SelectItem>
                              </SelectContent>
                            </Select>
                            {isAssigned && <span className="text-[10px] text-rose-500 italic font-medium leading-tight">Đang có lớp, không được đổi tổ</span>}
                          </div>
                        ) : (
                          <Badge className={`${teacherDept === 'KHTN' ? 'bg-blue-100 text-blue-700' : teacherDept === 'KHXH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'} text-xs font-bold shadow-none border-0`}>
                            {teacherDept === 'KHTN' ? 'Tổ KHTN' : teacherDept === 'KHXH' ? 'Tổ KHXH' : 'Chưa phân tổ'}
                          </Badge>
                        )}
                      </TableCell>
                      
                      {/* CỘT 2: CHỌN MÔN (MULTI-SELECT BADGES) */}
                      <TableCell className="align-top pt-4">
                        {isEditing ? (
                          teacherDept ? (
                            <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                              {availableSubjects.map((sub) => {
                                const isSelected = teacherSubs.includes(sub.name);
                                return (
                                  <button
                                    key={sub._id}
                                    type="button"
                                    disabled={isSavingTeacher}
                                    onClick={() => toggleSubjectSelect(sub.name)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                      isSelected
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-50"
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                );
                              })}
                              {availableSubjects.length === 0 && <span className="text-xs text-slate-400 italic">Tổ này chưa có môn nào. Hãy thêm môn ở trên!</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic flex items-center mt-2"><ShieldAlert className="w-3 h-3 mr-1 text-amber-500"/> Vui lòng chọn Tổ lớn trước</span>
                          )
                        ) : (
                          <div className="flex flex-wrap gap-1">
                             {teacherSubs.length > 0 ? (
                                teacherSubs.map((sub, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[11px]">
                                     {sub}
                                  </Badge>
                                ))
                             ) : <span className="text-xs text-slate-400 italic mt-1 block">Chưa đăng ký môn</span>}
                          </div>
                        )}
                      </TableCell>

                      {/* CỘT 3: THAO TÁC KHÓA / MỞ KHÓA */}
                      <TableCell className="align-top pt-3 pr-4 text-right">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-end">
                            <Button 
                              onClick={() => handleSaveTeacher(teacher._id)} 
                              disabled={isSavingTeacher}
                              className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-bold w-[110px]"
                            >
                              {isSavingTeacher ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5"/> Lưu & Khóa</>}
                            </Button>
                            <Button onClick={handleCancelEdit} variant="ghost" className="h-7 text-xs text-slate-500 hover:text-rose-500 px-2">Hủy bỏ</Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleOpenEdit(teacher)} 
                            variant="outline" 
                            className="h-9 border-sky-200 text-sky-600 hover:bg-sky-50 font-bold w-[110px]"
                          >
                            <Unlock className="w-4 h-4 mr-1.5" /> Mở khóa
                          </Button>
                        )}
                      </TableCell>

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDepartmentManagement;