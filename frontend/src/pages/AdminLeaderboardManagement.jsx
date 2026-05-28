import React, { useState, useEffect } from "react";
import axios from "../lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Trophy, Medal, BarChart as BarChartIcon, Calendar, Filter, Loader2, Sparkles, Eye, Search, BarChart3
} from "lucide-react";

// KHÔNG CẦN IMPORT BẤT KỲ THƯ VIỆN BIỂU ĐỒ NÀO NỮA!

const AdminLeaderboardManagement = () => {
  const [adminLeaderboard, setAdminLeaderboard] = useState([]);
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [lbYear, setLbYear] = useState(currentYear);
  const [lbMonth, setLbMonth] = useState(currentMonth);
  const [lbWeek, setLbWeek] = useState("all");
  const [lbGradeFilter, setLbGradeFilter] = useState("all");
  const [isLoadingLb, setIsLoadingLb] = useState(false);

  const [isClassDetailsOpen, setIsClassDetailsOpen] = useState(false);
  const [selectedClassDetails, setSelectedClassDetails] = useState([]);
  const [classDetailsLoading, setClassDetailsLoading] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchStudent, setSearchStudent] = useState(""); 

  const [showChart, setShowChart] = useState(false);
  const [selectedClassesForChart, setSelectedClassesForChart] = useState([]);

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchAdminLeaderboard = async () => {
      setIsLoadingLb(true);
      setShowChart(false); 
      try {
        const res = await axios.get(`/admin/leaderboard?year=${lbYear}&month=${lbMonth}&week=${lbWeek}&grade=${lbGradeFilter}`, getHeader());
        const data = res.data.leaderboard || [];
        setAdminLeaderboard(data);
        
        // Mặc định chọn 4 lớp đầu tiên
        if (data.length > 0) {
          setSelectedClassesForChart(data.slice(0, 4).map(cls => cls.className));
        } else {
          setSelectedClassesForChart([]);
        }
      } catch (error) {
        console.error("Lỗi tải bảng thi đua:", error);
      } finally {
        setIsLoadingLb(false);
      }
    };
    fetchAdminLeaderboard();
  }, [lbYear, lbMonth, lbWeek, lbGradeFilter]);

  const handleViewClassDetails = async (cls) => {
    setSelectedClassName(`Lớp ${cls.className}`);
    setIsClassDetailsOpen(true);
    setClassDetailsLoading(true);
    setSortOrder("desc");
    setSearchStudent(""); 

    try {
      const targetClassId = cls.classId || cls._id; 
      const res = await axios.get(`/admin/leaderboard/class/${targetClassId}?year=${lbYear}&month=${lbMonth}&week=${lbWeek}`, getHeader());
      setSelectedClassDetails(res.data.students || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết lớp:", error);
      alert("Chưa lấy được dữ liệu chi tiết từ máy chủ.");
      setSelectedClassDetails([]);
    } finally {
      setClassDetailsLoading(false);
    }
  };

  const processedClassDetails = [...selectedClassDetails]
    .filter(st => st.fullName.toLowerCase().includes(searchStudent.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "desc") return b.averageScore - a.averageScore;
      return a.averageScore - b.averageScore;
    });

  const handleToggleClassChart = (className) => {
    if (selectedClassesForChart.includes(className)) {
      setSelectedClassesForChart(selectedClassesForChart.filter(k => k !== className));
    } else {
      setSelectedClassesForChart([...selectedClassesForChart, className]);
    }
  };

  // TẠO DỮ LIỆU SẠCH CHO BIỂU ĐỒ TỰ CHẾ
  const chartData = adminLeaderboard
    .filter(cls => selectedClassesForChart.includes(cls.className))
    .map(cls => ({
      name: `Lớp ${cls.className}`,
      averageScore: Number(cls.averageScore) || 0,
      totalTests: Number(cls.totalTests) || 0
    }));

  // Tìm lớp có số bài nộp cao nhất để làm mốc 100% chiều cao cho cột Lượt Nộp Bài
  const maxTests = chartData.length > 0 ? Math.max(...chartData.map(d => d.totalTests), 10) : 10;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. THANH LỌC */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Thi đua toàn trường
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500 ml-2 hidden sm:block" />
            <Select value={lbYear} onValueChange={setLbYear}>
              <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[90px] sm:w-[100px]"><span className="truncate">Năm {lbYear}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">Năm 2024</SelectItem><SelectItem value="2025">Năm 2025</SelectItem><SelectItem value="2026">Năm 2026</SelectItem><SelectItem value="2027">Năm 2027</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lbMonth} onValueChange={(val) => { setLbMonth(val); if(val === "all") setLbWeek("all"); }}>
              <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[110px] sm:w-[120px]"><span className="truncate">{lbMonth === "all" ? "Cả năm" : `Tháng ${lbMonth}`}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cả năm</SelectItem>{[...Array(12)].map((_, i) => (<SelectItem key={i+1} value={(i+1).toString()}>Tháng {i+1}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={lbWeek} onValueChange={setLbWeek} disabled={lbMonth === "all"}>
              <SelectTrigger className="h-9 bg-white border-none font-bold text-sky-700 shadow-sm w-[110px] sm:w-[120px]"><span className="truncate">{lbWeek === "all" ? "Cả tháng" : `Tuần ${lbWeek}`}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cả tháng</SelectItem><SelectItem value="1">Tuần 1</SelectItem><SelectItem value="2">Tuần 2</SelectItem><SelectItem value="3">Tuần 3</SelectItem><SelectItem value="4">Tuần 4</SelectItem><SelectItem value="5">Tuần 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={lbGradeFilter} onValueChange={setLbGradeFilter}>
            <SelectTrigger className="h-11 sm:h-[50px] rounded-xl bg-slate-50 min-w-[120px] border border-slate-200 font-bold text-slate-700 shadow-sm">
              <Filter className="w-4 h-4 mr-2" /><span className="truncate">{lbGradeFilter === "all" ? "Tất cả Khối" : `Khối ${lbGradeFilter}`}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả Khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. BẢNG THI ĐUA VÀ TOP 3 */}
      {isLoadingLb ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100"><Loader2 className="w-12 h-12 animate-spin mx-auto text-sky-500 mb-4"/></div>
      ) : adminLeaderboard.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200">
          <BarChartIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Chưa có dữ liệu cho thời gian này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500"/> Lớp xuất sắc nhất
            </h3>
            {adminLeaderboard.slice(0, 3).map((cls, idx) => (
              <Card key={cls.className} className={`border-none shadow-md rounded-2xl ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-50' : idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100' : 'bg-gradient-to-br from-orange-200 to-orange-100'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                       {idx === 0 ? <Medal className="w-6 h-6 text-amber-400" /> : idx === 1 ? <Medal className="w-6 h-6 text-slate-300" /> : <Medal className="w-6 h-6 text-orange-400" />}
                     </div>
                     <div><p className="font-black text-slate-800 text-lg">Lớp {cls.className}</p><p className="text-xs font-bold text-slate-500">{cls.totalTests} bài</p></div>
                   </div>
                   <div className="text-right"><p className="font-black text-2xl leading-none">{cls.averageScore}</p><p className="text-[10px] font-black uppercase opacity-60">Điểm TB</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-700">Danh sách xếp hạng</h3>
               <Button 
                  onClick={() => setShowChart(!showChart)} 
                  variant={showChart ? "default" : "outline"}
                  className={`rounded-xl font-bold h-9 shadow-sm transition-all ${showChart ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-white text-sky-600 border-sky-200 hover:bg-sky-50'}`}
               >
                  <BarChartIcon className="w-4 h-4 mr-2" />
                  {showChart ? "Ẩn sơ đồ" : "Tạo sơ đồ thống kê"}
               </Button>
            </div>
            <div className="overflow-x-auto flex-1">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Hạng</TableHead>
                    <TableHead>Tên Lớp</TableHead>
                    <TableHead className="text-center">Khối</TableHead>
                    <TableHead className="text-center">Đã nộp</TableHead>
                    <TableHead className="text-right">Điểm TB</TableHead>
                    <TableHead className="text-center w-24 pr-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminLeaderboard.map((cls, idx) => (
                    <TableRow key={cls.className}>
                      <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-black text-slate-700">Lớp {cls.className}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">Khối {cls.grade}</Badge></TableCell>
                      <TableCell className="text-center font-medium">{cls.totalTests} bài</TableCell>
                      <TableCell className="text-right font-black text-sky-600">{cls.averageScore}</TableCell>
                      <TableCell className="text-center pr-4">
                        <Button variant="ghost" size="icon" onClick={() => handleViewClassDetails(cls)} className="h-8 w-8 text-sky-600 hover:bg-sky-50 hover:text-sky-700 rounded-xl" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* 3. BIỂU ĐỒ CỘT THUẦN HTML + TAILWIND (KHÔNG BAO GIỜ LỖI) */}
      {showChart && adminLeaderboard.length > 0 && (
        <Card className="border-slate-100 shadow-md rounded-3xl bg-white p-4 sm:p-6 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="p-0 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-500" /> Sơ đồ so sánh lớp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">BẤM ĐỂ CHỌN/BỎ CHỌN LỚP MUỐN SO SÁNH:</label>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                {adminLeaderboard.map((cls) => {
                  const isChecked = selectedClassesForChart.includes(cls.className);
                  return (
                    <button
                      key={cls.className}
                      type="button"
                      onClick={() => handleToggleClassChart(cls.className)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all border ${
                        isChecked ? "bg-sky-500 text-white border-sky-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Lớp {cls.className}
                    </button>
                  );
                })}
              </div>
            </div>

            {chartData.length === 0 ? (
               <div className="w-full h-[350px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                 <BarChartIcon className="w-8 h-8 opacity-40 mb-2" /> Vui lòng chọn ít nhất 1 lớp
               </div>
            ) : (
               <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                  <div className="min-w-[600px] mt-10">
                     {/* KHUNG VẼ BIỂU ĐỒ */}
                     <div className="relative h-[300px] border-b-2 border-slate-200 flex items-end justify-around gap-2 px-8 pt-4">
                        
                        {/* Lưới nền (Dashed lines) */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0 z-0">
                           {[...Array(6)].map((_, i) => (
                              <div key={i} className="w-full border-t border-slate-200 border-dashed h-0"></div>
                           ))}
                        </div>

                        {/* Vẽ các cột dữ liệu */}
                        {chartData.map((data, idx) => (
                           <div key={idx} className="relative z-10 flex flex-col items-center justify-end h-full w-full group">
                              <div className="flex items-end justify-center w-full gap-1 sm:gap-2 h-full">
                                 
                                 {/* CỘT ĐIỂM TRUNG BÌNH (Tỷ lệ = Điểm / 10) */}
                                 <div className="w-[30%] max-w-[45px] bg-blue-500 rounded-t-md relative hover:brightness-110 transition-all duration-300" style={{ height: `${Math.max((data.averageScore / 10) * 100, 2)}%` }}>
                                    {/* Tooltip hiển thị khi hover */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                       Điểm: {data.averageScore}
                                    </div>
                                 </div>

                                 {/* CỘT SỐ BÀI NỘP (Tỷ lệ = Bài / MaxBài) */}
                                 <div className="w-[30%] max-w-[45px] bg-emerald-500 rounded-t-md relative hover:brightness-110 transition-all duration-300" style={{ height: `${Math.max((data.totalTests / maxTests) * 100, 2)}%` }}>
                                    {/* Tooltip hiển thị khi hover */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                       Nộp: {data.totalTests} bài
                                    </div>
                                 </div>
                              </div>
                              
                              {/* Trục X - Tên lớp */}
                              <div className="absolute -bottom-8 w-full text-center">
                                 <span className="text-sm font-bold text-slate-600">{data.name}</span>
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Chú thích màu (Legend) */}
                     <div className="flex items-center justify-center gap-6 mt-12 mb-4">
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                           <span className="text-sm font-bold text-slate-700">Điểm Trung Bình (Thang 10)</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-emerald-500 rounded-sm"></div>
                           <span className="text-sm font-bold text-slate-700">Lượt Nộp Bài (Lượt)</span>
                        </div>
                     </div>
                  </div>
               </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG XEM CHI TIẾT */}
      <Dialog open={isClassDetailsOpen} onOpenChange={setIsClassDetailsOpen}>
        <DialogContent className="sm:max-w-[750px] w-[95%] rounded-3xl border-none p-5 sm:p-7">
          <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-500" /> Chi tiết thi đua - {selectedClassName}</DialogTitle></DialogHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-3 mb-5 gap-3">
            <div className="relative w-full sm:w-1/2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Tìm tên học sinh..." className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-sky-500 shadow-sm" value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} /></div>
            <Select value={sortOrder} onValueChange={setSortOrder}><SelectTrigger className="w-full sm:w-[220px] h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700 shadow-sm"><SelectValue placeholder="Sắp xếp điểm" /></SelectTrigger><SelectContent><SelectItem value="desc">Điểm: Cao xuống Thấp</SelectItem><SelectItem value="asc">Điểm: Thấp lên Cao</SelectItem></SelectContent></Select>
          </div>
          {classDetailsLoading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
          ) : (
             <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-100 shadow-inner">
               <Table className="min-w-full">
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm"><TableRow><TableHead className="w-16 text-center font-bold text-slate-700">STT</TableHead><TableHead className="font-bold text-slate-700">Họ và Tên</TableHead><TableHead className="text-center font-bold text-slate-700">Số bài nộp</TableHead><TableHead className="text-center font-bold text-slate-700">Điểm TB</TableHead></TableRow></TableHeader>
                  <TableBody>
                     {processedClassDetails.length === 0 ? (
                       <TableRow><TableCell colSpan={4} className="text-center py-10"><Search className="w-10 h-10 mb-2 opacity-50 mx-auto" /><p className="font-medium text-slate-500">Không tìm thấy học sinh nào.</p></TableCell></TableRow>
                     ) : (
                       processedClassDetails.map((st, i) => (
                          <TableRow key={st._id || i} className="hover:bg-slate-50/50"><TableCell className="text-center font-medium text-slate-500">{i + 1}</TableCell><TableCell className="font-bold text-slate-800">{st.fullName}</TableCell><TableCell className="text-center font-medium">{st.totalTests}</TableCell><TableCell className="text-center font-black text-sky-600">{st.averageScore}</TableCell></TableRow>
                       ))
                     )}
                  </TableBody>
               </Table>
             </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeaderboardManagement;