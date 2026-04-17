import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; 
import { 
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, 
  Loader2, Image as ImageIcon, LayoutGrid, X, Trash2, Clock4, 
  GalleryVerticalEnd, SquareMousePointer, Map, Sparkles
} from "lucide-react"; 

const TakeQuiz = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState("single"); 
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); 
  const [currentPage, setCurrentPage] = useState(0); 
  const questionsPerPage = 10;
  
  const [answers, setAnswers] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/assignments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.questions) {
          setAssignment(res.data);
          
          const initialAnswers = {};
          res.data.questions.forEach(item => {
            const qId = item.questionId._id || item.questionId;
            initialAnswers[qId] = { text: "", imageFile: null, previewUrl: "" };
          });

          // 👉 SỬA LOGIC TÍNH GIỜ: Cân nhắc cả thời lượng bài thi và Hạn chót
          let initialTimeLeft = res.data.duration ? res.data.duration * 60 : 2700;
          const now = new Date().getTime();
          
          if (res.data.dueDate) {
              const dueTime = new Date(res.data.dueDate).getTime();
              const timeUntilDueInSeconds = Math.floor((dueTime - now) / 1000);
              
              // Nếu quá hạn thì đóng luôn không cho làm
              if (timeUntilDueInSeconds <= 0) {
                  alert("Bài tập này đã quá hạn nộp!");
                  return navigate("/student-dashboard");
              }
              
              // Lấy thời gian nhỏ hơn giữa (Thời gian làm bài gốc) và (Thời gian còn lại đến hạn chót)
              initialTimeLeft = Math.min(initialTimeLeft, timeUntilDueInSeconds);
          }

          // Kiểm tra xem đã có lịch sử làm bài trước đó lưu ở LocalStorage chưa
          const savedProgress = localStorage.getItem(`quiz_progress_${id}`);
          if (savedProgress) {
              try {
                  const parsedProgress = JSON.parse(savedProgress);
                  // Nếu thời gian lưu trong máy < thời gian tính toán ở trên thì lấy theo máy (trừ lùi tiếp)
                  if (parsedProgress.timeLeft && parsedProgress.timeLeft < initialTimeLeft) {
                      initialTimeLeft = parsedProgress.timeLeft;
                  }

                  if (parsedProgress.answers) {
                      Object.keys(parsedProgress.answers).forEach(qId => {
                          if (initialAnswers[qId]) {
                              initialAnswers[qId].text = parsedProgress.answers[qId].text || "";
                          }
                      });
                  }
              } catch(e) {
                  console.error("Lỗi parse lịch sử làm bài", e);
              }
          }

          setTimeLeft(initialTimeLeft);
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error("Lỗi lấy bài tập:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [id, navigate]);

  useEffect(() => {
    if (loading || !assignment || result) return;
    
    // Nếu hết giờ -> Tự động nộp bài
    if (timeLeft <= 0) {
      handleSubmit(); 
      return;
    }

    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);

    const textAnswersOnly = {};
    Object.keys(answers).forEach(qId => {
        textAnswersOnly[qId] = { text: answers[qId].text };
    });
    localStorage.setItem(`quiz_progress_${id}`, JSON.stringify({
        timeLeft: timeLeft,
        answers: textAnswersOnly
    }));

    return () => clearInterval(timer);
  }, [timeLeft, answers, result, loading, assignment, id]);

  const handleAnswerChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], text: value } }));
  };

  const handleImageUpload = (qId, e) => {
    const file = e.target.files[0];
    if (file) {
      setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], imageFile: file, previewUrl: URL.createObjectURL(file) } }));
    }
  };

  const handleRemoveImage = (qId) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], imageFile: null, previewUrl: "" } }));
  };

  const handleSubmit = async () => {
    if (!assignment || isSubmitting) return;
    
    const answeredCount = Object.values(answers).filter(a => a.text.trim() !== "" || a.imageFile !== null).length;
    if (!result && timeLeft > 0 && answeredCount < assignment.questions.length) {
       if (!window.confirm(`Em mới làm được ${answeredCount}/${assignment.questions.length} câu. Em có chắc chắn muốn nộp bài sớm không?`)) return;
    } else if (!result && timeLeft > 0) {
       if (!window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("assignmentId", id);

      const formattedAnswers = Object.keys(answers).map(qId => ({
        question: qId,
        studentAnswer: answers[qId].text || ""
      }));
      formData.append("studentAnswers", JSON.stringify(formattedAnswers));

      Object.keys(answers).forEach(qId => {
        if (answers[qId].imageFile) formData.append(`image_${qId}`, answers[qId].imageFile);
      });

      const token = localStorage.getItem("token");
      const res = await axios.post("/submissions/submit", formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      
      setResult(res.data);
      localStorage.removeItem(`quiz_progress_${id}`);

    } catch (err) {
      alert(err.response?.data?.message || "Lỗi nộp bài!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapClick = (idx) => {
    if (viewMode === "single") {
        setCurrentQuestionIdx(idx);
    } else {
        const targetPage = Math.floor(idx / questionsPerPage);
        setCurrentPage(targetPage);
        setTimeout(() => {
            const el = document.getElementById(`question-card-${idx}`);
            if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 150);
    }
    setIsMobileMapOpen(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
      <Loader2 className="h-12 w-12 text-sky-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-sky-900">Đang tải đề thi...</h2>
    </div>
  );

  if (!assignment || !assignment.questions || assignment.questions.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-4 text-center">
      <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-slate-800">Đề thi này chưa có câu hỏi!</h2>
      <Button onClick={() => navigate("/student-dashboard")} className="mt-6 bg-sky-500 hover:bg-sky-600 rounded-xl h-12 px-8 font-bold shadow-md text-white">Quay lại Trang chủ</Button>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-sky-50/50 flex items-center justify-center p-4 font-sans text-center">
      <Card className="max-w-md w-full p-8 sm:p-10 rounded-3xl shadow-2xl border-none bg-white">
        {result.status === 'pending' ? (
          <><Clock4 className="w-20 h-20 sm:w-24 sm:h-24 text-amber-500 mx-auto mb-6 animate-pulse" /><h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">Đã nộp thành công!</h2><p className="text-slate-500 font-medium mb-6 leading-relaxed">Bài làm của em có phần Tự luận. Vui lòng chờ giáo viên chấm điểm nhé.</p></>
        ) : (
          <><CheckCircle2 className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-500 mx-auto mb-6" /><h2 className="text-2xl sm:text-3xl font-black text-slate-800">Kết quả thi</h2><div className="my-6 sm:my-8 bg-emerald-50 py-6 sm:py-8 rounded-3xl border border-emerald-100 shadow-inner"><span className="text-6xl sm:text-7xl font-black text-emerald-600">{result.score}</span><p className="font-bold text-emerald-500 mt-2 uppercase tracking-widest text-xs sm:text-sm">Điểm số</p></div></>
        )}
        <Button onClick={() => navigate("/student-dashboard")} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-base sm:text-lg shadow-lg shadow-sky-200 transition-all">Về trang chủ</Button>
      </Card>
    </div>
  );

  const answeredCount = Object.values(answers).filter(a => a.text.trim() !== "" || a.imageFile !== null).length;
  const progressPercent = (answeredCount / assignment.questions.length) * 100;

  const totalPages = Math.ceil(assignment.questions.length / questionsPerPage);
  const currentQuestionsMultiple = assignment.questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

  const renderQuestionCard = (item, idx) => {
    const q = item.questionId;
    const qId = q._id;
    const currentAnswer = answers[qId] || { text: "", imageFile: null, previewUrl: "" };
    
    let parsedOptions = [];
    try { parsedOptions = typeof q?.options === 'string' ? JSON.parse(q.options) : (q?.options || []); } catch (e) { parsedOptions = []; }

    const finalOptions = parsedOptions.slice(0, 4);

    return (
      <Card key={qId} id={`question-card-${idx}`} className="rounded-3xl shadow-sm border border-sky-100/60 overflow-hidden bg-white mb-8 hover:shadow-md transition-shadow">
        <CardHeader className="bg-sky-50/30 border-b border-sky-50/80 p-5 sm:p-7 flex flex-row justify-between items-start">
          <div>
              <Badge className="mb-3 bg-sky-100 text-sky-700 font-black border-0 px-3 sm:px-4 py-1.5 text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                Câu {idx + 1}
              </Badge>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {q?.content}
              </CardTitle>
          </div>
          <Badge variant="outline" className="text-slate-500 bg-white border-slate-200 font-bold text-sm shrink-0 whitespace-nowrap ml-4 shadow-sm">
              {item.points} Điểm
          </Badge>
        </CardHeader>
        
        {q?.imageUrl && (
          <div className="w-full bg-slate-50/50 border-b border-slate-100 p-4">
            <img src={getImageUrl(q.imageUrl)} alt="Hình minh họa" className="w-auto max-h-[300px] object-contain mx-auto rounded-xl border border-slate-200 shadow-sm bg-white" />
          </div>
        )}

        <CardContent className="p-5 sm:p-8 bg-white">
          {q.type === "multiple_choice" ? (
              <RadioGroup value={currentAnswer.text} onValueChange={(val) => handleAnswerChange(qId, val)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {finalOptions.map((opt, oIdx) => {
                  if (!opt || opt.trim() === "") return null; 
                  const optLabel = String.fromCharCode(65 + oIdx); 
                  const isSelected = currentAnswer.text === optLabel;
                  return (
                    <div 
                      key={oIdx} 
                      onClick={() => {
                         if (isSelected) handleAnswerChange(qId, "");
                         else handleAnswerChange(qId, optLabel);
                      }} 
                      className={`flex items-center space-x-3 p-4 rounded-2xl transition-all cursor-pointer border-2 ${isSelected ? 'border-sky-500 bg-sky-50 shadow-md scale-[1.02]' : 'border-slate-100 hover:border-sky-300 bg-white hover:bg-sky-50/50 shadow-sm'}`}
                    >
                      <RadioGroupItem value={optLabel} id={`q${qId}-opt-${oIdx}`} className={`w-6 h-6 transition-all shrink-0 ${isSelected ? 'border-sky-600 border-[6px]' : 'border-slate-300 border-2'}`} />
                      <Label htmlFor={`q${qId}-opt-${oIdx}`} className="flex-1 text-base cursor-pointer flex items-center gap-3 font-medium text-slate-700 leading-relaxed">
                        <span className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-colors ${isSelected ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {optLabel}
                        </span> 
                        <span className={isSelected ? 'text-sky-950 font-bold' : 'text-slate-600'}>{opt}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
          ) : (
              <div className="space-y-4">
                <Textarea 
                  placeholder="Gõ câu trả lời của em vào đây..." 
                  className="min-h-[160px] rounded-2xl bg-slate-50/50 border-slate-200 text-base font-medium focus-visible:ring-sky-500 p-5 shadow-inner transition-colors focus:bg-white"
                  value={currentAnswer.text}
                  onChange={(e) => handleAnswerChange(qId, e.target.value)}
                />
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {currentAnswer.previewUrl ? (
                      <div className="relative w-48 h-32 rounded-xl border-2 border-sky-200 overflow-hidden shadow-md group">
                        <img src={currentAnswer.previewUrl} alt="Bài làm" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button type="button" onClick={() => handleRemoveImage(qId)} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full"><Trash2 className="w-4 h-4 mr-2"/> Xóa ảnh</Button>
                        </div>
                      </div>
                  ) : (
                      <label className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 text-sky-700 cursor-pointer hover:bg-sky-100 hover:border-sky-500 transition-all font-bold w-full sm:w-max">
                        <ImageIcon className="w-5 h-5" /> Đính kèm ảnh (Tùy chọn)
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(qId, e)} />
                      </label>
                  )}
                </div>
              </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col font-sans relative">
      
      {isMobileMapOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsMobileMapOpen(false)} />}

      <header className="bg-gradient-to-r from-sky-50/80 via-white to-sky-50/80 backdrop-blur-md border-b border-sky-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <h1 className="font-extrabold text-base sm:text-lg text-sky-900 truncate flex-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500 hidden sm:block" /> {assignment?.title}
          </h1>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex bg-white p-1 rounded-xl border border-sky-100 shadow-sm">
               <button onClick={() => setViewMode("single")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${viewMode === 'single' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'}`}>
                  <SquareMousePointer className="w-4 h-4"/> 1 Câu
               </button>
               <button onClick={() => setViewMode("multiple")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${viewMode === 'multiple' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'}`}>
                  <GalleryVerticalEnd className="w-4 h-4"/> 10 Câu
               </button>
            </div>

            <div className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-sm sm:text-lg border-2 shadow-sm bg-white ${timeLeft < 60 ? 'border-rose-200 text-rose-600 animate-pulse' : 'border-sky-100 text-sky-700'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <Button onClick={() => setIsMobileMapOpen(true)} variant="outline" size="icon" className="lg:hidden h-10 w-10 rounded-xl border-sky-200 text-sky-700 bg-sky-50">
              <LayoutGrid className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1.5 rounded-none bg-sky-100 [&>div]:bg-sky-500 transition-all" />
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative">
        
        <div className="flex-1 w-full min-w-0"> 
           {viewMode === "single" ? (
               <div className="flex flex-col h-full">
                  {renderQuestionCard(assignment.questions[currentQuestionIdx], currentQuestionIdx)}
                  <div className="flex justify-between gap-3 mt-auto pt-4">
                    <Button variant="outline" onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))} disabled={currentQuestionIdx === 0} className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50 font-bold h-14 px-4 sm:px-8 shadow-sm bg-white text-base">
                      <ChevronLeft className="mr-1 sm:mr-2 w-5 h-5" /> <span className="hidden sm:inline">Câu trước</span>
                    </Button>
                    <Button onClick={() => setCurrentQuestionIdx(p => Math.min(assignment.questions.length - 1, p + 1))} disabled={currentQuestionIdx === assignment.questions.length - 1} className="bg-sky-500 text-white hover:bg-sky-600 rounded-xl font-black h-14 px-4 sm:px-8 shadow-md text-base">
                      <span className="hidden sm:inline">Câu tiếp</span> <ChevronRight className="ml-1 sm:ml-2 w-5 h-5" />
                    </Button>
                  </div>
               </div>
           ) : (
               <div className="pb-10">
                  <div className="space-y-6">
                    {currentQuestionsMultiple.map((item, localIdx) => renderQuestionCard(item, currentPage * questionsPerPage + localIdx))}
                  </div>
                  {totalPages > 1 && (
                     <div className="flex justify-center items-center gap-4 mt-10 pt-6 border-t border-slate-200">
                        <Button variant="outline" onClick={() => {setCurrentPage(p => Math.max(0, p - 1)); window.scrollTo({top:0});}} disabled={currentPage === 0} className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50 bg-white font-bold h-12 px-6 shadow-sm">
                          <ChevronLeft className="mr-2 w-5 h-5" /> Trang trước
                        </Button>
                        <span className="font-bold text-sky-900 bg-sky-100 px-4 py-2 rounded-xl shadow-inner border border-sky-200">Trang {currentPage + 1} / {totalPages}</span>
                        <Button onClick={() => {setCurrentPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({top:0});}} disabled={currentPage === totalPages - 1} className="rounded-xl bg-sky-500 text-white hover:bg-sky-600 shadow-md font-bold h-12 px-6">
                          Trang sau <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                     </div>
                  )}
               </div>
           )}
        </div>

        <aside className={`fixed inset-y-0 right-0 z-50 w-[300px] bg-white shadow-2xl transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-80 lg:shadow-none lg:bg-transparent lg:z-0 lg:flex lg:flex-col lg:self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] ${isMobileMapOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <Card className="rounded-none lg:rounded-3xl shadow-none lg:shadow-xl border-0 lg:border lg:border-sky-100 p-5 bg-white flex flex-col h-full lg:h-auto">
             <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4 shrink-0">
               <CardTitle className="text-lg font-black text-sky-900 flex items-center gap-2">
                 <Map className="w-5 h-5 text-sky-500" /> Bản đồ câu hỏi
               </CardTitle>
               <Button variant="ghost" size="icon" className="lg:hidden -mr-2" onClick={() => setIsMobileMapOpen(false)}><X className="w-5 h-5 text-slate-500" /></Button>
             </div>

             <div className="flex-1 lg:flex-none overflow-y-auto pr-1 custom-scrollbar">
                <div className="border-2 border-sky-50 bg-slate-50/50 rounded-2xl p-4">
                  <div className="grid grid-cols-5 gap-2.5">
                    {assignment.questions.map((item, idx) => {
                      const qId = item.questionId._id;
                      const isAnswered = answers[qId]?.text.trim() !== "" || answers[qId]?.imageFile !== null;
                      
                      let isCurrent = false;
                      if (viewMode === "single") {
                          isCurrent = currentQuestionIdx === idx;
                      } else {
                          isCurrent = idx >= currentPage * questionsPerPage && idx < (currentPage + 1) * questionsPerPage;
                      }

                      let btnClass = "";
                      if (isCurrent && isAnswered) {
                         btnClass = "bg-sky-500 text-white border-sky-600 ring-2 ring-offset-2 ring-sky-300 scale-105 shadow-md z-10";
                      } else if (isCurrent && !isAnswered) {
                         btnClass = "bg-white text-sky-700 border-sky-400 ring-2 ring-offset-2 ring-sky-200 scale-105 shadow-md z-10";
                      } else if (!isCurrent && isAnswered) {
                         btnClass = "bg-sky-500 border-sky-600 text-white shadow-sm";
                      } else {
                         btnClass = "bg-white text-slate-400 border-slate-200 hover:border-sky-300 hover:bg-sky-50";
                      }
                      
                      return (
                        <button 
                          key={qId} 
                          onClick={() => handleMapClick(idx)}
                          className={`aspect-square w-full rounded-lg font-black text-sm transition-all duration-200 flex flex-col items-center justify-center relative border-2 ${btnClass}`}
                        >
                          {idx + 1}
                          {answers[qId]?.imageFile && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm"></div>}
                        </button>
                      )
                    })}
                  </div>
                </div>
             </div>
             
             <div className="mt-6 pt-5 border-t border-slate-100 shrink-0">
               <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-2xl font-black text-xl shadow-lg shadow-emerald-200 transition-all active:scale-95">
                 {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang nộp...</> : <><Send className="w-6 h-6 mr-2" /> NỘP BÀI</>}
               </Button>
             </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default TakeQuiz;