import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios"; // ĐÃ SỬA: Dùng axiosInstance
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, Loader2, Image as ImageIcon } from "lucide-react";

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

  // Lấy URL thực tế của Server (từ axiosInstance) để nối vào link ảnh
  const serverUrl = axios.defaults.baseURL.replace('/api', '');

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const token = localStorage.getItem("token");
        // ĐÃ SỬA: Rút gọn API
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
      // ĐÃ SỬA: Rút gọn API
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
    <div className="min-h-screen bg-sky-50/50 flex flex-col items-center justify-center font-sans">
      <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-slate-800">Đề thi này chưa có câu hỏi!</h2>
      <Button onClick={() => navigate("/student-dashboard")} className="mt-6 bg-sky-500 hover:bg-sky-600 rounded-xl h-12 px-8 font-bold shadow-md text-white">
        Quay lại Trang chủ
      </Button>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-sky-50/50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-md w-full text-center p-10 rounded-3xl shadow-xl border-none bg-white">
        <CheckCircle2 className="w-24 h-24 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-slate-800">Kết quả thi</h2>
        <div className="my-8 bg-emerald-50 py-8 rounded-3xl border border-emerald-100 shadow-inner">
           <span className="text-7xl font-black text-emerald-600">{result.score}</span>
           <p className="font-bold text-emerald-500 mt-2 uppercase tracking-widest text-sm">Điểm số</p>
        </div>
        <Button onClick={() => navigate("/student-dashboard")} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-md shadow-sky-200">
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
    <div className="min-h-screen bg-sky-50/50 flex flex-col font-sans">
      <header className="bg-white border-b border-sky-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-extrabold text-lg text-sky-950 truncate pr-4">{assignment.title}</h1>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg border-2 ${timeLeft < 60 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-sky-50 border-sky-100 text-sky-700'}`}>
            <Clock className="w-5 h-5" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </div>
        </div>
        <Progress value={progressPercent} className="h-1.5 rounded-none bg-sky-100 [&>div]:bg-sky-500 transition-all" />
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col md:flex-row gap-6">
        <div className="flex-1 w-full min-w-0"> 
          <Card className="rounded-3xl shadow-md border-sky-100 overflow-hidden bg-white flex flex-col">
            
            <CardHeader className="bg-sky-100 border-b border-sky-200 p-6 sm:p-8">
              <Badge className="mb-4 bg-white text-sky-800 font-bold border border-sky-200 px-4 py-1.5 text-sm uppercase tracking-wider shadow-none w-max">
                Câu {currentQuestionIdx + 1}
              </Badge>
              
              {currentQ?.imageUrl && (
                <div className="w-full mb-6 rounded-2xl overflow-hidden border border-sky-200 bg-white shadow-sm p-2">
                  <img 
                    // ĐÃ SỬA: Nối chuỗi linh hoạt cho ảnh từ server local hoặc Render
                    src={`${serverUrl}${currentQ.imageUrl}`} 
                    alt="Hình minh họa" 
                    className="w-full h-auto max-h-[400px] object-contain mx-auto rounded-xl fade-in"
                  />
                </div>
              )}

              <CardTitle className="text-2xl sm:text-3xl font-bold text-sky-950 leading-snug">
                {currentQ?.content}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 bg-white flex-1">
              <RadioGroup 
                value={answers[currentQ?._id] || ""} 
                onValueChange={(val) => setAnswers({ ...answers, [currentQ?._id]: val })} 
                className="space-y-2"
              >
                {parsedOptions.map((opt, idx) => {
                  const isSelected = answers[currentQ?._id] === opt;
                  return (
                    <div key={idx} className="flex items-center space-x-4 p-3 rounded-xl transition-colors cursor-pointer hover:bg-sky-50/50">
                      <RadioGroupItem 
                        value={opt} 
                        id={`opt-${idx}`} 
                        className={`w-6 h-6 transition-colors ${isSelected ? 'border-sky-600 border-[6px]' : 'border-slate-300 border-2'}`} 
                      />
                      
                      <Label htmlFor={`opt-${idx}`} className="flex-1 text-lg cursor-pointer flex items-center gap-4 leading-relaxed font-normal text-slate-700">
                         <span className={`flex items-center justify-center w-8 h-8 rounded-full text-base font-medium transition-colors ${isSelected ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-800'}`}>
                           {String.fromCharCode(65 + idx)}
                         </span> 
                         <span className={isSelected ? 'text-sky-950 font-medium' : 'text-slate-700'}>
                           {opt}
                         </span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>

            <CardFooter className="bg-white border-t border-sky-100 flex justify-between p-6 sm:px-8">
              <Button 
                variant="outline" 
                onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))} 
                disabled={currentQuestionIdx === 0}
                className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-100 font-bold h-12 px-6 shadow-sm"
              >
                <ChevronLeft className="mr-2 w-5 h-5" /> Câu trước
              </Button>
              <Button 
                onClick={() => setCurrentQuestionIdx(p => Math.min(assignment.questions.length - 1, p + 1))} 
                disabled={currentQuestionIdx === assignment.questions.length - 1}
                className="bg-sky-500 text-white hover:bg-sky-600 rounded-xl font-black h-12 px-6 shadow-sm"
              >
                Câu tiếp <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <aside className="w-full md:w-80 shrink-0">
          <Card className="rounded-3xl shadow-md border-sky-100 p-6 sticky top-24 bg-white">
             <CardTitle className="mb-6 text-lg font-black text-sky-950 border-b border-sky-100 pb-4 flex items-center gap-2">
               <ImageIcon className="w-5 h-5 text-sky-500" /> Bản đồ câu hỏi
             </CardTitle>
             <div className="grid grid-cols-5 gap-3">
                {assignment.questions.map((q, idx) => (
                  <button 
                    key={q._id} 
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`h-11 w-11 rounded-xl font-black text-sm transition-all duration-300 ${currentQuestionIdx === idx ? 'ring-4 ring-sky-200 bg-sky-600 text-white shadow-md' : answers[q._id] ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {idx + 1}
                  </button>
                ))}
             </div>
             
             <div className="mt-8 pt-6 border-t border-sky-100">
               <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting} 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-2xl font-black text-xl shadow-md shadow-emerald-200 transition-all active:scale-95"
               >
                  {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang chấm...</> : <><Send className="w-6 h-6 mr-2" /> Nộp bài</>}
               </Button>
               <p className="text-center text-[12px] font-bold text-slate-400 mt-4 flex items-center justify-center gap-1.5">
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