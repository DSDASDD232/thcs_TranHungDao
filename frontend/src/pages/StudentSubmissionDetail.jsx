import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
    ArrowLeft, Loader2, CheckCircle2, MessageSquareText, 
    AlertCircle, Clock, BookOpen, PenTool, XCircle
} from "lucide-react"; 

const StudentSubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';
  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  const formatDateVN = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear(); 
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins} - ${day}/${month}/${year}`;
  };

  useEffect(() => {
    const fetchSubmissionDetail = async () => {
      try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/submissions/detail/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setSubmission(res.data);
      } catch (error) {
          alert("Lỗi tải chi tiết bài làm!");
          navigate(-1);
      } finally {
          setLoading(false);
      }
    };
    fetchSubmissionDetail();
  }, [id, navigate]);

  if (loading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold text-sm">Đang tải dữ liệu bài làm...</p>
        </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans pb-24 relative selection:bg-sky-200">
        
        {/* ===================================== */}
        {/* BACKGROUND HEADER (ĐÃ THU GỌN CHIỀU CAO) */}
        {/* ===================================== */}
        <div className="absolute top-0 left-0 w-full h-[240px] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 z-0">
            <div className="absolute inset-0 bg-white/10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>

        {/* ĐÃ THU GỌN MAX-WIDTH CÒN max-w-4xl */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 pt-6 sm:pt-8">
            
            <Button variant="link" onClick={() => navigate(-1)} className="text-white/80 hover:text-white mb-3 -ml-4 text-sm font-bold transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
            </Button>

            {/* ===================================== */}
            {/* CARD THÔNG TIN TỔNG QUAN BO TRÒN VỪA PHẢI */}
            {/* ===================================== */}
            <Card className="rounded-3xl border-0 shadow-lg shadow-blue-900/10 bg-white/95 backdrop-blur-xl mb-8 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Phần thông tin bài tập */}
                    <div className="flex-1 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center text-sky-600">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sky-600 tracking-wide uppercase text-xs">Kết quả làm bài</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-3">
                            {submission.assignment?.title || "Bài tập đã bị xóa"}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
                            <span className="flex items-center bg-slate-100 px-3 py-1 rounded-md text-xs font-bold">
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> Nộp lúc: {formatDateVN(submission.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Phần Điểm số */}
                    <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-50/50 min-w-[240px]">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Điểm số của bạn</p>
                        <div className="flex items-end justify-center mb-3">
                            <span className={`text-5xl sm:text-6xl font-black leading-none tracking-tighter ${submission.status === 'pending' ? 'text-slate-300' : 'text-sky-600'}`}>
                                {submission.status === 'pending' ? '?' : submission.score}
                            </span>
                            <span className="text-xl sm:text-2xl font-bold text-slate-400 ml-1 mb-1">/ 10</span>
                        </div>
                        <Badge className={`px-4 py-1.5 text-xs font-bold shadow-sm border-0 rounded-lg ${submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {submission.status === 'graded' ? 'Đã chấm xong' : 'Đang chờ GV chấm'}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Lời phê của giáo viên */}
            {submission.feedback && (
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-amber-200 border-l-4 border-l-amber-400 mb-6 relative overflow-hidden">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                            <MessageSquareText className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-amber-800 text-base mb-1.5">Giáo viên nhận xét</h3>
                            <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed text-sm italic">
                                "{submission.feedback}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================== */}
            {/* DANH SÁCH CÂU HỎI VÀ ĐÁP ÁN CHI TIẾT */}
            {/* ===================================== */}
            <div className="space-y-5 sm:space-y-6">
                {submission.answers.map((ans, idx) => {
                    const q = ans.question;
                    const isMultipleChoice = q.type === 'multiple_choice';
                    const isCorrectOverall = ans.pointsAwarded === ans.maxPoints;

                    return (
                        <div key={idx} className={`bg-white border shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${isCorrectOverall ? 'border-slate-200' : 'border-slate-200'}`}>
                            
                            {/* Header Câu hỏi */}
                            <div className={`px-5 py-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-100 bg-slate-50/50`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-sky-100 text-sky-700 font-black text-sm px-3 py-1 rounded-md shadow-sm">
                                        Câu {idx + 1}
                                    </div>
                                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold bg-white text-[11px] shadow-sm">
                                        {isMultipleChoice ? 'Trắc nghiệm' : 'Tự luận'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="text-slate-500 font-bold text-xs">Điểm:</span>
                                    <span className={`font-black text-sm ${ans.pointsAwarded > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{ans.pointsAwarded}</span>
                                    <span className="text-slate-400 font-bold text-xs">/ {ans.maxPoints}</span>
                                </div>
                            </div>

                            {/* Nội dung Đề bài */}
                            <div className="p-5 sm:p-6 space-y-5">
                                <div className="space-y-3">
                                    <div 
                                        className="font-semibold text-slate-800 leading-relaxed text-base q-content-view"
                                        dangerouslySetInnerHTML={{ __html: q.content }}
                                    />
                                    {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-w-full max-h-64 rounded-xl shadow-sm border border-slate-200 object-contain" alt="Đề bài" />}
                                </div>

                                {/* BÀI LÀM: TRẮC NGHIỆM */}
                                {isMultipleChoice && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                        {(() => {
                                            let options = [];
                                            try { options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch(e){}
                                            
                                            let correctKey = q.correctAnswer ? q.correctAnswer.toString().trim() : '';
                                            if (correctKey.toLowerCase().startsWith("câu ")) {
                                                correctKey = correctKey.split(" ")[1]; 
                                            }

                                            return options.map((opt, oIdx) => {
                                                const letter = String.fromCharCode(65 + oIdx);
                                                const isMyAnswer = ans.studentAnswer === letter || ans.studentAnswer === opt;
                                                const isCorrectAnswer = correctKey === letter || correctKey === opt;
                                                
                                                let boxClass = "border-slate-200 bg-white hover:border-slate-300";
                                                let textClass = "text-slate-600";
                                                let letterBoxClass = "bg-slate-50 text-slate-400 border border-slate-200";
                                                let icon = null;
                                                let badge = null;
                                                
                                                if (isMyAnswer && isCorrectAnswer) {
                                                    // Chọn đúng
                                                    boxClass = "border-emerald-500 bg-emerald-50 shadow-sm"; 
                                                    textClass = "text-emerald-800 font-bold";
                                                    letterBoxClass = "bg-emerald-500 text-white border-transparent";
                                                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>;
                                                } else if (isMyAnswer && !isCorrectAnswer) {
                                                    // Chọn sai
                                                    boxClass = "border-rose-400 bg-rose-50 shadow-sm"; 
                                                    textClass = "text-rose-800 font-bold";
                                                    letterBoxClass = "bg-rose-500 text-white border-transparent";
                                                    icon = <XCircle className="w-5 h-5 text-rose-600 shrink-0"/>;
                                                } else if (!isMyAnswer && isCorrectAnswer) {
                                                    // Đáp án đúng mà hs không chọn
                                                    boxClass = "border-emerald-500 border-dashed bg-emerald-50/50"; 
                                                    textClass = "text-emerald-700 font-bold";
                                                    letterBoxClass = "bg-emerald-100 text-emerald-600 border-emerald-200";
                                                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0"/>;
                                                    badge = <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-500 shadow-sm text-[10px] uppercase font-bold tracking-wide">Đáp án đúng</Badge>;
                                                }

                                                return (
                                                    <div key={oIdx} className={`p-3 sm:p-4 border-2 rounded-xl flex items-center justify-between gap-3 transition-all ${boxClass}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-black shrink-0 ${letterBoxClass}`}>
                                                                {letter}
                                                            </div>
                                                            <div 
                                                                className={`text-sm sm:text-base ${textClass} q-content-view leading-snug`}
                                                                dangerouslySetInnerHTML={{ __html: opt }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                            {badge}
                                                            {icon}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                )}

                                {/* BÀI LÀM: TỰ LUẬN */}
                                {!isMultipleChoice && (
                                    <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 mt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PenTool className="w-4 h-4 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Bài làm của em</span>
                                        </div>
                                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm min-h-[80px]">
                                            {ans.studentAnswer ? (
                                                <div className="text-slate-800 font-medium q-content-view text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: ans.studentAnswer }} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full opacity-60 py-3">
                                                    <FileX className="w-8 h-8 mb-1 text-slate-400" />
                                                    <p className="text-slate-500 italic text-xs font-bold">Không gõ nội dung</p>
                                                </div>
                                            )}
                                        </div>
                                        {ans.studentImage && (
                                            <div className="mt-3 text-center">
                                                <img src={getImageUrl(ans.studentImage)} className="max-h-[300px] mx-auto rounded-xl border border-slate-200 shadow-sm bg-white object-contain" alt="Ảnh bài làm" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* HƯỚNG DẪN GIẢI */}
                                {submission.status === 'graded' && (q.essayAnswerText || q.essayAnswerImageUrl) && (
                                    <div className="mt-6 bg-emerald-50/50 p-4 sm:p-5 rounded-xl border border-emerald-100 relative overflow-hidden">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                                            <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wide">Hướng dẫn giải</h3>
                                        </div>
                                        
                                        {q.essayAnswerText && (
                                            <div className="bg-white p-4 rounded-xl border border-emerald-50 shadow-sm q-content-view">
                                                <div 
                                                    className="text-emerald-950 font-medium leading-relaxed text-sm sm:text-base" 
                                                    dangerouslySetInnerHTML={{ __html: q.essayAnswerText }} 
                                                />
                                            </div>
                                        )}
                                        
                                        {q.essayAnswerImageUrl && (
                                            <div className="mt-3 text-center">
                                                <img src={getImageUrl(q.essayAnswerImageUrl)} className="max-h-[300px] mx-auto rounded-xl border border-emerald-100 shadow-sm bg-white object-contain" alt="Ảnh đáp án" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            
        </div>
    </div>
  );
};

export default StudentSubmissionDetail;