import React, { useState, useEffect, useRef } from "react";
import axios from "../lib/axios";
import ExcelJS from 'exceljs';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from 'file-saver';
import schoolLogo from "../assets/logo-truong_221020252129.jpg";
import {
  Document,
  Packer,
  Paragraph,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  TextRun,
  Footer,
  ImageRun,
} from "docx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, UserCog, Search, Download, Layers, Unlock, Save, Plus, X, BookOpen, ShieldAlert, Lock, Filter, ChevronLeft, ChevronRight } from "lucide-react";

// ================== CÁC HÀM XUẤT FILE (WORD, PDF) ==================



const autoFitSheetColumns = (sheet, startColumn = 1, endColumn = sheet.columnCount, startRow = 1, endRow = sheet.rowCount) => {
  for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex += 1) {
    let maxLength = 0;

    sheet.getColumn(columnIndex).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber < startRow || rowNumber > endRow) return;
      const cellValue = cell.value;
      const text = cellValue == null ? "" : String(cellValue).replace(/\s+/g, " ").trim();
      maxLength = Math.max(maxLength, text.length);
    });

    const column = sheet.getColumn(columnIndex);
    const currentWidth = column.width || 10;
    const paddedWidth = Math.min(Math.max(maxLength + 2, 8), 36);
    column.width = Math.max(currentWidth, paddedWidth);
  }
};

const exportPDF = async (dataList, reportTitle, adminName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu!");

  const doc = new jsPDF("l", "mm", "a4"); // Xuất khổ ngang (landscape) để vừa 6 cột

  try {
    const [regularFontRes, boldFontRes] = await Promise.all([
      fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf"),
      fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf")
    ]);

    const regularFontBuffer = await regularFontRes.arrayBuffer();
    const boldFontBuffer = await boldFontRes.arrayBuffer();

    const regularBase64 = btoa(new Uint8Array(regularFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const boldBase64 = btoa(new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
    doc.addFileToVFS("Roboto-Medium.ttf", boldBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");
  } catch (error) {
    void error;
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  try { doc.addImage(schoolLogo, "JPEG", 20, 10, 22, 22); } catch (error) { void error; }

  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("PHƯỜNG LƯU KIẾM", 70, 16, { align: "center" });
  doc.text("TRƯỜNG THCS TRẦN HƯNG ĐẠO", 70, 22, { align: "center" });

  doc.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 220, 16, { align: "center" });
  doc.text("ĐỘC LẬP - TỰ DO - HẠNH PHÚC", 220, 22, { align: "center" });

  const sloganWidth = doc.getTextWidth("ĐỘC LẬP - TỰ DO - HẠNH PHÚC");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(220 - sloganWidth / 2, 23.5, 220 + sloganWidth / 2, 23.5);

  doc.setFontSize(16);
  doc.setTextColor(0, 112, 192);
  doc.text(reportTitle.toUpperCase(), 148, 40, { align: "center" });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 50,
    head: [Object.keys(dataList[0])],
    body: dataList.map((obj) => Object.values(obj)),
    margin: { left: 12, right: 12 },
    styles: { font: "Roboto", fontSize: 10, halign: "center", valign: "middle", overflow: "linebreak", cellWidth: "wrap", lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [0, 112, 192], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "left" }, // Tài khoản
      2: { halign: "left" }, // Họ tên
      4: { halign: "left" }, // Môn dạy
      5: { halign: "left" }, // Lớp
    },
  });

  let finalY = doc.lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  if (finalY + 30 > pageHeight) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(12);
  doc.setFont("Roboto", "normal");
  doc.text(dateStr, pageWidth / 2, finalY, { align: "center" });

  doc.setFont("Roboto", "bold");
  doc.text("Quản trị viên", pageWidth / 2, finalY + 6, { align: "center" });
  doc.text(adminName, pageWidth / 2, finalY + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("Roboto", "normal");
  doc.text(`Người xuất file: ${adminName}`, pageWidth - 10, pageHeight - 10, { align: "right" });

  doc.save(`Phan_Bo_Chuyen_Mon.pdf`);
};

const exportWord = async (dataList, reportTitle, adminName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  const table = new DocxTable({
    width: { size: 100, type: "pct" },
    rows: [
      new DocxTableRow({
        children: Object.keys(dataList[0]).map((key) =>
          new DocxTableCell({
            children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: key, bold: true, color: "FFFFFF", size: 22 })] })],
            shading: { fill: "0070C0" },
          })
        ),
      }),
      ...dataList.map((obj) =>
        new DocxTableRow({
          children: Object.values(obj).map((val, index) =>
            new DocxTableCell({
              children: [new Paragraph({ alignment: index === 1 || index === 2 || index === 4 || index === 5 ? "left" : "center", children: [new TextRun({ text: String(val), size: 22 })] })],
            })
          ),
        })
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: "landscape" }, margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: "right", children: [new TextRun({ text: `Người xuất file: ${adminName}`, font: "Times New Roman", size: 22, italics: true, bold: true })] })],
          }),
        },
        children: [
          new DocxTable({
            width: { size: 100, type: "pct" },
            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: { size: 15, type: "pct" },
                    verticalAlign: "center",
                    borders: { top: { style: "none" }, tom: { style: "none" }, left: { style: "none" }, right: { style: "none" } },
                    children: [
                      new Paragraph({
                        alignment: "center",
                        children: [
                          new ImageRun({
                            data: await fetch(schoolLogo).then((res) => res.arrayBuffer()),
                            transformation: { width: 50, height: 50 },
                          }),
                        ],
                      }),
                    ],
                  }),
                  new DocxTableCell({
                    width: { size: 85, type: "pct" },
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } },
                    children: [
                      new DocxTable({
                        width: { size: 100, type: "pct" },
                        borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
                        rows: [
                          new DocxTableRow({
                            children: [
                              new DocxTableCell({ borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }, children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: "PHƯỜNG LƯU KIẾM", bold: true, size: 22, font: "Times New Roman" })] })] }),
                              new DocxTableCell({ borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }, children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 22, font: "Times New Roman" })] })] }),
                            ],
                          }),
                          new DocxTableRow({
                            children: [
                              new DocxTableCell({ borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }, children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: "TRƯỜNG THCS TRẦN HƯNG ĐẠO", bold: true, size: 24, font: "Times New Roman" })] })] }),
                              new DocxTableCell({ borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }, children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: "ĐỘC LẬP - TỰ DO - HẠNH PHÚC", bold: true, underline: {}, size: 24, font: "Times New Roman" })] })] }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph(""),
          new Paragraph({ alignment: "center", children: [new TextRun({ text: reportTitle.toUpperCase(), bold: true, size: 30, color: "0070C0", font: "Times New Roman" })] }),
          new Paragraph(""),
          table,
          new Paragraph(""),
          new DocxTable({
            width: { size: 100, type: "pct" },
            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({ width: { size: 65, type: "pct" }, borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }, children: [new Paragraph("")] }),
                  new DocxTableCell({
                    width: { size: 35, type: "pct" },
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } },
                    children: [
                      new Paragraph({ alignment: "center", children: [new TextRun({ text: dateStr, italics: true, size: 24, font: "Times New Roman" })] }),
                      new Paragraph({ alignment: "center", children: [new TextRun({ text: "Quản trị viên", bold: true, size: 24, font: "Times New Roman" })] }),
                      new Paragraph(""),
                      new Paragraph(""),
                      new Paragraph({ alignment: "center", children: [new TextRun({ text: adminName, bold: true, size: 24, font: "Times New Roman" })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Phan_Bo_Chuyen_Mon.docx");
};

// ================== COMPONENT CHÍNH ==================

const AdminDepartmentManagement = ({ teachersList, fetchData }) => {
  // Lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDept, setSearchDept] = useState("all");
  const [searchSubject, setSearchSubject] = useState("all");
  const [searchStatus, setSearchStatus] = useState("all");

  const [subjectList, setSubjectList] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDept, setNewSubjectDept] = useState("Chọn Tổ");
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isSubjectEditMode, setIsSubjectEditMode] = useState(false);

  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [selectedTeacherRowId, setSelectedTeacherRowId] = useState(null);
  const [tempEditData, setTempEditData] = useState({ department: "", subjects: [] });
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const tableScrollRef = useRef(null);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

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
    if (!newSubjectName.trim() || !newSubjectDept) return alert("Vui lòng nhập tên và chọn tổ!");
    setIsLoadingSubjects(true);
    try {
      await axios.post("/admin/subjects", { name: newSubjectName, department: newSubjectDept }, getHeader());
      setNewSubjectName("");
      await fetchSubjects();
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi thêm môn học!");
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleDeleteSubject = async (id, name) => {
    const confirmMsg = `🚨 CẢNH BÁO NGUY HIỂM:\n\nBạn đang chuẩn bị xóa môn "${name}" khỏi hệ thống!\nNếu có giáo viên nào đang được phân công môn này, dữ liệu của họ có thể bị ảnh hưởng.\n\nBạn có CHẮC CHẮN muốn xóa?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await axios.delete(`/admin/subjects/${id}`, getHeader());
      await fetchSubjects();
      await fetchData();
    } catch {
      alert("Lỗi khi xóa môn học!");
    }
  };

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

  // Filter dữ liệu bảng
  const filteredTeachers = teachersList.filter(t => {
    const term = searchTerm.toLowerCase();
    const subs = getTeacherSubjects(t);
    const teacherStatus = t.status || "active";
    const matchName = !searchTerm
      || (t.fullName && t.fullName.toLowerCase().includes(term))
      || (t.username && t.username.toLowerCase().includes(term))
      || subs.some((sub) => String(sub).toLowerCase().includes(term));
    const matchDept = searchDept === "all" || t.department === searchDept;
    const matchSubject = searchSubject === "all" || subs.includes(searchSubject);
    const matchStatus = searchStatus === "all" || teacherStatus === searchStatus;

    return matchName && matchDept && matchSubject && matchStatus;
  });

  const deptFilterLabel = searchDept === "all" ? "Tất cả tổ" : searchDept === "KHTN" ? "Tổ KHTN" : "Tổ KHXH";
  const subjectFilterLabel = searchSubject === "all" ? "Tất cả môn" : searchSubject;
  const statusFilterLabel = searchStatus === "all" ? "Tất cả trạng thái" : searchStatus === "active" ? "Đang hoạt động" : "Ngừng hoạt động";

  const handleHorizontalScroll = (direction) => {
    const wrapper = tableScrollRef.current;
    if (!wrapper) return;
    const el = wrapper.querySelector('[data-slot="table-container"]');
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 0) return;

    const scrollAmount = Math.max(120, Math.floor(el.clientWidth * 0.3));
    const nextLeft = direction === "left"
      ? Math.max(0, el.scrollLeft - scrollAmount)
      : Math.min(maxScrollLeft, el.scrollLeft + scrollAmount);

    el.scrollTo({
      left: nextLeft,
      behavior: "smooth",
    });
  };

  const getExportData = () => {
    return filteredTeachers.map((t, idx) => {
      const assignedStr = t.assignedClasses && t.assignedClasses.length > 0
        ? t.assignedClasses.map(c => c.name || c).join(", ")
        : "Chưa có lớp";
      const subs = getTeacherSubjects(t);
      return {
        "STT": idx + 1,
        "Tài khoản": t.username,
        "Họ và tên": t.fullName,
        "Tổ chuyên môn": t.department === "KHTN" ? "Tổ KHTN" : t.department === "KHXH" ? "Tổ KHXH" : "Chưa phân tổ",
        "Chức vụ trong tổ": t.departmentPosition === "Tổ trưởng" || t.departmentPosition === "Tổ phó" ? t.departmentPosition : (t.departmentPosition || "Giáo viên thường"),
        "Môn giảng dạy": subs.length > 0 ? subs.join(", ") : "Chưa đăng ký môn",
        "Lớp đang phụ trách": assignedStr
      };
    });
  };

  const adminName = localStorage.getItem("fullName") || "Quản trị viên";
  const reportTitle = "DANH SÁCH PHÂN BỔ TỔ CHUYÊN MÔN & MÔN HỌC GIÁO VIÊN";

  const handleExportExcel = async () => {
    if (filteredTeachers.length === 0) return alert("Không có dữ liệu để xuất!");

    const estimateWidth = (arr, min, max) => {
      if (!arr || arr.length === 0) return min;
      const maxLen = Math.max(...arr.map(s => String(s || "").length));
      return Math.min(Math.max(maxLen + 4, min), max);
    };

    const fitWrappedRowHeight = (sheet, rowNum, baseHeight, charWidth) => {
      const row = sheet.getRow(rowNum);
      let maxLines = 1;
      row.eachCell((cell) => {
        const text = String(cell.value || "");
        const lines = Math.ceil(text.length / charWidth);
        if (lines > maxLines) maxLines = lines;
      });
      row.height = Math.max(baseHeight, maxLines * 18 + 4);
    };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Phân bổ chuyên môn', { views: [{ showGridLines: false }] });

    const dataToExport = getExportData();
    const classRowsByTeacher = dataToExport.map((teacher) => {
      const classList = String(teacher["Lớp đang phụ trách"] || "")
        .split(/\s*,\s*/)
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        teacher,
        classes: classList.length > 0 ? classList : ["Chưa phân công"],
      };
    });

    const longestName = dataToExport.reduce((max, teacher) => Math.max(max, String(teacher["Họ và tên"] || "").length), 0);
    const longestSubject = dataToExport.reduce((max, teacher) => Math.max(max, String(teacher["Môn giảng dạy"] || "").length), 0);
    const longestClass = classRowsByTeacher.reduce((max, item) => Math.max(max, item.classes.join(", ").length), 0);

    // Bố cục bảng: 6 cột thông tin chung + 1 cột lớp (mỗi lớp một dòng)
    sheet.columns = [
      { width: 11 },
      { width: Math.min(Math.max(estimateWidth(dataToExport.map((item) => item["Tài khoản"]), 12, 20), 12), 20) },
      { width: Math.min(Math.max(longestName + 4, 20), 28) },
      { width: Math.min(Math.max(estimateWidth(dataToExport.map((item) => item["Tổ chuyên môn"]), 12, 18), 12), 18) },
      { width: Math.min(Math.max(estimateWidth(dataToExport.map((item) => item["Chức vụ trong tổ"]), 12, 20), 12), 20) },
      { width: Math.min(Math.max(longestSubject + 4, 20), 30) },
      { width: Math.min(Math.max(longestClass + 4, 18), 28) },
    ];

    // Thêm các dòng tiêu đề (Dịch text sang cột B để chừa chỗ cho Logo ở cột A)
    sheet.addRow(["", "PHƯỜNG LƯU KIẾM", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", ""]);
    sheet.addRow(["", "TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "", "ĐỘC LẬP - TỰ DO - HẠNH PHÚC", "", ""]);
    sheet.mergeCells('B1:C1'); sheet.mergeCells('B2:C2');
    sheet.mergeCells('E1:G1'); sheet.mergeCells('E2:G2');

    // CHÈN LOGO VÀO GÓC CỘT A
    try {
      const logoResponse = await fetch(schoolLogo);
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoId = workbook.addImage({ buffer: logoBuffer, extension: "jpeg" });
      sheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 85, height: 85 },
      });
    } catch (err) {
      console.log("Không tải được logo", err);
    }

    const formatHeader = (rowNum) => {
      const row = sheet.getRow(rowNum);
      row.height = 30;
      row.eachCell((cell, colNum) => {
        if (colNum > 1) { // Bỏ qua format đè lên cột A chứa logo
          cell.font = { name: 'Times New Roman', size: 14, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, shrinkToFit: true };
        }
      });
    };
    formatHeader(1); formatHeader(2);
    sheet.getCell('E2').font = { name: 'Times New Roman', size: 14, bold: true, underline: true };
    sheet.getCell('E2').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, shrinkToFit: true };

    sheet.addRow([]);
    sheet.getRow(3).height = 10;

    const titleRow = sheet.addRow([reportTitle]);
    sheet.mergeCells('A4:G4');
    titleRow.height = 40;
    const titleCell = sheet.getCell('A4');
    titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0070C0' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow([]);
    sheet.getRow(5).height = 8;

    const tableHeaders = Object.keys(dataToExport[0]);
    const headerRow = sheet.addRow(tableHeaders);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, shrinkToFit: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    classRowsByTeacher.forEach(({ teacher, classes }) => {
      const startRowNumber = sheet.rowCount + 1;

      classes.forEach((className) => {
        const row = sheet.addRow([
          teacher["STT"],
          teacher["Tài khoản"],
          teacher["Họ và tên"],
          teacher["Tổ chuyên môn"],
          teacher["Chức vụ trong tổ"],
          teacher["Môn giảng dạy"],
          className,
        ]);

        row.height = 24;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Times New Roman', size: 12 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 7 ? 'left' : 'center',
            wrapText: true,
            shrinkToFit: true,
            indent: colNumber === 7 ? 1 : 0,
          };
          if (colNumber === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, shrinkToFit: true, indent: 1 };
          }
        });

        fitWrappedRowHeight(sheet, row.number, 24, 44);
      });

      const endRowNumber = sheet.rowCount;
      if (endRowNumber > startRowNumber) {
        [1, 2, 3, 4, 5, 6].forEach((col) => {
          sheet.mergeCells(startRowNumber, col, endRowNumber, col);
          const mergedCell = sheet.getCell(startRowNumber, col);
          mergedCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, shrinkToFit: true };
          mergedCell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
        });
        fitWrappedRowHeight(sheet, startRowNumber, 24, 44);
      }
    });

    autoFitSheetColumns(sheet, 1, 7, 1, sheet.rowCount);
    sheet.getColumn(1).width = 11;
    sheet.getColumn(2).width = Math.min(Math.max(sheet.getColumn(2).width || 0, 14), 20);
    sheet.getColumn(3).width = Math.min(Math.max(sheet.getColumn(3).width || 0, 20), 28);
    sheet.getColumn(4).width = Math.min(Math.max(sheet.getColumn(4).width || 0, 14), 18);
    sheet.getColumn(5).width = Math.min(Math.max(sheet.getColumn(5).width || 0, 14), 20);
    sheet.getColumn(6).width = Math.min(Math.max(sheet.getColumn(6).width || 0, 20), 30);
    sheet.getColumn(7).width = Math.min(Math.max(sheet.getColumn(7).width || 0, 18), 28);

    sheet.addRow([]);
    sheet.getRow(sheet.rowCount).height = 8;

    const today = new Date();
    const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

    const signDateRow = sheet.addRow(["", "", "", "", "", dateStr]);
    sheet.mergeCells(`E${signDateRow.number}:F${signDateRow.number}`);
    sheet.getCell(`E${signDateRow.number}`).font = { name: 'Times New Roman', size: 12, italic: true };
    sheet.getCell(`E${signDateRow.number}`).alignment = { horizontal: 'center', wrapText: true, shrinkToFit: true };
    signDateRow.height = 22;

    const roleRow = sheet.addRow(["", "", "", "", "", "Quản trị viên"]);
    sheet.mergeCells(`E${roleRow.number}:F${roleRow.number}`);
    sheet.getCell(`E${roleRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`E${roleRow.number}`).alignment = { horizontal: 'center', wrapText: true, shrinkToFit: true };
    roleRow.height = 22;

    sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);

    const nameRow = sheet.addRow(["", "", "", "", "", adminName]);
    sheet.mergeCells(`E${nameRow.number}:F${nameRow.number}`);
    sheet.getCell(`E${nameRow.number}`).font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell(`E${nameRow.number}`).alignment = { horizontal: 'center', wrapText: true, shrinkToFit: true };
    nameRow.height = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Phan_Bo_Chuyen_Mon.xlsx`);
  };

  const handleExportPDF = async () => {
    if (filteredTeachers.length === 0) return alert("Không có dữ liệu để xuất!");
    setIsExportingPDF(true);
    await exportPDF(getExportData(), reportTitle, adminName);
    setIsExportingPDF(false);
  };

  const handleExportWord = async () => {
    if (filteredTeachers.length === 0) return alert("Không có dữ liệu để xuất!");
    await exportWord(getExportData(), reportTitle, adminName);
  };

  const khtnCount = teachersList.filter(t => t.department === "KHTN").length;
  const khxhCount = teachersList.filter(t => t.department === "KHXH").length;

  const khtnSubjects = subjectList.filter(s => s.department === "KHTN");
  const khxhSubjects = subjectList.filter(s => s.department === "KHXH");

  return (
    <div className="space-y-6">

      {/* 1. KHU VỰC THỐNG KÊ SỐ LƯỢNG GIÁO VIÊN THEO TỔ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        <Card className="bg-white border-blue-100 shadow-sm rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-5 text-white flex justify-between items-center min-h-[95px]">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2"><Layers className="w-6 h-6 opacity-80" /> TỔ KHOA HỌC TỰ NHIÊN</h3>
              <p className="text-blue-100 font-medium text-sm mt-1">Đang có {khtnCount} giáo viên</p>
            </div>
          </div>
          <CardContent className="p-5 flex-1 flex flex-col bg-slate-50/30 min-h-[150px]">
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

        <Card className="bg-white border-orange-100 shadow-sm rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-5 text-white flex justify-between items-center min-h-[95px]">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2"><Layers className="w-6 h-6 opacity-80" /> TỔ KHOA HỌC XÃ HỘI</h3>
              <p className="text-orange-100 font-medium text-sm mt-1">Đang có {khxhCount} giáo viên</p>
            </div>
          </div>
          <CardContent className="p-5 flex-1 flex flex-col bg-slate-50/30 min-h-[150px]">
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
      <div className="flex items-center gap-2 text-slate-600 font-bold shrink-0">
        <BookOpen className="w-5 h-5 text-sky-500" /> Quản lý danh mục Môn:
      </div>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row w-full lg:w-auto items-start sm:items-center gap-4">

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

        <div className="w-full lg:w-auto flex justify-end border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-4">
          <Button
            onClick={() => setIsSubjectEditMode(!isSubjectEditMode)}
            variant="outline"
            className={`font-bold transition-all w-full sm:w-auto ${isSubjectEditMode ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
          >
            {isSubjectEditMode ? <><Unlock className="w-4 h-4 mr-2" /> Đang mở khóa Xóa</> : <><Lock className="w-4 h-4 mr-2" /> Mở khóa xóa môn</>}
          </Button>
        </div>
      </div>

      {/* 2. BẢNG PHÂN BỔ NHÂN SỰ CHÍNH */}
      <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-slate-500" /> Bảng phân công nhiệm vụ Giáo viên
            </CardTitle>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <Button onClick={handleExportExcel} variant="outline" className="h-10 text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-xl font-bold shadow-sm">
                <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button onClick={handleExportPDF} disabled={isExportingPDF} variant="outline" className="h-10 text-rose-600 border-rose-300 hover:bg-rose-50 rounded-xl font-bold shadow-sm">
                {isExportingPDF ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button onClick={handleExportWord} variant="outline" className="h-10 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-xl font-bold shadow-sm">
                <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Word</span>
              </Button>
            </div>
          </div>

          {/* BỘ LỌC BẢNG GIÁO VIÊN */}
          <div className="flex flex-wrap md:flex-nowrap gap-3 pt-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm tên hoặc tài khoản"
                className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <CardTitle className="text-lg font-bold h- text-slate-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-500" /> Lọc theo: tổ, môn, trạng thái
            </CardTitle>

            <Select value={searchDept} onValueChange={setSearchDept}>
              <SelectTrigger className="h-10 w-[150px] bg-white border-slate-200 rounded-xl font-medium">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <span className="truncate">{deptFilterLabel}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tổ</SelectItem>
                <SelectItem value="KHTN">Tổ KHTN</SelectItem>
                <SelectItem value="KHXH">Tổ KHXH</SelectItem>
              </SelectContent>
            </Select>

            <Select value={searchSubject} onValueChange={setSearchSubject}>
              <SelectTrigger className="h-10 w-[160px] bg-white border-slate-200 rounded-xl font-medium">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <span className="truncate">{subjectFilterLabel}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn</SelectItem>
                {subjectList.map(sub => (
                  <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchStatus} onValueChange={setSearchStatus}>
              <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 rounded-xl font-medium">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <span className="truncate">{statusFilterLabel}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <div ref={tableScrollRef} className="overflow-x-auto p-4">
          <Table className="min-w-[1400px] border border-slate-200 rounded-xl [&_th]:border [&_th]:border-slate-200 [&_td]:border [&_td]:border-slate-200">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center font-bold text-slate-500">STT</TableHead>
                <TableHead className="font-bold text-slate-500 w-56">Thông tin Giáo viên</TableHead>
                <TableHead className="font-bold text-slate-500 w-32 text-center">Chức vụ</TableHead>
                <TableHead className="font-bold text-slate-500 w-44">Tổ chuyên môn</TableHead>
                <TableHead className="font-bold text-slate-500">Môn giảng dạy</TableHead>
                <TableHead className="font-bold text-slate-500 w-56">Lớp đang phụ trách</TableHead>
                <TableHead className="font-bold text-slate-500 text-right w-32 pr-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500">Không tìm thấy giáo viên nào phù hợp.</TableCell></TableRow>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const isAssigned = teacher.assignedClasses && teacher.assignedClasses.length > 0;
                  const isEditing = editingTeacherId === teacher._id;
                  const isRowSelected = selectedTeacherRowId === teacher._id;
                  const isInactive = teacher.status === "inactive";
                  const teacherSubs = isEditing ? tempEditData.subjects : getTeacherSubjects(teacher);
                  const teacherDept = isEditing ? tempEditData.department : teacher.department;

                  const availableSubjects = teacherDept === 'KHTN' ? khtnSubjects : teacherDept === 'KHXH' ? khxhSubjects : [];

                  return (
                    <TableRow
                      key={teacher._id}
                      onClick={() => setSelectedTeacherRowId(teacher._id)}
                      className={`cursor-pointer transition-colors ${isRowSelected
                          ? '!bg-blue-50 [&>td]:!bg-blue-50 [&>td]:text-slate-800'
                          : isInactive
                            ? 'bg-slate-50/80 opacity-80'
                            : isEditing
                              ? 'bg-sky-50/50'
                              : 'hover:bg-slate-50/50'
                        }`}
                    >
                      <TableCell className="text-center font-bold text-slate-400 align-top pt-5">{index + 1}</TableCell>

                      <TableCell className="align-top pt-4">
                        <p className="font-bold text-slate-700">{teacher.fullName}</p>
                        <p className="text-sky-600 font-medium text-xs mt-0.5">{teacher.username}</p>
                        {isInactive && (
                          <Badge variant="outline" className="mt-2 bg-rose-50 text-rose-600 border-rose-200 text-[10px] font-bold uppercase">
                            Ngừng hoạt động
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="align-top pt-4 text-center">
                        {teacher.departmentPosition === "Tổ trưởng" ? (
                          <Badge className="bg-violet-100 text-violet-800 text-xs font-bold shadow-none border-0">Tổ trưởng</Badge>
                        ) : teacher.departmentPosition === "Tổ phó" ? (
                          <Badge className="bg-purple-100 text-purple-800 text-xs font-bold shadow-none border-0">Tổ phó</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 text-xs font-bold shadow-none border-0">Giáo viên thường</Badge>
                        )}
                      </TableCell>

                      <TableCell className="align-top pt-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <Select
                              value={teacherDept || "none"}
                              onValueChange={(val) => setTempEditData({ department: val === "none" ? "" : val, subjects: [] })}
                              disabled={isAssigned}
                            >
                              <SelectTrigger className={`w-full h-10 rounded-xl bg-white border-slate-200 font-bold ${teacherDept === 'KHTN' ? 'text-blue-600 border-blue-200' :
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
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className={`${teacherDept === 'KHTN' ? 'bg-blue-100 text-blue-700' : teacherDept === 'KHXH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'} text-xs font-bold shadow-none border-0`}>
                              {teacherDept === 'KHTN' ? 'Tổ KHTN' : teacherDept === 'KHXH' ? 'Tổ KHXH' : 'Chưa phân tổ'}
                            </Badge>
                            {isInactive && (
                              <Badge className="bg-rose-100 text-rose-600 text-xs font-bold shadow-none border-0">
                                Ngừng hoạt động
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                                        ? "bg-blue-600 text-white border-red-600 shadow-sm"
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
                            <span className="text-xs text-slate-400 italic flex items-center mt-2"><ShieldAlert className="w-3 h-3 mr-1 text-amber-500" /> Vui lòng chọn Tổ lớn trước</span>
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

                      <TableCell className="align-top pt-4">
                        <div className="max-w-[300px]">
                          {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
                            teacher.assignedClasses.map((cls, idx) => (
                              <Badge key={idx} variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[11px]">
                                {cls.name || cls}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chưa có lớp</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-top pt-3 pr-4 text-right">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-end">
                            <Button
                              onClick={() => handleSaveTeacher(teacher._id)}
                              disabled={isSavingTeacher}
                              className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-bold w-[110px]" //chinh mau button mo khoa mon
                            >
                              {isSavingTeacher ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Lưu & Khóa</>}
                            </Button>
                            <Button onClick={handleCancelEdit} variant="ghost" className="h-7 text-xs text-slate-500 hover:text-rose-500 px-2">Hủy bỏ</Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleOpenEdit(teacher)}
                            variant="outline"
                            className="h-9 border-sky-200 text-sky-600 hover:bg-sky-50 font-bold w-[110px]" //mau cua mon khi chon
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
        <div className="px-4 pb-4 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleHorizontalScroll("left")}
            className="h-9 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Trái
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleHorizontalScroll("right")}
            className="h-9 rounded-lg"
          >
            Phải <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDepartmentManagement;