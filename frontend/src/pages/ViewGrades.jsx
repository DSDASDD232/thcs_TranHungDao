import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; // ĐÃ SỬA: Import axiosInstance thay cho axios mặc định
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Trophy, Clock, User, CheckCircle2, FileX } from "lucide-react";

const ViewGrades = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const token = localStorage.getItem("token");
        // ĐÃ SỬA: Rút gọn API do đã có baseURL
        const res = await axios.get(`/submissions/assignment/${assignmentId}/grades`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSubmissions(res.data.submissions || []);
      } catch (err) {
        console.error("Lỗi lấy điểm:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [assignmentId]);

  // Tính điểm trung bình của cả lớp
  const averageScore = submissions.length > 0 
    ? (submissions.reduce((acc, sub) => acc + (sub.score || 0), 0) / submissions.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-sky-50/40 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Nút quay lại */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/teacher-dashboard")}
          className="text-sky-600 hover:text-sky-700 hover:bg-sky-100 font-bold px-0 mb-2 h-auto"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại Bảng điều khiển
        </Button>

        {/* THỐNG KÊ TỔNG QUAN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white overflow-hidden relative">
            <CardContent className="p-8 relative z-10">
              <h3 className="text-sky-100 font-bold mb-1">Tổng số bài nộp</h3>
              <div className="text-5xl font-black">{submissions.length} <span className="text-xl font-bold text-sky-200">bài</span></div>
            </CardContent>
            <CheckCircle2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
          </Card>

          <Card className="border-sky-100 shadow-sm rounded-3xl bg-white">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-slate-500 font-bold mb-1">Điểm Trung Bình</h3>
                <div className="text-4xl font-black text-sky-950">{averageScore}</div>
              </div>
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BẢNG ĐIỂM CHI TIẾT */}
        <Card className="border-sky-100 shadow-xl rounded-3xl bg-white overflow-hidden">
          <CardHeader className="bg-sky-50/50 border-b border-sky-100 p-6">
            <CardTitle className="text-xl font-black text-sky-950 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-500" /> Chi tiết điểm số học sinh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-b border-sky-50">
                  <TableHead className="pl-8 font-bold text-slate-500 h-14">Họ và tên</TableHead>
                  <TableHead className="font-bold text-slate-500">Tài khoản</TableHead>
                  <TableHead className="font-bold text-slate-500 text-center">Lớp</TableHead>
                  <TableHead className="font-bold text-slate-500">Thời gian nộp</TableHead>
                  <TableHead className="font-bold text-slate-500 text-right pr-8">Điểm số</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto" />
                      <p className="text-slate-500 font-medium mt-4">Đang tải bảng điểm...</p>
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                      <FileX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium italic">Chưa có học sinh nào nộp bài.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub, idx) => (
                    <TableRow key={sub._id} className="hover:bg-sky-50/50 transition-colors border-sky-50">
                      <TableCell className="pl-8 py-4 font-bold text-sky-900">
                        {sub.student?.fullName || "Không xác định"}
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {sub.student?.username || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-sky-100 text-sky-700 border-0 shadow-none font-bold">
                          {sub.student?.classId?.name || "Chưa xếp lớp"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {new Date(sub.createdAt).toLocaleString("vi-VN", { 
                          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" 
                        })}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-lg font-black ${
                          sub.score >= 8 ? 'bg-emerald-100 text-emerald-700' : 
                          sub.score >= 5 ? 'bg-amber-100 text-amber-700' : 
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {sub.score}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewGrades;