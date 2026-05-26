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
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, 
  Loader2, Image as ImageIcon, LayoutGrid, X, Trash2, Clock4, 
  GalleryVerticalEnd, SquareMousePointer, Map, Sparkles, PenTool, Lock, ArrowLeft,
  Flag
} from "lucide-react"; 

import GeometryDrawing from "@/components/ui/GeometryDrawing";

// 👉 CÁC HÀM XỬ LÝ COOKIE (Miễn nhiễm với lệnh localStorage.clear() khi đăng xuất)
const setQuizCookie = (id, time) => {
    document.cookie = `quiz_start_time_${id}=${time}; path=/; max-age=86400`; // Lưu sống trong 24h
};
const getQuizCookie = (id) => {
    const match = document.cookie.match(new RegExp('(^| )' + `quiz_start_time_${id}` + '=([^;]+)'));
    return match ? match[2] : null;
};
const removeQuizCookie = (id) => {
    document.cookie = `quiz_start_time_${id}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

const TakeQuiz = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
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

  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [activeDrawingQId, setActiveDrawingQId] = useState(null);

  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:image")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  const handleExit = () => {
      sessionStorage.removeItem(`unlocked_${id}`);
      navigate("/student-dashboard");
  };

  useEffect(() => {
      const handlePopState = () => {
          sessionStorage.removeItem(`unlocked_${id}`);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [id]);

  const startQuiz = (assigData) => {
      setAssignment(assigData);
      
      const initialAnswers = {};
      assigData.questions.forEach(item => {
        const qId = item.questionId._id || item.questionId;
        // Thêm trường isFlagged để quản lý cắm cờ
        initialAnswers[qId] = { text: "", imageFile: null, previewUrl: "", base64Drawing: "", isFlagged: false };
      });

      const now = new Date().getTime();
      
      let startTime = getQuizCookie(id) || localStorage.getItem(`quiz_start_time_${id}`);
      
      if (!startTime) {
          startTime = now;
          setQuizCookie(id, now);
          localStorage.setItem(`quiz_start_time_${id}`, now); 
      } else {
          localStorage.setItem(`quiz_start_time_${id}`, startTime);
          setQuizCookie(id, startTime); 
      }

      const durationSeconds = assigData.duration ? assigData.duration * 60 : 2700;
      const elapsed = Math.floor((now - parseInt(startTime)) / 1000);
      let calculatedTimeLeft = durationSeconds - elapsed;
      
      if (assigData.dueDate) {
          const dueTime = new Date(assigData.dueDate).getTime();
          const timeUntilDueInSeconds = Math.floor((dueTime - now) / 1000);
          if (timeUntilDueInSeconds <= 0) {
              alert("Bài tập này đã quá hạn nộp!");
              return handleExit();
          }
          calculatedTimeLeft = Math.min(calculatedTimeLeft, timeUntilDueInSeconds);
      }

      const savedProgress = localStorage.getItem(`quiz_progress_${id}`);
      if (savedProgress) {
          try {
              const parsedProgress = JSON.parse(savedProgress);
              if (parsedProgress.answers) {
                  Object.keys(parsedProgress.answers).forEach(qId => {
                      if (initialAnswers[qId]) {
                          initialAnswers[qId].text = parsedProgress.answers[qId].text || "";
                          initialAnswers[qId].isFlagged = parsedProgress.answers[qId].isFlagged || false; // Khôi phục trạng thái cắm cờ
                      }
                  });
              }
          } catch(e) {}
      }

      if (calculatedTimeLeft <= 0) {
          setTimeLeft(0);
          setIsTimeUp(true);
      } else {
          setTimeLeft(calculatedTimeLeft);
      }
      
      setAnswers(initialAnswers);
      setLoading(false);
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/assignments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.questions) {
          const assigData = res.data;
          
          if (assigData.password && assigData.password.trim() !== "") {
              const unlockedPass = sessionStorage.getItem(`unlocked_${id}`);
              if (unlockedPass !== assigData.password) {
                  setIsLocked(true); 
                  setAssignment(assigData);
                  setLoading(false);
                  return; 
              }
          }
          
          startQuiz(assigData);
        }
      } catch (err) {
        console.error("Lỗi lấy bài tập:", err);
      } finally {
        if(!isLocked) setLoading(false);
      }
    };
    fetchAssignment();
  }, [id]);

  useEffect(() => {
    if (loading || !assignment || result || isLocked || isTimeUp) return;

    const durationSeconds = assignment.duration ? assignment.duration * 60 : 2700;

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const startTimeStr = getQuizCookie(id) || localStorage.getItem(`quiz_start_time_${id}`);
        if (!startTimeStr) return; 

        const elapsed = Math.floor((now - parseInt(startTimeStr)) / 1000);
        let remaining = durationSeconds - elapsed;

        if (assignment.dueDate) {
            const dueTime = new Date(assignment.dueDate).getTime();
            const untilDue = Math.floor((dueTime - now) / 1000);
            remaining = Math.min(remaining, untilDue);
        }

        if (remaining <= 0) {
            setTimeLeft(0);
            clearInterval(timer);
            setIsTimeUp(true);
        } else {
            setTimeLeft(remaining);
        }
    }, 1000); 

    return () => clearInterval(timer);
  }, [loading, assignment, result, isLocked, isTimeUp, id]);

  useEffect(() => {
    if (isTimeUp && !isSubmitting && !result) {
        alert("Đã hết thời gian làm bài! Hệ thống tự động thu bài của em.");
        handleSubmit();
    }
  }, [isTimeUp]);

  useEffect(() => {
    if (Object.keys(answers).length > 0 && !isLocked) {
        const textAnswersOnly = {};
        // Lưu kèm trạng thái cắm cờ vào bộ nhớ tạm
        Object.keys(answers).forEach(qId => { 
            textAnswersOnly[qId] = { 
                text: answers[qId].text,
                isFlagged: answers[qId].isFlagged 
            }; 
        });
        localStorage.setItem(`quiz_progress_${id}`, JSON.stringify({ answers: textAnswersOnly }));
    }
  }, [answers, isLocked, id]);

  const handleUnlockQuiz = () => {
     if (passwordInput === assignment.password) {
         sessionStorage.setItem(`unlocked_${id}`, passwordInput);
         setIsLocked(false);
         setLoading(true); 
         startQuiz(assignment); 
     } else {
         setPasswordError("Mật khẩu không chính xác!");
     }
  };

  const handleAnswerChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], text: value } }));
  };

  // Hàm kích hoạt/bỏ cắm cờ
  const handleToggleFlag = (qId) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], isFlagged: !prev[qId].isFlagged } }));
  };

  const handleImageUpload = (qId, e) => {
    const file = e.target.files[0];
    if (file) {
      setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], imageFile: file, previewUrl: URL.createObjectURL(file), base64Drawing: "" } }));
    }
  };

  const handleSaveGeoGebraDrawing = (base64Image) => {
    if(activeDrawingQId) {
       setAnswers(prev => ({ 
         ...prev, 
         [activeDrawingQId]: { 
           ...prev[activeDrawingQId], 
           imageFile: null, 
           previewUrl: base64Image, 
           base64Drawing: base64Image 
         } 
       }));
       setIsDrawingModalOpen(false);
       setActiveDrawingQId(null);
    }
  };

  const handleRemoveImage = (qId) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], imageFile: null, previewUrl: "", base64Drawing: "" } }));
  };

  const handleSubmit = async () => {
    if (!assignment || isSubmitting) return;
    
    const currentAnswers = answersRef.current;
    const answeredCount = Object.values(currentAnswers).filter(a => a.text.trim() !== "" || a.imageFile !== null || a.base64Drawing !== "").length;
    
    if (!isTimeUp) {
        if (!result && timeLeft > 0 && answeredCount < assignment.questions.length) {
           if (!window.confirm(`Em mới làm được ${answeredCount}/${assignment.questions.length} câu. Em có chắc chắn muốn nộp bài sớm không?`)) return;
        } else if (!result && timeLeft > 0) {
           if (!window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;
        }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("assignmentId", id);

      const formattedAnswers = Object.keys(currentAnswers).map(qId => ({
        question: qId,
        studentAnswer: currentAnswers[qId].text || "",
        studentBase64Image: currentAnswers[qId].base64Drawing || "" 
      }));
      formData.append("studentAnswers", JSON.stringify(formattedAnswers));

      Object.keys(currentAnswers).forEach(qId => {
        if (currentAnswers[qId].imageFile) formData.append(`image_${qId}`, currentAnswers[qId].imageFile);
      });

      const token = localStorage.getItem("token");
      const res = await axios.post("/submissions/submit", formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      
      setResult(res.data);
      
      localStorage.removeItem(`quiz_progress_${id}`);
      localStorage.removeItem(`quiz_start_time_${id}`);
      removeQuizCookie(id);
      sessionStorage.removeItem(`unlocked_${id}`);

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
      <h2 className="text-xl font-bold text-sky-900">Đang chuẩn bị đề thi...</h2>
    </div>
  );

  if (isLocked) return (
    <div className="min-h-screen bg-sky-50/40 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      <Card className="max-w-md w-full rounded-[2rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white overflow-hidden relative z-10">
        <div className="h-2 w-full bg-gradient-to-r from-sky-400 to-sky-600"></div>
        <CardHeader className="text-center pt-10 pb-4">
          <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-sky-100">
             <Lock className="h-10 w-10 text-sky-500" />
          </div>
          <CardTitle className="text-2xl font-black text-sky-950 mb-2">Khu vực Bảo mật</CardTitle>
          <p className="text-slate-500 font-medium text-sm leading-relaxed px-2">
            Bài thi <strong className="text-sky-600 font-bold">{assignment?.title}</strong> yêu cầu mật khẩu để truy cập.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 px-8 pb-10">
           <div>
              <Input 
                 type="password" 
                 placeholder="Nhập mật khẩu tại đây..." 
                 className={`h-14 rounded-2xl text-center text-lg font-black tracking-widest transition-all shadow-sm ${passwordError ? 'border-rose-300 focus-visible:ring-rose-500 bg-rose-50/50' : 'border-slate-200 focus-visible:ring-sky-500 bg-slate-50/50 hover:border-sky-300'}`}
                 value={passwordInput}
                 onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
                 onKeyDown={(e) => { if (e.key === 'Enter') handleUnlockQuiz(); }}
                 autoFocus
              />
              {passwordError && <p className="text-rose-500 text-sm font-bold mt-3 text-center flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-2"><AlertCircle className="w-4 h-4"/> {passwordError}</p>}
           </div>
           <div className="space-y-3 pt-2">
               <Button onClick={handleUnlockQuiz} className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-sky-200/50 transition-all active:scale-95 flex items-center justify-center gap-2">
                  Mở khóa Đề thi <ChevronRight className="w-5 h-5"/>
               </Button>
               <Button onClick={handleExit} variant="ghost" className="w-full h-12 rounded-2xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                   <ArrowLeft className="w-4 h-4 mr-2"/> Quay lại bảng điều khiển
               </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!assignment || !assignment.questions || assignment.questions.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-4 text-center">
      <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-slate-800">Đề thi này chưa có câu hỏi!</h2>
      <Button onClick={handleExit} className="mt-6 bg-sky-500 hover:bg-sky-600 rounded-xl h-12 px-8 font-bold shadow-md text-white">Quay lại Trang chủ</Button>
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
        <Button onClick={handleExit} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-base sm:text-lg shadow-lg shadow-sky-200 transition-all">Về trang chủ</Button>
      </Card>
    </div>
  );

  const answeredCount = Object.values(answers).filter(a => a.text.trim() !== "" || a.imageFile !== null || a.base64Drawing !== "").length;
  const progressPercent = (answeredCount / assignment.questions.length) * 100;

  const totalPages = Math.ceil(assignment.questions.length / questionsPerPage);
  const currentQuestionsMultiple = assignment.questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

  const renderQuestionCard = (item, idx) => {
    const q = item.questionId;
    const qId = q._id;
    const currentAnswer = answers[qId] || { text: "", imageFile: null, previewUrl: "", base64Drawing: "", isFlagged: false };
    
    let parsedOptions = [];
    try { parsedOptions = typeof q?.options === 'string' ? JSON.parse(q.options) : (q?.options || []); } catch (e) { parsedOptions = []; }

    const finalOptions = parsedOptions.slice(0, 4);

    return (
      <Card key={qId} id={`question-card-${idx}`} className={`rounded-3xl shadow-sm border overflow-hidden mb-8 transition-shadow ${currentAnswer.isFlagged ? 'border-rose-200 shadow-rose-100' : 'border-sky-100/60 hover:shadow-md bg-white'}`}>
        <CardHeader className={`p-5 sm:p-7 flex flex-row justify-between items-start border-b ${currentAnswer.isFlagged ? 'bg-rose-50/50 border-rose-100' : 'bg-sky-50/30 border-sky-50/80'}`}>
          <div className="w-full">
              <Badge className={`mb-3 font-black border-0 px-3 sm:px-4 py-1.5 text-xs sm:text-sm uppercase tracking-wider shadow-sm ${currentAnswer.isFlagged ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                Câu {idx + 1}
              </Badge>
              <div 
                  className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed whitespace-pre-wrap q-content-view w-full"
                  dangerouslySetInnerHTML={{ __html: q?.content }}
              />
          </div>
          <div className="flex items-center gap-2 ml-4">
              <Button
                variant={currentAnswer.isFlagged ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleFlag(qId)}
                className={`h-7 px-2.5 text-xs font-bold shadow-sm transition-all ${
                  currentAnswer.isFlagged
                    ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 mr-1 ${currentAnswer.isFlagged ? "fill-white" : ""}`} />
                <span className="hidden sm:inline">{currentAnswer.isFlagged ? "" : ""}</span>
              </Button>
              <Badge variant="outline" className="text-slate-500 bg-white border-slate-200 font-bold text-sm shrink-0 whitespace-nowrap shadow-sm hidden md:flex">
                  {item.points} Điểm
              </Badge>
          </div>
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
                        <div 
                            className={`q-content-view w-full ${isSelected ? 'text-sky-950 font-bold' : 'text-slate-600'}`}
                            dangerouslySetInnerHTML={{ __html: opt }}
                        />
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
                        <img src={currentAnswer.previewUrl} alt="Bài làm" className="w-full h-full object-cover bg-white" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button type="button" onClick={() => handleRemoveImage(qId)} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full"><Trash2 className="w-4 h-4 mr-2"/> Xóa ảnh</Button>
                        </div>
                      </div>
                  ) : (
                      <div className="flex flex-wrap gap-3 w-full">
                          <label className="flex flex-1 items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 text-sky-700 cursor-pointer hover:bg-sky-100 hover:border-sky-500 transition-all font-bold">
                            <ImageIcon className="w-5 h-5" /> Tải ảnh bài làm lên
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(qId, e)} />
                          </label>
                          
                          <Button 
                             variant="outline"
                             className="flex-1 h-auto py-4 px-6 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 font-bold transition-all"
                             onClick={() => { setActiveDrawingQId(qId); setIsDrawingModalOpen(true); }}
                          >
                             <PenTool className="w-5 h-5 mr-2" /> Vẽ hình/Sơ đồ trực tiếp
                          </Button>
                      </div>
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

      <Dialog open={isDrawingModalOpen} onOpenChange={setIsDrawingModalOpen}>
        <DialogContent className="sm:max-w-[1000px] w-[95vw] p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 pb-2 border-b border-sky-50">
            <DialogTitle className="text-2xl font-black text-sky-900 flex items-center gap-2">
               <Map className="w-6 h-6 text-sky-500" /> Bảng Vẽ Học Sinh
            </DialogTitle>
            <p className="text-slate-500 text-sm mt-1">Sử dụng công cụ bên dưới để vẽ tọa độ, đường thẳng, hình chóp...</p>
          </DialogHeader>
          
          <div className="p-6 bg-slate-50 h-[650px] overflow-hidden">
             {isDrawingModalOpen && (
                 <GeometryDrawing 
                    onSaveImage={handleSaveGeoGebraDrawing} 
                    onCancel={() => {setIsDrawingModalOpen(false); setActiveDrawingQId(null);}} 
                 />
             )}
          </div>
        </DialogContent>
      </Dialog>

      <header className="bg-gradient-to-r from-sky-50/80 via-white to-sky-50/80 backdrop-blur-md border-b border-sky-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <h1 className="font-extrabold text-sm sm:text-lg text-sky-900 truncate flex-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500 hidden sm:block" /> 
            <span className="truncate">{assignment?.title || "Bài kiểm tra"}</span>
          </h1>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex bg-white p-1 rounded-xl border border-sky-100 shadow-sm shrink-0">
               <button onClick={() => setViewMode("single")} className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${viewMode === 'single' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'}`}>
                  <SquareMousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">1 Câu</span><span className="sm:hidden">1</span>
               </button>
               <button onClick={() => setViewMode("multiple")} className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${viewMode === 'multiple' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'}`}>
                  <GalleryVerticalEnd className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">10 Câu</span><span className="sm:hidden">10</span>
               </button>
            </div>

            <div className={`flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-sm sm:text-lg border-2 shadow-sm bg-white shrink-0 ${timeLeft < 60 ? 'border-rose-200 text-rose-600 animate-pulse' : 'border-sky-100 text-sky-700'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <Button onClick={() => setIsMobileMapOpen(true)} variant="outline" size="icon" className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-sky-200 text-sky-700 bg-sky-50 shrink-0">
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Nút Hủy / Thoát bài */}
            <Button onClick={handleExit} variant="outline" className="hidden sm:flex rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 ml-2">
              Thoát
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
                          <ChevronLeft className="mr-2 w-5 h-5" /> <span className="hidden sm:inline">Trang trước</span>
                        </Button>
                        <span className="font-bold text-sky-900 bg-sky-100 px-4 py-2 rounded-xl shadow-inner border border-sky-200">Trang {currentPage + 1} / {totalPages}</span>
                        <Button onClick={() => {setCurrentPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({top:0});}} disabled={currentPage === totalPages - 1} className="rounded-xl bg-sky-500 text-white hover:bg-sky-600 shadow-md font-bold h-12 px-6">
                          <span className="hidden sm:inline">Trang sau</span> <ChevronRight className="ml-2 w-5 h-5" />
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
                      const isAnswered = answers[qId]?.text.trim() !== "" || answers[qId]?.imageFile !== null || answers[qId]?.base64Drawing !== "";
                      const isFlagged = answers[qId]?.isFlagged;
                      
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
                          {isAnswered && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm"></div>}
                          {isFlagged && (
                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                              <Flag className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          )}
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
               <Button onClick={handleExit} variant="ghost" className="w-full h-12 mt-2 font-bold text-slate-500 hover:text-slate-800 lg:hidden">
                 Thoát bài thi
               </Button>
             </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default TakeQuiz;