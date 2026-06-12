import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, Loader2, Search, Edit3, Eye, CheckCircle2, AlertCircle, Clock, Lock, FileText, CalendarDays, Users, Tag, Hourglass, Image as ImageIcon
} from "lucide-react";

import katex from 'katex';
import 'katex/dist/katex.min.css';

// ==========================================
// HÀM DỊCH MÃ LATEX ĐỂ HIỂN THỊ CÔNG THỨC TOÁN
// ==========================================
const renderLatexContent = (htmlString) => {
  if (!htmlString) return "";
  const decodeHtmlEntities = (text) => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = text;
    let decoded = textArea.value;
    decoded = decoded.replace(/<[^>]*>?/gm, ''); 
    decoded = decoded.replace(/\\\\/g, '\\'); 
    return decoded;
  };
  let parsedHtml = htmlString;
  const renderMath = (math) => {
      try {
        const cleanMath = decodeHtmlEntities(math);
        return katex.renderToString(`\\displaystyle ${cleanMath}`, { displayMode: false, throwOnError: false, output: "html" });
      } catch(e) { return math; }
  };
  parsedHtml = parsedHtml.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => renderMath(math));
  parsedHtml = parsedHtml.replace(/\$([^\$]+)\$/g, (match, math) => renderMath(math));
  parsedHtml = parsedHtml.replace(/\\frac{[^{}]+}{[^{}]+}/g, (match) => renderMath(match));
  parsedHtml = parsedHtml.replace(/\\sqrt{[^{}]+}/g, (match) => renderMath(match));
  return parsedHtml;
};

// ==========================================
// HÀM XỬ LÝ NGÀY THÁNG AN TOÀN (CHỐNG LỖI INVALID DATE)
// ==========================================
const formatSafeDate = (dateString, fallbackString = "Không giới hạn") => {
    if (!dateString) return fallbackString;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return fallbackString;
    return d.toLocaleString('vi-VN');
};

const AssignmentGrades = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/');
      if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
      return `${serverUrl}${cleanUrl}`;
  };

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

  const goToGradePage = (sub) => {
    navigate(`/teacher/grade/${sub._id}`, { 
      state: { submission: sub, assignment: assignment } 
    });
  };

  if (loading) return <div className="min-h-screen bg-sky-50/50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /></div>;

  const isPastDeadline = assignment?.dueDate ? new Date() >= new Date(assignment.dueDate) : true;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER QUAY LẠI VÀ XEM CHI TIẾT */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => navigate("/teacher-dashboard")} className="bg-white shadow-sm rounded-xl text-sky-700 hover:bg-sky-50 h-12 px-4 font-bold mt-1 shrink-0">
              <ArrowLeft className="w-5 h-5 mr-2" /> Trở về
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-sky-950">{assignment?.title}</h1>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsDetailModalOpen(true)}
                  className="h-8 border-sky-200 text-sky-600 hover:bg-sky-100 hover:text-sky-700 rounded-lg shadow-sm font-bold"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Chi tiết đề
                </Button>
              </div>
              <p className="text-slate-500 font-medium mt-1">Sĩ số nộp: {submissions.length}</p>
            </div>
          </div>
        </div>

        {/* CẢNH BÁO NẾU CHƯA TỚI HẠN NỘP */}
        {!isPastDeadline && (
          <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
             <Clock className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
             <div>
                <h4 className="font-bold text-amber-800 text-lg">Chưa đến thời gian chấm bài!</h4>
                <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                  Hạn nộp bài là <strong>{formatSafeDate(assignment.dueDate)}</strong>. Để đảm bảo công bằng và tránh thất thoát điểm khi học sinh nộp lại bài, hệ thống đã tạm khóa chức năng chấm tự luận. Bạn có thể chấm bài ngay khi hết hạn nộp.
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
                    <TableCell className="text-center text-sm text-slate-500 font-medium">{formatSafeDate(sub.createdAt)}</TableCell>
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
                          <Button onClick={() => goToGradePage(sub)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm h-10 px-5">
                            <Edit3 className="w-4 h-4 mr-2"/> Chấm bài
                          </Button>
                        ) : (
                          <Button disabled className="bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold shadow-none h-10 px-4 cursor-not-allowed" title="Chưa hết hạn nộp bài nên chưa thể chấm">
                            <Lock className="w-4 h-4 mr-2"/> Chưa tới hạn
                          </Button>
                        )
                      ) : (
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

        {/* ==================================================== */}
        {/* 👉 MODAL XEM CHI TIẾT BÀI TẬP VỚI GIAO DIỆN FULL NỘI DUNG */}
        {/* ==================================================== */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none bg-slate-50 shadow-2xl">
            <DialogHeader className="bg-sky-500 text-white p-6 sm:p-8 rounded-t-[2rem] sticky top-0 z-20 shadow-md flex flex-row items-start justify-between">
              <div>
                 <DialogTitle className="text-xl sm:text-2xl font-black leading-tight pr-4">{assignment?.title}</DialogTitle>
                 <p className="text-sky-100 font-medium text-sm mt-1.5 flex items-center gap-1.5">
                    {assignment?.assignmentType === 'exam' ? 'Đề kiểm tra' : 'Bài tập về nhà'}
                 </p>
              </div>
            </DialogHeader>

            {assignment && (
              <div className="p-6 space-y-6">
                
                {/* THÔNG TIN CHUNG */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <Users className="w-5 h-5 text-sky-500 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Giao cho lớp</span>
                      <span className="font-black text-slate-700 text-sm mt-0.5">{assignment.targetClass}</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <Tag className="w-5 h-5 text-indigo-500 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Môn học</span>
                      <span className="font-black text-slate-700 text-sm mt-0.5">{assignment.subject}</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <Hourglass className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Thời gian</span>
                      <span className="font-black text-slate-700 text-sm mt-0.5">{assignment.duration} Phút</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                      <FileText className="w-5 h-5 text-emerald-500 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Tổng số câu</span>
                      <span className="font-black text-slate-700 text-sm mt-0.5">{assignment.questions?.length || 0} Câu</span>
                   </div>
                </div>

                {/* KHUNG THỜI GIAN */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-sm">
                   <div className="flex-1 flex gap-3 items-center pt-2 sm:pt-0">
                      <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                         <CalendarDays className="w-5 h-5 text-sky-500" />
                      </div>
                      <div>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thời gian mở đề</p>
                         <p className="font-bold text-slate-700 text-sm">{formatSafeDate(assignment.startDate, formatSafeDate(assignment.createdAt))}</p>
                      </div>
                   </div>
                   <div className="flex-1 flex gap-3 items-center pt-4 sm:pt-0 sm:pl-4">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                         <Clock className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hạn chót nộp bài</p>
                         <p className="font-bold text-rose-600 text-sm">{formatSafeDate(assignment.dueDate)}</p>
                      </div>
                   </div>
                </div>

                {/* DANH SÁCH CHI TIẾT CÂU HỎI BÊN TRONG BÀI TẬP */}
                <div className="space-y-4 pt-2">
                   <h3 className="font-black text-slate-800 text-lg border-b border-slate-200 pb-2">Nội dung đề chi tiết ({assignment.questions?.length || 0} câu)</h3>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pb-4">
                     {assignment.questions?.map((item, idx) => {
                       const q = item.questionId;
                       // Nếu backend không trả về full dữ liệu questionId (chưa populate)
                       if(!q || typeof q === 'string') {
                           return (
                             <div key={idx} className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
                                <span className="font-bold text-rose-700">Câu {idx + 1}: Lỗi tải nội dung. (Hãy kiểm tra lại Backend hàm GET assignment xem đã populate('questions.questionId') chưa nhé!)</span>
                             </div>
                           );
                       }

                       let parsedOpts = [];
                       try { parsedOpts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch(e) {}

                       return (
                         <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                           <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                              <span className="font-bold text-sky-700 whitespace-nowrap bg-sky-50 px-3 py-1 rounded-lg text-sm">Câu {idx + 1}</span>
                              <Badge variant="outline" className="text-xs text-slate-500 font-bold bg-slate-50">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'} • {item.points}đ</Badge>
                           </div>
                           
                           {/* Nội dung chữ */}
                           <div className="text-slate-800 font-medium text-[15px] leading-relaxed q-content-view whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }} />
                           
                           {/* Hình ảnh nếu có */}
                           {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-w-full max-h-64 mt-2 rounded-xl border border-slate-200 shadow-sm object-contain" alt="Minh họa đề bài" />}
                           
                           {/* Danh sách đáp án Trắc nghiệm */}
                           {q.type === 'multiple_choice' && parsedOpts.length > 0 && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                {parsedOpts.map((opt, oIdx) => {
                                   const letter = String.fromCharCode(65 + oIdx);
                                   const isCorrect = q.correctAnswer === letter || q.correctAnswer === opt;
                                   return (
                                     <div key={oIdx} className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 text-xs ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>{letter}</div>
                                        <span className={`text-sm font-medium q-content-view break-words ${isCorrect ? 'text-emerald-800 font-bold' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: renderLatexContent(opt) }} />
                                     </div>
                                   )
                                })}
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <Button onClick={() => setIsDetailModalOpen(false)} className="bg-slate-800 text-white rounded-xl h-11 px-8 font-bold hover:bg-slate-700">Đóng cửa sổ</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AssignmentGrades;