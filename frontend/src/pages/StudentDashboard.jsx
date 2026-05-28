import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import ExcelJS from "exceljs";
import schoolLogo from "../assets/logo-truong_221020252129.jpg";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Trophy,
  History,
  Calendar,
  Loader2,
  Download,
  Search,
  Filter,
  Eye,
  FileX,
  Lock,
  Printer,
} from "lucide-react";

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
      <span className="text-xs font-bold text-slate-500 uppercase">
        {label}
      </span>
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

const exportFormalExcel = async (dataList, reportTitle, fileName, studentName) => {
  if (!dataList || dataList.length === 0)
    return alert("Không có dữ liệu để xuất báo cáo!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, "0")} tháng ${(today.getMonth() + 1).toString().padStart(2, "0")} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Lịch Sử Học Tập", { views: [{ showGridLines: false }] });
  
  sheet.pageSetup = {
    paperSize: 9, 
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
  };

  sheet.columns = [
    { width: 8 },  
    { width: 45 }, 
    { width: 15 }, 
    { width: 25 }, 
    { width: 25 }, 
  ];

  sheet.addRow(["", "UBND HUYỆN THỦY NGUYÊN", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  sheet.addRow(["", "TRƯỜNG THCS TRẦN HƯNG ĐẠO", "", "ĐỘC LẬP - TỰ DO - HẠNH PHÚC"]);

  sheet.mergeCells("B1:C1");
  sheet.mergeCells("B2:C2");
  sheet.mergeCells("D1:E1");
  sheet.mergeCells("D2:E2");

  try {
    const logoResponse = await fetch(schoolLogo);
    const logoBuffer = await logoResponse.arrayBuffer();
    const logoId = workbook.addImage({ buffer: logoBuffer, extension: "jpg" });
    sheet.addImage(logoId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 55, height: 55 },
    });
  } catch (err) {
    console.log("Không tải được logo vào Excel", err);
  }

  const formatGovHeader = (rowNum) => {
    const row = sheet.getRow(rowNum);
    row.height = 25;
    row.eachCell((cell, colNum) => {
      if (colNum > 1) { 
        cell.font = { name: "Times New Roman", size: 12, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  };
  formatGovHeader(1);
  formatGovHeader(2);
  sheet.getCell("D2").font = { name: "Times New Roman", size: 13, bold: true, underline: true };

  sheet.addRow([]);
  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells("A4:E4");
  titleRow.height = 40;
  sheet.getCell("A4").font = { name: "Times New Roman", size: 16, bold: true, color: { argb: "FF0070C0" } };
  sheet.getCell("A4").alignment = { vertical: "middle", horizontal: "center" };

  sheet.addRow([]);
  const tableHeaders = Object.keys(dataList[0]);
  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  dataList.forEach((obj) => {
    const row = sheet.addRow(Object.values(obj));
    row.height = 25;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Times New Roman", size: 12 };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      if (colNumber === 1 || colNumber >= 4) cell.alignment = { vertical: "middle", horizontal: "center" };
      else cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    });
  });

  sheet.addRow([]);
  sheet.addRow([]);
  const dateRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", dateStr]);
  sheet.mergeCells(`D${dateRowNum}:E${dateRowNum}`);
  sheet.getCell(`D${dateRowNum}`).font = { name: "Times New Roman", size: 12, italic: true };
  sheet.getCell(`D${dateRowNum}`).alignment = { horizontal: "center" };

  const signRowNum = sheet.rowCount + 1;
  sheet.addRow(["", "", "", "Học sinh"]);
  sheet.mergeCells(`D${signRowNum}:E${signRowNum}`);
  sheet.getCell(`D${signRowNum}`).font = { name: "Times New Roman", size: 12, bold: true };
  sheet.getCell(`D${signRowNum}`).alignment = { horizontal: "center" };

  const nameRowNum = sheet.rowCount + 4; 
  sheet.addRow(["", "", "", studentName]);
  sheet.mergeCells(`D${nameRowNum}:E${nameRowNum}`);
  sheet.getCell(`D${nameRowNum}`).font = { name: "Times New Roman", size: 12, bold: true };
  sheet.getCell(`D${nameRowNum}`).alignment = { horizontal: "center" };
  
  sheet.headerFooter.oddFooter = `&R&"Times New Roman,Bold"&10Người xuất file: ${studentName}`;
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${fileName}.xlsx`);
};

const exportPDF = async (dataList, reportTitle, studentName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu!");

  const doc = new jsPDF("p", "mm", "a4");

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
    console.error("Lỗi tải font Tiếng Việt, sử dụng font mặc định:", error);
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  try {
     doc.addImage(schoolLogo, "JPEG", 15, 10, 22, 22);
  } catch (e) { console.log(e) }

  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("UBND HUYỆN THỦY NGUYÊN", 65, 16, { align: "center" });
  doc.text("TRƯỜNG THCS TRẦN HƯNG ĐẠO", 65, 22, { align: "center" });

  doc.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 150, 16, { align: "center" });
  doc.text("ĐỘC LẬP - TỰ DO - HẠNH PHÚC", 150, 22, { align: "center" });

  const sloganWidth = doc.getTextWidth("ĐỘC LẬP - TỰ DO - HẠNH PHÚC");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(150 - sloganWidth / 2, 23.5, 150 + sloganWidth / 2, 23.5);

  doc.setFontSize(16);
  doc.setTextColor(0, 112, 192); 
  doc.text(reportTitle.toUpperCase(), 105, 38, { align: "center" });
  doc.setTextColor(0, 0, 0); 

  autoTable(doc, {
    startY: 45,
    head: [Object.keys(dataList[0])],
    body: dataList.map((obj) => Object.values(obj)),
    styles: {
      font: "Roboto", 
      fontSize: 10,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 112, 192],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "left" }, 
      2: { halign: "center" }, 
    },
  });

  const finalY = doc.lastAutoTable.finalY + 12;

  doc.setFontSize(12);
  doc.setFont("Roboto", "normal");
  doc.text(dateStr, 155, finalY, { align: "center" });
  
  doc.setFont("Roboto", "bold");
  doc.text("Học sinh", 155, finalY + 6, { align: "center" });
  doc.text(studentName, 155, finalY + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("Roboto", "normal");
  doc.text(`Người xuất file: ${studentName}`, 200, 287, { align: "right" });

  doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
};

// =====================================================================
// HÀM MỚI: TẠO VÀ IN BẢNG ĐIỂM TRỰC TIẾP QUA IFRAME ẨN
// =====================================================================
const printPDF = async (dataList, reportTitle, studentName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu!");

  const doc = new jsPDF("p", "mm", "a4");

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
    console.error("Lỗi tải font Tiếng Việt:", error);
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  try {
     doc.addImage(schoolLogo, "JPEG", 15, 10, 22, 22);
  } catch (e) { console.log(e) }

  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("UBND HUYỆN THỦY NGUYÊN", 65, 16, { align: "center" });
  doc.text("TRƯỜNG THCS TRẦN HƯNG ĐẠO", 65, 22, { align: "center" });

  doc.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 150, 16, { align: "center" });
  doc.text("ĐỘC LẬP - TỰ DO - HẠNH PHÚC", 150, 22, { align: "center" });

  const sloganWidth = doc.getTextWidth("ĐỘC LẬP - TỰ DO - HẠNH PHÚC");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(150 - sloganWidth / 2, 23.5, 150 + sloganWidth / 2, 23.5);

  doc.setFontSize(16);
  doc.setTextColor(0, 112, 192);
  doc.text(reportTitle.toUpperCase(), 105, 38, { align: "center" });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 45,
    head: [Object.keys(dataList[0])],
    body: dataList.map((obj) => Object.values(obj)),
    styles: {
      font: "Roboto",
      fontSize: 10,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 112, 192],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "left" }, 
      2: { halign: "center" },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 12;

  doc.setFontSize(12);
  doc.setFont("Roboto", "normal");
  doc.text(dateStr, 155, finalY, { align: "center" });
  
  doc.setFont("Roboto", "bold");
  doc.text("Học sinh", 155, finalY + 6, { align: "center" });
  doc.text(studentName, 155, finalY + 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("Roboto", "normal");
  doc.text(`Người xuất file: ${studentName}`, 200, 287, { align: "right" });

  // Kích hoạt tính năng gọi lệnh in của trình duyệt
  doc.autoPrint();
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
};

const exportWord = async (dataList, reportTitle, studentName) => {
  if (!dataList || dataList.length === 0) return alert("Không có dữ liệu!");

  const today = new Date();
  const dateStr = `Ngày ${today.getDate()} tháng ${
    today.getMonth() + 1
  } năm ${today.getFullYear()}`;

  const table = new DocxTable({
    width: {
      size: 100,
      type: "pct",
    },
    rows: [
      new DocxTableRow({
        children: Object.keys(dataList[0]).map(
          (key) =>
            new DocxTableCell({
              children: [
                new Paragraph({
                  alignment: "center",
                  children: [
                    new TextRun({
                      text: key,
                      bold: true,
                      color: "FFFFFF",
                      size: 24,
                    }),
                  ],
                }),
              ],
              shading: {
                fill: "0070C0",
              },
            }),
        ),
      }),

      ...dataList.map(
        (obj) =>
          new DocxTableRow({
            children: Object.values(obj).map(
              (val, index) =>
                new DocxTableCell({
                  children: [
                    new Paragraph({
                      alignment: index === 1 || index === 2 ? "left" : "center",
                      children: [
                        new TextRun({
                          text: String(val),
                          size: 24,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: "right",
                children: [
                  new TextRun({
                    text: `Người xuất file: ${studentName}`,
                    font: "Times New Roman",
                    size: 24,
                    italics: true,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new DocxTable({
            width: {
              size: 100,
              type: "pct",
            },

            borders: {
              top: { style: "none" },
              bottom: { style: "none" },
              left: { style: "none" },
              right: { style: "none" },
              insideHorizontal: { style: "none" },
              insideVertical: { style: "none" },
            },

            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: {
                      size: 12,
                      type: "pct",
                    },
                    verticalAlign: "center",
                    borders: {
                      top: { style: "none" },
                      bottom: { style: "none" },
                      left: { style: "none" },
                      right: { style: "none" },
                    },
                    children: [
                      new Paragraph({
                        alignment: "center",
                        children: [
                          new ImageRun({
                            data: await fetch(schoolLogo).then((res) =>
                              res.arrayBuffer(),
                            ),
                            transformation: {
                              width: 45,
                              height: 45,
                            },
                          }),
                        ],
                      }),
                    ],
                  }),

                  new DocxTableCell({
                    width: {
                      size: 85,
                      type: "pct",
                    },

                    borders: {
                      top: { style: "none" },
                      bottom: { style: "none" },
                      left: { style: "none" },
                      right: { style: "none" },
                    },

                    children: [
                      new DocxTable({
                        width: {
                          size: 100,
                          type: "pct",
                        },

                        borders: {
                          top: { style: "none" },
                          bottom: { style: "none" },
                          left: { style: "none" },
                          right: { style: "none" },
                          insideHorizontal: { style: "none" },
                          insideVertical: { style: "none" },
                        },

                        rows: [
                          new DocxTableRow({
                            children: [
                              new DocxTableCell({
                                borders: {
                                  top: { style: "none" },
                                  bottom: { style: "none" },
                                  left: { style: "none" },
                                  right: { style: "none" },
                                },

                                children: [
                                  new Paragraph({
                                    alignment: "center",

                                    children: [
                                      new TextRun({
                                        text: "UBND HUYỆN THỦY NGUYÊN",
                                        bold: true,
                                        size: 22,
                                        font: "Times New Roman",
                                      }),
                                    ],
                                  }),
                                ],
                              }),

                              new DocxTableCell({
                                borders: {
                                  top: { style: "none" },
                                  bottom: { style: "none" },
                                  left: { style: "none" },
                                  right: { style: "none" },
                                },

                                children: [
                                  new Paragraph({
                                    alignment: "center",

                                    children: [
                                      new TextRun({
                                        text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                                        bold: true,
                                        size: 22,
                                        font: "Times New Roman",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),

                          new DocxTableRow({
                            children: [
                              new DocxTableCell({
                                borders: {
                                  top: { style: "none" },
                                  bottom: { style: "none" },
                                  left: { style: "none" },
                                  right: { style: "none" },
                                },

                                children: [
                                  new Paragraph({
                                    alignment: "center",

                                    children: [
                                      new TextRun({
                                        text: "TRƯỜNG THCS TRẦN HƯNG ĐẠO",
                                        bold: true,
                                        size: 24,
                                        font: "Times New Roman",
                                      }),
                                    ],
                                  }),
                                ],
                              }),

                              new DocxTableCell({
                                borders: {
                                  top: { style: "none" },
                                  bottom: { style: "none" },
                                  left: { style: "none" },
                                  right: { style: "none" },
                                },

                                children: [
                                  new Paragraph({
                                    alignment: "center",

                                    children: [
                                      new TextRun({
                                        text: "ĐỘC LẬP - TỰ DO - HẠNH PHÚC",
                                        bold: true,
                                        underline: {},
                                        size: 24,
                                        font: "Times New Roman",
                                      }),
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
                ],
              }),
            ],
          }),

          new Paragraph(""),

          new Paragraph({
            alignment: "center",
            children: [
              new TextRun({
                text: reportTitle.toUpperCase(),
                bold: true,
                size: 32,
                color: "0070C0",
                font: "Times New Roman",
              }),
            ],
          }),

          new Paragraph(""),
          table,
          new Paragraph(""),

          new DocxTable({
            width: {
              size: 100,
              type: "pct",
            },

            borders: {
              top: { style: "none" },
              bottom: { style: "none" },
              left: { style: "none" },
              right: { style: "none" },
              insideHorizontal: { style: "none" },
              insideVertical: { style: "none" },
            },

            rows: [
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    width: {
                      size: 65,
                      type: "pct",
                    },

                    borders: {
                      top: { style: "none" },
                      bottom: { style: "none" },
                      left: { style: "none" },
                      right: { style: "none" },
                    },

                    children: [new Paragraph("")],
                  }),

                  new DocxTableCell({
                    width: {
                      size: 35,
                      type: "pct",
                    },

                    borders: {
                      top: { style: "none" },
                      bottom: { style: "none" },
                      left: { style: "none" },
                      right: { style: "none" },
                    },

                    children: [
                      new Paragraph({
                        alignment: "center",

                        children: [
                          new TextRun({
                            text: dateStr,
                            italics: true,
                            size: 24,
                            font: "Times New Roman",
                          }),
                        ],
                      }),

                      new Paragraph({
                        alignment: "center",

                        children: [
                          new TextRun({
                            text: "Học sinh",
                            bold: true,
                            size: 24,
                            font: "Times New Roman",
                          }),
                        ],
                      }),

                      new Paragraph({
                        alignment: "center",

                        children: [
                          new TextRun({
                            text: studentName,
                            bold: true,
                            size: 24,
                            font: "Times New Roman",
                          }),
                        ],
                      }),
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
  saveAs(blob, "lich_su.docx");
};

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
  const [historySubjectSearch, setHistorySubjectSearch] = useState(""); 
  const [historySubject, setHistorySubject] = useState("all");
  const [historyScoreStatus, setHistoryScoreStatus] = useState("all");
  const [scoreFrom, setScoreFrom] = useState("");
  const [scoreTo, setScoreTo] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [historyDateTo, setHistoryDateTo] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const profileRes = await axios
          .get("/auth/me", config)
          .catch(() => null);
        if (profileRes && profileRes.data) {
          setProfile(profileRes.data);
        }

        const [assignmentsRes, submissionsRes] = await Promise.all([
          axios.get("/assignments/student", config).catch(() => ({ data: [] })),
          axios
            .get("/submissions/my-submissions", config)
            .catch(() => ({ data: [] })),
        ]);

        const allAssignments =
          assignmentsRes.data.assignments || assignmentsRes.data || [];
        const mySubmissions =
          submissionsRes.data.submissions || submissionsRes.data || [];

        setAllAssignmentsForRef(allAssignments);

        const submittedAssignmentIds = mySubmissions.map(
          (sub) => sub.assignment?._id || sub.assignment,
        );
        const now = new Date();

        const pending = [];
        const overdueMocks = [];

        allAssignments.forEach((a) => {
          if (!submittedAssignmentIds.includes(a._id)) {
            if (new Date(a.dueDate) < now) {
              overdueMocks.push({
                _id: a._id + "_overdue",
                assignment: a,
                createdAt: a.dueDate,
                status: "overdue",
                score: 0,
                isOverdueMock: true,
                isOverdueMock: true,
              });
            } else {
              pending.push(a);
            }
          }
        });

        setPendingAssignments(pending);

        const fullHistory = [...mySubmissions, ...overdueMocks].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setCompletedAssignments(fullHistory);
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

  const getSubject = (sub) => {
    if (sub.assignment?.subject) return sub.assignment.subject;
    const foundAssign = allAssignmentsForRef.find(
      (a) => a._id === (sub.assignment?._id || sub.assignment),
    );
    if (foundAssign && foundAssign.subject) return foundAssign.subject;
    return "-";
  };

  const formatDateVN = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const filteredHistory = completedAssignments.filter((sub) => {
    const assign = sub.assignment || {};

    const matchSearch = (assign.title || "")
      .toLowerCase()
      .includes(historySearch.toLowerCase());

    const subj = getSubject(sub);

    const matchSubjectSearch = subj
      .toLowerCase()
      .includes(historySubjectSearch.toLowerCase());

    const matchSubject =
      !historySubject || historySubject === "all" || subj === historySubject;

    let matchDate = true;
    const subDate = new Date(sub.createdAt).getTime();

    if (historyDateFrom)
      matchDate =
        matchDate && subDate >= new Date(historyDateFrom).setHours(0, 0, 0, 0);

    if (historyDateTo)
      matchDate =
        matchDate &&
        subDate <= new Date(historyDateTo).setHours(23, 59, 59, 999);

    let matchScore = true;

    if (historyScoreStatus === "overdue") {
      matchScore = sub.isOverdueMock;
    } else if (historyScoreStatus === "pending") {
      matchScore = sub.status === "pending";
    } else if (historyScoreStatus === "graded") {
      matchScore = !sub.isOverdueMock && sub.status !== "pending";
    }

    if (scoreFrom !== "" && !sub.isOverdueMock && sub.status !== "pending") {
      matchScore = matchScore && Number(sub.score) >= Number(scoreFrom);
    }

    if (scoreTo !== "" && !sub.isOverdueMock && sub.status !== "pending") {
      matchScore = matchScore && Number(sub.score) <= Number(scoreTo);
    }

    if (
      scoreFrom !== "" &&
      scoreTo !== "" &&
      Number(scoreTo) < Number(scoreFrom)
    ) {
      return false;
    }

    return (
      matchSearch &&
      matchSubjectSearch &&
      matchSubject &&
      matchDate &&
      matchScore
    );
  });

  const handleExportClick = () => {
    if (filteredHistory.length === 0) return alert("Không có dữ liệu để xuất!");

    const dataToExport = filteredHistory.map((sub, idx) => ({
      STT: idx + 1,
      "Tên Bài Tập": sub.assignment?.title || "Bài tập đã xóa",
      "Môn Học": getSubject(sub),
      "Thời Gian Nộp": sub.isOverdueMock
        ? "Không nộp"
        : formatDateVN(sub.createdAt),
      "Điểm Số": sub.isOverdueMock
        ? "0 (Bỏ lỡ)"
        : sub.status === "pending"
          ? "Chờ chấm"
          : sub.score,
    }));

    exportFormalExcel(
      dataToExport,
      `BẢNG ĐIỂM CÁ NHÂN: LỚP ${profile?.classId?.name || profile?.className || ""}`,
      `Lich_Su_Hoc_Tap_${fullName.replace(/\s+/g, "_")}`,
      fullName,
    );
  };

  const handleExportWord = () => {
    if (filteredHistory.length === 0) return alert("Không có dữ liệu để xuất!");

    const dataToExport = filteredHistory.map((sub, idx) => ({
      STT: idx + 1,
      "Tên Bài Tập": sub.assignment?.title || "Bài tập đã xóa",
      "Môn Học": getSubject(sub),
      "Thời Gian Nộp": sub.isOverdueMock
        ? "Không nộp"
        : formatDateVN(sub.createdAt),
      "Điểm Số": sub.isOverdueMock
        ? "0 (Bỏ lỡ)"
        : sub.status === "pending"
          ? "Chờ chấm"
          : sub.score,
    }));

    exportWord(
      dataToExport,
      `BẢNG ĐIỂM CÁ NHÂN: LỚP ${
        profile?.classId?.name || profile?.className || ""
      }`,
      fullName,
    );
  };

  const handleExportPDF = async () => {
    if (filteredHistory.length === 0) return alert("Không có dữ liệu để xuất!");
    setIsExportingPDF(true);

    const dataToExport = filteredHistory.map((sub, idx) => ({
      STT: idx + 1,
      "Tên Bài Tập": sub.assignment?.title || "Bài tập đã xóa",
      "Môn Học": getSubject(sub),
      "Thời Gian Nộp": sub.isOverdueMock
        ? "Không nộp"
        : formatDateVN(sub.createdAt),
      "Điểm Số": sub.isOverdueMock
        ? "0 (Bỏ lỡ)"
        : sub.status === "pending"
          ? "Chờ chấm"
          : sub.score,
    }));

    await exportPDF(
      dataToExport,
      `BẢNG ĐIỂM CÁ NHÂN: LỚP ${
        profile?.classId?.name || profile?.className || ""
      }`,
      fullName,
    );
    setIsExportingPDF(false);
  };

  const handlePrint = async () => {
    if (filteredHistory.length === 0) return alert("Không có dữ liệu để in!");
    setIsPrinting(true);

    const dataToExport = filteredHistory.map((sub, idx) => ({
      STT: idx + 1,
      "Tên Bài Tập": sub.assignment?.title || "Bài tập đã xóa",
      "Môn Học": getSubject(sub),
      "Thời Gian Nộp": sub.isOverdueMock
        ? "Không nộp"
        : formatDateVN(sub.createdAt),
      "Điểm Số": sub.isOverdueMock
        ? "0 (Bỏ lỡ)"
        : sub.status === "pending"
          ? "Chờ chấm"
          : sub.score,
    }));

    await printPDF(
      dataToExport,
      `BẢNG ĐIỂM CÁ NHÂN: LỚP ${
        profile?.classId?.name || profile?.className || ""
      }`,
      fullName,
    );
    setIsPrinting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-sky-500 p-2 rounded-xl">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl text-sky-950 truncate max-w-[120px] sm:max-w-none">
              Học Sinh Panel
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-800 leading-tight">
                {fullName}
              </p>
              <p className="text-xs font-semibold text-sky-600">
                {profile?.classId?.name
                  ? `Lớp ${profile.classId.name}`
                  : profile?.className
                    ? `Lớp ${profile.className}`
                    : "Chưa phân lớp"}
              </p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border-2 border-sky-200 shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="text-rose-500 hover:bg-rose-50 rounded-xl sm:w-auto sm:px-3 sm:py-2"
            >
              <LogOut className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline font-bold">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="bg-sky-500 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-lg shadow-sky-200 mb-6 sm:mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
              Chào {fullName.split(" ").pop()}! 👋
            </h1>
            <p className="text-sky-100 text-sm sm:text-base lg:text-lg font-medium max-w-xl leading-relaxed">
              Hôm nay bạn có{" "}
              <strong className="text-white bg-sky-600 px-2 py-0.5 rounded-lg mx-1">
                {pendingAssignments.length}
              </strong>{" "}
              bài tập cần hoàn thành. Hãy sắp xếp thời gian hợp lý nhé!
            </p>
          </div>
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48 sm:w-64 sm:h-64" />
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full sm:w-max overflow-x-auto no-scrollbar">
          <Button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === "pending" ? "bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200" : "bg-transparent text-slate-500 hover:bg-slate-50 shadow-none"}`}
          >
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />{" "}
            <span className="text-sm sm:text-base">
              Cần làm ({pendingAssignments.length})
            </span>
          </Button>
          <Button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 sm:flex-none rounded-xl px-4 sm:px-6 h-11 sm:h-12 font-bold transition-all whitespace-nowrap ${activeTab === "completed" ? "bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200" : "bg-transparent text-slate-500 hover:bg-slate-50 shadow-none"}`}
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />{" "}
            <span className="text-sm sm:text-base">
              Lịch sử ({completedAssignments.length})
            </span>
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold text-sm sm:text-base">
              Đang tải dữ liệu học tập...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {pendingAssignments.length === 0 ? (
                  <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200 px-4">
                    <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-sky-400 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-700">
                      Tuyệt vời!
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">
                      Bạn đã hoàn thành tất cả bài tập được giao.
                    </p>
                  </div>
                ) : (
                  pendingAssignments.map((assig) => {
                    return (
                      <Card
                        key={assig._id}
                        className="rounded-3xl border-sky-100 shadow-sm hover:shadow-md transition-all bg-white flex flex-col"
                      >
                        <CardHeader className="pb-3 border-b border-slate-50 p-5 sm:p-6">
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <Badge className="bg-sky-50 text-sky-600 border-0 shadow-none font-bold px-3 py-1 text-xs whitespace-nowrap">
                              Đang mở
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-500 font-bold border-slate-200 text-xs whitespace-nowrap shrink-0"
                            >
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
                              <Clock className="w-4 h-4 mr-2 text-sky-500 shrink-0" />{" "}
                              Thời gian:{" "}
                              <span className="ml-1 text-slate-800">
                                {assig.duration} phút
                              </span>
                            </div>
                            <div className="flex items-start text-xs sm:text-sm font-semibold text-slate-600">
                              <Calendar className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" />{" "}
                              <span className="shrink-0">Hạn nộp:</span>{" "}
                              <span className="ml-1 text-slate-800 line-clamp-1">
                                {new Date(assig.dueDate).toLocaleString(
                                  "vi-VN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 pb-5 px-5 sm:px-6">
                          <Button
                            onClick={() => navigate(`/take-quiz/${assig._id}`)}
                            className="w-full h-11 sm:h-12 rounded-xl font-black text-sm sm:text-base shadow-sm bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200 transition-all active:scale-95"
                          >
                            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />{" "}
                            Bắt đầu làm bài
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "completed" && (
              <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden mb-10">
                <div className="p-6 bg-sky-100 border-b border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-sky-900 flex items-center">
                      <History className="w-6 h-6 mr-2 text-sky-600" /> Lịch Sử
                      Học Tập
                    </h3>
                    <p className="text-sky-700 font-medium text-sm mt-1">
                      Bảng Điểm Cá Nhân
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    {/* Nút In Mới */}
                    <Button
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-11 shadow-sm flex-1 sm:flex-none"
                    >
                      {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} 
                      In bảng điểm
                    </Button>

                    <Button
                      onClick={handleExportClick}
                      variant="outline"
                      className="bg-white text-sky-700 border-sky-300 hover:bg-sky-50 font-bold rounded-xl h-11 shadow-sm flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>

                    <Button
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      variant="outline"
                      className="bg-white text-sky-700 border-sky-300 hover:bg-sky-50 font-bold rounded-xl h-11 shadow-sm flex-1 sm:flex-none"
                    >
                      {isExportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} 
                      PDF
                    </Button>

                    <Button
                      onClick={handleExportWord}
                      variant="outline"
                      className="bg-white text-sky-700 border-sky-300 hover:bg-sky-50 font-bold rounded-xl h-11 shadow-sm flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 mr-2" /> Word
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row gap-4">
                  <div className="flex gap-3 flex-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-[14px] w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Tìm tên bài tập..."
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-sky-500 shadow-sm text-sm"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                    </div>

                    <div className="relative w-[200px]">
                      <Search className="absolute left-3 top-[14px] w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Tìm môn học..."
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-sky-500 shadow-sm text-sm"
                        value={historySubjectSearch}
                        onChange={(e) =>
                          setHistorySubjectSearch(e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0">
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <Select
                          value={historySubject}
                          onValueChange={setHistorySubject}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium shadow-sm w-[130px] text-sm">
                            <div className="flex items-center">
                              <Filter className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                              <SelectValue>
                                {
                                  {
                                    all: "Tất cả môn",
                                    Toán: "Toán",
                                    "Ngữ Văn": "Ngữ Văn",
                                    "Tiếng Anh": "Tiếng Anh",
                                  }[historySubject]
                                }
                              </SelectValue>
                            </div>
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="all">Tất cả môn</SelectItem>
                            <SelectItem value="Toán">Toán</SelectItem>
                            <SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem>
                            <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={historyScoreStatus}
                          onValueChange={setHistoryScoreStatus}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium shadow-sm w-[130px] text-sm">
                            <SelectValue>
                              {
                                {
                                  all: "Tất cả điểm",
                                  graded: "Đã chấm",
                                  overdue: "Quá hạn",
                                  pending: "Chờ chấm",
                                }[historyScoreStatus]
                              }
                            </SelectValue>
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="all">Tất cả điểm</SelectItem>
                            <SelectItem value="graded">Đã chấm</SelectItem>
                            <SelectItem value="overdue">Quá hạn</SelectItem>
                            <SelectItem value="pending">Chờ chấm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">
                          Từ
                        </span>

                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={scoreFrom}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value === "") {
                              setScoreFrom("");
                              return;
                            }

                            const num = Number(value);
                            if (num < 0 || num > 10) return;

                            if (scoreTo !== "" && num > Number(scoreTo)) {
                              alert('Điểm "Từ" phải nhỏ hơn hoặc bằng điểm "Đến"');
                              return;
                            }

                            setScoreFrom(value);
                          }}
                          className="h-10 rounded-xl bg-slate-50 border-slate-200 shadow-sm w-[55px] text-sm px-2"
                        />

                        <span className="text-sm font-medium text-slate-600">
                          điểm
                        </span>

                        <span className="text-sm font-medium text-slate-600">
                          đến
                        </span>

                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={scoreTo}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value === "") {
                              setScoreTo("");
                              return;
                            }

                            const num = Number(value);
                            if (num < 0 || num > 10) return;

                            if (scoreFrom !== "" && num < Number(scoreFrom)) {
                              alert('Điểm "Đến" phải lớn hơn hoặc bằng điểm "Từ"');
                              return;
                            }

                            setScoreTo(value);
                          }}
                          className="h-10 rounded-xl bg-slate-50 border-slate-200 shadow-sm w-[55px] text-sm px-2"
                        />

                        <span className="text-sm font-medium text-slate-600">
                          điểm
                        </span>
                      </div>
                    </div>
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
                        <TableHead className="font-bold text-sky-800 w-16 text-center rounded-tl-2xl">
                          STT
                        </TableHead>
                        <TableHead className="font-bold text-sky-800">
                          Tên Bài Tập
                        </TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-32">
                          Môn Học
                        </TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-48">
                          Thời Gian Nộp
                        </TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-32">
                          Điểm Số
                        </TableHead>
                        <TableHead className="font-bold text-sky-800 text-right w-32 rounded-tr-2xl pr-4">
                          Thao tác
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16">
                            <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">
                              Không tìm thấy dữ liệu.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map((sub, idx) => {
                          const isPending = sub.status === "pending";
                          const isOverdueMock = sub.isOverdueMock;

                          let isTimeOver = false;
                          if (sub.assignment?.dueDate) {
                            const due = new Date(
                              sub.assignment.dueDate,
                            ).getTime();
                            const now = new Date().getTime();
                            isTimeOver = now >= due;
                          }

                          return (
                            <TableRow
                              key={sub._id}
                              className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                            >
                              <TableCell className="font-medium text-slate-500 text-center">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-bold text-slate-800 py-4">
                                {sub.assignment?.title || (
                                  <span className="text-slate-400 italic font-normal">
                                    Bài tập đã bị xóa
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm font-medium text-slate-600">
                                  {getSubject(sub)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-medium text-slate-600 text-sm">
                                {isOverdueMock ? (
                                  <span className="text-slate-400 italic">
                                    Không nộp
                                  </span>
                                ) : (
                                  formatDateVN(sub.createdAt)
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isOverdueMock ? (
                                  <Badge className="font-bold text-sm px-3 py-1 shadow-none border-0 bg-rose-100 text-rose-700">
                                    Quá hạn
                                  </Badge>
                                ) : isPending ? (
                                  <Badge className="font-bold text-sm px-3 py-1 shadow-none border-0 bg-amber-100 text-amber-700">
                                    Chờ chấm
                                  </Badge>
                                ) : (
                                  <Badge
                                    className={`font-black text-sm px-3 py-1 shadow-none border-0 ${sub.score >= 8 ? "bg-emerald-100 text-emerald-700" : sub.score >= 5 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                                  >
                                    {sub.score}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                {isOverdueMock ? (
                                  <Button
                                    disabled
                                    variant="outline"
                                    size="sm"
                                    className="font-bold rounded-lg shadow-sm border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                                  >
                                    <FileX className="w-4 h-4 sm:mr-2" />{" "}
                                    <span className="hidden sm:inline">
                                      Bỏ lỡ
                                    </span>
                                  </Button>
                                ) : isPending ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      alert(
                                        "Bài làm có phần tự luận đang chờ giáo viên chấm. Bạn chỉ có thể xem chi tiết đáp án khi đã có điểm chính thức nhé!",
                                      )
                                    }
                                    className="font-bold rounded-lg shadow-sm border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100"
                                  >
                                    <Clock className="w-4 h-4 sm:mr-2" />{" "}
                                    <span className="hidden sm:inline">
                                      Chờ chấm
                                    </span>
                                  </Button>
                                ) : !isTimeOver ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      alert(
                                        `Bài tập này chưa hết thời gian làm bài của lớp.\n(Hạn nộp: ${formatDateVN(sub.assignment?.dueDate)}).\n\nĐể đảm bảo tính công bằng, bạn chỉ có thể xem đáp án chi tiết sau khi thời gian làm bài kết thúc.`,
                                      )
                                    }
                                    className="font-bold rounded-lg shadow-sm border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100"
                                  >
                                    <Lock className="w-4 h-4 sm:mr-2" />{" "}
                                    <span className="hidden sm:inline">
                                      Chưa mở
                                    </span>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      navigate(`/student/submission/${sub._id}`)
                                    }
                                    className="border-sky-200 text-sky-700 hover:bg-sky-100 font-bold rounded-lg shadow-sm"
                                  >
                                    <Eye className="w-4 h-4 sm:mr-2" />{" "}
                                    <span className="hidden sm:inline">
                                      Xem bài
                                    </span>
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
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;