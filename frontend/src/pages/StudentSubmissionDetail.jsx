import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
    ArrowLeft, Loader2, CheckCircle2, MessageSquareText, 
    AlertCircle, Clock, BookOpen, PenTool, XCircle, Video, FileAudio,
    FileCheck, CalendarDays, FileX 
} from "lucide-react";

import katex from 'katex';
import 'katex/dist/katex.min.css';

// ==========================================
// HÀM DỊCH MÃ LATEX CẬP NHẬT "SIÊU CẤP"
// ==========================================
const renderLatexContent = (htmlString) => {
  if (!htmlString) return "";
  let processedHtml = htmlString;

  // 1. DÀNH RIÊNG CHO ĐÁP ÁN: Tự động dịch nếu là chuỗi Toán học thô (VD: "\frac{1}{5}", "\sqrt3")
  if (!/<[a-z][\s\S]*>/i.test(processedHtml) && (processedHtml.includes('\\') || processedHtml.includes('^') || processedHtml.includes('_'))) {
      try {
          const cleanMath = processedHtml.replace(/\$/g, '').trim();
          return katex.renderToString(`\\displaystyle ${cleanMath}`, { displayMode: false, throwOnError: true });
      } catch (e) {
          // Bỏ qua để xử lý ở bước 4 nếu có chữ xen lẫn
      }
  }

  // 2. Xử lý các thẻ của khung soạn thảo Quill (<span class="ql-formula">)
  if (processedHtml.includes('ql-formula')) {
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(processedHtml, 'text/html');
          const formulas = doc.querySelectorAll('.ql-formula');
          formulas.forEach(formula => {
              const latex = formula.getAttribute('data-value') || formula.textContent;
              if (latex) {
                  try {
                      formula.innerHTML = katex.renderToString(`\\displaystyle ${latex}`, { displayMode: false, throwOnError: false });
                  } catch (e) { console.error("Lỗi render công thức:", e); }
              }
          });
          processedHtml = doc.body.innerHTML;
      } catch (e) { console.error("Lỗi parse DOM:", e); }
  }

  // 3. Xử lý khi được bọc thủ công bằng $$...$$ hoặc $...$
  processedHtml = processedHtml.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });
  processedHtml = processedHtml.replace(/\$([^\$]+)\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });

  // 4. QUÉT SÂU BẮT MÃ THÔ: Quét tìm cụm \frac, \sqrt, x^2... rải rác bên trong text
  if (processedHtml.includes('\\') || processedHtml.includes('^') || processedHtml.includes('_')) {
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(processedHtml, 'text/html');
          
          const walkTextNodes = (node) => {
              if (node.nodeType === 3) { 
                  let text = node.nodeValue;
                  if (node.parentNode && !node.parentNode.closest('.katex')) {
                       const simpleMathRegex = /(\\(?:[a-zA-Z]+)[0-9a-zA-Z\+\-\*\/\^\_\{\}\(\)\.=]*|[a-zA-Z][\^_][0-9a-zA-Z\{\}]+[\+\-\*\/\^\_\{\}\(\)\.=0-9a-zA-Z]*)/g;
                       if (simpleMathRegex.test(text)) {
                          const newHtml = text.replace(simpleMathRegex, (match) => {
                              try { 
                                 return katex.renderToString(`\\displaystyle ${match}`, { displayMode: false, throwOnError: true }); 
                              } catch (e) { return match; }
                          });
                          const span = document.createElement('span');
                          span.innerHTML = newHtml;
                          node.replaceWith(span);
                       }
                  }
              } else if (node.nodeType === 1) { 
                  if (!node.classList.contains('katex') && !node.classList.contains('ql-formula')) {
                      Array.from(node.childNodes).forEach(walkTextNodes);
                  }
              }
          };

          Array.from(doc.body.childNodes).forEach(walkTextNodes);
          processedHtml = doc.body.innerHTML;
      } catch (e) { console.error("DOMParser Error in Raw Math:", e); }
  }
  
  return processedHtml;
};

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

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) return url.replace("watch?v=", "embed/").split("&")[0];
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/").split("?")[0];
    return url;
  };

  const getDriveEmbedUrl = (url) => {
    if (!url) return "";
    let fileId = null;
    if (url.includes("/file/d/")) {
      const matches = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) fileId = matches[1];
    } else if (url.includes("?id=")) {
      const matches = url.match(/\?id=([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) fileId = matches[1];
    }
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    return url;
  };

  const isAudioFile = (url) => {
    if (!url) return false;
    return url.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/) != null;
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

  // 👉 XÁC ĐỊNH LOẠI BÀI VÀ HỌC KỲ
  const isExam = submission.assignment?.assignmentType === 'exam';
  const typeLabel = isExam ? "Đề Thi" : "Bài Tập";
  const semesterLabel = submission.assignment?.semester;

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans pb-24 relative selection:bg-sky-200">
        
        {/* BACKGROUND HEADER */}
        <div className="absolute top-0 left-0 w-full h-[240px] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 z-0">
            <div className="absolute inset-0 bg-white/10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 pt-6 sm:pt-8">
            
            <Button variant="link" onClick={() => navigate(-1)} className="text-white/80 hover:text-white mb-3 -ml-4 text-sm font-bold transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
            </Button>

            {/* ===================================== */}
            {/* CARD THÔNG TIN TỔNG QUAN */}
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
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-4">
                            {submission.assignment?.title || "Bài tập đã bị xóa"}
                        </h1>
                        
                        {/* 👉 BỔ SUNG PHÂN LOẠI & HỌC KỲ VÀO ĐÂY */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-500 font-medium">
                            <Badge className={`px-3 py-1.5 text-xs font-bold border-0 shadow-sm ${isExam ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                                {isExam ? <FileCheck className="w-3.5 h-3.5 mr-1" /> : <BookOpen className="w-3.5 h-3.5 mr-1" />}
                                {typeLabel}
                            </Badge>

                            {semesterLabel && (
                                <Badge variant="outline" className="px-3 py-1.5 text-xs font-bold bg-white text-slate-600 border-slate-200 shadow-sm">
                                    <CalendarDays className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                    {semesterLabel}
                                </Badge>
                            )}

                            <span className="flex items-center bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600">
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
                    if (!q) return null;

                    const isMultipleChoice = q.type === 'multiple_choice';
                    const isCorrectOverall = ans.pointsAwarded === ans.maxPoints;

                    // 👉 GỘP CHUNG LOGIC HIỂN THỊ LỜI GIẢI (CẢ TRẮC NGHIỆM LẪN TỰ LUẬN ĐỀU DÙNG ĐƯỢC)
                    const explanationText = q.explanation || q.essayAnswerText;
                    const explanationImage = q.essayAnswerImageUrl;
                    const hasExplanation = explanationText || explanationImage;

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

                            {/* 👉 Nội dung Đề bài */}
                            <div className="p-5 sm:p-6 space-y-5">
                                <div className="space-y-3">
                                    <div 
                                        className="font-semibold text-slate-800 leading-relaxed text-base q-content-view"
                                        dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }}
                                    />
                                    {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-w-full max-h-64 rounded-xl shadow-sm border border-slate-200 object-contain" alt="Đề bài" />}
                                </div>

                                {/* Video đề bài (nếu có) */}
                                {q?.videoUrl && (
                                  <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex justify-center mb-4">
                                     {(q.videoUrl.includes("youtube.com") || q.videoUrl.includes("youtu.be")) ? (
                                         <div className="h-[250px] sm:h-[350px] w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                             <iframe className="w-full h-full" src={getYoutubeEmbedUrl(q.videoUrl)} allow="autoplay; fullscreen" allowFullScreen></iframe>
                                         </div>
                                     ) : q.videoUrl.includes("drive.google.com") ? (
                                         <div className="flex flex-col items-center w-full">
                                             <div className="h-[200px] sm:h-[300px] w-full max-w-xl rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                                                 <iframe 
                                                    className="w-full h-full relative z-10" 
                                                    src={getDriveEmbedUrl(q.videoUrl)} 
                                                    allow="autoplay; fullscreen; encrypted-media" 
                                                    allowFullScreen
                                                    referrerPolicy="no-referrer"
                                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                 ></iframe>
                                                 <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
                                                     <Video className="w-8 h-8 text-slate-300 mb-2" />
                                                     <p className="text-slate-500 font-medium text-xs">Video đang bị Google Drive chặn.</p>
                                                 </div>
                                             </div>
                                             <a href={q.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition-colors border border-indigo-200 shadow-sm">
                                                <Video className="w-3.5 h-3.5 mr-2" /> Click mở Video sang Tab mới
                                             </a>
                                         </div>
                                     ) : isAudioFile(q.videoUrl) ? (
                                         <div className="w-full max-w-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                            <FileAudio className="w-10 h-10 text-indigo-400 mb-3" />
                                            <audio controls className="w-full rounded-full h-10" src={q.videoUrl} preload="metadata" />
                                         </div>
                                     ) : (
                                         <div className="w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black flex justify-center">
                                            <video controls className="w-full max-h-[350px]" src={q.videoUrl} preload="metadata" playsInline />
                                         </div>
                                     )}
                                  </div>
                                )}

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
                                                    boxClass = "border-emerald-500 bg-emerald-50 shadow-sm"; 
                                                    textClass = "text-emerald-800 font-bold";
                                                    letterBoxClass = "bg-emerald-500 text-white border-transparent";
                                                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>;
                                                } else if (isMyAnswer && !isCorrectAnswer) {
                                                    boxClass = "border-rose-400 bg-rose-50 shadow-sm"; 
                                                    textClass = "text-rose-800 font-bold";
                                                    letterBoxClass = "bg-rose-500 text-white border-transparent";
                                                    icon = <XCircle className="w-5 h-5 text-rose-600 shrink-0"/>;
                                                } else if (!isMyAnswer && isCorrectAnswer) {
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
                                                                dangerouslySetInnerHTML={{ __html: renderLatexContent(opt) }}
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
                                                <div className="text-slate-800 font-medium q-content-view text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatexContent(ans.studentAnswer) }} />
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

                                {/* 👉 HƯỚNG DẪN GIẢI / ĐÁP ÁN CHI TIẾT (TỐI ƯU GIAO DIỆN) */}
                                {submission.status === 'graded' && hasExplanation && (
                                    <div className="mt-6 bg-emerald-50/80 p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600"/>
                                            </div>
                                            <h3 className="font-black text-emerald-800 text-sm uppercase tracking-wider">Hướng dẫn giải / Đáp án</h3>
                                        </div>
                                        
                                        {explanationText && (
                                            <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-100/50 shadow-sm q-content-view">
                                                <div 
                                                    className="text-slate-700 font-medium leading-relaxed text-sm sm:text-base" 
                                                    dangerouslySetInnerHTML={{ __html: renderLatexContent(explanationText) }} 
                                                />
                                            </div>
                                        )}
                                        
                                        {explanationImage && (
                                            <div className="mt-4 text-center">
                                                <img src={getImageUrl(explanationImage)} className="max-h-[350px] mx-auto rounded-xl border border-emerald-200/50 shadow-sm bg-white object-contain p-1.5" alt="Ảnh đáp án" />
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