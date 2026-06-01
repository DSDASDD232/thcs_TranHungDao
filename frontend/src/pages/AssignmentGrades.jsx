import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Search, Edit3, Eye, CheckCircle2, AlertCircle, Clock, Lock } from "lucide-react";

const AssignmentGrades = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const getHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => { 
    const fetchData = async () => {
      try {
        const res = await axios.get(`/submissions/assignment/${id}/grades`, getHeader());
        setAssignment(res.data.assignment);
        setSubmissions(res.data.submissions);
      } catch (error) {
        console.error(error);
        alert("Lỗi tải dữ liệu bài nộp!");
      } finally {
        setLoading(false);
      }
    };
    fetchData(); 
  }, [id]);

  const filteredSubmissions = submissions.filter(s => 
    s.student?.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // CHUYỂN HƯỚNG SANG TRANG CHẤM BÀI TOÀN MÀN HÌNH
  const goToGradePage = (sub) => {
    navigate(`/teacher/grade/${sub._id}`, { 
      state: { submission: sub, assignment: assignment } 
    });
  };

  if (loading) return <div className="min-h-screen bg-sky-50/50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /></div>;

  // XÁC ĐỊNH XEM ĐÃ QUA HẠN NỘP HAY CHƯA
  const isPastDeadline = assignment?.dueDate ? new Date() >= new Date(assignment.dueDate) : true;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER QUAY LẠI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/teacher-dashboard")} className="bg-white shadow-sm rounded-xl text-sky-700 hover:bg-sky-50 h-12 px-4 font-bold">
              <ArrowLeft className="w-5 h-5 mr-2" /> Trở về
            </Button>
            <div>
              <h1 className="text-2xl font-black text-sky-950">{assignment?.title}</h1>
              <p className="text-slate-500 font-medium mt-1">Sĩ số nộp: {submissions.length}</p>
            </div>
          </div>
        </div>

        {/* CẢNH BÁO NẾU CHƯA TỚI HẠN NỘP VÀ CÓ BÀI CHỜ CHẤM */}
        {!isPastDeadline && (
          <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
             <Clock className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
             <div>
                <h4 className="font-bold text-amber-800 text-lg">Chưa đến thời gian chấm bài!</h4>
                <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                  Hạn nộp bài là <strong>{new Date(assignment.dueDate).toLocaleString('vi-VN')}</strong>. Để đảm bảo công bằng và tránh thất thoát điểm khi học sinh nộp lại bài, hệ thống đã tạm khóa chức năng chấm tự luận. Bạn có thể chấm bài ngay khi hết hạn nộp.
                </p>
             </div>
          </div>
        )}

        {/* DANH SÁCH BÀI NỘP */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
            <Search className="w-5 h-5 text-slate-400 ml-2" />
            <Input placeholder="Tìm tên học sinh..." className="h-11 border-none shadow-none text-base focus-visible:ring-0 px-0" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-sky-50/50">
                <TableRow>
                  <TableHead className="font-bold text-sky-800 pl-6 w-16">STT</TableHead>
                  <TableHead className="font-bold text-sky-800">Họ và Tên</TableHead>
                  <TableHead className="font-bold text-sky-800 text-center">Nộp lúc</TableHead>
                  <TableHead className="font-bold text-sky-800 text-center">Trạng thái</TableHead>
                  <TableHead className="font-bold text-sky-800 text-center">Tổng điểm</TableHead>
                  <TableHead className="font-bold text-sky-800 text-right pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Không có dữ liệu</TableCell></TableRow>
                ) : filteredSubmissions.map((sub, idx) => (
                  <TableRow key={sub._id} className="hover:bg-sky-50/30 transition-colors h-16">
                    <TableCell className="pl-6 font-medium text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-700 text-base">{sub.student?.fullName}</TableCell>
                    <TableCell className="text-center text-sm text-slate-500 font-medium">{new Date(sub.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-center">
                      {sub.status === 'pending' ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 shadow-none px-3 py-1 font-bold"><AlertCircle className="w-4 h-4 mr-1.5"/> Chờ chấm</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 shadow-none px-3 py-1 font-bold"><CheckCircle2 className="w-4 h-4 mr-1.5"/> Đã chấm</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-black text-sky-600 text-xl">
                      {sub.status === 'pending' ? '?' : sub.score}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {sub.status === 'pending' ? (
                        isPastDeadline ? (
                          // ĐÃ QUA HẠN: CHO PHÉP CHẤM BÀI
                          <Button onClick={() => goToGradePage(sub)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm h-10 px-5">
                            <Edit3 className="w-4 h-4 mr-2"/> Chấm bài
                          </Button>
                        ) : (
                          // CHƯA QUA HẠN: KHÓA NÚT
                          <Button disabled className="bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold shadow-none h-10 px-4 cursor-not-allowed" title="Chưa hết hạn nộp bài nên chưa thể chấm">
                            <Lock className="w-4 h-4 mr-2"/> Chưa tới hạn
                          </Button>
                        )
                      ) : (
                        // BÀI ĐÃ CHẤM XONG: CHỈ XEM
                        <Button onClick={() => goToGradePage(sub)} variant="outline" className="text-sky-600 border-sky-200 hover:bg-sky-50 rounded-xl font-bold h-10 px-5">
                          <Eye className="w-4 h-4 mr-2"/> Xem bài
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AssignmentGrades;