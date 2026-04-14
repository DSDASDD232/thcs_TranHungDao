import React, { useState } from "react";
import axios from "../lib/axios";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Trash2, Edit, PlusCircle, Search, Eye, UserCheck, Users, Download, UserMinus, ShieldCheck, ArrowRightLeft, School
} from "lucide-react";

// ==========================================
// HÀM XUẤT EXCEL CHUẨN FORM (DANH SÁCH HỌC SINH TRONG LỚP)
// ==========================================
const exportFormalExcel = async (dataList, reportTitle, fileName, adminName = "Quản trị viên") => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu để xuất báo cáo!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh Sách', { views: [{ showGridLines: false }] });

  sheet.columns = [ { width: 10 }, { width: 35 }, { width: 35 } ];

  sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "Độc lập - Tự do - Hạnh phúc"]);
  sheet.mergeCells('A1:B1'); sheet.mergeCells('A2:B2'); 

  const formatGovHeader = (rowNum, isBold) => {
    const row = sheet.getRow(rowNum); row.height = 25; 
    row.eachCell(cell => { cell.font = { name: 'Times New Roman', size: 12, bold: isBold }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
  };
  formatGovHeader(1, true); formatGovHeader(2, true);
  sheet.getCell('C2').font = { name: 'Times New Roman', size: 13, bold: true, underline: true }; 

  sheet.addRow([]); 
  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells('A4:C4'); titleRow.height = 40;
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
  sheet.addRow(["", "", dateStr]);
  sheet.getCell(`C${dateRowNum}`).font = { name: 'Times New Roman', size: 12, italic: true };
  sheet.getCell(`C${dateRowNum}`).alignment = { horizontal: 'center' };

  const signRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "Người xuất danh sách"]);
  sheet.getCell(`C${signRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`C${signRowNum}`).alignment = { horizontal: 'center' };

  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);
  const nameRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", adminName]);
  sheet.getCell(`C${nameRowNum}`).font = { name: 'Times New Roman', size: 12, bold: true };
  sheet.getCell(`C${nameRowNum}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileName}.xlsx`);
};

// ==========================================
// HÀM XUẤT EXCEL CHUẨN FORM (TỔNG HỢP CÁC LỚP)
// ==========================================
const exportClassesListExcel = async (dataList, reportTitle, fileName, adminName = "Quản trị viên") => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu để xuất báo cáo!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh Sách Lớp', { views: [{ showGridLines: false }] });

  sheet.columns = [ { width: 10 }, { width: 25 }, { width: 20 }, { width: 25 }, { width: 40 } ];

  sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "Độc lập - Tự do - Hạnh phúc"]);
  sheet.mergeCells('A1:C1'); sheet.mergeCells('A2:C2'); 
  sheet.mergeCells('D1:E1'); sheet.mergeCells('D2:E2');

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
      if(colNumber === 1 || colNumber === 3 || colNumber === 4) cell.alignment = { vertical: 'middle', horizontal: 'center' };
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


const AdminClassManagement = ({ classesList, teachersList, fetchData }) => {
  const [loading, setLoading] = useState(false);
  const [searchClassQuery, setSearchClassQuery] = useState("");
  const [filterClassGrade, setFilterClassGrade] = useState("all");

  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", grade: "6", academicYear: "" });
  const [editClass, setEditClass] = useState(null);

  // VIEW STUDENTS
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState(""); 

  // TRANSFER STUDENT
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState(null);
  const [targetGrade, setTargetGrade] = useState(""); 
  const [targetClassId, setTargetClassId] = useState("");

  const [isAssignTeacherDialogOpen, setIsAssignTeacherDialogOpen] = useState(false);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState(null);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState([]);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");

  const adminName = localStorage.getItem("fullName") || "Quản trị viên";

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const currentYear = new Date().getFullYear();
  const suggestedYears = Array.from({ length: 5 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);

  // ==========================
  // THAO TÁC LỚP HỌC
  // ==========================
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name.startsWith(newClass.grade)) return alert(`❌ Sai định dạng!\nTên lớp phải bắt đầu bằng số Khối.\nVí dụ: Khối ${newClass.grade} -> Lớp ${newClass.grade}A1`);
    setLoading(true);
    try {
      await axios.post("/classes/create", newClass, getHeader());
      alert("✅ Đã tạo lớp học thành công!"); 
      setIsClassDialogOpen(false); 
      setNewClass({ name: "", grade: "6", academicYear: "" }); 
      fetchData(); 
    } catch (error) { 
      alert(error.response?.data?.message || "Lỗi tạo lớp!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editClass.name.startsWith(editClass.grade)) return alert(`❌ Sai định dạng!\nTên lớp phải bắt đầu bằng số Khối.\nVí dụ: Khối ${editClass.grade} -> Lớp ${editClass.grade}A1`);
    setLoading(true);
    try {
      await axios.put(`/classes/${editClass._id}`, editClass, getHeader());
      alert("✅ Cập nhật lớp học thành công!");
      setIsEditClassDialogOpen(false);
      fetchData();
    } catch (err) {
      alert("Lỗi cập nhật lớp!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp: ${className}? Mọi dữ liệu liên quan có thể bị ảnh hưởng.`)) return;
    try {
      await axios.delete(`/classes/${classId}`, getHeader());
      fetchData();
      alert("✅ Đã xóa lớp thành công!");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xóa lớp học!");
    }
  };

  // 👉 HÀM XUẤT EXCEL DANH SÁCH LỚP HỌC (TỔNG HỢP)
  const handleExportAllClasses = async () => {
    if (filteredClassesDisplay.length === 0) return alert("Không có dữ liệu lớp học để xuất!");

    const dataToExport = filteredClassesDisplay.map((cls, index) => {
      const classAssignedTeachers = teachersList.filter(t => t.assignedClasses?.some(c => (c._id || c) === cls._id));
      const teacherNames = classAssignedTeachers.length > 0 
        ? classAssignedTeachers.map(t => t.fullName).join(", ") 
        : "Chưa phân công";

      return {
        "STT": index + 1,
        "Tên Lớp": cls.name,
        "Khối": `Khối ${cls.grade}`,
        "Sĩ số": `${cls.studentCount || 0} em`,
        "Giáo viên phụ trách": teacherNames
      };
    });

    let title = filterClassGrade === "all" ? "DANH SÁCH TỔNG HỢP LỚP HỌC TOÀN TRƯỜNG" : `DANH SÁCH LỚP HỌC KHỐI ${filterClassGrade}`;
    await exportClassesListExcel(dataToExport, title, `Danh_Sach_Lop_Hoc`, adminName);
  };

  // ==========================
  // THAO TÁC HỌC SINH & EXCEL
  // ==========================
  const handleViewClassStudents = async (cls) => {
      setSelectedClassForStudents(cls);
      setStudentsInClass([]);
      setStudentSearchQuery(""); 
      setIsStudentListOpen(true);
      try {
          const res = await axios.get(`/classes/${cls._id}/students`, getHeader());
          setStudentsInClass(res.data.students || []);
      } catch (err) {
          console.error("Lỗi tải học sinh", err);
      }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
      if (!window.confirm(`Xóa hoàn toàn tài khoản học sinh: ${studentName}? Hành động này sẽ xóa mọi bài nộp của học sinh này.`)) return;
      try {
          await axios.delete(`/admin/users/${studentId}`, getHeader());
          setStudentsInClass(prev => prev.filter(s => s._id !== studentId)); 
          fetchData(); 
          alert("✅ Đã xóa tài khoản học sinh thành công!");
      } catch (err) {
          alert("Lỗi xóa tài khoản!");
      }
  };

  const handleOpenTransferDialog = (student) => {
      setStudentToTransfer(student);
      setTargetGrade(selectedClassForStudents?.grade || "");
      setTargetClassId("");
      setIsTransferDialogOpen(true);
  };

  const submitTransferStudent = async () => {
      if (!targetClassId) return alert("Vui lòng chọn lớp đích để chuyển đến!");
      setLoading(true);
      try {
          const targetClassObj = classesList.find(c => String(c._id) === targetClassId);
          
          const payload = {
              ...studentToTransfer,
              classId: targetClassId,
              grade: targetClassObj.grade 
          };

          await axios.put(`/admin/users/${studentToTransfer._id}`, payload, getHeader());
          
          alert(`✅ Đã chuyển học sinh sang lớp ${targetClassObj.name} thành công!`);
          
          setStudentsInClass(prev => prev.filter(s => s._id !== studentToTransfer._id));
          setIsTransferDialogOpen(false);
          fetchData(); 
      } catch (error) {
          alert("Lỗi khi chuyển lớp!");
      } finally {
          setLoading(false);
      }
  };

  const handleExportClassList = async () => {
      if (studentsInClass.length === 0) return alert("Lớp hiện chưa có học sinh nào!");
      const dataToExport = studentsInClass.map((s, idx) => ({
          "STT": idx + 1,
          "Tài khoản đăng nhập": s.username,
          "Họ và Tên": s.fullName
      }));
      await exportFormalExcel(dataToExport, `DANH SÁCH LỚP ${selectedClassForStudents.name}`, `Danh_Sach_Lop_${selectedClassForStudents.name}`, adminName);
  };

  // ==========================
  // THAO TÁC PHÂN CÔNG GIÁO VIÊN
  // ==========================
  const handleOpenAssignTeacher = async (cls) => {
      setSelectedClassForAssign(cls);
      setAssignedTeacherIds([]);
      setAssignSearchQuery("");
      setIsAssignTeacherDialogOpen(true);
      
      const currentAssigned = teachersList.filter(t => {
         if(!t.assignedClasses) return false;
         return t.assignedClasses.some(ac => (ac._id || ac) === cls._id);
      }).map(t => t._id);
      
      setAssignedTeacherIds(currentAssigned);
  };

  const handleAddTeacherToClass = (teacherId) => {
      setAssignedTeacherIds(prev => [...prev, teacherId]);
  };

  const handleRemoveTeacherFromClass = (teacherId) => {
      setAssignedTeacherIds(prev => prev.filter(id => id !== teacherId));
  };

  const handleSaveTeacherAssignment = async () => {
      setLoading(true);
      try {
          await axios.post(`/classes/${selectedClassForAssign._id}/assign-teachers`, { teacherIds: assignedTeacherIds }, getHeader());
          alert("✅ Phân công giáo viên thành công!");
          setIsAssignTeacherDialogOpen(false);
          fetchData(); 
      } catch (err) {
          alert("Lỗi phân công giáo viên!");
      } finally {
          setLoading(false);
      }
  };

  const filteredClassesDisplay = classesList.filter(c => {
     const matchName = c.name.toLowerCase().includes(searchClassQuery.toLowerCase());
     const matchGrade = filterClassGrade === "all" || String(c.grade) === filterClassGrade;
     return matchName && matchGrade;
  });

  const assignedTeachers = teachersList.filter(t => assignedTeacherIds.includes(t._id));
  const unassignedTeachers = teachersList.filter(t => !assignedTeacherIds.includes(t._id) && (t.fullName.toLowerCase().includes(assignSearchQuery.toLowerCase()) || t.username.toLowerCase().includes(assignSearchQuery.toLowerCase())));

  const filteredStudentsInClass = studentsInClass.filter(s => 
     s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
     s.username.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  return (
    <>
      <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
        <div className="bg-white border-b border-sky-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Tìm tên Lớp..." className="pl-10 rounded-xl bg-white h-11" value={searchClassQuery} onChange={(e) => setSearchClassQuery(e.target.value)} />
            </div>
            <Select value={filterClassGrade} onValueChange={setFilterClassGrade}>
              <SelectTrigger className="w-[110px] sm:w-[140px] rounded-xl bg-white h-11"><span className="truncate">{filterClassGrade === "all" ? "Tất cả Khối" : `Khối ${filterClassGrade}`}</span></SelectTrigger>
              <SelectContent><SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
             {/* 👉 NÚT XUẤT EXCEL DANH SÁCH LỚP Ở ĐÂY */}
             <Button onClick={handleExportAllClasses} className="bg-teal-500 hover:bg-teal-600 text-white h-11 px-4 sm:px-6 rounded-xl shadow-md font-bold whitespace-nowrap">
               <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden sm:inline">Xuất Excel</span>
             </Button>

             <Button onClick={() => { setNewClass({ name: "", grade: "6", academicYear: suggestedYears[0] }); setIsClassDialogOpen(true); }} className="bg-sky-500 whitespace-nowrap hover:bg-sky-600 text-white h-11 px-4 sm:px-6 rounded-xl shadow-md flex items-center font-bold">
               <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Tạo lớp mới
             </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-sky-50/80"><TableRow><TableHead className="pl-4 sm:pl-8 font-bold text-sky-800">Tên Lớp</TableHead><TableHead className="font-bold text-center text-sky-800">Khối</TableHead><TableHead className="font-bold text-center text-sky-800">Năm học</TableHead><TableHead className="font-bold text-center text-sky-800">Giáo viên phụ trách</TableHead><TableHead className="font-bold text-center text-sky-800">Sĩ số</TableHead><TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800">Thao tác</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredClassesDisplay.map(cls => {
                const classAssignedTeachers = teachersList.filter(t => t.assignedClasses?.some(c => (c._id || c) === cls._id));
                return (
                <TableRow key={cls._id} className="hover:bg-sky-50/50">
                  <TableCell className="font-black text-base sm:text-lg pl-4 sm:pl-8 text-sky-900">{cls.name}</TableCell>
                  <TableCell className="text-center"><Badge className="bg-sky-100 text-sky-700 shadow-none border-0">Khối {cls.grade}</Badge></TableCell>
                  <TableCell className="text-center font-bold text-slate-600">{cls.academicYear}</TableCell>
                  <TableCell className="text-center">
                    {classAssignedTeachers.length > 0 ? (
                       <div className="flex flex-wrap items-center justify-center gap-1">
                          {classAssignedTeachers.slice(0, 2).map(t => (
                             <Badge key={t._id} variant="outline" className="bg-white border-teal-200 text-teal-700 text-xs font-semibold">{t.fullName}</Badge>
                          ))}
                          {classAssignedTeachers.length > 2 && (
                             <Badge variant="outline" className="bg-slate-100 text-slate-500 text-xs">+{classAssignedTeachers.length - 2}</Badge>
                          )}
                       </div>
                    ) : (
                       <span className="text-xs font-medium text-slate-400 italic">Chưa phân công</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center"><span className="font-black px-3 py-1 rounded-lg bg-slate-50 text-slate-600">{cls.studentCount || 0} em</span></TableCell>
                  <TableCell className="text-right pr-4 sm:pr-8">
                    <div className="flex justify-end gap-1">
                      <Button onClick={() => handleViewClassStudents(cls)} variant="ghost" size="icon" title="Xem danh sách lớp" className="h-8 w-8 text-sky-500 rounded-xl hover:bg-sky-100"><Eye className="h-4 w-4" /></Button>
                      <Button onClick={() => handleOpenAssignTeacher(cls)} variant="ghost" size="icon" title="Phân công giáo viên" className="h-8 w-8 text-amber-500 rounded-xl hover:bg-amber-100"><UserCheck className="h-4 w-4" /></Button>
                      <Button onClick={() => { setEditClass({ ...cls }); setIsEditClassDialogOpen(true); }} variant="ghost" size="icon" title="Sửa Lớp" className="h-8 w-8 text-teal-500 rounded-xl hover:bg-teal-100"><Edit className="h-4 w-4" /></Button>
                      <Button onClick={() => handleDeleteClass(cls._id, cls.name)} variant="ghost" size="icon" title="Xóa Lớp" className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </Card>

      <datalist id="year-options">
          {suggestedYears.map(y => <option key={y} value={y} />)}
      </datalist>

      {/* DIALOG TẠO LỚP */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none">
          <DialogHeader><DialogTitle className="text-2xl font-black text-sky-900">Thêm Lớp Học</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-5 pt-4">
            <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Tên Lớp</label><Input placeholder="" className="h-12 rounded-xl border-sky-100 focus-visible:ring-sky-500 text-lg font-bold uppercase bg-white" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value.toUpperCase()})} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Khối</label><Select value={newClass.grade} onValueChange={(v) => setNewClass({...newClass, grade: v})}><SelectTrigger className="h-12 rounded-xl font-bold border-sky-100 bg-white"><span className="truncate">{newClass.grade ? `Khối ${newClass.grade}` : "Chọn Khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select></div>
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-500">Năm học</label>
                 <Input list="year-options" placeholder="VD: 2024-2025" className="h-12 rounded-xl font-bold border-sky-100 bg-white" value={newClass.academicYear} onChange={(e) => setNewClass({...newClass, academicYear: e.target.value})} required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-600 font-black text-lg text-white mt-4 shadow-md">{loading ? <Loader2 className="animate-spin" /> : "Xác nhận tạo lớp"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG SỬA LỚP */}
      <Dialog open={isEditClassDialogOpen} onOpenChange={setIsEditClassDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none">
          <DialogHeader><DialogTitle className="text-2xl font-black text-sky-900">Sửa Thông Tin Lớp</DialogTitle></DialogHeader>
          {editClass && (
            <form onSubmit={handleUpdateClass} className="space-y-5 pt-4">
              <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Tên Lớp</label><Input placeholder="VD: 9A1" className="h-12 rounded-xl border-sky-100 focus-visible:ring-sky-500 text-lg font-bold uppercase bg-white" value={editClass.name} onChange={(e) => setEditClass({...editClass, name: e.target.value.toUpperCase()})} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-slate-500">Khối</label><Select value={editClass.grade} onValueChange={(v) => setEditClass({...editClass, grade: v})}><SelectTrigger className="h-12 rounded-xl font-bold border-sky-100 bg-white"><span className="truncate">{editClass.grade ? `Khối ${editClass.grade}` : "Chọn Khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select></div>
                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-500">Năm học</label>
                   <Input list="year-options" placeholder="VD: 2024-2025" className="h-12 rounded-xl font-bold border-sky-100 bg-white" value={editClass.academicYear} onChange={(e) => setEditClass({...editClass, academicYear: e.target.value})} required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl bg-teal-500 hover:bg-teal-600 font-black text-lg text-white mt-4 shadow-md">{loading ? <Loader2 className="animate-spin" /> : "Lưu thay đổi"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG XEM DANH SÁCH LỚP */}
      <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
        <DialogContent className="sm:max-w-[750px] w-[95%] max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border-none p-0 bg-slate-50">
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-white flex flex-col gap-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2">
                <Users className="w-6 h-6 text-sky-500"/> Danh sách Lớp {selectedClassForStudents?.name}
              </DialogTitle>
              <Button onClick={handleExportClassList} className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-10 shadow-sm w-full sm:w-auto">
                 <Download className="w-4 h-4 mr-2"/> Xuất Excel
              </Button>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Tìm theo tên hoặc tài khoản..." className="pl-9 h-11 rounded-xl bg-slate-50 border-sky-100 focus-visible:ring-sky-500" value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} />
            </div>
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {filteredStudentsInClass.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">{studentsInClass.length === 0 ? "Lớp chưa có học sinh nào." : "Không tìm thấy học sinh phù hợp."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow><TableHead className="font-bold text-slate-700 w-16 text-center">STT</TableHead><TableHead className="font-bold text-slate-700">Tài khoản</TableHead><TableHead className="font-bold text-slate-700">Họ và Tên</TableHead><TableHead className="font-bold text-slate-700 text-right pr-6">Thao tác</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredStudentsInClass.map((student, idx) => (
                        <TableRow key={student._id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-400 text-center">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-sky-600">{student.username}</TableCell>
                          <TableCell className="font-bold text-sky-900">{student.fullName}</TableCell>
                          <TableCell className="text-right pr-6">
                             <Button onClick={() => handleOpenTransferDialog(student)} variant="ghost" size="icon" title="Chuyển học sinh sang lớp khác" className="h-8 w-8 text-sky-500 hover:bg-sky-50 hover:text-sky-600 mr-1"><ArrowRightLeft className="h-4 w-4" /></Button>
                             <Button onClick={() => handleDeleteStudent(student._id, student.fullName)} variant="ghost" size="icon" title="Xóa khỏi lớp và Xóa tài khoản" className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-500"><UserMinus className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 👉 DIALOG CHUYỂN LỚP CHO HỌC SINH */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none">
          <DialogHeader><DialogTitle className="text-2xl font-black text-sky-900">Chuyển Lớp</DialogTitle></DialogHeader>
          <div className="pt-4 space-y-5">
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
               <p className="text-sm text-slate-500 font-medium">Học sinh:</p>
               <p className="font-black text-sky-900 text-lg">{studentToTransfer?.fullName} <span className="text-sm font-medium text-slate-500">({studentToTransfer?.username})</span></p>
               <p className="text-sm font-bold text-sky-600 mt-1">Đang học: Lớp {selectedClassForStudents?.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700">Khối</label>
                 <Select value={targetGrade} onValueChange={(val) => { setTargetGrade(val); setTargetClassId(""); }}>
                   <SelectTrigger className="h-12 rounded-xl font-bold border-sky-200 bg-white"><span className="truncate">{targetGrade ? `Khối ${targetGrade}` : "Chọn Khối"}</span></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700">Lớp Đích</label>
                 <Select value={targetClassId} onValueChange={setTargetClassId} disabled={!targetGrade}>
                   <SelectTrigger className="h-12 rounded-xl font-bold border-sky-200 bg-white">
                     <span className="truncate">{targetClassId ? classesList.find(c => String(c._id) === targetClassId)?.name : "Chọn Lớp"}</span>
                   </SelectTrigger>
                   <SelectContent>
                      {classesList.filter(c => String(c.grade) === String(targetGrade) && String(c._id) !== String(selectedClassForStudents?._id)).length === 0 ? (
                          <SelectItem value="none" disabled>Không có lớp khác</SelectItem>
                      ) : (
                          classesList.filter(c => String(c.grade) === String(targetGrade) && String(c._id) !== String(selectedClassForStudents?._id)).map(c => (
                              <SelectItem key={c._id} value={String(c._id)}>Lớp {c.name}</SelectItem>
                          ))
                      )}
                   </SelectContent>
                 </Select>
              </div>
            </div>

            <Button onClick={submitTransferStudent} disabled={loading || !targetClassId} className="w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-600 font-black text-lg text-white mt-4 shadow-md">
               {loading ? <Loader2 className="animate-spin" /> : "Xác nhận Chuyển"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG PHÂN CÔNG GIÁO VIÊN */}
      <Dialog open={isAssignTeacherDialogOpen} onOpenChange={setIsAssignTeacherDialogOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none p-4 sm:p-6 bg-slate-50">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500"/> Phân công Lớp {selectedClassForAssign?.name}
            </DialogTitle>
            <p className="text-slate-500 text-sm mt-1">Chỉ định giáo viên được phép quản lý và giao bài tập cho lớp này.</p>
          </DialogHeader>
          
          <div className="mt-4 space-y-6">
             <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm">
                <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-500"/> Đang phụ trách ({assignedTeachers.length})</h4>
                <div className="space-y-2">
                   {assignedTeachers.length === 0 ? (
                       <p className="text-slate-400 text-sm italic py-2">Lớp này hiện chưa có giáo viên nào phụ trách.</p>
                   ) : (
                       assignedTeachers.map(t => (
                           <div key={t._id} className="flex items-center justify-between bg-sky-50/50 border border-sky-100 p-3 rounded-xl">
                              <div>
                                 <p className="font-bold text-sky-900">{t.fullName}</p>
                                 <p className="text-xs text-slate-500">{t.username} • {t.subject ? `Tổ ${t.subject}` : "Chưa phân tổ"}</p>
                              </div>
                              <Button onClick={() => handleRemoveTeacherFromClass(t._id)} variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-100 font-bold px-3">Gỡ bỏ</Button>
                           </div>
                       ))
                   )}
                </div>
             </div>

             <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-slate-400"/> Thêm giáo viên khác</h4>
                <div className="relative mb-3">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input placeholder="Tìm tên giáo viên..." className="pl-9 bg-slate-50 border-slate-200 rounded-xl h-10" value={assignSearchQuery} onChange={(e) => setAssignSearchQuery(e.target.value)} />
                </div>
                
                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                   {unassignedTeachers.length === 0 ? (
                       <p className="text-slate-400 text-sm italic text-center py-4">Không tìm thấy giáo viên nào khác.</p>
                   ) : (
                       unassignedTeachers.map(t => (
                           <div key={t._id} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl hover:border-slate-300 transition-colors">
                              <div>
                                 <p className="font-bold text-slate-700">{t.fullName}</p>
                                 <p className="text-xs text-slate-400">{t.username} • {t.subject ? `Tổ ${t.subject}` : "Chưa phân tổ"}</p>
                              </div>
                              <Button onClick={() => handleAddTeacherToClass(t._id)} variant="outline" size="sm" className="text-sky-600 border-sky-200 hover:bg-sky-50 font-bold px-3">Thêm vào</Button>
                           </div>
                       ))
                   )}
                </div>
             </div>

             <Button onClick={handleSaveTeacherAssignment} disabled={loading} className="w-full h-14 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-lg text-white shadow-md">
                 {loading ? <Loader2 className="animate-spin mr-2" /> : "Lưu Thay Đổi Phân Công"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminClassManagement;