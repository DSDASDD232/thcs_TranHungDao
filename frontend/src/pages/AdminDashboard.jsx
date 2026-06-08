import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import * as XLSX from "xlsx"; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShieldCheck, Users, GraduationCap, School, LogOut, TrendingUp, UserPlus, 
  Loader2, Trash2, Edit, Search, Filter, FileCheck, 
  FileSpreadsheet, PenTool, Download, Trophy, BarChart, Calendar, Eye, 
  Menu, X, Key, Lock, Unlock, Library, Database, ChevronLeft, ChevronRight,
  Save, UploadCloud, Sparkles, User, Settings
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

  sheet.columns = [ { width: 10 }, { width: 30 }, { width: 30 }, { width: 35 }, { width: 40 } ];

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

const getSubjects = (user) => {
  if (Array.isArray(user.subjects) && user.subjects.length > 0) return user.subjects;
  if (user.subject) return [user.subject]; 
  return [];
};

const normalizeText = (text) => {
  if (!text && text !== 0) return "";
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const getRoleLabel = (role) => {
  if (role === "teacher") return "Giáo viên";
  if (role === "student") return "Học sinh";
  return "Chọn vai trò";
};

const getStatusLabel = (status, tab = "accounts") => {
  if (tab === "studentAccounts") {
    if (status === "active") return "Đang học";
    if (status === "inactive") return "Đã nghỉ học";
  }
  if (status === "active") return "Đang hoạt động";
  if (status === "inactive") return "Ngưng hoạt động";
  return "Trạng thái";
};

const getStatusOptions = (tab = "accounts") => {
  if (tab === "studentAccounts") {
    return [
      { value: "active", label: "Đang học" },
      { value: "inactive", label: "Đã nghỉ học" },
    ];
  }
  return [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngưng hoạt động" },
  ];
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Quản trị viên";
  const currentRole = localStorage.getItem("role");
  const accountFileRef = useRef(null);

  const [activeTab, setActiveTab] = useState("overview"); 
  const [subTab, setSubTab] = useState("all"); 

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [recentUsers, setRecentUsers] = useState([]); 
  const [classesList, setClassesList] = useState([]); 
  const [teachersList, setTeachersList] = useState([]);
  const [lbCounts, setLbCounts] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({ students: 0, teachers: 0, assignments: 0, submissions: 0 });
  const [adminLeaderboard, setAdminLeaderboard] = useState([]);
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [lbYear, setLbYear] = useState(currentYear);
  const [lbAvailableYears, setLbAvailableYears] = useState([currentYear]);
  const [lbMonth, setLbMonth] = useState("all"); // Mặc định là 'all' các tháng
  const [lbDay, setLbDay] = useState("all");     // Mặc định là 'all' các ngày
  const [lbGradeFilter, setLbGradeFilter] = useState("all");
  const [lbClassSearch, setLbClassSearch] = useState("");
  const [isLoadingLb, setIsLoadingLb] = useState(false);
  const [selectedLbClassId, setSelectedLbClassId] = useState("");
  const [classStudentStats, setClassStudentStats] = useState([]);
  const [classInfoForStats, setClassInfoForStats] = useState(null);
  const [isLoadingClassStats, setIsLoadingClassStats] = useState(false);
  const [editingStatStudentId, setEditingStatStudentId] = useState(null);
  const [editingStatForm, setEditingStatForm] = useState({ totalTests: "", averageScore: "", note: "" });
  const [isSavingStudentStat, setIsSavingStudentStat] = useState(false);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isUserDetailDialogOpen, setIsUserDetailDialogOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [createMethod, setCreateMethod] = useState("manual"); 
  const [newUser, setNewUser] = useState({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "", status: "active", phone: "", address: "", department: "", subjects: [], qualification: "Đại học", departmentPosition: "Giáo viên thường", note: "" });
  const [editUser, setEditUser] = useState(null); 
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [filterUserGrade, setFilterUserGrade] = useState("all");
  const [filterUserClass, setFilterUserClass] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSelectingRows, setIsSelectingRows] = useState(false);
  const [dragSelectMode, setDragSelectMode] = useState(null);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({ status: "", note: "" });
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const [accountFile, setAccountFile] = useState(null);

  useEffect(() => {
    setSelectedUserIds([]);
  }, [activeTab]);
  const [previewData, setPreviewData] = useState([]);
  const [uploadGrade, setUploadGrade] = useState("");
  const [uploadClassId, setUploadClassId] = useState("");
  const [importDuplicateMessage, setImportDuplicateMessage] = useState("");
  const [importResults, setImportResults] = useState(null);

  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [profileData, setProfileData] = useState({ fullName: '', phone: '', address: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  useEffect(() => {
    const onMouseUp = () => {
      if (isSelectingRows) {
        setIsSelectingRows(false);
        setDragSelectMode(null);
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [isSelectingRows]);

  const nextSlide = () => setCurrentImageIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentImageIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));

  const getHeader = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const config = getHeader();
      if (!config) {
        handleLogout();
        return;
      }
      const [statsRes, usersRes, classRes, subjectsRes, lbCountsRes] = await Promise.all([
        axios.get("/admin/stats", config),
        axios.get("/admin/users/recent", config),
        axios.get("/classes/all", config),
        axios.get("/admin/subjects", config),
        axios.get("/admin/leaderboard/stats", config),
      ]);

      setDashboardStats(statsRes.data.data || statsRes.data);
      const usersData = usersRes.data;
      const allUsrs = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
      setRecentUsers(allUsrs);
      setClassesList(classRes.data.classes || []);
      setTeachersList(allUsrs.filter(u => u.role === 'teacher'));
      setSubjectOptions(Array.isArray(subjectsRes) ? subjectsRes : (Array.isArray(subjectsRes?.data) ? subjectsRes.data : []));
      setLbCounts(lbCountsRes.data || null);
    } catch (error) { 
        if (error.response?.status === 403 || error.response?.status === 401) handleLogout(); 
    } finally { 
        setIsLoadingData(false); 
    }
  };

  const fetchSubjectOptions = async () => {
    const config = getHeader();
    if (!config) {
      handleLogout();
      return;
    }

    try {
      const res = await axios.get("/admin/subjects", config);
      setSubjectOptions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi tải danh mục môn học:", error);
      if (error.response?.status === 403 || error.response?.status === 401) handleLogout();
    }
  };

  // Nếu không có token hoặc không phải admin, chuyển về login ngay.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || currentRole !== "admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, []);

  // Khi vừa thêm môn ở tab "Tổ chuyên môn" xong chuyển qua "Tài khoản",
  // cần refresh lại danh mục môn để giáo viên chọn được môn mới ngay.
  useEffect(() => {
    if (activeTab === "accounts") fetchSubjectOptions();
  }, [activeTab]);

  // GỌI API THI ĐUA VỚI THAM SỐ MỚI
  const fetchLeaderboardYears = async () => {
    try {
      const res = await axios.get("/admin/leaderboard/years", getHeader());
      const yearsFromApi = Array.isArray(res.data?.years) ? res.data.years : [];
      const dataYears = yearsFromApi
        .map((y) => String(y))
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b));

      const nowYear = Number(currentYear);
      const maxFutureYear = nowYear + 10;
      const futureYears = Array.from({ length: maxFutureYear - nowYear + 1 }, (_, i) => String(nowYear + i));
      const mergedYears = Array.from(new Set([...dataYears, ...futureYears])).sort((a, b) => Number(a) - Number(b));

      setLbAvailableYears(mergedYears);
      setLbYear((prev) => (mergedYears.includes(prev) ? prev : currentYear));
    } catch (error) {
      console.error("Lỗi tải năm thi đua:", error);
      const nowYear = Number(currentYear);
      const fallbackYears = Array.from({ length: 11 }, (_, i) => String(nowYear + i));
      setLbAvailableYears(fallbackYears);
      setLbYear(currentYear);
    }
  };

  const fetchAdminLeaderboard = async () => {
    setIsLoadingLb(true);
    try {
      const res = await axios.get(`/admin/leaderboard?year=${lbYear}&month=${lbMonth}&day=${lbDay}&grade=${lbGradeFilter}`, getHeader());
      const leaderboardData = res.data.leaderboard || [];
      setAdminLeaderboard(leaderboardData);
      setSelectedLbClassId((prev) => {
        if (prev && leaderboardData.some((cls) => String(cls._id) === String(prev))) return String(prev);
        return leaderboardData[0]?._id ? String(leaderboardData[0]._id) : "";
      });
    } catch (error) {
      console.error("Lỗi tải bảng thi đua:", error);
    } finally {
      setIsLoadingLb(false);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") fetchLeaderboardYears();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "leaderboard") fetchAdminLeaderboard();
  }, [activeTab, lbYear, lbMonth, lbDay, lbGradeFilter]);

  useEffect(() => {
    if (activeTab !== "leaderboard") return;
    fetchClassStudentStats(selectedLbClassId);
  }, [activeTab, selectedLbClassId, lbYear, lbMonth, lbDay]);

  const fetchAdminProfile = async () => {
    try {
      const config = getHeader();
      if (!config) return;
      const res = await axios.get("/auth/me", config);
      setProfileData({
        fullName: res.data.fullName || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
    } catch (error) {
      console.error("Lỗi tải thông tin admin:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") fetchAdminProfile();
  }, [activeTab]);

  const getLeaderboardClassLabel = (cls) => cls?.className || cls?.name || "—";
  const getLeaderboardClassId = (cls) => String(cls?._id || "");

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    const phoneRaw = String(profileData.phone ?? "").trim();
    if (phoneRaw !== "" && !/^\d{1,15}$/.test(phoneRaw)) {
      return alert("Số điện thoại nếu nhập thì là số (1-15 ký tự), không được nhập chữ.");
    }

    const wantsPasswordChange = Boolean(
      passwordData.oldPassword || passwordData.newPassword || passwordData.confirmPassword
    );

    if (wantsPasswordChange) {
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        return alert("Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.");
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        return alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      }
      if (passwordData.newPassword.length < 6) {
        return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)) {
        return alert("Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*(),.?\":{}|<>).");
      }
    }

    setIsSavingProfile(true);
    try {
      const res = await axios.put("/auth/profile", {
        fullName: profileData.fullName,
        phone: phoneRaw,
        address: profileData.address,
        ...(wantsPasswordChange ? {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        } : {}),
      }, getHeader());

      localStorage.setItem("fullName", profileData.fullName);
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });

      if (res.data.passwordChanged) {
        alert("✅ Cập nhật thông tin và đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        handleLogout();
      } else {
        alert("✅ Lưu thông tin thành công!");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi lưu thông tin!");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };
  const handleSubTabChange = (tab) => { setSubTab(tab); setSearchName(""); setFilterUserGrade("all"); setFilterUserClass("all"); };
  const handleMenuClick = (tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };
  const handleViewAllAccounts = () => { setActiveTab("accounts"); setIsMobileMenuOpen(false); };
  const handleViewTeacherAccounts = () => { setActiveTab("teacherAccounts"); setIsMobileMenuOpen(false); };
  const handleViewStudentAccounts = () => { setActiveTab("studentAccounts"); setIsMobileMenuOpen(false); };


  const fetchClassStudentStats = async (classId) => {
    if (!classId) {
      setClassStudentStats([]);
      setClassInfoForStats(null);
      return;
    }
    setIsLoadingClassStats(true);
    try {
      const res = await axios.get(
        `/admin/leaderboard/class/${classId}/students?year=${lbYear}&month=${lbMonth}&day=${lbDay}`,
        getHeader()
      );
      setClassStudentStats(res.data.students || []);
      setClassInfoForStats(res.data.classInfo || null);
    } catch (error) {
      console.error("Lỗi tải chi tiết thi đua lớp:", error);
      setClassStudentStats([]);
      setClassInfoForStats(null);
    } finally {
      setIsLoadingClassStats(false);
    }
  };

  const handleStartEditStudentStat = (student) => {
    setEditingStatStudentId(student._id);
    setEditingStatForm({
      averageScore: String(student.final?.averageScore ?? student.computed?.averageScore ?? 0),
      note: student.note || "",
    });
  };

  const handleCancelEditStudentStat = () => {
    setEditingStatStudentId(null);
    setEditingStatForm({ averageScore: "", note: "" });
  };

  const handleSaveStudentStat = async (studentId) => {
    const averageScore = Number(editingStatForm.averageScore);
    if (!Number.isFinite(averageScore) || averageScore < 0 || averageScore > 10) return alert("Điểm TB phải trong khoảng 0-10");

    const student = classStudentStats.find((item) => item._id === studentId);
    if (!student) return alert("Không tìm thấy học sinh để cập nhật.");

    setIsSavingStudentStat(true);
    try {
      await axios.put(
        `/admin/leaderboard/class/${selectedLbClassId}/students/${studentId}`,
        {
          totalTests: student.final.totalTests,
          averageScore,
          note: editingStatForm.note || "",
        },
        getHeader()
      );
      await fetchClassStudentStats(selectedLbClassId);
      await fetchAdminLeaderboard();
      alert("✅ Đã cập nhật điểm TB hệ thống cho học sinh!");
      handleCancelEditStudentStat();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi cập nhật thi đua học sinh");
    } finally {
      setIsSavingStudentStat(false);
    }
  };

  const handleResetStudentStat = async (studentId) => {
    if (!window.confirm("Bạn muốn bỏ chỉnh tay để quay về số liệu hệ thống tính tự động?")) return;
    setIsSavingStudentStat(true);
    try {
      await axios.put(
        `/admin/leaderboard/class/${selectedLbClassId}/students/${studentId}`,
        { resetOverride: true },
        getHeader()
      );
      await fetchClassStudentStats(selectedLbClassId);
      await fetchAdminLeaderboard();
      alert("✅ Đã phục hồi số liệu tự động cho học sinh.");
      handleCancelEditStudentStat();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi phục hồi số liệu tự động");
    } finally {
      setIsSavingStudentStat(false);
    }
  };

  const handleDeleteStudentNote = async (student) => {
    if (!window.confirm(`Xóa ghi chú thi đua của học sinh ${student.fullName}?`)) return;
    setIsSavingStudentStat(true);
    try {
      await axios.put(
        `/admin/leaderboard/class/${selectedLbClassId}/students/${student._id}`,
        {
          totalTests: student.final.totalTests,
          averageScore: student.final.averageScore,
          note: "",
        },
        getHeader()
      );
      await fetchClassStudentStats(selectedLbClassId);
      alert("✅ Đã xóa ghi chú thi đua.");
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xóa ghi chú");
    } finally {
      setIsSavingStudentStat(false);
    }
  };

  const resolveTeacherPosition = (department, position) => {
    if (!department) return "";
    const valid = ["Tổ trưởng", "Tổ phó", "Giáo viên thường"];
    return valid.includes(position) ? position : "Giáo viên thường";
  };

  const buildUserUpdatePayload = (user) => {
    const classIdValue = user.classId?._id || user.classId || null;
    const payload = {
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      address: user.address,
      note: user.note,
    };
    if (user.role === "student") {
      payload.grade = user.grade;
      payload.classId = classIdValue;
    }
    if (user.role === "teacher") {
      payload.department = user.department || "";
      payload.subjects = Array.isArray(user.subjects) ? user.subjects : [];
      payload.qualification = user.qualification || "Đại học";
      payload.departmentPosition = resolveTeacherPosition(
        payload.department,
        user.departmentPosition
      );
    }
    return payload;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.role === "student" && (!newUser.grade || !newUser.classId)) return alert("Vui lòng chọn đầy đủ Khối và Lớp cho học sinh!");
    if (newUser.role === "student" || newUser.role === "teacher") {
      const phoneRaw = String(newUser.phone ?? "").trim();
      const addressRaw = String(newUser.address ?? "").trim();
      const roleLabel = newUser.role === "teacher" ? "Giáo viên" : "Học sinh";
      if (!phoneRaw || !addressRaw) return alert(`${roleLabel} phải nhập đầy đủ Số điện thoại và Địa chỉ!`);
      if (!/^\d{1,15}$/.test(phoneRaw)) return alert("Số điện thoại phải là số (1-15 ký tự), không được nhập chữ.");
    }
    if (newUser.password.length < 6) {
      return alert("Mật khẩu phải có ít nhất 6 ký tự!");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newUser.password)) {
      return alert("Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*(),.?\":{}|<>).");
    }
    setLoading(true);
    try {
      await axios.post("/auth/register", {
        ...newUser,
        subjects: Array.isArray(newUser.subjects) ? newUser.subjects : [],
        departmentPosition: newUser.role === "teacher"
          ? resolveTeacherPosition(newUser.department, newUser.departmentPosition)
          : "",
      }, getHeader());
      setIsUserDialogOpen(false); 
      setNewUser({ username: "", password: "", fullName: "", role: "student", grade: "", classId: "", status: "active", phone: "", address: "", department: "", subjects: [], qualification: "Đại học", departmentPosition: "Giáo viên thường", note: "" }); 
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

    const phoneRaw = String(editUser.phone ?? "").trim();
    const addressRaw = String(editUser.address ?? "").trim();
    if (editUser.role === "student" || editUser.role === "teacher") {
      const roleLabel = editUser.role === "teacher" ? "Giáo viên" : "Học sinh";
      if (!phoneRaw || !addressRaw) return alert(`${roleLabel} phải nhập đầy đủ Số điện thoại và Địa chỉ!`);
    }
    if (phoneRaw !== "" && !/^\d{1,15}$/.test(phoneRaw)) {
      return alert("Số điện thoại phải là số (1-15 ký tự), không được nhập chữ.");
    }

    setLoading(true);
    try {
      const payload = buildUserUpdatePayload(editUser);
      await axios.put(`/admin/users/${editUser._id}`, payload, getHeader());
      setIsEditUserDialogOpen(false); 
      fetchData(); 
      alert("✅ Cập nhật thành công!");
    } catch (err) { 
        const message = err?.response?.data?.message || err?.response?.data || err?.message || "❌ Lỗi cập nhật!";
        alert(typeof message === 'string' ? message : JSON.stringify(message));
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
    const newPassword = window.prompt(`Nhập mật khẩu mới cho tài khoản ${username}:\n(Để trống nếu muốn đặt mật khẩu mặc định là 1)\nMật khẩu phải có ít nhất 6 ký tự và chứa ít nhất một ký tự đặc biệt.`, "1");
    if (newPassword === null) return; 

    // Client-side validation for newPassword from prompt
    if (newPassword !== "1" && newPassword.length > 0) { // Only validate if not default "1" and not empty
        if (newPassword.length < 6) {
            return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            return alert("Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*(),.?\":{}|<>).");
        }
    }
    
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
    const ws = XLSX.utils.json_to_sheet([
      {
        "STT": 1,
        "Tên học sinh": "Nguyễn Văn A",
        "Năm sinh": "2012",
        "Số điện thoại": "0987654321",
        "Địa chỉ": "Số 1, Phường A, Quận B"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };

  const normalizeStudentImportRow = (rawRow) => {
    const normalizedRow = {};
    const keyMap = {
      stt: "STT",
      "số điện thoại": "Số điện thoại",
      sdt: "Số điện thoại",
      phone: "Số điện thoại",
      "điện thoại": "Số điện thoại",
      "địa chỉ": "Địa chỉ",
      diachi: "Địa chỉ",
      address: "Địa chỉ",
      "tên học sinh": "Tên học sinh",
      "họ và tên": "Tên học sinh",
      "họ tên": "Tên học sinh",
      "họ": "Tên học sinh",
      "tên": "Tên học sinh",
      "năm sinh": "Năm sinh",
      namsinh: "Năm sinh",
      year: "Năm sinh",
    };

    const stripAccents = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

    Object.entries(rawRow).forEach(([key, value]) => {
      const strippedKey = stripAccents(key).toLowerCase().trim();
      const normalizedKey = keyMap[strippedKey] || key;
      normalizedRow[normalizedKey] = value;
    });

    return normalizedRow;
  };

  const buildStudentUsername = (fullName, className, stt) => {
    const cleanedName = normalizeText(fullName || "");
    const nameParts = cleanedName.split(" ").filter(Boolean);
    const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : cleanedName;
    const cleanClassName = String(className || "").toLowerCase().replace(/\s+/g, "");
    const paddedStt = String(stt || "").padStart(2, "0");
    return `${firstName}${cleanClassName}${paddedStt}`;
  };

  const handleAccountFileChange = (e) => {
    setImportDuplicateMessage("");
    setImportResults(null);
    const file = e.target.files?.[0];
    if (file) {
      setAccountFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const sheet = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const normalized = json.map(normalizeStudentImportRow);
        setPreviewData(normalized);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleAccountFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleAccountFileChange({ target: { files: [file] } });
    }
  };

  const handleUploadExcel = async () => {
    if (!uploadClassId) return alert("Vui lòng chọn Lớp tiếp nhận học sinh trước!");
    if (previewData.length === 0) return alert("File Excel không có dữ liệu hợp lệ!");

    const selectedClassObj = classesList.find(c => String(c._id) === String(uploadClassId));
    if (!selectedClassObj) return alert("Lớp chọn không hợp lệ!");

    setImportDuplicateMessage("");
    setImportResults(null);
    setLoading(true);
    try {
      const payload = { classId: uploadClassId, className: selectedClassObj.name, grade: selectedClassObj.grade, students: previewData };
      const res = await axios.post("/admin/users/import-json", payload, getHeader());

      const result = res.data;
      const summaryLines = [];
      if (result.successCount) summaryLines.push(`Đã thêm ${result.successCount} học sinh thành công.`);
      if (result.duplicateCount) summaryLines.push(`Bỏ qua ${result.duplicateCount} dòng trùng trong lớp.`);
      if (result.failedCount) summaryLines.push(`Bỏ qua ${result.failedCount} dòng thiếu thông tin.`);
      setImportDuplicateMessage(summaryLines.join("\n"));
      setImportResults(result);

      let alertMessage = `✅ Hoàn tất import!\n`;
      alertMessage += summaryLines.length > 0 ? summaryLines.join(" ") : "Không có học sinh nào được thêm.";
      if (result.accounts && result.accounts.length > 0) {
        alertMessage += `\n\nĐang tự động tải file tài khoản .xlsx về máy...`;
      }
      alert(alertMessage);

      if (result.accounts && result.accounts.length > 0) {
        const ws = XLSX.utils.json_to_sheet(result.accounts);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "TaiKhoan");
        XLSX.writeFile(wb, `Danh_Sach_Tai_Khoan_Lop_${selectedClassObj.name}.xlsx`);
      }

      if (result.successCount > 0) {
        fetchData();
      }

      if (result.successCount > 0 && result.duplicateCount === 0 && result.failedCount === 0) {
        setIsUserDialogOpen(false);
        setAccountFile(null);
        setPreviewData([]);
        setUploadGrade("");
        setUploadClassId("");
        setImportDuplicateMessage("");
        setImportResults(null);
      }
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

  const handleExportLeaderboard = () => {
    if (!filteredLeaderboardClasses || filteredLeaderboardClasses.length === 0) return alert("Không có dữ liệu thi đua để xuất Excel.");
    const dataToExport = filteredLeaderboardClasses.map((cls, index) => ({
      "STT": index + 1,
      "Tên lớp": cls.className,
      "Khối": cls.grade,
      "Sĩ số": cls.studentCount || 0,
      "Số bài đã nộp": cls.totalTests,
      "Điểm TB": cls.averageScore
    }));

    const periodLabel = lbMonth === "all" ? "Cả năm" : lbDay === "all" ? `Tháng ${lbMonth}` : `Ngày ${lbDay}`;
    exportFormalExcel(dataToExport, `BẢNG THI ĐUA TOÀN TRƯỜNG - ${lbYear} - ${periodLabel}`, `Bang_Thi_Dua_Toan_Truong_${lbYear}_${lbMonth}_${lbDay}`, fullName);
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
    if (!user.assignedClasses || user.assignedClasses.length === 0) return <span className="text-slate-400 italic text-xs mt-1 block">Chưa phân công lớp</span>;
    
    const classNames = user.assignedClasses.map(c => {
       const classId = typeof c === 'object' ? c._id : c;
       const matched = classesList.find(cls => String(cls._id) === String(classId));
       return matched ? matched.name : null;
    }).filter(Boolean);

    return classNames.length > 0 ? (
       <div className="flex flex-wrap gap-1 mt-1">
          {classNames.map((name, idx) => (
             <Badge key={idx} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">{name}</Badge>
          ))}
       </div>
    ) : <span className="text-slate-400 italic text-[10px] mt-1 block">Chưa phân công</span>;
  };

  const getSubjectsByDepartment = (department) => {
    if (!department) return [];
    return subjectOptions.filter((s) => s.department === department);
  };

  const toggleUserSubject = (target, subjectName) => {
    if (target === "new") {
      setNewUser((prev) => {
        const current = Array.isArray(prev.subjects) ? prev.subjects : [];
        const next = current.includes(subjectName)
          ? current.filter((s) => s !== subjectName)
          : [...current, subjectName];
        return { ...prev, subjects: next };
      });
      return;
    }

    setEditUser((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.subjects) ? prev.subjects : [];
      const next = current.includes(subjectName)
        ? current.filter((s) => s !== subjectName)
        : [...current, subjectName];
      return { ...prev, subjects: next };
    });
  };

  const openUserDetailDialog = async (user) => {
    const userId = user._id || user.id;
    setSelectedUserDetail(user);
    setSelectedUserLoading(false);
    setIsUserDetailDialogOpen(true);

    if (!userId) {
      return;
    }

    if (user.phone && user.address && user.fullName && user.role) {
      return;
    }

    setSelectedUserLoading(true);
    try {
      const res = await axios.get(`/admin/users/${userId}`, getHeader());
      setSelectedUserDetail(res.data);
    } catch (error) {
      console.error("Lỗi tải chi tiết tài khoản:", error.response?.status, error.response?.data || error.message);
      setSelectedUserDetail(user);
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const hasUserProfileInfo = (user) => {
    if (!user || !user.role) return false;
    const hasCommon = Boolean(user.phone || user.address || user.note);
    if (user.role === 'student') {
      const hasStudentInfo = Boolean(user.grade || user.classId || hasCommon);
      return hasStudentInfo;
    }
    if (user.role === 'teacher') {
      const hasTeacherInfo = Boolean(user.department || getSubjects(user).length || user.qualification || hasCommon);
      return hasTeacherInfo;
    }
    return hasCommon;
  };

  const currentGrade = isUserDialogOpen ? newUser.grade : (isEditUserDialogOpen ? editUser?.grade : "");
  const filteredClassesForDropdown = classesList.filter(c => String(c.grade) === String(currentGrade));
  const filteredUploadClasses = classesList.filter(c => String(c.grade) === String(uploadGrade));
  const accountView = activeTab === "teacherAccounts" ? "teacher" : activeTab === "studentAccounts" ? "student" : "all";
  const filteredUsers = recentUsers.filter(user => {
    const keyword = String(searchName || "").toLowerCase().trim();
    const isFilteringByClass = filterUserGrade !== "all" || filterUserClass !== "all";

    if (accountView === "teacher" && user.role !== "teacher") return false;
    if (accountView === "student" && user.role !== "student") return false;
    if (accountView === "all" && isFilteringByClass && user.role !== "student") return false;

    if (keyword) {
      const address = String(user.address || "").toLowerCase();
      const phone = String(user.phone || "").toLowerCase();
      if (
        !user.fullName.toLowerCase().includes(keyword) &&
        !user.username.toLowerCase().includes(keyword) &&
        !address.includes(keyword) &&
        !phone.includes(keyword)
      ) return false;
    }

    if (user.role === "student" && (accountView === "student" || accountView === "all")) {
      if (filterUserGrade !== "all" && String(user.grade) !== filterUserGrade) return false;
      const uClassId = user.classId?._id || user.classId;
      if (filterUserClass !== "all" && String(uClassId) !== filterUserClass) return false;
    }
    if (!hasUserProfileInfo(user)) return false;
    return true;
  });

  const selectedUsers = recentUsers.filter(u => selectedUserIds.includes(String(u._id)));
  const selectedCount = selectedUsers.length;
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(String(u._id)));

  const handleRowSelectionStart = (userId, currentlySelected) => (event) => {
    if (event.button !== 0) return;
    if (event.target.type === "checkbox") return;
    event.preventDefault();
    const shouldSelect = !currentlySelected;
    setIsSelectingRows(true);
    setDragSelectMode(shouldSelect ? "add" : "remove");
    setSelectedUserIds((prevIds) => {
      if (shouldSelect) return Array.from(new Set([...prevIds, userId]));
      return prevIds.filter((id) => id !== userId);
    });
  };

  const handleRowSelectionEnter = (userId) => {
    if (!isSelectingRows || !dragSelectMode) return;
    setSelectedUserIds((prevIds) => {
      const already = prevIds.includes(userId);
      if (dragSelectMode === "add" && !already) return [...prevIds, userId];
      if (dragSelectMode === "remove" && already) return prevIds.filter((id) => id !== userId);
      return prevIds;
    });
  };

  const handleSelectAllVisible = () => {
    if (isAllSelected) {
      setSelectedUserIds((prevIds) => prevIds.filter(id => !filteredUsers.some(u => String(u._id) === id)));
    } else {
      setSelectedUserIds((prevIds) => Array.from(new Set([...prevIds, ...filteredUsers.map(u => String(u._id))])));
    }
  };

  const handleToggleUserSelection = (userId) => {
    setSelectedUserIds((prevIds) => prevIds.includes(userId) ? prevIds.filter(id => id !== userId) : [...prevIds, userId]);
  };

  const handleBulkEditOpen = () => {
    setBulkEditFields({ status: "", note: "" });
    setIsBulkEditDialogOpen(true);
  };

  const handleBulkUpdate = async () => {
    if (selectedCount === 0) return;
    const updateFields = {};
    if (bulkEditFields.status) updateFields.status = bulkEditFields.status;
    if (bulkEditFields.note) updateFields.note = bulkEditFields.note;
    if (!Object.keys(updateFields).length) {
      setIsBulkEditDialogOpen(false);
      return;
    }
    setIsBulkSaving(true);
    try {
      await Promise.all(selectedUsers.map((user) => axios.put(`/admin/users/${user._id}`, updateFields, getHeader())));
      await fetchData();
      setSelectedUserIds([]);
      setIsBulkEditDialogOpen(false);
    } catch (error) {
      console.error("Lỗi cập nhật hàng loạt:", error.response?.data || error.message);
      alert("Cập nhật hàng loạt thất bại. Vui lòng thử lại.");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    if (!window.confirm(`Xác nhận xóa ${selectedCount} tài khoản đã chọn?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedUsers.map((user) => axios.delete(`/admin/users/${user._id}`, getHeader())));
      await fetchData();
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Lỗi xóa hàng loạt:", error.response?.data || error.message);
      alert("Xóa hàng loạt thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedCount === 0) return;
    const data = selectedUsers.map((u, i) => ({
      "STT": i + 1,
      "Tài Khoản": u.username,
      "Họ và Tên": u.fullName,
      "Vai Trò": u.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
      "Khối": u.role === 'student' ? (u.grade ? `Khối ${u.grade}` : '') : '',
      "Lớp": u.role === 'student' ? renderClassName(u) : '',
      "Tổ": u.role === 'teacher' ? (u.department ? `Tổ ${u.department}` : '') : '',
      "Trạng thái": getStatusLabel(u.status, activeTab),
      "SĐT": u.phone || "",
      "Địa chỉ": u.address || "",
      "Ghi chú": u.note || "",
    }));
    exportFormalExcel(data, `TÀI KHOẢN ĐÃ CHỌN`, `DS_TaiKhoan_DaChon`, fullName);
  };

  const filteredLeaderboardClasses = adminLeaderboard.filter((cls) => {
    const keyword = normalizeText(lbClassSearch);
    if (!keyword) return true;

    const classNameMatch = normalizeText(cls.className).includes(keyword);
    const studentMatch = Array.isArray(cls.studentNames)
      ? cls.studentNames.some((name) => normalizeText(name).includes(keyword))
      : false;

    return classNameMatch || studentMatch;
  });

  const leaderboardSummary = (() => {
    const grades = ["6", "7", "8", "9"].map((grade) => {
      const group = adminLeaderboard.filter((cls) => String(cls.grade) === grade);
      const studentCount = group.reduce((acc, cls) => acc + (Number(cls.studentCount) || 0), 0);
      const totalTests = group.reduce((acc, cls) => acc + (Number(cls.totalTests) || 0), 0);
      const effectiveTests = group.reduce((acc, cls) => acc + (Number(cls.effectiveTests) || Number(cls.totalTests) || 0), 0);
      const weightedScore = group.reduce((acc, cls) => acc + ((Number(cls.averageScore) || 0) * (Number(cls.effectiveTests) || Number(cls.totalTests) || 0)), 0);
      const averageScore = effectiveTests ? Number((weightedScore / effectiveTests).toFixed(2)) : 0;
      return {
        grade,
        classes: group.length,
        studentCount,
        totalTests,
        effectiveTests,
        averageScore,
      };
    });

    const totalClasses = grades.reduce((acc, grade) => acc + grade.classes, 0);
    const totalStudents = grades.reduce((acc, grade) => acc + grade.studentCount, 0);
    const totalTests = grades.reduce((acc, grade) => acc + grade.totalTests, 0);
    const totalEffectiveTests = grades.reduce((acc, grade) => acc + grade.effectiveTests, 0);
    const totalWeightedScore = grades.reduce((acc, grade) => acc + grade.averageScore * grade.effectiveTests, 0);
    const averageScore = totalEffectiveTests ? Number((totalWeightedScore / totalEffectiveTests).toFixed(2)) : 0;

    return { grades, totalClasses, totalStudents, totalTests, averageScore };
  })();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 relative">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}/>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col h-screen shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:self-start lg:shadow-[4px_0_24px_rgba(15,23,42,0.04)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
          <Button onClick={() => handleViewAllAccounts()} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'accounts' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Users className="mr-3 h-5 w-5" /> Quản lý Tài khoản</Button>
          <Button onClick={() => handleViewTeacherAccounts()} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'teacherAccounts' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Users className="mr-3 h-5 w-5" /> Quản lý Giáo viên</Button>
          <Button onClick={() => handleViewStudentAccounts()} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'studentAccounts' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Users className="mr-3 h-5 w-5" /> Quản lý Học sinh</Button>
          <Button onClick={() => handleMenuClick("leaderboard")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Trophy className="mr-3 h-5 w-5" /> Thi đua toàn trường</Button>
          
          <Button onClick={() => handleMenuClick("settings")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all mt-4 ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow-md shadow-slate-300' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}><Settings className="mr-3 h-5 w-5" /> Thông tin & Bảo mật</Button>
        </nav>
        <div className="p-5 border-t border-slate-50"><Button onClick={handleLogout} variant="ghost" className="w-full h-11 rounded-xl text-rose-500 hover:bg-rose-50 font-bold"><LogOut className="mr-2 h-5 w-5" /> Đăng xuất</Button></div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full overflow-x-hidden max-w-[100vw]">
        
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
               activeTab === "leaderboard" ? "Bảng Thi Đua Tổng" : 
               activeTab === "accounts" ? "Quản lý Tài khoản" : 
               activeTab === "teacherAccounts" ? "Quản lý Giáo viên" : 
               activeTab === "studentAccounts" ? "Quản lý Học sinh" : 
               "Thông tin & Bảo mật"}
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

        {activeTab === "settings" && (
          <Card className="border-slate-100 shadow-sm rounded-3xl bg-white overflow-hidden max-w-7xl w-full mx-auto">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Settings className="w-6 h-6 text-sky-600" /> Thông tin cá nhân & Bảo mật
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 sm:p-10">
              <form onSubmit={handleSaveProfile} className="space-y-10 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-base font-semibold text-slate-800">Họ và tên</label>
                    <Input
                      value={profileData.fullName}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-base font-semibold text-slate-800">Số điện thoại</label>
                    <Input
                      value={profileData.phone}
                      inputMode="numeric"
                      maxLength={15}
                      onChange={(e) => {
                        const digitsOnly = String(e.target.value).replace(/[^0-9]/g, "").slice(0, 15);
                        setProfileData((prev) => ({ ...prev, phone: digitsOnly }));
                      }}
                      className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                      placeholder="Tùy chọn"
                    />
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <label className="text-base font-semibold text-slate-800">Địa chỉ</label>
                    <Input
                      value={profileData.address}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
                      className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                      placeholder="Nhập địa chỉ..."
                    />
                  </div>
                </div>

                <div className="space-y-5 pt-3 border-t border-slate-200">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-3">
                    <Key className="w-6 h-6 text-amber-500" /> Đổi mật khẩu
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-slate-800">Mật khẩu hiện tại</label>
                      <Input
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, oldPassword: e.target.value }))}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                        placeholder="Nhập mật khẩu cũ..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-slate-800">Mật khẩu mới</label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                        placeholder="Nhập mật khẩu mới..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-slate-800">Xác nhận mật khẩu</label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-200 text-base"
                        placeholder="Nhập lại mật khẩu mới..."
                      />
                    </div>
                  </div>
                  <p className="text-sm text-amber-600 italic">
                    *Chỉ điền vào khu vực này nếu bạn muốn đổi mật khẩu. Mật khẩu mới cần tối thiểu 6 ký tự và chứa ít nhất 1 ký tự đặc biệt.
                  </p>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="h-14 px-8 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold shadow-lg shadow-sky-200"
                  >
                    {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                    Lưu thông tin
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-3 sm:p-4 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Thi đua toàn trường</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                {/* Nhóm lọc thời gian */}
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <Calendar className="w-4 h-4 text-slate-500 ml-2 hidden sm:block" />
                  
                  {/* Chọn Năm */}
                  <Select value={lbYear} onValueChange={setLbYear}>
                    <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[82px] sm:w-[92px]">
                      <span className="truncate">Năm {lbYear}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {lbAvailableYears.map((year) => (
                        <SelectItem key={year} value={year}>Năm {year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Chọn Tháng */}
                  <Select value={lbMonth} onValueChange={(val) => { setLbMonth(val); if(val === "all") setLbDay("all"); }}>
                    <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[100px] sm:w-[110px]">
                      <span className="truncate">{lbMonth === "all" ? "Cả năm" : `Tháng ${lbMonth}`}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Cả năm</SelectItem>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>Tháng {i+1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Chọn Ngày */}
                  <Select value={lbDay} onValueChange={setLbDay} disabled={lbMonth === "all"}>
                    <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[100px] sm:w-[110px]">
                      <span className="truncate">{lbDay === "all" ? "Cả tháng" : `Ngày ${lbDay}`}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Cả tháng</SelectItem>
                      {[...Array(31)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Ngày {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nhóm lọc khối */}
                <Select value={lbGradeFilter} onValueChange={setLbGradeFilter}>
                  <SelectTrigger className="h-11 sm:h-[50px] rounded-xl bg-slate-50 min-w-[120px] border border-slate-200 font-bold text-slate-700 shadow-sm">
                    <Filter className="w-4 h-4 mr-2" />
                    <span className="truncate">{lbGradeFilter === "all" ? "Tất cả Khối" : `Khối ${lbGradeFilter}`}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả Khối</SelectItem>
                    <SelectItem value="6">Khối 6</SelectItem>
                    <SelectItem value="7">Khối 7</SelectItem>
                    <SelectItem value="8">Khối 8</SelectItem>
                    <SelectItem value="9">Khối 9</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExportLeaderboard} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 shadow-sm whitespace-nowrap">
                  <Download className="w-4 h-4 mr-2" /> Xuất Excel
                </Button>
              </div>
            </div>

            {adminLeaderboard.length > 0 && (
              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] mb-6">
                <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-800">Tổng quan thi đua cả trường</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-3xl bg-sky-50 p-3">
                        <p className="text-sm text-slate-500">Số lớp có dữ liệu</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{lbCounts?.totalClasses ?? leaderboardSummary.totalClasses}</p>
                      </div>
                      <div className="rounded-3xl bg-emerald-50 p-4">
                        <p className="text-sm text-slate-500">Tổng số học sinh</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{lbCounts?.totalStudents ?? leaderboardSummary.totalStudents}</p>
                      </div>
                      <div className="rounded-3xl bg-amber-50 p-4">
                        <p className="text-sm text-slate-500">Tổng số bài đã nộp</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{leaderboardSummary.totalTests}</p>
                      </div>
                      <div className="rounded-3xl bg-cyan-50 p-4">
                        <p className="text-sm text-slate-500">Điểm TB toàn trường</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{leaderboardSummary.averageScore}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-800">Thống kê theo khối</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {leaderboardSummary.grades.map((grade) => {
                      const lbInfo = lbCounts?.grades?.find(g => String(g.grade) === String(grade.grade));
                      const classesNum = lbInfo?.classes ?? grade.classes;
                      const studentsNum = lbInfo?.students ?? grade.studentCount;
                      return (
                        <div key={grade.grade} className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-3">
                          <div>
                            <p className="text-sm text-slate-500">Khối {grade.grade}</p>
                            <p className="mt-1 text-base font-bold text-slate-900">{classesNum} lớp · {studentsNum} học sinh</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Điểm TB</p>
                            <p className="mt-1 text-base font-black text-sky-700">{grade.averageScore}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {isLoadingLb ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
            ) : adminLeaderboard.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chưa có dữ liệu cho thời gian này.</p></div>
            ) : (
              <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                <div className="bg-white border-b border-slate-50 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Tìm tên lớp hoặc học sinh..."
                      className="pl-10 rounded-xl bg-white h-10"
                      value={lbClassSearch}
                      onChange={(e) => setLbClassSearch(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-slate-500 font-medium">
                    Tổng số lớp có dữ liệu: <span className="font-bold text-slate-700">{filteredLeaderboardClasses.length}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader className="bg-sky-50/80">
                      <TableRow>
                        <TableHead className="pl-4 sm:pl-8 font-bold text-sky-800">Tên Lớp</TableHead>
                        <TableHead className="font-bold text-center text-sky-800">Khối</TableHead>
                        <TableHead className="font-bold text-center text-sky-800">Sĩ số</TableHead>
                        <TableHead className="font-bold text-center text-sky-800">Số bài đã nộp</TableHead>
                        <TableHead className="font-bold text-center text-sky-800">Điểm TB</TableHead>
                        <TableHead className="text-right pr-4 sm:pr-8 font-bold text-sky-800">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaderboardClasses.map((cls) => (
                        <TableRow key={getLeaderboardClassId(cls)} className={`hover:bg-sky-50/50 ${String(selectedLbClassId) === getLeaderboardClassId(cls) ? "bg-sky-50" : ""}`}>
                          <TableCell className="font-black text-base sm:text-lg pl-4 sm:pl-8 text-sky-900">{getLeaderboardClassLabel(cls)}</TableCell>
                          <TableCell className="text-center"><Badge className="bg-sky-100 text-sky-700 shadow-none border-0">Khối {cls.grade}</Badge></TableCell>
                          <TableCell className="text-center"><span className="font-black px-3 py-1 rounded-lg bg-slate-50 text-slate-600">{cls.studentCount || 0} học sinh</span></TableCell>
                          <TableCell className="text-center font-bold text-slate-700">{cls.totalTests}</TableCell>
                          <TableCell className="text-center font-black text-sky-600">{cls.averageScore}</TableCell>
                          <TableCell className="text-right pr-4 sm:pr-8">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedLbClassId(getLeaderboardClassId(cls))}>
                              <Eye className="w-4 h-4 mr-1" /> Xem danh sách lớp
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" />
                  Thi đua chi tiết theo học sinh {classInfoForStats ? `(Lớp ${classInfoForStats.name})` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <span className="text-sm font-semibold text-slate-600">Chọn lớp:</span>
                  <Select value={selectedLbClassId || undefined} onValueChange={setSelectedLbClassId}>
                    <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-200 rounded-xl">
                      <span className="truncate">
                        {selectedLbClassId
                          ? `Lớp ${adminLeaderboard.find((cls) => getLeaderboardClassId(cls) === String(selectedLbClassId))?.className || selectedLbClassId}`
                          : "Chọn lớp"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {adminLeaderboard.map((cls) => (
                        <SelectItem key={getLeaderboardClassId(cls)} value={getLeaderboardClassId(cls)}>
                          Lớp {getLeaderboardClassLabel(cls)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoadingClassStats ? (
                  <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></div>
                ) : classStudentStats.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 italic">Chưa có dữ liệu thi đua theo học sinh cho lớp này.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14 text-center">Hạng</TableHead>
                          <TableHead>Học sinh</TableHead>
                          <TableHead className="text-center">Số bài (hệ thống)</TableHead>
                          <TableHead className="text-center">Điểm TB (hệ thống)</TableHead>
                          <TableHead>Ghi chú thi đua</TableHead>
                          <TableHead className="text-right pr-4">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudentStats.map((student, idx) => {
                          const isEditingStudent = editingStatStudentId === student._id;
                          return (
                            <TableRow key={student._id}>
                              <TableCell className="text-center font-bold text-slate-500">{idx + 1}</TableCell>
                              <TableCell>
                                <p className="font-bold text-slate-800">{student.fullName}</p>
                                <p className="text-xs text-sky-600">{student.username}</p>
                              </TableCell>
                              <TableCell className="text-center">{student.computed.totalTests}</TableCell>
                              <TableCell className="text-center">
                                {isEditingStudent ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.01"
                                    value={editingStatForm.averageScore}
                                    onChange={(e) => setEditingStatForm((prev) => ({ ...prev, averageScore: e.target.value }))}
                                    className="h-9 w-24 mx-auto text-center"
                                  />
                                ) : (
                                  <span className={student.overridden.averageScore ? "font-bold text-amber-600" : ""}>{student.final.averageScore}</span>
                                )}
                              </TableCell>
                              <TableCell className="min-w-[220px]">
                                {isEditingStudent ? (
                                  <Input
                                    value={editingStatForm.note}
                                    onChange={(e) => setEditingStatForm((prev) => ({ ...prev, note: e.target.value }))}
                                    placeholder="Nhập ghi chú thi đua..."
                                    className="h-9"
                                  />
                                ) : (
                                  <span className="text-sm text-slate-600">{student.note || "—"}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                {isEditingStudent ? (
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" className="h-8" onClick={() => handleSaveStudentStat(student._id)} disabled={isSavingStudentStat}>
                                      {isSavingStudentStat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleResetStudentStat(student._id)} disabled={isSavingStudentStat}>
                                      Reset
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={handleCancelEditStudentStat} disabled={isSavingStudentStat}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleStartEditStudentStat(student)}>
                                      <Edit className="w-4 h-4 mr-1" /> Sửa
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteStudentNote(student)} disabled={!student.note || isSavingStudentStat}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {(activeTab === "accounts" || activeTab === "teacherAccounts" || activeTab === "studentAccounts") && (
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="bg-white border-b border-slate-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <span className="rounded-xl whitespace-nowrap px-4 sm:px-6 font-bold bg-sky-500 text-white">
                  
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {activeTab === "teacherAccounts" && (
                  <Button onClick={() => {
                    const data = filteredUsers.map((u, i) => {
                      const subs = getSubjects(u);
                      const subjectStr = subs.length > 0 ? subs.map(s => `Tổ ${s}`).join(", ") : "Chưa phân tổ";

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
                        "Tổ chuyên môn": subjectStr,
                        "Lớp phụ trách": assignedStr,
                      };
                    });
                    exportFormalExcel(data, "DANH SÁCH GIÁO VIÊN", "DS_GiaoVien", fullName);
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-10 flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2"/> Xuất DS Giáo viên
                  </Button>
                )}

                {activeTab === "studentAccounts" && (
                  <Button onClick={handleExportClassList} className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl h-10 flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2"/> Xuất Excel Lớp
                  </Button>
                )}

                {activeTab === "accounts" && (
                  <Button onClick={() => {
                    const data = filteredUsers.map((u, i) => ({
                      "STT": i + 1,
                      "Tài Khoản": u.username,
                      "Họ và Tên": u.fullName,
                      "Vai Trò": u.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
                      "Khối": u.role === 'student' ? (u.grade ? `Khối ${u.grade}` : '') : '',
                      "Lớp": u.role === 'student' ? renderClassName(u) : '',
                      "Tổ": u.role === 'teacher' ? (u.department ? `Tổ ${u.department}` : '') : '',
                    }));
                    exportFormalExcel(data, "DANH SÁCH TẤT CẢ TÀI KHOẢN", "DS_TatCa_TaiKhoan", fullName);
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-10 flex-1 sm:flex-none">
                    <Download className="w-4 h-4 mr-2"/> Xuất DS Tất cả
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-slate-50/40 border-b border-slate-50 px-4 sm:px-8 py-4 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Tìm tên/tài khoản/địa chỉ/SDT..." className="pl-10 rounded-xl bg-white h-11" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              </div>

              {(accountView === "student" || accountView === "all") && (
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

            {selectedCount > 0 && (
              <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 mb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-700">Đã chọn <span className="font-semibold text-slate-900">{selectedCount}</span> tài khoản</div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <>
                        <Select value={bulkEditFields.status} onValueChange={(val) => setBulkEditFields((prev) => ({ ...prev, status: val }))}>
                          <SelectTrigger className="h-11 min-w-[180px] rounded-xl bg-white"><span className="truncate">{bulkEditFields.status ? getStatusLabel(bulkEditFields.status, activeTab) : "Trạng thái chung"}</span></SelectTrigger>
                          <SelectContent>
                            {getStatusOptions(activeTab).map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleBulkUpdate} disabled={!bulkEditFields.status || isBulkSaving} className="h-11 bg-sky-500 hover:bg-sky-600 text-white font-bold">
                          {isBulkSaving ? "Đang lưu..." : "Áp dụng trạng thái"}
                        </Button>
                      </>
                    <Button onClick={handleBulkExport} className="h-11 bg-slate-800 hover:bg-slate-900 text-white font-bold">
                      <Download className="w-4 h-4 mr-2" /> Xuất Excel
                    </Button>
                    <Button onClick={handleBulkDelete} className="h-11 bg-rose-500 hover:bg-rose-600 text-white font-bold">
                      Xóa đã chọn
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-32 pl-4 sm:pl-8 font-bold text-slate-700">
                    <label className="flex items-center gap-2 h-full cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAllVisible}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Chọn tất cả</span>
                    </label>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 w-[160px]">Tên ĐN</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[220px]">Họ và tên</TableHead>
                  {activeTab === "accounts" && <TableHead className="font-bold text-slate-700 w-[130px]">Vai trò</TableHead>}
                  {activeTab === "teacherAccounts" && <TableHead className="font-bold text-slate-700 w-[220px]">Phân công</TableHead>}
                  <TableHead className="font-bold text-slate-700 min-w-[320px]">Thông tin</TableHead>
                  <TableHead className="text-right pr-4 sm:pr-8 font-bold text-slate-700 w-[180px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeTab === "studentAccounts" ? 5 : 6} className="py-10 text-center text-slate-500">
                        Chưa có thông tin tài khoản để hiển thị.
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(String(user._id));
                    return (
                      <TableRow
                        key={user._id}
                        className={`${user.isLocked ? 'bg-slate-50 opacity-60' : ''} ${isSelected ? 'bg-sky-50' : ''} select-none`}
                        onMouseDown={handleRowSelectionStart(String(user._id), isSelected)}
                        onMouseEnter={() => handleRowSelectionEnter(String(user._id))}
                        onMouseMove={() => handleRowSelectionEnter(String(user._id))}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        <TableCell className="pl-4 sm:pl-8 w-[170px]">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUserSelection(String(user._id))}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 w-[160px]">
                          <div className="flex items-center gap-3">
                            <span>{user.username}</span>
                            {user.isLocked && <Badge variant="destructive" className="text-[10px] uppercase">Đã khóa</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 w-[220px]">{user.fullName}</TableCell>
                        {activeTab === "accounts" && (
                          <TableCell className="w-[130px]"><Badge className={`${user.role === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-sky-100 text-sky-700'} shadow-none border-0`}>{user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</Badge></TableCell>
                        )}
                        {activeTab === "teacherAccounts" && (
                          <TableCell className="text-slate-500 font-medium w-[220px]">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap gap-1">
                                {user.department ? (
                                  <Badge variant="outline" className={`${user.department === 'KHTN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'} text-[10px] font-bold`}>
                                    Tổ {user.department}
                                  </Badge>
                                ) : null}
                                {user.department && (user.departmentPosition === "Tổ trưởng" || user.departmentPosition === "Tổ phó") && (
                                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold">
                                    {user.departmentPosition}
                                  </Badge>
                                )}

                                {getSubjects(user).map((sub, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px]">
                                    Môn {sub}
                                  </Badge>
                                ))}

                                {!user.department && getSubjects(user).length === 0 && (
                                  <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[10px]">
                                    Chưa phân tổ
                                  </Badge>
                                )}
                              </div>
                              {renderTeacherAssignments(user)}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-slate-600 text-sm space-y-1 min-w-[320px]">
                          {user.role === 'student' ? (
                            <>
                              <div>{user.grade ? `Khối ${user.grade}` : "Chưa có khối"} · {renderClassName(user)}</div>
                              <div>Trạng thái: <span className={`font-semibold ${user.status === 'inactive' ? 'text-rose-600' : 'text-emerald-600'}`}>{getStatusLabel(user.status, activeTab)}</span></div>
                              {user.phone && <div>📞 {user.phone}</div>}
                              {user.address && <div>🏠 {user.address}</div>}
                              {user.note && <div className="text-xs italic text-slate-500">📝 {user.note}</div>}
                            </>
                          ) : (
                            <>
                              <div>{user.department ? `Tổ ${user.department}` : "Chưa phân tổ"}</div>
                              {user.department && (
                                <div>Chức vụ: {resolveTeacherPosition(user.department, user.departmentPosition)}</div>
                              )}
                              <div>Trạng thái: <span className={`font-semibold ${user.status === 'inactive' ? 'text-rose-600' : 'text-emerald-600'}`}>{getStatusLabel(user.status, activeTab)}</span></div>
                              {user.qualification && <div>Trình độ: {user.qualification}</div>}
                              {getSubjects(user).length > 0 && <div>Môn: {getSubjects(user).join(", ")}</div>}
                              {user.phone && <div>📞 {user.phone}</div>}
                              {user.address && <div>🏠 {user.address}</div>}
                              {user.note && <div className="text-xs italic text-slate-500">📝 {user.note}</div>}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-8">
                          <div className="flex justify-end gap-1">
                            <Button onClick={() => openUserDetailDialog(user)} onMouseDown={(e) => e.stopPropagation()} variant="ghost" size="icon" title="Xem thông tin" className="h-8 w-8 text-indigo-500 rounded-xl hover:bg-indigo-50"><Eye className="h-4 w-4" /></Button>
                            <Button onClick={() => handleResetPassword(user._id, user.username)} onMouseDown={(e) => e.stopPropagation()} variant="ghost" size="icon" title="Khôi phục mật khẩu (1)" className="h-8 w-8 text-amber-500 rounded-xl hover:bg-amber-50"><Key className="h-4 w-4" /></Button>
                            <Button onClick={() => handleToggleLock(user._id, user.isLocked)} onMouseDown={(e) => e.stopPropagation()} variant="ghost" size="icon" title={user.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"} className={`h-8 w-8 rounded-xl ${user.isLocked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                              {user.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button onClick={() => { setEditUser({ ...user, grade: user.grade || "", classId: user.classId?._id || user.classId || "", subjects: Array.isArray(user.subjects) ? user.subjects : (user.subject ? [user.subject] : []), department: user.department || "", qualification: user.qualification || (user.role === "teacher" ? "Đại học" : ""), departmentPosition: resolveTeacherPosition(user.department || "", user.departmentPosition), status: user.status || "active", phone: user.phone || "", address: user.address || "", note: user.note || "" }); setIsEditUserDialogOpen(true); }} onMouseDown={(e) => e.stopPropagation()} variant="ghost" size="icon" className="h-8 w-8 text-sky-500 rounded-xl hover:bg-sky-100"><Edit className="h-4 w-4" /></Button>
                            <Button onClick={() => handleDeleteUser(user._id, user.fullName)} onMouseDown={(e) => e.stopPropagation()} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}


      </main>

      <Dialog open={isUserDialogOpen} onOpenChange={(val) => { setIsUserDialogOpen(val); if(!val) {setAccountFile(null); setPreviewData([]); setUploadClassId(""); setUploadGrade("");} }}>
        <DialogContent className="sm:max-w-[700px] w-[95%] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl border-none p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950">Thêm người dùng mới</DialogTitle></DialogHeader>

          <div className="flex bg-slate-100 rounded-xl w-full p-1 mt-4">
            <button type="button" onClick={() => setCreateMethod("manual")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'manual' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><PenTool className="w-4 h-4"/> Nhập thủ công</button>
            <button type="button" onClick={() => setCreateMethod("upload")} className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${createMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><FileSpreadsheet className="w-4 h-4"/> Thêm học sinh bằng file Excel</button>
          </div>

          {createMethod === "manual" ? (
            <form onSubmit={handleCreateUser} className="space-y-4 mt-6">
              <Input placeholder="Họ và tên..." className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Tên đăng nhập" className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} required />
                <Input type="password" placeholder="Mật khẩu" className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
              </div>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({...newUser, role: val, grade: "", classId: "", qualification: val === "teacher" ? "Đại học" : ""})}>
                <SelectTrigger className="h-11 w-full rounded-xl font-medium border-sky-100 bg-white"><span className="truncate">{getRoleLabel(newUser.role)}</span></SelectTrigger>
                <SelectContent><SelectItem value="student">Học sinh</SelectItem><SelectItem value="teacher">Giáo viên</SelectItem></SelectContent>
              </Select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder={newUser.role === "student" ? "Số điện thoại phụ huynh *" : "Số điện thoại *"}
                  className="h-11 rounded-xl border-sky-100 bg-white"
                  value={String(newUser.phone || "")}
                  inputMode="numeric"
                  maxLength={15}
                  required
                  onChange={(e) => {
                    const digitsOnly = String(e.target.value).replace(/[^0-9]/g, "").slice(0, 15);
                    setNewUser((prev) => ({ ...prev, phone: digitsOnly }));
                  }}
                />
                <Input placeholder="Địa chỉ *" className="h-11 rounded-xl border-sky-100 bg-white" value={newUser.address} onChange={(e) => setNewUser({...newUser, address: e.target.value})} required />
              </div>
              <Select value={newUser.status} onValueChange={(val) => setNewUser({...newUser, status: val})}>
                <SelectTrigger className="h-11 w-full rounded-xl font-medium border-sky-100 bg-white"><span className="truncate">{getStatusLabel(newUser.status, activeTab)}</span></SelectTrigger>
                <SelectContent>{getStatusOptions(activeTab).map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              {newUser.role === "teacher" && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border-emerald-100 space-y-4">
                  <Select value={newUser.department || ""} onValueChange={(val) => setNewUser({...newUser, department: val === "" ? "" : val, subjects: [], departmentPosition: val === "" ? "" : (newUser.departmentPosition || "Giáo viên thường")})}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-emerald-100 bg-white">
                      <span className={`truncate ${newUser.department ? 'text-slate-900' : 'text-slate-400'}`}>
                        {newUser.department ? (newUser.department === 'KHTN' ? 'Tổ KHTN (Khoa học Tự nhiên)' : 'Tổ KHXH (Khoa học Xã hội)') : 'Chưa cập nhật'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Chưa cập nhật</SelectItem>
                      <SelectItem value="KHTN">Tổ KHTN (Khoa học Tự nhiên)</SelectItem>
                      <SelectItem value="KHXH">Tổ KHXH (Khoa học Xã hội)</SelectItem>
                    </SelectContent>
                  </Select>
                  {newUser.department && (
                    <Select value={newUser.departmentPosition || "Giáo viên thường"} onValueChange={(val) => setNewUser({...newUser, departmentPosition: val})}>
                      <SelectTrigger className="h-11 w-full rounded-xl border-emerald-100 bg-white"><SelectValue placeholder="Chức vụ trong tổ" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Giáo viên thường">Giáo viên thường</SelectItem>
                        <SelectItem value="Tổ trưởng">Tổ trưởng</SelectItem>
                        <SelectItem value="Tổ phó">Tổ phó</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={newUser.qualification || "Đại học"} onValueChange={(val) => setNewUser({...newUser, qualification: val})}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-emerald-100 bg-white">
                      <span className="truncate text-slate-900">{newUser.qualification || "Đại học"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Đại học">Đại học</SelectItem>
                      <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                      <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">Môn phụ trách (chọn từ danh mục của tổ)</p>
                    {!newUser.department ? (
                      <p className="text-sm italic text-slate-400">Vui lòng chọn tổ chuyên môn trước.</p>
                    ) : getSubjectsByDepartment(newUser.department).length === 0 ? (
                      <p className="text-sm italic text-slate-400">Tổ này chưa có môn nào trong danh mục.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getSubjectsByDepartment(newUser.department).map((sub) => {
                          const checked = Array.isArray(newUser.subjects) && newUser.subjects.includes(sub.name);
                          return (
                            <Button
                              key={sub._id}
                              type="button"
                              variant={checked ? "default" : "outline"}
                              className={`h-8 rounded-full px-3 text-xs ${checked ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                              onClick={() => toggleUserSubject("new", sub.name)}
                            >
                              {sub.name}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Input placeholder="Ghi chú (nếu có)" className="h-11 rounded-xl border-emerald-100 bg-white" value={newUser.note || ""} onChange={(e) => setNewUser({...newUser, note: e.target.value})} />
                </div>
              )}
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
                    <Input placeholder="Ghi chú (nếu có)" className="h-11 rounded-xl border-sky-100 bg-white sm:col-span-2" value={newUser.note || ""} onChange={(e) => setNewUser({...newUser, note: e.target.value})} />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 shadow-md text-white font-bold">{loading ? <Loader2 className="animate-spin" /> : "Lưu tài khoản"}</Button>
            </form>
          ) : (
            <div className="space-y-4 mt-4 overflow-y-auto pr-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-sky-50 p-4 rounded-xl gap-3 border border-sky-100">
                  <div><h4 className="font-bold text-sky-900 text-sm">1. Tải file mẫu</h4><p className="text-xs text-slate-500">File Excel cần có cột tiêu đề: <strong>STT</strong> và <strong>Tên</strong><strong> / Họ tên</strong>. Thêm được các cột <strong>Năm sinh</strong>, <strong> bắt buộc có zSố điện thoại phụ huynh</strong> và <strong>Địa chỉ</strong>.</p></div>
                  <Button type="button" onClick={handleDownloadTemplate} variant="outline" className="bg-white border-sky-200 text-sky-600 hover:bg-sky-100 w-full sm:w-auto"><Download className="w-4 h-4 mr-2"/> Tải mẫu</Button>
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
                <p className="text-xs text-slate-500 mb-3">Các cột bắt buộc: <strong>Họ tên</strong>, <strong>Số điện thoại phụ huynh </strong>, <strong>Địa chỉ</strong>. Có thể thêm <strong>Năm sinh</strong> hoặc các thông tin phụ khác. Chỉ đọc sheet đầu tiên.</p>
                <div onDragOver={(e) => { e.preventDefault(); }} onDragEnter={(e) => { e.preventDefault(); }} onDrop={handleAccountFileDrop} onClick={() => accountFileRef.current.click()} className={`border-2 border-dashed rounded-xl p-4 cursor-pointer flex flex-col items-center gap-2 ${accountFile ? 'border-sky-500 bg-sky-100' : 'border-slate-300 bg-white'}`}>
                  <input type="file" ref={accountFileRef} onChange={handleAccountFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                  {accountFile ? <><FileSpreadsheet className="h-6 w-6 text-teal-600" /><p className="font-bold text-sky-900 text-sm">{accountFile.name}</p></> : <><UploadCloud className="h-6 w-6 text-sky-400" /><p className="text-xs font-bold text-slate-500">Bấm hoặc kéo thả file ở đây</p></>}
                </div>
              </div>

              {previewData.length > 0 && (
                <>
                  {importDuplicateMessage && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-3 whitespace-pre-line">
                      {importDuplicateMessage}
                    </div>
                  )}
                  <div className="border border-sky-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-sky-50 px-3 py-2 flex justify-between items-center"><span className="font-bold text-sm text-sky-800">Xem trước ({previewData.length} em)</span></div>
                    <div className="max-h-[150px] overflow-x-auto p-1">
                      <Table className="text-sm min-w-[400px]"><TableHeader><TableRow><TableHead className="w-12 text-center py-1">STT</TableHead><TableHead className="py-1">Họ và Tên</TableHead><TableHead className="py-1">Số điện thoại phụ huynh</TableHead><TableHead className="py-1">Địa chỉ</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {previewData.slice(0, 5).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-center py-1.5">{row["STT"] || idx + 1}</TableCell>
                              <TableCell className="py-1.5 font-medium">{row["Tên học sinh"] || row["Họ và tên"] || row["Họ tên"] || "-"}</TableCell>
                              <TableCell className="py-1.5">{row["Số điện thoại"] || row["SDT"] || row["Phone"] || "-"}</TableCell>
                              <TableCell className="py-1.5">{row["Địa chỉ"] || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {importResults && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4 text-sm space-y-3">
                  <div className="font-semibold text-slate-900">Kết quả import</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                    <div>Thêm thành công: <span className="font-semibold text-slate-900">{importResults.successCount}</span></div>
                    <div>Trùng lặp: <span className="font-semibold text-slate-900">{importResults.duplicateCount}</span></div>
                    <div>Lỗi: <span className="font-semibold text-slate-900">{importResults.failedCount}</span></div>
                  </div>
                  {importResults.errors?.length > 0 && (
                    <div>
                      <div className="font-medium text-slate-800">Dòng bị lỗi:</div>
                      <ul className="list-disc list-inside text-slate-700">
                        {importResults.errors.map((item, index) => (
                          <li key={`error-${index}`}>{item.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResults.duplicates?.length > 0 && (
                    <div>
                      <div className="font-medium text-slate-800">Dòng bị trùng:</div>
                      <ul className="list-disc list-inside text-slate-700">
                        {importResults.duplicates.map((item, index) => (
                          <li key={`dup-${index}`}>{item.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <Button type="button" onClick={handleUploadExcel} disabled={previewData.length === 0 || !uploadClassId || loading} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold h-12 rounded-xl">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />} Thêm {previewData.length} học sinh vào lớp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95%] rounded-2xl border-none">
          <DialogHeader><DialogTitle className="text-2xl font-bold flex items-center gap-2 text-sky-900"><Edit className="h-5 w-5"/> Sửa tài khoản</DialogTitle></DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
              <Input value={editUser.username} disabled className="h-11 rounded-xl bg-slate-50 text-slate-400" />
              <Input value={editUser.fullName} onChange={(e) => setEditUser({...editUser, fullName: e.target.value})} required className="h-11 rounded-xl bg-white" />
              <Select value={editUser.role} onValueChange={(val) => setEditUser({...editUser, role: val, grade: "", classId: ""})}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white"><span className="truncate">{getRoleLabel(editUser.role)}</span></SelectTrigger>
                <SelectContent><SelectItem value="student">Học sinh</SelectItem><SelectItem value="teacher">Giáo viên</SelectItem></SelectContent>
              </Select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder={editUser.role === "student" ? "Số điện thoại phụ huynh *" : "Số điện thoại *"}
                  className="h-11 rounded-xl bg-white"
                  value={String(editUser.phone || "")}
                  inputMode="numeric"
                  maxLength={15}
                  required
                  onChange={(e) => {
                    const digitsOnly = String(e.target.value).replace(/[^0-9]/g, "").slice(0, 15);
                    setEditUser((prev) => ({ ...prev, phone: digitsOnly }));
                  }}
                />
                <Input placeholder="Địa chỉ *" className="h-11 rounded-xl bg-white" value={editUser.address || ""} onChange={(e) => setEditUser({...editUser, address: e.target.value})} required />
              </div>
              <Select value={editUser.status || "active"} onValueChange={(val) => setEditUser({...editUser, status: val})}>
                <SelectTrigger className="h-11 w-full rounded-xl bg-white"><span className="truncate">{getStatusLabel(editUser.status, activeTab)}</span></SelectTrigger>
                <SelectContent>{getStatusOptions(activeTab).map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              {editUser.role === "teacher" && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border-emerald-100 space-y-4">
                  <Select value={editUser.department || ""} onValueChange={(val) => setEditUser({...editUser, department: val === "" ? "" : val, subjects: [], departmentPosition: val === "" ? "" : (editUser.departmentPosition || "Giáo viên thường")})}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                      <span className={`truncate ${editUser.department ? 'text-slate-900' : 'text-slate-400'}`}>
                        {editUser.department ? (editUser.department === 'KHTN' ? 'Tổ KHTN (Khoa học Tự nhiên)' : 'Tổ KHXH (Khoa học Xã hội)') : 'Chưa cập nhật'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Chưa cập nhật</SelectItem>
                      <SelectItem value="KHTN">Tổ KHTN (Khoa học Tự nhiên)</SelectItem>
                      <SelectItem value="KHXH">Tổ KHXH (Khoa học Xã hội)</SelectItem>
                    </SelectContent>
                  </Select>
                  {editUser.department && (
                    <Select value={editUser.departmentPosition || "Giáo viên thường"} onValueChange={(val) => setEditUser({...editUser, departmentPosition: val})}>
                      <SelectTrigger className="h-11 w-full rounded-xl bg-white"><SelectValue placeholder="Chức vụ trong tổ" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Giáo viên thường">Giáo viên thường</SelectItem>
                        <SelectItem value="Tổ trưởng">Tổ trưởng</SelectItem>
                        <SelectItem value="Tổ phó">Tổ phó</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={editUser.qualification || "Đại học"} onValueChange={(val) => setEditUser({...editUser, qualification: val})}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white">
                      <span className="truncate text-slate-900">{editUser.qualification || "Đại học"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Đại học">Đại học</SelectItem>
                      <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                      <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">Môn phụ trách (chọn từ danh mục của tổ)</p>
                    {!editUser.department ? (
                      <p className="text-sm italic text-slate-400">Vui lòng chọn tổ chuyên môn trước.</p>
                    ) : getSubjectsByDepartment(editUser.department).length === 0 ? (
                      <p className="text-sm italic text-slate-400">Tổ này chưa có môn nào trong danh mục.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getSubjectsByDepartment(editUser.department).map((sub) => {
                          const checked = Array.isArray(editUser.subjects) && editUser.subjects.includes(sub.name);
                          return (
                            <Button
                              key={sub._id}
                              type="button"
                              variant={checked ? "default" : "outline"}
                              className={`h-8 rounded-full px-3 text-xs ${checked ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                              onClick={() => toggleUserSubject("edit", sub.name)}
                            >
                              {sub.name}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Input placeholder="Ghi chú giáo viên" className="h-11 rounded-xl bg-white" value={editUser.note || ""} onChange={(e) => setEditUser({...editUser, note: e.target.value})} />
                </div>
              )}
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
                  <Input placeholder="Ghi chú học sinh" className="h-11 rounded-xl bg-white sm:col-span-2" value={editUser.note || ""} onChange={(e) => setEditUser({...editUser, note: e.target.value})} />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold">{loading ? <Loader2 className="animate-spin" /> : "Cập nhật"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDetailDialogOpen} onOpenChange={setIsUserDetailDialogOpen}>
        <DialogContent className="sm:max-w-[560px] w-[95%] rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-sky-900">Thông tin tài khoản</DialogTitle>
          </DialogHeader>
          {selectedUserLoading ? (
            <div className="py-10 text-center text-slate-500">Đang tải thông tin...</div>
          ) : selectedUserDetail ? (
            hasUserProfileInfo(selectedUserDetail) ? (
              <div className="space-y-3 text-sm pt-2">
                <div><span className="font-semibold text-slate-600">Tài khoản:</span> <span className="font-bold text-sky-700">{selectedUserDetail.username}</span></div>
                <div><span className="font-semibold text-slate-600">Họ tên:</span> {selectedUserDetail.fullName || "Chưa cập nhật"}</div>
                <div><span className="font-semibold text-slate-600">Vai trò:</span> {selectedUserDetail.role === "teacher" ? "Giáo viên" : selectedUserDetail.role === "student" ? "Học sinh" : "Quản trị viên"}</div>
                {selectedUserDetail.role === "student" ? (
                  <>
                    <div><span className="font-semibold text-slate-600">Khối:</span> {selectedUserDetail.grade || "Chưa cập nhật"}</div>
                    <div><span className="font-semibold text-slate-600">Lớp:</span> {renderClassName(selectedUserDetail)}</div>
                  </>
                ) : (
                  <>
                    <div><span className="font-semibold text-slate-600">Tổ chuyên môn:</span> {selectedUserDetail.department ? (selectedUserDetail.department === "KHTN" ? "Tổ KHTN (Khoa học Tự nhiên)" : "Tổ KHXH (Khoa học Xã hội)") : "Chưa cập nhật"}</div>
                    <div><span className="font-semibold text-slate-600">Chức vụ trong tổ:</span> {selectedUserDetail.department ? resolveTeacherPosition(selectedUserDetail.department, selectedUserDetail.departmentPosition) : "—"}</div>
                    <div><span className="font-semibold text-slate-600">Trình độ:</span> {selectedUserDetail.qualification || "Đại học"}</div>
                    <div><span className="font-semibold text-slate-600">Môn phụ trách:</span> {getSubjects(selectedUserDetail).length ? getSubjects(selectedUserDetail).join(", ") : "Chưa cập nhật"}</div>
                  </>
                )}
                <div><span className="font-semibold text-slate-600">Số điện thoại:</span> {selectedUserDetail.phone || "Chưa cập nhật"}</div>
                <div><span className="font-semibold text-slate-600">Địa chỉ:</span> {selectedUserDetail.address || "Chưa cập nhật"}</div>
                <div><span className="font-semibold text-slate-600">Ghi chú:</span> {selectedUserDetail.note || "Không có"}</div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">Tài khoản này hiện chưa có thông tin chi tiết.</div>
            )
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;