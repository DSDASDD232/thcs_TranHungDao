import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, Loader2, Image as ImageIcon, LayoutGrid, X } from "lucide-react"; // Thêm LayoutGrid và X

const TakeQuiz = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // STATE MENU TRÊN MOBILE
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/assignments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.questions) {
          setAssignment(res.data);
          setTimeLeft(res.data.duration ? res.data.duration * 60 : 2700); 
        }
      } catch (err) {
        console.error("Lỗi lấy bài tập:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignment();
  }, [id]);

  useEffect(() => {
    if (loading || !assignment || result) return;
    if (timeLeft <= 0) {
      handleSubmit(); 
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, loading, assignment]);

  const handleSubmit = async () => {
    if (!assignment || isSubmitting) return;
    if (!result && !window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;

    setIsSubmitting(true);
    const formattedAnswers = Object.keys(answers).map(qId => ({
      question: qId,
      studentAnswer: answers[qId]
    }));

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/submissions/submit", {
        assignmentId: id,
        studentAnswers: formattedAnswers
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi nộp bài!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-sky-50/50 flex flex-col items-center justify-center font-sans">
      <Loader2 className="h-12 w-12 text-sky-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-sky-900">Đang chuẩn bị đề thi...</h2>
    </div>
  );

  if (!assignment || !assignment.questions || assignment.questions.length === 0) return (
    <div className="min-h-screen bg-sky-50/50 flex flex-col items-center justify-center font-sans p-4 text-center">
      <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-slate-800">Đề thi này chưa có câu hỏi!</h2>
      <Button onClick={() => navigate("/student-dashboard")} className="mt-6 bg-sky-500 hover:bg-sky-600 rounded-xl h-12 px-8 font-bold shadow-md text-white">
        Quay lại Trang chủ
      </Button>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-sky-50/50 flex items-center justify-center p-4 font-sans text-center">
      <Card className="max-w-md w-full p-8 sm:p-10 rounded-3xl shadow-xl border-none bg-white">
        <CheckCircle2 className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800">Kết quả thi</h2>
        <div className="my-6 sm:my-8 bg-emerald-50 py-6 sm:py-8 rounded-3xl border border-emerald-100 shadow-inner">
           <span className="text-6xl sm:text-7xl font-black text-emerald-600">{result.score}</span>
           <p className="font-bold text-emerald-500 mt-2 uppercase tracking-widest text-xs sm:text-sm">Điểm số</p>
        </div>
        <Button onClick={() => navigate("/student-dashboard")} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-base sm:text-lg shadow-md shadow-sky-200">
          Xác nhận & Thoát
        </Button>
      </Card>
    </div>
  );

  const currentQ = assignment.questions[currentQuestionIdx];
  const progressPercent = (Object.keys(answers).length / assignment.questions.length) * 100;

  let parsedOptions = [];
  try {
    parsedOptions = typeof currentQ?.options === 'string' ? JSON.parse(currentQ.options) : (currentQ?.options || []);
  } catch (error) {
    parsedOptions = [];
  }

  return (
    <div className="min-h-screen bg-sky-50/40 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* LỚP PHỦ MÀN HÌNH TỐI TRÊN MOBILE */}
      {isMobileMapOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setIsMobileMapOpen(false)} />
      )}

      {/* HEADER CỐ ĐỊNH */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <h1 className="font-extrabold text-base sm:text-lg text-sky-950 truncate flex-1">{assignment.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-sm sm:text-lg border-2 ${timeLeft < 60 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-sky-50 border-sky-100 text-sky-700'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
            {/* NÚT MỞ BẢN ĐỒ CÂU HỎI TRÊN MOBILE */}
            <Button onClick={() => setIsMobileMapOpen(true)} variant="outline" size="icon" className="md:hidden h-10 w-10 rounded-xl border-sky-200 text-sky-700 bg-sky-50">
              <LayoutGrid className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1.5 rounded-none bg-sky-100 [&>div]:bg-sky-500 transition-all" />
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6 relative">
        
        {/* KHU VỰC CÂU HỎI CHÍNH */}
        <div className="flex-1 w-full min-w-0"> 
          <Card className="rounded-3xl shadow-sm border border-sky-100 overflow-hidden bg-white flex flex-col">
            <CardHeader className="bg-sky-50/50 border-b border-sky-100 p-5 sm:p-8">
              <Badge className="mb-4 bg-white text-sky-800 font-bold border border-sky-200 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm uppercase tracking-wider shadow-none w-max">
                Câu {currentQuestionIdx + 1}
              </Badge>
              
              {currentQ?.imageUrl && (
                <div className="w-full mb-6 rounded-2xl overflow-hidden border border-sky-200 bg-white shadow-sm p-2">
                  <img 
                    src={`${serverUrl}${currentQ.imageUrl}`} 
                    alt="Hình minh họa" 
                    className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain mx-auto rounded-xl"
                  />
                </div>
              )}

              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-950 leading-snug">
                {currentQ?.content}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-8 bg-white flex-1">
              <RadioGroup 
                value={answers[currentQ?._id] || ""} 
                onValueChange={(val) => setAnswers({ ...answers, [currentQ?._id]: val })} 
                className="space-y-3"
              >
                {parsedOptions.map((opt, idx) => {
                  const isSelected = answers[currentQ?._id] === opt;
                  return (
                    <div key={idx} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-2xl transition-colors cursor-pointer hover:bg-sky-50/50 border border-transparent hover:border-sky-50">
                      <RadioGroupItem 
                        value={opt} 
                        id={`opt-${idx}`} 
                        className={`w-5 h-5 sm:w-6 sm:h-6 mt-1 sm:mt-0.5 transition-colors shrink-0 ${isSelected ? 'border-sky-600 border-[5px] sm:border-[6px]' : 'border-slate-300 border-2'}`} 
                      />
                      
                      <Label htmlFor={`opt-${idx}`} className="flex-1 text-base sm:text-lg cursor-pointer flex items-start sm:items-center gap-3 sm:gap-4 leading-relaxed font-normal text-slate-700">
                         <span className={`flex shrink-0 items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-sm sm:text-base font-bold transition-colors ${isSelected ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-800'}`}>
                           {String.fromCharCode(65 + idx)}
                         </span> 
                         <span className={isSelected ? 'text-sky-950 font-semibold' : 'text-slate-700'}>
                           {opt}
                         </span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>

            <CardFooter className="bg-white border-t border-sky-100 flex justify-between gap-3 p-5 sm:p-8">
              <Button 
                variant="outline" 
                onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))} 
                disabled={currentQuestionIdx === 0}
                className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-100 font-bold h-11 sm:h-12 px-3 sm:px-6 shadow-sm flex-1 sm:flex-none max-w-[48%] sm:max-w-none"
              >
                <ChevronLeft className="mr-1 sm:mr-2 w-5 h-5" /> <span className="text-sm sm:text-base">Câu trước</span>
              </Button>
              <Button 
                onClick={() => setCurrentQuestionIdx(p => Math.min(assignment.questions.length - 1, p + 1))} 
                disabled={currentQuestionIdx === assignment.questions.length - 1}
                className="bg-sky-500 text-white hover:bg-sky-600 rounded-xl font-black h-11 sm:h-12 px-3 sm:px-6 shadow-sm flex-1 sm:flex-none max-w-[48%] sm:max-w-none"
              >
                <span className="text-sm sm:text-base">Câu tiếp</span> <ChevronRight className="ml-1 sm:ml-2 w-5 h-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* BẢN ĐỒ CÂU HỎI (SIDEBAR TRÊN PC / DRAWER TRÊN MOBILE) */}
        <aside className={`fixed inset-y-0 right-0 z-50 w-[280px] bg-white shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 md:w-80 md:shadow-none md:bg-transparent md:z-0 md:flex md:flex-col ${isMobileMapOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <Card className="h-full rounded-none md:rounded-3xl shadow-none md:shadow-md border-0 md:border border-sky-100 p-6 flex flex-col md:sticky md:top-24 bg-white overflow-y-auto">
             
             {/* Header của Sidebar trên Mobile */}
             <div className="flex items-center justify-between mb-6 border-b border-sky-100 pb-4">
               <CardTitle className="text-lg font-black text-sky-950 flex items-center gap-2">
                 <LayoutGrid className="w-5 h-5 text-sky-500 md:hidden" />
                 <ImageIcon className="w-5 h-5 text-sky-500 hidden md:block" /> 
                 Bản đồ câu hỏi
               </CardTitle>
               <Button variant="ghost" size="icon" className="md:hidden -mr-2" onClick={() => setIsMobileMapOpen(false)}>
                 <X className="w-5 h-5 text-slate-500" />
               </Button>
             </div>

             <div className="grid grid-cols-5 gap-2 sm:gap-3 flex-1 content-start">
                {assignment.questions.map((q, idx) => (
                  <button 
                    key={q._id} 
                    onClick={() => { setCurrentQuestionIdx(idx); setIsMobileMapOpen(false); }}
                    className={`aspect-square w-full rounded-xl font-black text-sm sm:text-base transition-all duration-300 ${currentQuestionIdx === idx ? 'ring-4 ring-sky-200 bg-sky-600 text-white shadow-md' : answers[q._id] ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {idx + 1}
                  </button>
                ))}
             </div>
             
             <div className="mt-8 pt-6 border-t border-sky-100">
               <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting} 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 sm:h-14 rounded-2xl font-black text-lg sm:text-xl shadow-md shadow-emerald-200 transition-all active:scale-95"
               >
                  {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang chấm...</> : <><Send className="w-5 h-5 sm:w-6 sm:h-6 mr-2" /> Nộp bài</>}
               </Button>
               <p className="text-center text-[11px] sm:text-[12px] font-bold text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Hãy kiểm tra kỹ trước khi nộp nhé!
               </p>
             </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default TakeQuiz;