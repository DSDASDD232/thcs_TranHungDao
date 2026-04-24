import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // 👉 Bổ sung Import Dialog
import { ArrowLeft, Loader2, Trophy, Clock, User, CheckCircle2, FileX, MessageSquareText, Eye, AlertCircle } from "lucide-react"; // 👉 Bổ sung Icon

const ViewGrades = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 👉 STATE cho Modal xem chi tiết
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const serverUrl = axios.defaults.baseURL.replace('/api', '');
  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const token = localStorage.getItem("token");
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

  // 👉 HÀM MỞ MODAL XEM CHI TIẾT (Lấy dữ liệu từ server)
  const openDetailModal = async (submissionId) => {
      try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/submissions/detail/${submissionId}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setSelectedSubmission(res.data);
      } catch (error) {
          alert("Lỗi tải chi tiết bài làm!");
      }
  };

  const averageScore = submissions.length > 0 
    ? (submissions.reduce((acc, sub) => acc + (sub.score || 0), 0) / submissions.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-sky-50/40 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <Button 
          variant="ghost" 
          onClick={() => navigate("/teacher-dashboard")}
          className="text-sky-600 hover:text-sky-700 hover:bg-sky-100 font-bold px-0 mb-2 h-auto"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại Bảng điều khiển
        </Button>

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
                  <TableHead className="font-bold text-slate-500 text-center">Điểm số</TableHead>
                  <TableHead className="font-bold text-slate-500 text-right pr-8">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto" />
                      <p className="text-slate-500 font-medium mt-4">Đang tải bảng điểm...</p>
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <FileX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium italic">Chưa có học sinh nào nộp bài.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub, idx) => (
                    <TableRow key={sub._id} className="hover:bg-sky-50/50 transition-colors border-sky-50">
                      <TableCell className="pl-8 py-4 font-bold text-sky-900">
                        {sub.student?.fullName || "Không xác định"}
                        {sub.status === 'pending' && <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Chờ chấm</Badge>}
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {sub.student?.username || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-sky-100 text-sky-700 border-0 shadow-none font-bold">
                          {sub.student?.classId?.name || "Chưa xếp lớp"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {new Date(sub.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-lg font-black ${
                          sub.status === 'pending' ? 'bg-slate-100 text-slate-400' :
                          sub.score >= 8 ? 'bg-emerald-100 text-emerald-700' : 
                          sub.score >= 5 ? 'bg-amber-100 text-amber-700' : 
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {sub.status === 'pending' ? '?' : sub.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                          {/* 👉 Nút Xem bài làm */}
                          <Button variant="outline" size="sm" onClick={() => openDetailModal(sub._id)} className="border-sky-200 text-sky-700 hover:bg-sky-100 font-bold rounded-lg shadow-sm">
                              <Eye className="w-4 h-4 mr-2" /> Xem bài
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 👉 MODAL XEM CHI TIẾT BÀI LÀM VÀ LỜI PHÊ */}
        <Dialog open={!!selectedSubmission} onOpenChange={(val) => {if(!val) setSelectedSubmission(null)}}>
            <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none p-0 bg-slate-50">
                {selectedSubmission && (
                    <div className="pb-10">
                        {/* Header Modal */}
                        <div className="bg-sky-500 text-white p-6 sm:p-8 sticky top-0 z-10 shadow-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">
                                    Bài làm: {selectedSubmission.assignment?.title}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                                    <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Điểm số</span>
                                    <p className="text-3xl font-black">{selectedSubmission.score} <span className="text-lg font-bold opacity-70">/ 10</span></p>
                                </div>
                                <Badge className="bg-white text-sky-600 font-bold px-4 py-2 shadow-sm text-sm">
                                    {selectedSubmission.status === 'graded' ? 'Đã chấm xong' : 'Đang chờ chấm'}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 space-y-6">
                            
                            {/* HIỂN THỊ LỜI PHÊ CỦA GIÁO VIÊN NẾU CÓ */}
                            {selectedSubmission.feedback && (
                                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-amber-400">
                                    <h3 className="font-black text-amber-700 flex items-center gap-2 mb-2">
                                        <MessageSquareText className="w-5 h-5" /> Nhận xét của Giáo viên
                                    </h3>
                                    <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                                        {selectedSubmission.feedback}
                                    </p>
                                </div>
                            )}

                            {/* DANH SÁCH CÂU HỎI VÀ ĐÁP ÁN */}
                            {selectedSubmission.answers.map((ans, idx) => {
                                const q = ans.question;
                                const isMultipleChoice = q.type === 'multiple_choice';

                                return (
                                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                                            <div className="font-black text-slate-800 text-lg">Câu {idx + 1}</div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">Max: {ans.maxPoints} đ</Badge>
                                                <Badge className={ans.pointsAwarded > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                                                    Đạt: {ans.pointsAwarded} đ
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <p className="font-medium text-slate-800 leading-relaxed">{q.content}</p>
                                            {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-h-48 rounded-xl shadow-sm" alt="Đề bài" />}
                                        </div>

                                        {/* HIỂN THỊ BÀI LÀM TRẮC NGHIỆM */}
                                        {isMultipleChoice && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl">
                                                {(() => {
                                                    let options = [];
                                                    try { options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch(e){}
                                                    return options.map((opt, oIdx) => {
                                                        const letter = String.fromCharCode(65 + oIdx);
                                                        const isMyAnswer = ans.studentAnswer === letter;
                                                        const isCorrectAnswer = q.correctAnswer === letter;
                                                        
                                                        let boxClass = "border-slate-200 bg-white";
                                                        let textClass = "text-slate-600";
                                                        
                                                        if (isMyAnswer && isCorrectAnswer) {
                                                            boxClass = "border-emerald-500 bg-emerald-50"; textClass = "text-emerald-700 font-bold";
                                                        } else if (isMyAnswer && !isCorrectAnswer) {
                                                            boxClass = "border-rose-500 bg-rose-50"; textClass = "text-rose-700 font-bold";
                                                        } else if (isCorrectAnswer) {
                                                            boxClass = "border-emerald-300 bg-emerald-50 opacity-60"; textClass = "text-emerald-700 font-bold";
                                                        }

                                                        return (
                                                            <div key={oIdx} className={`p-3 border-2 rounded-xl flex items-center gap-3 ${boxClass}`}>
                                                                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${isMyAnswer ? (isCorrectAnswer ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-200 text-slate-500'}`}>
                                                                    {letter}
                                                                </div>
                                                                <span className={textClass}>{opt}</span>
                                                                {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}
                                                                {isMyAnswer && !isCorrectAnswer && <AlertCircle className="w-5 h-5 text-rose-500 ml-auto shrink-0"/>}
                                                            </div>
                                                        )
                                                    })
                                                })()}
                                            </div>
                                        )}

                                        {/* HIỂN THỊ BÀI LÀM TỰ LUẬN */}
                                        {!isMultipleChoice && (
                                            <div className="space-y-4">
                                                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                                                    <span className="text-xs font-black text-sky-700 uppercase mb-2 block">Bài làm học sinh:</span>
                                                    {ans.studentAnswer ? (
                                                        <p className="whitespace-pre-wrap text-slate-800 font-medium">{ans.studentAnswer}</p>
                                                    ) : (
                                                        <p className="text-slate-400 italic text-sm">Không gõ nội dung</p>
                                                    )}
                                                    {ans.studentImage && (
                                                        <img src={getImageUrl(ans.studentImage)} className="max-h-64 mt-3 rounded-xl border border-slate-200 shadow-sm" alt="Ảnh bài làm" />
                                                    )}
                                                </div>

                                                {/* HIỂN THỊ ĐÁP ÁN ĐÚNG CỦA GV (NẾU ĐÃ CHẤM) */}
                                                {selectedSubmission.status === 'graded' && (q.essayAnswerText || q.essayAnswerImageUrl) && (
                                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                                        <span className="text-xs font-black text-emerald-700 uppercase mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Đáp án / Hướng dẫn giải:</span>
                                                        {q.essayAnswerText && <p className="whitespace-pre-wrap text-emerald-900 font-medium">{q.essayAnswerText}</p>}
                                                        {q.essayAnswerImageUrl && <img src={getImageUrl(q.essayAnswerImageUrl)} className="max-h-64 mt-3 rounded-xl border border-emerald-200 shadow-sm" alt="Ảnh đáp án" />}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                )
                            })}

                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default ViewGrades;