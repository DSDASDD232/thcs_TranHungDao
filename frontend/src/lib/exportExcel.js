import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
// Nhớ check lại đường dẫn logo này cho đúng với file của cậu nhé
import schoolLogo from "../assets/logo-truong_221020252129.jpg"; 

export const exportFormalExcel = async (dataList, reportTitle, fileName, personName, roleName = "Học sinh") => {
  if (!dataList || dataList.length === 0) {
    return alert("Không có dữ liệu để xuất báo cáo!");
  }

  const today = new Date();
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, "0")} tháng ${(today.getMonth() + 1).toString().padStart(2, "0")} năm ${today.getFullYear()}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Báo Cáo", { views: [{ showGridLines: false }] });
  
  sheet.pageSetup = {
    paperSize: 9, 
    orientation: "landscape", // Khổ ngang cho rộng rãi
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
  };

  const tableHeaders = Object.keys(dataList[0]);
  const columnCount = tableHeaders.length;
  
  // 👉 BÍ QUYẾT: Đảm bảo phần Header quốc hiệu luôn có không gian rộng rãi (Tối thiểu 6 cột)
  const layoutColCount = Math.max(columnCount, 6);
  const lastLayoutLetter = sheet.getColumn(layoutColCount).letter;

  // 1. Header Quốc hiệu & Tiêu ngữ
  const row1 = sheet.addRow([]);
  const row2 = sheet.addRow([]);

  // Chữ bắt đầu từ cột B (Cell 2) để chừa cột A cho Logo
  row1.getCell(2).value = "UBND PHƯỜNG LƯU KIẾM";
  row2.getCell(2).value = "TRƯỜNG THCS TRẦN HƯNG ĐẠO";
  row1.getCell(4).value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
  row2.getCell(4).value = "ĐỘC LẬP - TỰ DO - HẠNH PHÚC";

  // Merge các ô (Cột B+C cho Tên trường, Cột D tới cuối cho Quốc hiệu)
  sheet.mergeCells(`B1:C1`);
  sheet.mergeCells(`B2:C2`);
  sheet.mergeCells(`D1:${lastLayoutLetter}1`);
  sheet.mergeCells(`D2:${lastLayoutLetter}2`);

  row1.height = 25;
  row2.height = 25;
  
  [1, 2].forEach(rowNum => {
      const r = sheet.getRow(rowNum);
      r.getCell(2).font = { name: "Times New Roman", size: 12, bold: true };
      r.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
      
      r.getCell(4).font = { name: "Times New Roman", size: 12, bold: true };
      r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
  });
  sheet.getCell(`D2`).font = { name: "Times New Roman", size: 13, bold: true, underline: true };

  // Chèn Logo gọn gàng vào cột A
  try {
      const logoResponse = await fetch(schoolLogo);
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoId = workbook.addImage({ buffer: logoBuffer, extension: "jpg" });
      sheet.addImage(logoId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 55, height: 55 },
      });
  } catch (err) {}

  // 2. Tiêu đề báo cáo
  sheet.addRow([]);
  const titleRow = sheet.addRow([reportTitle.toUpperCase()]);
  sheet.mergeCells(`A4:${lastLayoutLetter}4`);
  titleRow.height = 45;
  sheet.getCell("A4").font = { name: "Times New Roman", size: 16, bold: true, color: { argb: "FF0070C0" } };
  sheet.getCell("A4").alignment = { vertical: "middle", horizontal: "center" };

  sheet.addRow([]);
  
  // 3. Header Bảng Dữ Liệu
  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0070C0" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  // 4. Đổ dữ liệu
  dataList.forEach((obj) => {
      const row = sheet.addRow(Object.values(obj));
      row.height = 30; // Giãn dòng 
      row.eachCell((cell, colNumber) => {
          cell.font = { name: "Times New Roman", size: 12 };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          // Cột 2 (Họ và Tên) căn trái, còn lại căn giữa
          if (colNumber === 1 || colNumber >= 3) {
              cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
              cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
          }
      });
  });

  // 5. Tự động căn chỉnh độ rộng cột theo độ dài chữ
  tableHeaders.forEach((header, i) => {
      let maxLength = header.length;
      dataList.forEach(row => {
          const cellValue = row[header] ? String(row[header]) : "";
          if (cellValue.length > maxLength) {
              maxLength = cellValue.length;
          }
      });
      // Đảm bảo cột A (chứa STT/Hạng) luôn có độ rộng tối thiểu là 12 để vừa Logo
      const width = i === 0 ? Math.max(maxLength + 4, 12) : Math.min(Math.max(maxLength + 5, 18), 45);
      sheet.getColumn(i + 1).width = width;
  });

  // 6. Khu vực chữ ký (Tự động canh lề phải)
  sheet.addRow([]);
  sheet.addRow([]);

  // Lấy 3 cột cuối cùng để gộp cho phần chữ ký
  const signStartCol = Math.max(layoutColCount - 2, 4); 
  const signStartLetter = sheet.getColumn(signStartCol).letter;

  const dateRow = sheet.addRow(Array(layoutColCount).fill(""));
  const dateRowNum = dateRow.number;
  sheet.getCell(`${signStartLetter}${dateRowNum}`).value = dateStr;
  sheet.mergeCells(`${signStartLetter}${dateRowNum}:${lastLayoutLetter}${dateRowNum}`);
  sheet.getCell(`${signStartLetter}${dateRowNum}`).font = { name: "Times New Roman", size: 12, italic: true };
  sheet.getCell(`${signStartLetter}${dateRowNum}`).alignment = { horizontal: "center" };

  const signRow = sheet.addRow(Array(layoutColCount).fill(""));
  const signRowNum = signRow.number;
  sheet.getCell(`${signStartLetter}${signRowNum}`).value = roleName;
  sheet.mergeCells(`${signStartLetter}${signRowNum}:${lastLayoutLetter}${signRowNum}`);
  sheet.getCell(`${signStartLetter}${signRowNum}`).font = { name: "Times New Roman", size: 12, bold: true };
  sheet.getCell(`${signStartLetter}${signRowNum}`).alignment = { horizontal: "center" };

  sheet.addRow([]); sheet.addRow([]); sheet.addRow([]);

  const nameRow = sheet.addRow(Array(layoutColCount).fill(""));
  const nameRowNum = nameRow.number;
  sheet.getCell(`${signStartLetter}${nameRowNum}`).value = personName;
  sheet.mergeCells(`${signStartLetter}${nameRowNum}:${lastLayoutLetter}${nameRowNum}`);
  sheet.getCell(`${signStartLetter}${nameRowNum}`).font = { name: "Times New Roman", size: 12, bold: true };
  sheet.getCell(`${signStartLetter}${nameRowNum}`).alignment = { horizontal: "center" };
  
  sheet.headerFooter.oddFooter = `&R&"Times New Roman,Bold"&10Người xuất file: ${personName}`;
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${fileName}.xlsx`);
};