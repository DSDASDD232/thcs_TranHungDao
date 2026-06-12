import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { exportFormalExcel } from "../lib/exportExcel"; 

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { 
  BookOpen, FileQuestion, LogOut, CheckSquare, School,
  Loader2, PlusCircle, Trash2, PenTool, X,
  UserCircle, Users, CheckCircle2, ArrowUpDown, Menu, Trophy, History, Database, Search, Filter,
  CalendarClock, Calendar, Lock, AlertCircle, FileCheck, Clock, Eye, Download, Sparkles, Medal, BarChart, Settings, Key, Save, Edit, FileText
} from "lucide-react";

const getRankMedal = (index) => {
  if (index === 0) return <Medal className="w-8 h-8 text-amber-400 drop-shadow-md" fill="currentColor" />;
  if (index === 1) return <Medal className="w-8 h-8 text-slate-300 drop-shadow-md" fill="currentColor" />;
  if (index === 2) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-md" fill="currentColor" />;
  return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">{index + 1}</div>;
};

const formatSafeDateTime = (dateString) => {
  if (!dateString) return { time: "--", date: "--" };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { time: "--", date: "--" };
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { time, date };
};

const getPrimarySubject = (profile) => {
  if (!profile) return "";
  if (Array.isArray(profile.subjects) && profile.subjects.length > 0) return profile.subjects[0];
  if (profile.subject) return profile.subject;
  return "";
};

const CustomDateInput = ({ label, value, onChange, min }) => {
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
      if (d && m && y?.length === 4) {
        const typedDate = `${y}-${m}-${d}`;
        if (min && typedDate < min) {
          alert(`Không thể chọn ngày trong quá khứ!\nNgày hợp lệ nhỏ nhất là: ${min.split('-').reverse().join('/')}`);
          const [minY, minM, minD] = min.split("-");
          setTextVal(`${minD}/${minM}/${minY}`);
          onChange(min);
        } else {
          onChange(typedDate); 
        }
      }
    } else if (val === "") {
      onChange("");
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white px-3 h-11 sm:h-12 rounded-xl border border-slate-200 shadow-sm w-full">
      {label && <span className="text-xs font-bold text-slate-500 uppercase shrink-0">{label}</span>}
      <Input 
        type="text" 
        placeholder="dd/mm/yyyy" 
        value={textVal} 
        onChange={handleTextChange} 
        maxLength={10}
        className="h-full border-0 p-0 text-sm font-bold flex-1 bg-transparent text-slate-700 focus:ring-0 placeholder:font-normal placeholder:text-slate-400" 
      />
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-md transition-colors shrink-0">
        <Calendar className="w-4 h-4 text-sky-600 pointer-events-none absolute" />
        <input 
          type="date" 
          value={value} 
          min={min}
          onChange={(e) => {
            if (e.target.value) {
              if (min && e.target.value < min) {
                alert(`Không thể chọn ngày trong quá khứ!\nNgày hợp lệ nhỏ nhất là: ${min.split('-').reverse().join('/')}`);
                onChange(min);
              } else {
                onChange(e.target.value);
              }
            }
          }} 
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
          title="Mở lịch"
        />
      </div>
    </div>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Giáo viên";

  const [activeTab, setActiveTab] = useState("my-classes"); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [allClasses, setAllClasses] = useState([]);

  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const [currentViewClassId, setCurrentViewClassId] = useState(null);
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSortOption, setStudentSortOption] = useState("name"); 
  
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({ fullName: '', phone: '', address: '', newPassword: '' });
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);

  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', address: '' });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 👉 CẬP NHẬT STATE BỘ LỌC BẢNG THI ĐUA (NĂM -> THÁNG -> TUẦN)
  const currentYear = new Date().getFullYear().toString();
  const currentMonthNum = (new Date().getMonth() + 1).toString();
  
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [selectedLeaderboardClass, setSelectedLeaderboardClass] = useState("");
  const [leaderboardSubjectFilter, setLeaderboardSubjectFilter] = useState("all"); 
  const [leaderboardTypeFilter, setLeaderboardTypeFilter] = useState("all"); 

  const [lbYear, setLbYear] = useState(currentYear);
  const [lbMonth, setLbMonth] = useState("all"); // 'all' = Cả năm
  const [lbWeek, setLbWeek] = useState("all");   // 'all' = Cả tháng

  const [searchClassQuery, setSearchClassQuery] = useState("");
  const [classStatsMap, setClassStatsMap] = useState({});
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [selectedAssignmentForDeadline, setSelectedAssignmentForDeadline] = useState(null);
  const [newDeadlineDate, setNewDeadlineDate] = useState("");
  const [newDeadlineTime, setNewDeadlineTime] = useState("");
  const [isUpdatingDeadline, setIsUpdatingDeadline] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedAssignmentForPassword, setSelectedAssignmentForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const config = getHeader();
      if (!config.headers.Authorization.split(" ")[1]) return navigate("/login");
      
      const [profRes, classRes, assignmentsRes] = await Promise.all([
        axios.get("/teacher/me", config),
        axios.get("/classes/all", config),
        axios.get("/assignments/my-assignments", config)
      ]);
      
      const tProfile = profRes.data;
      setTeacherProfile(tProfile);
      setAllClasses(classRes.data.classes || []);
      setAssignments(assignmentsRes.data?.assignments || []);

      const primarySubject = getPrimarySubject(tProfile);
      setLeaderboardSubjectFilter(primarySubject || "all"); 
      
      setProfileForm({
          fullName: tProfile.fullName || "",
          phone: tProfile.phone || "",
          address: tProfile.address || "",
      });

    } catch (error) { console.error("Lỗi tải dữ liệu:", error); } finally { setIsLoadingData(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchAllClassStats = async () => {
      if (activeTab !== "my-classes" || !teacherProfile?.assignedClasses?.length) return;
      setIsFetchingStats(true);
      try {
        const statsObj = {};
        await Promise.all(teacherProfile.assignedClasses.map(async (c) => {
          const classId = c._id || c;
          try {
            const res = await axios.get(`/submissions/class/${classId}/leaderboard?timeframe=all`, getHeader());
            const leaderboard = res.data.leaderboard || [];
            let totalSubmissions = 0, sumScore = 0, studentCountWithScore = 0;
            leaderboard.forEach(st => {
              totalSubmissions += (st.totalTests || 0);
              if (st.totalTests > 0) { sumScore += parseFloat(st.averageScore || 0); studentCountWithScore++; }
            });
            const classAvg = studentCountWithScore > 0 ? (sumScore / studentCountWithScore).toFixed(1) : 0;
            statsObj[classId] = { totalSubmissions, averageScore: classAvg, leaderboard };
          } catch (e) { statsObj[classId] = { totalSubmissions: 0, averageScore: 0, leaderboard: [] }; }
        }));
        setClassStatsMap(statsObj);
      } catch (error) { console.error("Lỗi thống kê:", error); } finally { setIsFetchingStats(false); }
    };
    fetchAllClassStats();
  }, [activeTab, teacherProfile]);

  // 👉 HÀM TÍNH TOÁN CÁC TUẦN TRONG THÁNG ĐƯỢC CHỌN
  const weeksInMonth = useMemo(() => {
      if (lbMonth === "all") return [];
      const weeks = [];
      const year = parseInt(lbYear);
      const month = parseInt(lbMonth);
      
      // Ngày đầu và ngày cuối tháng
      const firstDate = new Date(year, month - 1, 1);
      const lastDate = new Date(year, month, 0);
      
      let current = new Date(firstDate);
      let weekNum = 1;

      while (current <= lastDate) {
          const weekStart = new Date(current);
          const weekEnd = new Date(current);
          // Tìm Chủ nhật của tuần đó
          const day = weekEnd.getDay();
          const diffToSunday = day === 0 ? 0 : 7 - day;
          weekEnd.setDate(weekEnd.getDate() + diffToSunday);
          
          // Không vượt quá ngày cuối tháng
          if (weekEnd > lastDate) weekEnd.setTime(lastDate.getTime());
          
          weekEnd.setHours(23, 59, 59, 999);
          
          weeks.push({
              id: `${weekStart.toISOString()}_${weekEnd.toISOString()}`,
              label: `Tuần ${weekNum}`,
              subLabel: `${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')}`
          });

          current = new Date(weekEnd);
          current.setDate(current.getDate() + 1);
          current.setHours(0,0,0,0);
          weekNum++;
      }
      return weeks;
  }, [lbYear, lbMonth]);

  // 👉 TỰ ĐỘNG FETCH DATA KHI CÁC FILTER THAY ĐỔI
  useEffect(() => {
    const fetchLeaderboard = async (classId) => {
      if (!classId) return;
      setIsLoadingLeaderboard(true);
      try {
        // Tính toán timeframe chuỗi gửi cho backend
        let computedTimeframe = "all";
        if (lbWeek !== "all") {
            computedTimeframe = lbWeek; // Đây là chuỗi 'StartISO_EndISO'
        } else if (lbMonth !== "all") {
            // Lấy từ ngày 1 đến ngày cuối của tháng
            const start = new Date(parseInt(lbYear), parseInt(lbMonth) - 1, 1);
            const end = new Date(parseInt(lbYear), parseInt(lbMonth), 0, 23, 59, 59);
            computedTimeframe = `${start.toISOString()}_${end.toISOString()}`;
        } else if (lbYear) {
            // Lấy cả năm
            const start = new Date(parseInt(lbYear), 0, 1);
            const end = new Date(parseInt(lbYear), 11, 31, 23, 59, 59);
            computedTimeframe = `${start.toISOString()}_${end.toISOString()}`;
        }

        const [studentsRes, leaderboardRes] = await Promise.all([
          axios.get(`/classes/${classId}/students`, getHeader()),
          axios.get(`/submissions/class/${classId}/leaderboard?timeframe=${computedTimeframe}&subject=${leaderboardSubjectFilter}&type=${leaderboardTypeFilter}`, getHeader()).catch(() => ({ data: { leaderboard: [] } }))
        ]);

        const baseStudents = studentsRes.data.students || [];
        const leaderboardStats = leaderboardRes.data.leaderboard || [];

        const mergedLeaderboard = baseStudents.map(student => {
          const stats = leaderboardStats.find(lb => lb._id === student._id) || {};
          return { _id: student._id, fullName: student.fullName, username: student.username, totalTests: stats.totalTests || 0, averageScore: stats.averageScore || 0 };
        });

        mergedLeaderboard.sort((a, b) => {
          if (b.totalTests !== a.totalTests) return b.totalTests - a.totalTests;
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        setLeaderboardData(mergedLeaderboard);
      } catch (error) { setLeaderboardData([]); } finally { setIsLoadingLeaderboard(false); }
    };

    if (activeTab === "leaderboard" && selectedLeaderboardClass) {
        fetchLeaderboard(selectedLeaderboardClass);
    }
  }, [activeTab, selectedLeaderboardClass, lbYear, lbMonth, lbWeek, leaderboardSubjectFilter, leaderboardTypeFilter]);

  // Xử lý Reset khi đổi Năm / Tháng
  const handleYearChange = (val) => {
      setLbYear(val);
      setLbMonth("all"); // Đổi năm thì reset tháng
      setLbWeek("all");
  };

  const handleMonthChange = (val) => {
      setLbMonth(val);
      setLbWeek("all"); // Đổi tháng thì reset tuần
  };


  const handleLogout = () => { localStorage.clear(); navigate("/login"); };
  const handleMenuClick = (tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };

  const handleViewStudentList = async (classId, className) => {
    setCurrentViewClassId(classId); 
    setSelectedClassName(className); setClassStudents([]); setStudentSearchQuery(""); setStudentSortOption("name"); setIsStudentListOpen(true);
    try {
      const studentsRes = await axios.get(`/classes/${classId}/students`, getHeader());
      let baseStudents = studentsRes.data.students || [];

      let leaderboardStats = [];
      try {
          const leaderboardRes = await axios.get(`/submissions/class/${classId}/leaderboard?timeframe=all`, getHeader());
          leaderboardStats = leaderboardRes.data.leaderboard || [];
      } catch(e) {}

      const mergedStudents = baseStudents.map(student => {
        const stats = leaderboardStats.find(lb => lb._id === student._id) || {};
        return { ...student, totalTests: stats.totalTests || 0, averageScore: stats.averageScore || 0, lastSubmission: stats.lastSubmission || null };
      });
      setClassStudents(mergedStudents);
    } catch (error) { console.error("Lỗi lấy danh sách học sinh:", error); }
  };

  const handleViewStudentDetails = async (student) => {
    setSelectedStudentDetails(student); setIsLoadingHistory(true);
    try {
      const res = await axios.get(`/submissions/student/${student._id}`, getHeader());
      setStudentHistory(res.data.submissions || []);
    } catch (error) {} finally { setIsLoadingHistory(false); }
  };

  const openEditStudentModal = (student) => {
      setSelectedStudentForEdit(student);
      setEditStudentForm({
          fullName: student.fullName || "",
          phone: student.phone || "",
          address: student.address || "",
          newPassword: ""
      });
      setIsEditStudentModalOpen(true);
  };

  const handleUpdateStudent = async (e) => {
      e.preventDefault();
      
      if (editStudentForm.newPassword && editStudentForm.newPassword.length > 0) {
          if (editStudentForm.newPassword.length < 6) return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(editStudentForm.newPassword)) {
            return alert("Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*(),.?\":{}|<>).");
          }
      }

      setIsUpdatingStudent(true);
      try {
          const payload = {
              fullName: editStudentForm.fullName,
              phone: editStudentForm.phone,
              address: editStudentForm.address,
              newPassword: editStudentForm.newPassword
          };

          await axios.put(`/teacher/update-student/${selectedStudentForEdit._id}`, payload, getHeader());
          alert("✅ Cập nhật thông tin học sinh thành công!");
          setIsEditStudentModalOpen(false);
          if (currentViewClassId) {
              await handleViewStudentList(currentViewClassId, selectedClassName);
          }
      } catch (error) {
          alert(error.response?.data?.message || "Lỗi khi cập nhật thông tin học sinh!");
      } finally {
          setIsUpdatingStudent(false);
      }
  };

  const handleUpdateTeacherProfile = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      return alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
    }
    
    if (passwordData.newPassword && passwordData.newPassword.length > 0) {
        if (passwordData.newPassword.length < 6) return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)) {
          return alert("Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*(),.?\":{}|<>).");
        }
    }
    
    setIsUpdatingProfile(true);
    try {
      const payload = {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        address: profileForm.address,
      };

      if (passwordData.oldPassword && passwordData.newPassword) {
          payload.oldPassword = passwordData.oldPassword;
          payload.newPassword = passwordData.newPassword;
      }

      const res = await axios.put('/auth/profile', payload, getHeader());
      
      alert("✅ Lưu thông tin thành công!");
      localStorage.setItem("fullName", res.data.user.fullName); 
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      if (passwordData.newPassword) {
          alert("Bạn vừa đổi mật khẩu, vui lòng đăng nhập lại.");
          handleLogout();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật thông tin!");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleExportClassReport = (classId, className) => {
    const stats = classStatsMap[classId];
    if (!stats || !stats.leaderboard || stats.leaderboard.length === 0) return alert(`Chưa có dữ liệu làm bài của lớp ${className} để xuất báo cáo!`);
    
    const dataToExport = stats.leaderboard.map((st, idx) => ({
      "Hạng": idx + 1, "Họ và Tên": st.fullName, "Tài Khoản": st.username || "", "Số lượt nộp": st.totalTests, "Điểm Trung Bình": parseFloat(st.averageScore || 0)
    }));
    exportFormalExcel(
        dataToExport, 
        `BÁO CÁO HỌC TẬP LỚP ${className}`, 
        `Bao_Cao_Hoc_Tap_Lop_${className}`, 
        teacherProfile?.fullName || fullName || "Giáo viên phụ trách",
        "Giáo viên"
    );
  };

  const handleExportLeaderboardExcel = () => {
    if (!leaderboardData || leaderboardData.length === 0) return alert("Không có dữ liệu để xuất!");
    
    const classObj = allClasses.find(c => (c._id || c) === selectedLeaderboardClass);
    const className = classObj ? classObj.name : "Lop";
    
    const dataToExport = leaderboardData.map((st, idx) => ({
      "Hạng": idx + 1, "Họ và Tên": st.fullName, "Tài Khoản": st.username || "", "Số lượt nộp bài": st.totalTests, "Điểm Trung Bình": parseFloat(st.averageScore || 0)
    }));
    exportFormalExcel(
        dataToExport, 
        `BẢNG THI ĐUA LỚP ${className}`, 
        `Bang_Thi_Dua_${className}`, 
        teacherProfile?.fullName || fullName || "Giáo viên phụ trách",
        "Giáo viên"
    );
  };

  const handleDeleteAssignment = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài "${title}"?`)) return;
    try { 
        await axios.delete(`/assignments/${id}`, getHeader()); 
        fetchData(); 
    } catch (err) { alert("Lỗi khi xóa bài tập!"); }
  };

  const openDeadlineModal = (assignment) => {
    setSelectedAssignmentForDeadline(assignment);
    const d = new Date(assignment.dueDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    
    setNewDeadlineDate(`${yyyy}-${mm}-${dd}`);
    setNewDeadlineTime(`${hh}:${mins}`);
    setIsDeadlineModalOpen(true);
  };

  const handleUpdateDeadline = async () => {
    if(!window.confirm("Xác nhận đổi hạn nộp?")) return;

    const finalDateObj = new Date(`${newDeadlineDate}T${newDeadlineTime}:00`);
    const startDate = new Date(selectedAssignmentForDeadline.startDate || selectedAssignmentForDeadline.createdAt);
    const durationInMs = (selectedAssignmentForDeadline.duration || 0) * 60 * 1000;
    const minAllowedDate = new Date(startDate.getTime() + durationInMs);

    if (finalDateObj < minAllowedDate) {
        alert(`LỖI: Hạn nộp mới không hợp lệ!\n\nThời gian mở đề là: ${formatSafeDateTime(startDate).time} ${formatSafeDateTime(startDate).date}\nThời gian làm bài: ${selectedAssignmentForDeadline.duration || 0} phút\n👉 Hạn nộp tối thiểu phải từ: ${formatSafeDateTime(minAllowedDate).time} ${formatSafeDateTime(minAllowedDate).date}`);
        return;
    }

    setIsUpdatingDeadline(true);
    try {
        const finalDate = finalDateObj.toISOString();
        await axios.patch(`/assignments/update-deadline/${selectedAssignmentForDeadline._id}`, { newDueDate: finalDate }, getHeader());
        alert("✅ Gia hạn bài tập thành công!");
        setIsDeadlineModalOpen(false);
        fetchData();
    } catch (error) {
        alert("Lỗi khi cập nhật hạn nộp!");
    } finally {
        setIsUpdatingDeadline(false);
    }
  };

  const handleOpenPasswordModal = (assignment) => {
    setSelectedAssignmentForPassword(assignment);
    setNewPassword(""); 
    setIsPasswordModalOpen(true);
  };

  const handleUpdatePassword = async () => {
    setIsUpdatingPassword(true);
    try {
      await axios.put(`/assignments/update-password/${selectedAssignmentForPassword._id}`, { password: newPassword.trim() }, getHeader());
      alert("✅ Cập nhật mật khẩu thành công!");
      setIsPasswordModalOpen(false);
      fetchData(); 
    } catch(e) {
      alert("Lỗi khi đổi mật khẩu bài thi!");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const filteredClasses = (teacherProfile?.assignedClasses || []).filter(c => {
    const classObj = allClasses.find(ac => ac._id === c._id || ac._id === c) || c;
    return (classObj.name || "").toLowerCase().includes(searchClassQuery.toLowerCase());
  });

  const getTeacherDeptInfo = () => {
    if(!teacherProfile) return "...";
    return teacherProfile.department === "KHTN" ? "Tổ KHTN" : teacherProfile.department === "KHXH" ? "Tổ KHXH" : "Chưa phân tổ";
  };

  const displayedAssignments = assignments.filter(a => {
      if (assignmentFilter === "all") return true;
      return a.assignmentType === assignmentFilter;
  });

  return (
    <div className="min-h-screen bg-sky-50/40 flex font-sans text-slate-800 relative">
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-sky-100 flex flex-col h-screen shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-[4px_0_24px_rgba(14,165,233,0.05)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-sky-50">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-sky-600" />
            </div>
            <span className="font-extrabold text-xl text-sky-950 tracking-tight">Khu vực<br/>Giáo viên</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}><X className="w-5 h-5 text-slate-500" /></Button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          <Button onClick={() => handleMenuClick("my-classes")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'my-classes' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><School className="mr-3 h-5 w-5" /> Quản lý Lớp</Button>
          <Button onClick={() => {handleMenuClick("leaderboard"); if(!selectedLeaderboardClass && teacherProfile?.assignedClasses?.length > 0) setSelectedLeaderboardClass(String(teacherProfile.assignedClasses[0]._id || teacherProfile.assignedClasses[0]));}} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'hover:bg-amber-50 hover:text-amber-600 text-slate-500'}`}><Trophy className="mr-3 h-5 w-5" /> Bảng thi đua</Button>
          
          <Button onClick={() => handleMenuClick("assignments")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all ${activeTab === 'assignments' ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-500'}`}><CheckSquare className="mr-3 h-5 w-5" /> Bài tập đã giao</Button>
          <Button onClick={() => navigate("/teacher/question-bank")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all hover:bg-sky-50 hover:text-sky-600 text-slate-500`}><Database className="mr-3 h-5 w-5" /> Kho câu hỏi</Button>
          
          <Button onClick={() => handleMenuClick("settings")} variant="ghost" className={`w-full justify-start rounded-xl h-12 font-bold transition-all mt-4 ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow-md shadow-slate-300' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}><Settings className="mr-3 h-5 w-5" /> Thông tin & Bảo mật</Button>
        </nav>
        <div className="p-5 border-t border-sky-50">
          <Button onClick={handleLogout} variant="ghost" className="w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold h-11 rounded-xl">
            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full overflow-y-auto overflow-x-hidden max-w-[100vw]">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden bg-white shadow-sm rounded-xl border border-sky-100" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-sky-900" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-950 tracking-tight">Trường THCS Trần Hưng Đạo</h1>
              <p className="text-slate-500 mt-1 sm:mt-2 font-medium flex items-center gap-2">
                 Chào thầy/cô {fullName} 👋
                 <Badge variant="outline" className="bg-sky-50 text-sky-700 font-bold border-sky-200 shadow-none text-xs ml-1">
                   {getTeacherDeptInfo()}
                 </Badge>
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {activeTab === "assignments" && (
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 whitespace-nowrap text-white h-11 px-6 rounded-xl shadow-md flex items-center font-bold transition-transform active:scale-95">
                <PlusCircle className="mr-2 h-5 w-5" /> Giao bài mới
              </Button>
            )}
          </div>
        </header>

        {/* MODAL DANH SÁCH LỚP VÀ CHỈNH SỬA HỌC SINH */}
        <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
          <DialogContent className="sm:max-w-[1100px] w-[95%] max-h-[90vh] flex flex-col rounded-3xl border-none p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2 shrink-0">
                <UserCircle className="w-6 h-6 text-sky-500"/> Danh sách Lớp {selectedClassName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Tìm theo tên hoặc mã học sinh..." className="pl-10 h-11 rounded-xl bg-slate-50 border-sky-100" value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} />
              </div>
              
              <Select value={studentSortOption || "name"} onValueChange={setStudentSortOption}>
                <SelectTrigger className="h-11 rounded-xl bg-sky-50 border-sky-100 font-bold text-sky-800 sm:w-[180px] [&>span]:truncate">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {studentSortOption === 'name' ? 'Tên A-Z' : 
                       studentSortOption === 'most_submissions' ? 'Nộp nhiều nhất' : 
                       studentSortOption === 'latest_submission' ? 'Nộp gần nhất' : 'Sắp xếp'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="bg-white z-50">
                  <SelectItem value="name">Tên A-Z</SelectItem>
                  <SelectItem value="most_submissions">Nộp nhiều nhất</SelectItem>
                  <SelectItem value="latest_submission">Nộp gần nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-y-auto mt-2 min-h-0">
              {classStudents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">Không tìm thấy học sinh nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-sky-100">
                  <Table className="min-w-[1000px] w-full">
                    <TableHeader className="bg-sky-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-bold text-sky-800 w-12 text-center">STT</TableHead>
                        <TableHead className="font-bold text-sky-800 w-[180px]">Họ và Tên</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-[120px]">SĐT</TableHead>
                        <TableHead className="font-bold text-sky-800 min-w-[220px]">Địa chỉ</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-24">Đã nộp</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-24">Điểm TB</TableHead>
                        <TableHead className="font-bold text-sky-800 text-center w-[170px] shrink-0">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents
                        .filter(student => (student.fullName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) || (student.username || "").toLowerCase().includes(studentSearchQuery.toLowerCase()))
                        .sort((a, b) => {
                          if (studentSortOption === "most_submissions") return (b.totalTests || 0) - (a.totalTests || 0);
                          else if (studentSortOption === "latest_submission") return (b.lastSubmission ? new Date(b.lastSubmission).getTime() : 0) - (a.lastSubmission ? new Date(a.lastSubmission).getTime() : 0);
                          return (a.fullName || "").localeCompare(b.fullName || "");
                        })
                        .map((student, idx) => (
                        <TableRow key={student._id} className="hover:bg-sky-50/50">
                          <TableCell className="font-medium text-slate-400 text-center align-middle">{idx + 1}</TableCell>
                          <TableCell className="align-middle">
                            <p className="font-bold text-sky-900">{student.fullName}</p>
                            <p className="text-xs text-sky-600">Tên TK: {student.username}</p>
                          </TableCell>
                          <TableCell className="text-center align-middle font-medium text-slate-600">
                             {student.phone || "-"}
                          </TableCell>
                          <TableCell className="align-middle text-slate-600 text-sm whitespace-normal break-words">
                             {student.address || "-"}
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <Badge className="bg-teal-50 text-teal-700 shadow-none border-0">{student.totalTests || 0} bài</Badge>
                          </TableCell>
                          <TableCell className="text-center pr-4 font-black text-sky-600 align-middle">{student.averageScore || "-"}</TableCell>
                          <TableCell className="text-center align-middle">
                              <div className="flex justify-center items-center gap-2">
                                 <Button onClick={() => openEditStudentModal(student)} variant="outline" size="sm" className="h-8 px-2.5 text-amber-600 border-amber-200 hover:bg-amber-50 font-bold">
                                    <Edit className="w-3.5 h-3.5 mr-1" /> Sửa
                                 </Button>
                                 <Button onClick={() => handleViewStudentDetails(student)} variant="outline" size="sm" className="h-8 px-2.5 text-sky-600 border-sky-200 hover:bg-sky-50 font-bold">
                                    Chi tiết
                                 </Button>
                              </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 👉 MODAL SỬA THÔNG TIN HỌC SINH (DÀNH CHO GIÁO VIÊN) */}
        <Dialog open={isEditStudentModalOpen} onOpenChange={setIsEditStudentModalOpen}>
            <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none p-6 bg-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-700 pb-2 border-b border-amber-100">
                        <Edit className="h-5 w-5" /> Sửa thông tin Học sinh
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateStudent} className="space-y-4 pt-2">
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-1 block">Tên Đăng Nhập (Mã HS)</label>
                        <Input value={selectedStudentForEdit?.username || ""} disabled className="h-11 rounded-xl bg-slate-50 text-slate-500" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-1 block">Họ và tên</label>
                        <Input 
                            value={editStudentForm.fullName} 
                            onChange={(e) => setEditStudentForm({...editStudentForm, fullName: e.target.value})} 
                            required 
                            className="h-11 rounded-xl bg-white border-amber-200 focus-visible:ring-amber-500" 
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-1 block">Số điện thoại</label>
                        <Input
                            className="h-11 rounded-xl bg-white border-amber-200 focus-visible:ring-amber-500"
                            value={editStudentForm.phone}
                            inputMode="numeric"
                            maxLength={15}
                            onChange={(e) => {
                                const digitsOnly = String(e.target.value).replace(/[^0-9]/g, "").slice(0, 15);
                                setEditStudentForm((prev) => ({ ...prev, phone: digitsOnly }));
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-1 block">Địa chỉ</label>
                        <Input 
                            className="h-11 rounded-xl bg-white border-amber-200 focus-visible:ring-amber-500"
                            value={editStudentForm.address}
                            onChange={(e) => setEditStudentForm({...editStudentForm, address: e.target.value})}
                        />
                    </div>
                    
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 mt-2">
                        <label className="text-sm font-bold text-rose-700 flex items-center gap-1 mb-2">
                            <Key className="w-4 h-4"/> Đặt lại mật khẩu (Nếu cần)
                        </label>
                        <Input 
                            type="password" 
                            placeholder="Nhập mật khẩu mới..."
                            className="h-11 rounded-xl bg-white border-rose-200 focus-visible:ring-rose-500"
                            value={editStudentForm.newPassword}
                            onChange={(e) => setEditStudentForm({...editStudentForm, newPassword: e.target.value})}
                        />
                        <p className="text-[10px] text-rose-500 mt-1 font-medium">*Bỏ trống nếu không muốn đổi mật khẩu. (MK cần chứa số/chữ và ký tự đặc biệt)</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditStudentModalOpen(false)} className="rounded-xl font-bold h-11 text-slate-500">Hủy</Button>
                        <Button type="submit" disabled={isUpdatingStudent} className="h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6">
                            {isUpdatingStudent ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog open={!!selectedStudentDetails} onOpenChange={(open) => { if (!open) setSelectedStudentDetails(null); }}>
          <DialogContent className="sm:max-w-[600px] w-[95%] rounded-3xl border-none p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-2">
                <History className="w-6 h-6 text-amber-500"/> Lịch sử làm bài: {selectedStudentDetails?.fullName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[50vh] overflow-y-auto mt-2">
              {isLoadingHistory ? (
                <div className="text-center py-10"><Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500"/></div>
              ) : studentHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Học sinh này chưa nộp bài nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentHistory.map(sub => (
                    <div key={sub._id} className="flex justify-between items-center p-4 bg-white border border-sky-100 rounded-2xl shadow-sm hover:border-sky-300 transition-colors">
                       <div>
                         <p className="font-bold text-sky-900 line-clamp-1">{sub.assignment?.title || "Bài tập đã bị xóa"}</p>
                         <p className="text-xs text-slate-500 font-medium mt-1">Nộp lúc: {new Date(sub.createdAt).toLocaleString('vi-VN')}</p>
                       </div>
                       <div className="bg-sky-50 text-sky-700 font-black text-lg px-4 py-2 rounded-xl shrink-0">
                         {sub.score} <span className="text-[10px] font-bold text-sky-500 uppercase">Điểm</span>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL CHỌN LOẠI BÀI */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[450px] w-[95%] rounded-3xl border-none p-6 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-800 text-center mb-4">
                        Bạn muốn tạo loại bài nào?
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        onClick={() => { setIsCreateModalOpen(false); navigate("/teacher/create-assignment?type=homework"); }}
                        className="h-32 flex flex-col items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border-2 border-sky-200 hover:border-sky-400 transition-all rounded-2xl shadow-sm"
                    >
                        <BookOpen className="w-10 h-10 mb-2" />
                        <span className="font-bold text-base">Bài tập về nhà</span>
                    </Button>
                    <Button 
                        onClick={() => { setIsCreateModalOpen(false); navigate("/teacher/create-assignment?type=exam"); }}
                        className="h-32 flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border-2 border-indigo-200 hover:border-indigo-400 transition-all rounded-2xl shadow-sm"
                    >
                        <FileCheck className="w-10 h-10 mb-2" />
                        <span className="font-bold text-base">Đề kiểm tra/Thi</span>
                    </Button>
                </div>
                <p className="text-xs text-center text-slate-500 mt-4 font-medium">
                    *Bạn có thể cài đặt thời gian làm bài ở bước tiếp theo.
                </p>
            </DialogContent>
        </Dialog>

        {/* MODAL GIA HẠN BÀI TẬP */}
        <Dialog open={isDeadlineModalOpen} onOpenChange={setIsDeadlineModalOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl border-none p-6 bg-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-amber-500" /> Gia hạn bài tập
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <p className="text-sm font-bold text-slate-600">
                        Tên bài tập: <span className="text-sky-600">{selectedAssignmentForDeadline?.title}</span>
                    </p>
                    <div className="space-y-2">
                        <label className="font-bold text-slate-700">Chọn hạn nộp mới</label>
                        <div className="flex gap-2 relative">
                            <div className="flex-1">
                               <CustomDateInput 
                                  value={newDeadlineDate}
                                  min={new Date().toISOString().slice(0, 10)}
                                  onChange={(val) => {
                                     if(val) setNewDeadlineDate(val);
                                  }}
                               />
                            </div>
                            <Input 
                                type="time" 
                                className="w-[120px] h-11 sm:h-12 rounded-xl bg-slate-50 border-sky-200 font-bold text-slate-700 shadow-sm relative z-10" 
                                value={newDeadlineTime} 
                                onChange={(e) => setNewDeadlineTime(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsDeadlineModalOpen(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-800">
                            Hủy
                        </Button>
                        <Button onClick={handleUpdateDeadline} disabled={isUpdatingDeadline} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md">
                            {isUpdatingDeadline ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Lưu hạn nộp
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL ĐỔI MẬT KHẨU BÀI THI */}
        <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-2">
                <Lock className="w-6 h-6 text-indigo-500" /> Quản lý mật khẩu bài thi
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <p>Cảnh báo: Thay đổi mật khẩu này sẽ ảnh hưởng trực tiếp đến những học sinh chưa vào làm bài. Hãy thông báo cho học sinh nếu đổi!</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600">Bài thi</label>
                <Input value={selectedAssignmentForPassword?.title || ""} readOnly className="bg-slate-50 font-bold border-none text-slate-500 cursor-not-allowed h-11" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-600">Mật khẩu cũ (hiện tại)</label>
                <Input value={selectedAssignmentForPassword?.password || "Không có mật khẩu"} readOnly className="bg-slate-50 font-bold border-sky-100 text-sky-700 h-11 cursor-not-allowed" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-indigo-600">Nhập mật khẩu mới</label>
                <Input
                  type="text"
                  placeholder="Để trống nếu muốn xóa mật khẩu..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl font-bold border-indigo-200 focus-visible:ring-indigo-500 text-indigo-700 bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-800 h-11 px-6">Hủy</Button>
                <Button
                  disabled={isUpdatingPassword}
                  onClick={handleUpdatePassword}
                  className="h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl px-6 shadow-md shadow-indigo-200"
                >
                  {isUpdatingPassword ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : null}
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {activeTab === "my-classes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-sky-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-sky-950 flex items-center gap-2">
                  <School className="w-6 h-6 text-sky-500" /> Tiến độ & Thi đua
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Báo cáo tổng quan các lớp thầy/cô được phân công phụ trách.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Tìm tên lớp (VD: 6A)..." 
                    className="pl-9 h-11 rounded-xl bg-slate-50 border-sky-100 focus-visible:ring-sky-500 font-medium" 
                    value={searchClassQuery} 
                    onChange={(e) => setSearchClassQuery(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {isLoadingData ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-sky-100">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500"/>
                <p className="mt-4 text-slate-500 font-medium">Đang tải dữ liệu lớp học...</p>
              </div>
            ) : !filteredClasses || filteredClasses.length === 0 ? (
              <div className="bg-white border border-dashed border-sky-200 rounded-3xl p-10 sm:p-16 text-center">
                <School className="w-16 h-16 text-sky-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">Chưa có lớp nào</h3>
                <p className="text-slate-400">Thầy/cô hiện chưa được admin phân công phụ trách lớp nào, hoặc không tìm thấy lớp phù hợp.</p>
              </div>
            ) : (
              <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-sky-50/80">
                      <TableRow>
                        <TableHead className="w-16 text-center font-bold text-sky-800 h-12">STT</TableHead>
                        <TableHead className="font-bold text-sky-800">Tên Lớp</TableHead>
                        <TableHead className="text-center font-bold text-sky-800">Khối</TableHead>
                        <TableHead className="text-center font-bold text-sky-800">Sĩ số</TableHead>
                        <TableHead className="text-center font-bold text-sky-800">Lượt làm bài</TableHead>
                        <TableHead className="text-center font-bold text-sky-800">Điểm TB Lớp</TableHead>
                        <TableHead className="text-right pr-6 font-bold text-sky-800">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((cls, idx) => {
                        const classId = cls._id || cls;
                        const classObj = allClasses.find(c => c._id === classId) || cls;
                        const stats = classStatsMap[classId] || { totalSubmissions: 0, averageScore: 0 };
                        
                        return (
                          <TableRow key={classId} className="hover:bg-sky-50/50 transition-colors border-sky-50 group">
                            <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-black text-sky-900 text-lg">{classObj.name || cls.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-sky-100 text-sky-700 shadow-none font-bold border-0 hover:bg-sky-200">Khối {classObj.grade || cls.grade}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-700">
                              <div className="flex items-center justify-center"><Users className="w-4 h-4 mr-1.5 text-slate-400" />{classObj.studentCount || classObj.students?.length || 0} em</div>
                            </TableCell>
                            <TableCell className="text-center">
                              {isFetchingStats ? (<Loader2 className="w-4 h-4 animate-spin mx-auto text-teal-500" />) : (<Badge className="bg-teal-50 text-teal-700 border-0 shadow-none hover:bg-teal-100 px-3"><CheckSquare className="w-3.5 h-3.5 mr-1.5" />{stats.totalSubmissions} lượt</Badge>)}
                            </TableCell>
                            <TableCell className="text-center">
                              {isFetchingStats ? (<Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-500" />) : (<Badge className="bg-blue-50 text-blue-700 border-0 shadow-none hover:bg-blue-100 px-3 text-sm">{stats.averageScore}</Badge>)}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <div className="flex justify-end gap-2">
                                <Button onClick={() => handleViewStudentList(classId, classObj.name || cls.name)} variant="outline" size="sm" className="text-sky-600 border-sky-200 hover:bg-sky-50 hover:text-sky-700 font-bold shadow-sm"><Eye className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Xem DS</span></Button>
                                <Button onClick={() => handleExportClassReport(classId, classObj.name || cls.name)} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-sm"><Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Báo cáo</span></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* QUẢN LÝ BÀI TẬP */}
        {activeTab === "assignments" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* BỘ LỌC BÀI TẬP */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-sky-100">
                <h2 className="text-lg font-black text-sky-900 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-sky-500" /> Danh sách Bài tập / Đề thi
                </h2>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 w-full sm:w-auto h-11">
                    <Filter className="w-4 h-4 text-sky-500 ml-2" />
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                        <SelectTrigger className="w-full sm:w-[160px] border-none bg-transparent font-bold text-sky-700 focus:ring-0">
                            <span className="truncate">
                                {assignmentFilter === 'all' ? 'Tất cả loại bài' : assignmentFilter === 'homework' ? 'Bài tập về nhà' : 'Đề thi / Kiểm tra'}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả loại bài</SelectItem>
                            <SelectItem value="homework">Bài tập về nhà</SelectItem>
                            <SelectItem value="exam">Đề thi / Kiểm tra</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="border-sky-100/50 shadow-sm rounded-3xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table className="min-w-[1100px] border-collapse">
                  <TableHeader className="bg-sky-50/80 border-b border-sky-100">
                    <TableRow>
                      <TableHead className="w-[50px] text-center font-bold text-sky-800 h-12">STT</TableHead>
                      <TableHead className="w-[280px] font-bold text-sky-800 pl-4">Tên bài / Phân loại</TableHead>
                      <TableHead className="w-[80px] text-center font-bold text-sky-800">Lớp</TableHead>
                      <TableHead className="w-[80px] text-center font-bold text-sky-800">Số câu</TableHead>
                      <TableHead className="w-[120px] text-center font-bold text-sky-800">Thời gian</TableHead>
                      <TableHead className="w-[120px] text-center font-bold text-sky-800">Hạn nộp</TableHead>
                      <TableHead className="w-[100px] text-center font-bold text-sky-800">Đã nộp</TableHead>
                      <TableHead className="w-[100px] text-center font-bold text-sky-800">Chờ chấm</TableHead>
                      <TableHead className="w-[120px] text-center font-bold text-sky-800">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingData ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20">
                          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : displayedAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-20 text-slate-500">
                          <FileQuestion className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                          <p className="font-bold text-lg text-slate-600">Chưa có bài tập nào.</p>
                          <p className="text-sm mt-1">Hãy bấm "Giao bài mới" để bắt đầu.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedAssignments.map((assignment, index) => {
                        const isExam = assignment.assignmentType === "exam";
                        const isDraft = assignment.status === "draft";
                        const due = formatSafeDateTime(assignment.dueDate);
                        
                        // TÌM LỚP ĐÚNG CHUẨN ĐỂ ĐẾM SỐ HỌC SINH
                        const safeTargetClass = (assignment.targetClass || "").toString().trim().toLowerCase();
                        const classObj = allClasses?.find(c => 
                            (c.name || "").toString().trim().toLowerCase() === safeTargetClass || 
                            String(c._id) === safeTargetClass
                        );
                        
                        // Lấy tổng học sinh
                        const totalStudents = assignment.totalStudents || classObj?.studentCount || (Array.isArray(classObj?.students) ? classObj.students.length : 0) || 0;
                        
                        // Lấy số lượng đã nộp
                        const submittedCount = assignment.submittedCount !== undefined 
                            ? Number(assignment.submittedCount) 
                            : (Array.isArray(assignment.submissions) ? assignment.submissions.length : 0);

                        const pendingCount = assignment.pendingCount || 0;
                        
                        return (
                          <TableRow 
                            key={assignment._id} 
                            className={`transition-colors border-b border-slate-100 hover:bg-slate-50/50 ${isExam ? 'bg-indigo-50/20' : ''}`}
                          >
                            <TableCell className="text-center font-bold text-slate-400 align-middle">
                              {index + 1}
                            </TableCell>
                            
                            <TableCell className="align-middle pl-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <p className={`font-black text-base line-clamp-2 ${isExam ? 'text-indigo-900' : 'text-sky-900'}`}>
                                  {assignment.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className={`border-0 font-bold text-[10px] ${isExam ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                                    {isExam ? "ĐỀ THI" : "BÀI TẬP"}
                                  </Badge>
                                  {isDraft && <Badge variant="outline" className="bg-amber-100 text-amber-700 border-0 font-bold text-[10px]">BẢN NHÁP</Badge>}
                                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-0 text-[10px]">{assignment.subject}</Badge>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold text-sm shadow-sm px-3">
                                {assignment.targetClass}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center align-middle font-bold text-slate-600 text-base">
                              {assignment.questions?.length || 0}
                            </TableCell>

                            <TableCell className="text-center align-middle font-bold text-slate-700">
                              {assignment.duration ? `${assignment.duration} phút` : "Không giới hạn"}
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-rose-600 text-base">{due.time}</span>
                                <span className="text-[11px] font-medium text-slate-500">{due.date}</span>
                              </div>
                            </TableCell>

                            {/* CỘT HIỂN THỊ ĐÃ NỘP CHUẨN */}
                            <TableCell className="text-center align-middle">
                              {isDraft ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <span className="font-black text-emerald-600 text-base">
                                  {submittedCount}<span className="text-sm font-medium text-slate-400">/{totalStudents}</span>
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-center align-middle">
                              {isDraft ? (
                                <span className="text-slate-400">-</span>
                              ) : pendingCount > 0 ? (
                                <span className="font-black text-amber-500 text-base">{pendingCount}</span>
                              ) : (
                                <span className="font-medium text-slate-300">0</span>
                              )}
                            </TableCell>

                            <TableCell className="text-right pr-4 sm:pr-8">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                {/* XEM ĐỀ / SỬA NHÁP */}
                                {isDraft ? (
                                   <Button onClick={() => navigate(`/teacher/edit-assignment/${assignment._id}`)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-amber-600 hover:bg-amber-100 rounded-xl" title="Sửa bản nháp"><PenTool className="h-4 w-4" /></Button>
                                ) : (
                                   <Button onClick={() => navigate(`/teacher/assignment/${assignment._id}/grades`)} variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-sky-600 hover:bg-sky-100 rounded-xl" title="Xem đề & Xem điểm"><FileText className="h-4 w-4" /></Button>
                                )}

                                {/* GIA HẠN */}
                                <Button 
                                  disabled={isDraft}
                                  onClick={() => openDeadlineModal(assignment)} 
                                  variant="ghost" 
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-amber-500 hover:bg-amber-50 hover:text-amber-600 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed" 
                                  title={isDraft ? "Bản nháp không thể gia hạn" : "Gia hạn nộp bài"}
                                >
                                  <CalendarClock className="h-4 w-4" />
                                </Button>

                                {/* ĐỔI MẬT KHẨU */}
                                <Button 
                                  disabled={isDraft || !assignment.password}
                                  onClick={() => handleOpenPasswordModal(assignment)} 
                                  variant="ghost" 
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed" 
                                  title={isDraft ? "Bản nháp chưa có mật khẩu" : (!assignment.password ? "Bài tập này không cài mật khẩu" : "Đổi mật khẩu vào đề")}
                                >
                                  <Lock className="h-4 w-4" />
                                </Button>

                                {/* XÓA */}
                                <Button 
                                  onClick={() => handleDeleteAssignment(assignment._id, assignment.title)} 
                                  variant="ghost" 
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl" 
                                  title="Xóa bài"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
        )}

        {/* 👉 TAB BẢNG THI ĐUA NÂNG CẤP BỘ LỌC THEO TUẦN */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-sky-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-sky-950 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" /> Bảng Xếp Hạng Lớp
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 w-full xl:w-auto overflow-x-auto pb-2 sm:pb-0">
                
                <Select value={leaderboardTypeFilter || "all"} onValueChange={setLeaderboardTypeFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-amber-50 min-w-[180px] border-none font-bold text-amber-800 shadow-sm [&>span]:truncate">
                    <span className="truncate">
                        {leaderboardTypeFilter === 'all' ? 'Tất cả bài làm' : leaderboardTypeFilter === 'homework' ? 'Bài Tập Về Nhà' : 'Đề Kiểm Tra'}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50">
                    <SelectItem value="all">Tất cả bài làm</SelectItem>
                    <SelectItem value="homework">Bài Tập Về Nhà</SelectItem>
                    <SelectItem value="exam">Đề Kiểm Tra</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={leaderboardSubjectFilter || "all"} onValueChange={setLeaderboardSubjectFilter}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[160px] border-none font-bold text-sky-800 shadow-sm [&>span]:truncate">
                    <span className="truncate">
                        {leaderboardSubjectFilter === 'all' ? 'Tất cả môn của tôi' : `Môn: ${leaderboardSubjectFilter}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50">
                    <SelectItem value="all">Tất cả môn của tôi</SelectItem>
                    {(() => {
                      const teacherSubjects = Array.isArray(teacherProfile?.subjects) && teacherProfile.subjects.length > 0 
                        ? teacherProfile.subjects 
                        : teacherProfile?.subject ? [teacherProfile.subject] : [];
                      return teacherSubjects.map(sub => (
                        <SelectItem key={sub} value={sub} className="font-bold">Môn: {sub}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>

                {/* 👉 LỌC NĂM */}
                <Select value={lbYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[120px] border-none font-bold text-sky-800 shadow-sm">
                    <span className="truncate">Năm {lbYear}</span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50 max-h-[400px]">
                      {Array.from({length: 10}, (_, i) => currentYear - 5 + i).map(year => (
                         <SelectItem key={year} value={String(year)} className="font-bold">Năm {year}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* 👉 LỌC THÁNG */}
                <Select value={lbMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[130px] border-none font-bold text-sky-800 shadow-sm">
                    <span className="truncate">{lbMonth === "all" ? "Cả năm" : `Tháng ${lbMonth}`}</span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50 max-h-[400px]">
                      <SelectItem value="all" className="font-bold text-sky-600">-- Cả năm --</SelectItem>
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                         <SelectItem key={month} value={String(month)} className="font-bold">Tháng {month}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* 👉 LỌC TUẦN (CHỈ HIỂN THỊ KHI ĐÃ CHỌN THÁNG CỤ THỂ) */}
                <Select value={lbWeek} onValueChange={setLbWeek} disabled={lbMonth === "all"}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 min-w-[200px] border-none font-bold text-sky-800 shadow-sm">
                    <span className="truncate">
                        {lbMonth === "all" 
                            ? "Chọn ngày" 
                            : lbWeek === "all" 
                                ? "Tất cả các tuần" 
                                : weeksInMonth.find(w => w.id === lbWeek)?.label || 'Chọn tuần'}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50 max-h-[400px]">
                    <SelectItem value="all" className="font-bold text-sky-600">-- Cả tháng --</SelectItem>
                    {weeksInMonth.map(week => (
                        <SelectItem key={week.id} value={week.id}>
                            <span className="font-bold">{week.label}</span>
                            <span className="text-slate-400 text-xs ml-2">{week.subLabel}</span>
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedLeaderboardClass || ""} onValueChange={setSelectedLeaderboardClass}>
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl bg-sky-50 border-none font-bold text-sky-800 shadow-sm min-w-[140px] [&>span]:truncate">
                    <span className="truncate">
                        {selectedLeaderboardClass ? (allClasses.find(c => String(c._id) === String(selectedLeaderboardClass))?.name ? `Lớp ${allClasses.find(c => String(c._id) === String(selectedLeaderboardClass))?.name}` : "Đang tải...") : "-- Chọn lớp --"}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white z-50">
                    {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
                      <SelectItem value="none" disabled>Bạn chưa quản lý lớp</SelectItem>
                    ) : (
                      teacherProfile.assignedClasses.map(c => { 
                        const classId = String(c._id || c); 
                        const matchedClass = allClasses.find(cls => String(cls._id) === classId); 
                        return <SelectItem key={classId} value={classId} className="font-bold">Lớp {matchedClass ? matchedClass.name : "Đang tải..."}</SelectItem> 
                      })
                    )}
                  </SelectContent>
                </Select>
                
                <Button onClick={handleExportLeaderboardExcel} className="h-10 sm:h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm shrink-0">
                  <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">In báo cáo</span>
                </Button>
              </div>
            </div>

            {isLoadingLeaderboard ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-sky-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
            ) : !selectedLeaderboardClass ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chọn một lớp để xem xếp hạng.</p></div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200"><BarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-slate-500 font-medium">Chưa có học sinh nào làm bài hoặc chưa khớp bộ lọc.</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-black text-sky-900 text-lg uppercase flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500"/> Bảng Vàng
                  </h3>
                  {leaderboardData.slice(0, 3).map((student, idx) => (
                    <Card key={student._id} onClick={() => handleViewStudentDetails(student)} className={`border-none shadow-md rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">{getRankMedal(idx)}</div>
                            <div><p className="font-black text-slate-800 text-lg line-clamp-1">{student.fullName}</p><p className="text-xs font-bold text-slate-500">{student.totalTests} bài</p></div>
                          </div>
                          <div className="text-right shrink-0 ml-2"><p className="font-black text-2xl">{student.averageScore}</p><p className="text-[10px] font-black uppercase opacity-60">Điểm TB</p></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-sky-100 overflow-hidden">
                  <div className="bg-sky-50/50 p-4 border-b border-sky-100">
                    <h3 className="font-black text-sky-900">Danh sách toàn lớp</h3>
                  </div>
                  <div className="max-h-[500px] overflow-x-auto p-2">
                    <Table className="min-w-[400px]">
                      <TableHeader><TableRow><TableHead className="w-16 text-center">Hạng</TableHead><TableHead>Họ và Tên</TableHead><TableHead className="text-center">Đã làm</TableHead><TableHead className="text-right pr-6">Điểm TB</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {leaderboardData.map((student, idx) => (
                          <TableRow key={student._id} onClick={() => handleViewStudentDetails(student)} className="cursor-pointer hover:bg-sky-50/50 transition-colors group">
                            <TableCell className="text-center font-bold text-slate-400 group-hover:text-sky-600">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-700 group-hover:text-sky-700">{student.fullName}</TableCell>
                            <TableCell className="text-center font-medium">
                              <Badge className="bg-sky-100 text-sky-700 border-0 shadow-none hover:bg-sky-200">{student.totalTests}</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 font-black text-sky-600">{student.averageScore}</TableCell>
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

        {/* 👉 TAB CÀI ĐẶT THÔNG TIN CÁ NHÂN VÀ ĐỔI MẬT KHẨU CHO GIÁO VIÊN */}
        {activeTab === "settings" && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            <Card className="border-slate-100 shadow-sm rounded-3xl bg-white overflow-hidden max-w-4xl mx-auto">
                <CardHeader className="bg-sky-50/50 border-b border-sky-100">
                    <CardTitle className="text-xl font-bold text-sky-900 flex items-center gap-2">
                        <UserCircle className="w-6 h-6 text-sky-600" /> Thông tin cá nhân & Bảo mật
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                    <form onSubmit={handleUpdateTeacherProfile} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Họ và tên</label>
                                <Input 
                                    required 
                                    value={profileForm.fullName} 
                                    onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} 
                                    className="h-12 rounded-xl bg-slate-50 border-sky-100 focus-visible:ring-sky-500 font-bold text-sky-900" 
                                    placeholder="Nhập họ và tên..." 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                                <Input 
                                    inputMode="numeric"
                                    maxLength={15}
                                    value={profileForm.phone} 
                                    onChange={e => setProfileForm({...profileForm, phone: e.target.value.replace(/[^0-9]/g, "")})} 
                                    className="h-12 rounded-xl bg-slate-50 border-sky-100 focus-visible:ring-sky-500 font-medium" 
                                    placeholder="Nhập số điện thoại..." 
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Địa chỉ</label>
                                <Input 
                                    value={profileForm.address} 
                                    onChange={e => setProfileForm({...profileForm, address: e.target.value})} 
                                    className="h-12 rounded-xl bg-slate-50 border-sky-100 focus-visible:ring-sky-500 font-medium" 
                                    placeholder="Nhập địa chỉ chi tiết..." 
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 mt-2 space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Key className="w-5 h-5 text-amber-500" /> Đổi mật khẩu
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Mật khẩu hiện tại</label>
                                    <Input 
                                        type="password" 
                                        value={passwordData.oldPassword} 
                                        onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} 
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500" 
                                        placeholder="Nhập mật khẩu cũ..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
                                    <Input 
                                        type="password" 
                                        value={passwordData.newPassword} 
                                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500" 
                                        placeholder="Nhập mật khẩu mới..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu</label>
                                    <Input 
                                        type="password" 
                                        value={passwordData.confirmPassword} 
                                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-amber-500" 
                                        placeholder="Nhập lại mật khẩu mới..." 
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-amber-600 font-medium italic">
                                *Chỉ điền vào khu vực này nếu bạn muốn đổi mật khẩu. Mật khẩu mới cần tối thiểu 6 ký tự và chứa ít nhất 1 ký tự đặc biệt.
                            </p>
                        </div>
                        
                        <div className="pt-2 flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={isUpdatingProfile} 
                                className="w-full sm:w-auto px-8 h-12 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md shadow-sky-200 active:scale-95 text-base"
                            >
                                {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                Lưu thông tin
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
};

export default TeacherDashboard;