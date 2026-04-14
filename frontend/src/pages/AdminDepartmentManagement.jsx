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
import { Loader2, Library, UserCog, CheckCircle, Search, Download, Plus, X } from "lucide-react";

const AdminDepartmentManagement = ({ teachersList, fetchData }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [subjectList, setSubjectList] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

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
      if (!newSubjectName.trim()) return;
      setIsLoadingSubjects(true);
      try {
          await axios.post("/admin/subjects", { name: newSubjectName }, getHeader());
          setNewSubjectName("");
          await fetchSubjects();
      } catch (error) {
          alert(error.response?.data?.message || "Lỗi thêm môn học!");
      } finally {
          setIsLoadingSubjects(false);
      }
  };

  const handleDeleteSubject = async (id, name) => {
      if (!window.confirm(`Bạn có chắc chắn muốn xóa môn "${name}" khỏi hệ thống?`)) return;
      try {
          await axios.delete(`/admin/subjects/${id}`, getHeader());
          await fetchSubjects();
      } catch (error) {
          alert("Lỗi khi xóa môn học!");
      }
  };

  const handleUpdateSubject = async (teacherId, newSubject) => {
    setLoadingId(teacherId);
    try {
      await axios.put(`/admin/users/${teacherId}`, { subject: newSubject }, getHeader());
      await fetchData(); 
    } catch (error) {
      // 👉 Hiển thị thông báo lỗi (VD: Đang có lớp phụ trách) từ Backend
      const errorMsg = error.response?.data?.message || "Lỗi khi cập nhật tổ bộ môn!";
      alert(errorMsg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleExportExcel = async () => {
    if (filteredTeachers.length === 0) return alert("Không có dữ liệu để xuất!");

    // 👉 Định nghĩa adminName tại đây để tránh lỗi "is not defined"
    const adminName = localStorage.getItem("fullName") || "Quản trị viên";

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Phân bổ chuyên môn', { views: [{ showGridLines: false }] });

    sheet.columns = [
      { width: 10 }, { width: 25 }, { width: 35 }, { width: 20 }, { width: 35 }
    ];

    sheet.addRow(["UBND HUYỆN THỦY NGUYÊN", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
    sheet.addRow(["TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "Độc lập - Tự do - Hạnh phúc"]);
    sheet.mergeCells('A1:C1'); sheet.mergeCells('A2:C2');
    sheet.mergeCells('D1:E1'); sheet.mergeCells('D2:E2');

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

    const titleRow = sheet.addRow(["DANH SÁCH PHÂN BỔ TỔ CHUYÊN MÔN GIÁO VIÊN"]);
    sheet.mergeCells('A4:E4');
    titleRow.height = 35;
    const titleCell = sheet.getCell('A4');
    titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow([]); 

    const tableHeaders = ["STT", "Tài khoản", "Họ và tên", "Tổ môn", "Lớp đang phụ trách"];
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

      const rowData = [
        index + 1,
        t.username,
        t.fullName,
        t.subject || "Chưa phân tổ",
        assignedStr
      ];

      const row = sheet.addRow(rowData);
      row.height = 25;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 12 };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        if (colNumber === 1 || colNumber === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      });
    });

    sheet.addRow([]); 

    const today = new Date();
    const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;
    
    // 👉 ĐÃ SỬA: Dùng trực tiếp row.number thay vì roleRow
    const signDateRow = sheet.addRow(["", "", "", dateStr]);
    sheet.mergeCells(`D${signDateRow.number}:E${signDateRow.number}`);
    sheet.getCell(`D${signDateRow.number}`).font = { name: 'Times New Roman', size: 12, italic: true };
    sheet.getCell(`D${signDateRow.number}`).alignment = { horizontal: 'center' };

    const roleRow = sheet.addRow(["", "", "", "Quản trị viên"]);
    sheet.mergeCells(`D${roleRow.number}:E${roleRow.number}`);
    sheet.getCell(`D${roleRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`D${roleRow.number}`).alignment = { horizontal: 'center' };

    sheet.addRow([]); sheet.addRow([]); sheet.addRow([]); 

    const nameRow = sheet.addRow(["", "", "", adminName]);
    sheet.mergeCells(`D${nameRow.number}:E${nameRow.number}`);
    sheet.getCell(`D${nameRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`D${nameRow.number}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Bao_Cao_Phan_Bo_To_Chuyen_Mon.xlsx`);
  };

  const filteredTeachers = teachersList.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.fullName && t.fullName.toLowerCase().includes(term)) ||
      (t.username && t.username.toLowerCase().includes(term))
    );
  });

  const departmentStats = subjectList.reduce((acc, subject) => {
    acc[subject.name] = teachersList.filter(t => t.subject === subject.name).length;
    return acc;
  }, {});

  const unassignedCount = teachersList.filter(t => !t.subject).length;

  return (
    <div className="space-y-6">
      
      <Card className="border-sky-100/50 shadow-sm rounded-3xl bg-white overflow-hidden">
         <div className="bg-sky-50/50 p-4 border-b border-sky-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h3 className="font-bold text-sky-900 flex items-center gap-2">
                 <Library className="w-5 h-5 text-indigo-500" /> Cài đặt Danh mục Môn học hệ thống
               </h3>
               <p className="text-xs text-slate-500 mt-1">Danh sách này sẽ đồng bộ trên toàn bộ nền tảng.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-[350px]">
               <Input 
                 placeholder="Nhập tên môn học mới..." 
                 value={newSubjectName} 
                 onChange={(e) => setNewSubjectName(e.target.value)} 
                 className="h-10 bg-white" 
                 onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
               />
               <Button onClick={handleAddSubject} disabled={isLoadingSubjects} className="h-10 bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm font-bold">
                 {isLoadingSubjects ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Thêm
               </Button>
            </div>
         </div>
         <CardContent className="p-4 flex flex-wrap gap-2">
             {subjectList.length === 0 && <span className="text-sm text-slate-400 italic">Chưa có môn học nào. Hãy thêm mới!</span>}
             {subjectList.map(sub => (
                 <Badge key={sub._id} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-sm font-medium shadow-none group flex items-center gap-2">
                     {sub.name}
                     <div onClick={() => handleDeleteSubject(sub._id, sub.name)} className="bg-indigo-200 text-indigo-500 rounded-full p-0.5 cursor-pointer hover:bg-rose-500 hover:text-white transition-colors">
                        <X className="w-3 h-3" />
                     </div>
                 </Badge>
             ))}
         </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-rose-50 border-rose-100 shadow-none rounded-2xl">
            <CardContent className="p-4 text-center">
                <p className="text-xs font-bold text-rose-600 mb-1">Chưa phân tổ</p>
                <h3 className="text-xl font-black text-rose-700">{unassignedCount}</h3>
            </CardContent>
        </Card>
        {Object.entries(departmentStats).filter(([_, count]) => count > 0).map(([subjectName, count]) => (
          <Card key={subjectName} className="bg-slate-50 border-slate-100 shadow-none rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-bold text-slate-600 mb-1 truncate px-1" title={`Tổ ${subjectName}`}>Tổ {subjectName}</p>
              <h3 className="text-xl font-black text-slate-700">{count} GV</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-slate-500" /> Bảng phân bổ nhân sự
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
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center font-bold text-slate-500">STT</TableHead>
                <TableHead className="font-bold text-slate-500">Họ và tên Giáo viên</TableHead>
                <TableHead className="font-bold text-slate-500">Tài khoản</TableHead>
                <TableHead className="font-bold text-slate-500">Tổ chuyên môn hiện tại</TableHead>
                <TableHead className="text-right font-bold text-slate-500 w-[220px]">Phân bổ vào Tổ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500">Không tìm thấy giáo viên nào.</TableCell></TableRow>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const isAssigned = teacher.assignedClasses && teacher.assignedClasses.length > 0;

                  return (
                    <TableRow key={teacher._id}>
                      <TableCell className="text-center font-bold text-slate-400">{index + 1}</TableCell>
                      <TableCell className="font-bold text-slate-700">{teacher.fullName}</TableCell>
                      <TableCell className="text-sky-600 font-medium">{teacher.username}</TableCell>
                      <TableCell>
                        {teacher.subject ? (
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-none px-3 py-1">Tổ {teacher.subject}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50 px-3 py-1">Chưa phân tổ</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex justify-end items-center gap-2">
                            <Select 
                              value={teacher.subject || "none"} 
                              onValueChange={(val) => handleUpdateSubject(teacher._id, val === "none" ? "" : val)}
                              disabled={loadingId === teacher._id || isAssigned}
                            >
                              <SelectTrigger className={`w-[160px] h-10 rounded-xl bg-white border-slate-200 font-medium ${isAssigned ? 'opacity-50 bg-slate-100 cursor-not-allowed' : ''}`}>
                                <SelectValue>
                                  {teacher.subject ? `Tổ ${teacher.subject}` : "-- Chưa phân tổ --"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-rose-500 font-medium">-- Gỡ bỏ phân tổ --</SelectItem>
                                {subjectList.map(sub => (
                                  <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <div className="w-5 flex justify-center">
                              {loadingId === teacher._id && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
                              {loadingId !== teacher._id && teacher.subject && !isAssigned && <CheckCircle className="w-4 h-4 text-emerald-500 opacity-60" />}
                            </div>
                          </div>
                          {isAssigned && (
                            <span className="text-[10px] text-rose-500 italic mr-7 font-medium">Đang có lớp, không thể đổi tổ</span>
                          )}
                        </div>
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