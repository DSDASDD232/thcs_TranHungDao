import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "../lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; 
import { ArrowLeft, CheckCircle2, AlertCircle, Save, Loader2, UserCircle2, MessageSquareText } from "lucide-react"; 

const GradeStudent = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const submissionData = location.state?.submission;
  const assignmentData = location.state?.assignment;

  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);
  
  const serverUrl = axios.defaults.baseURL.replace('/api', '');
  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  useEffect(() => {
    if (!submissionData) {
      alert("Không tìm thấy dữ liệu học sinh. Vui lòng chọn lại từ danh sách!");
      navigate(-1);
      return;
    }
    const initialScores = {};
    submissionData.answers.forEach(ans => {
      initialScores[ans.question._id] = ans.pointsAwarded || 0;
    });
    setScores(initialScores);
    
    if (submissionData.feedback) {
        setFeedback(submissionData.feedback);
    }
  }, [submissionData, navigate]);

  const handleScoreChange = (questionId, value, maxPoints) => {
    let val = parseFloat(value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > maxPoints) val = maxPoints; 
    setScores(prev => ({ ...prev, [questionId]: val }));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/submissions/grade/${submissionData._id}`, { 
          grades: scores,
          teacherComment: feedback 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("✅ Chấm bài thành công!");
      navigate(-1);
    } catch (error) {
      alert("Lỗi khi lưu điểm!");
    } finally {
      setIsSaving(false);
    }
  };

  if (!submissionData) return null;

  const currentTotal = Object.values(scores).reduce((a, b) => a + b, 0).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl h-12 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
            <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-sky-950 flex items-center gap-2">
              <UserCircle2 className="w-7 h-7 text-sky-500" /> Bài làm: {submissionData.student?.fullName}
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Bài tập: {assignmentData?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black uppercase text-slate-400">Tổng điểm tạm tính</p>
            <p className="text-3xl font-black text-sky-600 leading-none">{currentTotal}</p>
          </div>
          <Button onClick={handleSaveGrades} disabled={isSaving} className="bg-sky-500 hover:bg-sky-600 text-white font-black h-12 px-6 rounded-xl shadow-md shadow-sky-200">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Save className="w-5 h-5 mr-2" />} Lưu điểm
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 mt-4">
        
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
           <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
               <MessageSquareText className="w-5 h-5 text-sky-500" />
               <h3 className="font-black text-sky-900 text-lg">Nhận xét bài làm (Tùy chọn)</h3>
           </div>
           <div className="p-6">
               <Textarea 
                   placeholder="Nhập lời phê, nhận xét hoặc hướng dẫn thêm cho học sinh..."
                   className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 text-base focus-visible:ring-sky-500 p-4"
                   value={feedback}
                   onChange={(e) => setFeedback(e.target.value)}
               />
               <p className="text-xs font-medium text-slate-400 mt-3 flex items-center gap-1">
                   <AlertCircle className="w-3.5 h-3.5" /> 
               </p>
           </div>
        </Card>

        {submissionData.answers.map((ans, idx) => {
          const q = ans.question;
          const isEssay = q.type === 'essay';
          
          return (
            <Card key={idx} className={`border-none shadow-md rounded-3xl overflow-hidden ${isEssay ? 'ring-2 ring-amber-300 bg-white' : 'bg-white'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isEssay ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-black text-lg text-slate-700">Câu {idx + 1}</span>
                  <Badge variant="outline" className={`border-0 font-bold px-3 py-1 ${isEssay ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                    {isEssay ? 'Tự luận' : 'Trắc nghiệm'}
                  </Badge>
                </div>
                <Badge variant="outline" className="bg-white text-slate-600 font-black text-sm px-3 py-1">Tối đa: {ans.maxPoints} đ</Badge>
              </div>
              
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-3">
                  {/* 👉 ĐÃ SỬA: Hiển thị Đề bài dùng dangerouslySetInnerHTML */}
                  <div 
                      className="font-medium text-slate-800 text-lg leading-relaxed q-content-view"
                      dangerouslySetInnerHTML={{ __html: q.content }}
                  />
                  {q.imageUrl && (
                    <img src={getImageUrl(q.imageUrl)} className="max-w-full sm:max-w-md max-h-64 rounded-xl border border-slate-200 shadow-sm" alt="Đề bài" />
                  )}
                </div>

                {isEssay && (q.essayAnswerText || q.essayAnswerImageUrl) && (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-4">
                        <p className="text-xs font-black text-emerald-700 uppercase mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Đáp án / Hướng dẫn chấm:</p>
                        {/* 👉 ĐÃ SỬA: Hiển thị Hướng dẫn giải dùng dangerouslySetInnerHTML */}
                        {q.essayAnswerText && (
                           <div 
                               className="text-emerald-900 font-medium text-base mb-3 leading-relaxed q-content-view bg-white p-3 rounded-lg border border-emerald-100"
                               dangerouslySetInnerHTML={{ __html: q.essayAnswerText }}
                           />
                        )}
                        {q.essayAnswerImageUrl && <img src={getImageUrl(q.essayAnswerImageUrl)} className="max-w-full sm:max-w-sm max-h-48 rounded-xl border border-emerald-200 shadow-sm" alt="Ảnh đáp án" />}
                    </div>
                )}
                
                <div className={`p-5 rounded-2xl border ${isEssay ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs font-black text-slate-400 uppercase mb-4 tracking-wider">Bài làm học sinh:</p>
                  
                  {isEssay ? (
                    <div className="space-y-4">
                      {/* 👉 ĐÃ SỬA: Hiển thị Bài làm của học sinh dùng dangerouslySetInnerHTML (phòng trường hợp form hs cũng có Editor) */}
                      <div className="text-slate-700 font-medium text-lg leading-relaxed bg-white p-4 rounded-xl border border-slate-100 min-h-[80px] q-content-view">
                        {ans.studentAnswer ? (
                           <div dangerouslySetInnerHTML={{ __html: ans.studentAnswer }} />
                        ) : (
                           <span className="text-slate-400 italic">Không gõ nội dung</span>
                        )}
                      </div>
                      {ans.studentImage && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Ảnh đính kèm:</p>
                          <img src={getImageUrl(ans.studentImage)} className="w-full max-w-2xl rounded-xl border-2 border-slate-200 shadow-md object-contain bg-white" alt="Ảnh bài làm" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                          let parsedOptions = [];
                          try { parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch (e) { parsedOptions = []; }

                          return parsedOptions.map((opt, optIdx) => {
                              const optLetter = String.fromCharCode(65 + optIdx); 
                              const isStudentChoice = ans.studentAnswer === optLetter;
                              const isCorrectAnswer = opt === q.correctAnswer || optLetter === q.correctAnswer;

                              let bgColor = "bg-white";
                              let borderColor = "border-slate-200";
                              let textColor = "text-slate-600";
                              let icon = null;

                              if (isCorrectAnswer) {
                                  bgColor = "bg-emerald-50";
                                  borderColor = "border-emerald-500";
                                  textColor = "text-emerald-700 font-bold";
                                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                              } else if (isStudentChoice && !isCorrectAnswer) {
                                  bgColor = "bg-rose-50";
                                  borderColor = "border-rose-500";
                                  textColor = "text-rose-700 font-bold";
                                  icon = <AlertCircle className="w-5 h-5 text-rose-600" />;
                              }

                              return (
                                  <div key={optIdx} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${bgColor} ${borderColor}`}>
                                      <div className="flex items-center gap-4">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 ${isCorrectAnswer ? 'bg-emerald-500 text-white' : isStudentChoice ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                              {optLetter}
                                          </div>
                                          {/* 👉 ĐÃ SỬA: Hiển thị Các đáp án trắc nghiệm dùng dangerouslySetInnerHTML */}
                                          <div 
                                              className={`text-base ${textColor} leading-relaxed q-content-view`}
                                              dangerouslySetInnerHTML={{ __html: opt }}
                                          />
                                      </div>
                                      <div className="flex items-center gap-3">
                                          {isStudentChoice && <Badge className="bg-slate-600 hover:bg-slate-700 text-white">Học sinh chọn</Badge>}
                                          {icon}
                                      </div>
                                  </div>
                              );
                          });
                      })()}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
                  <span className="font-black text-slate-500 uppercase tracking-widest text-sm">Điểm đạt được:</span>
                  {isEssay ? (
                    <Input 
                      type="number" step="0.1" min="0" max={ans.maxPoints}
                      value={scores[q._id] ?? ''}
                      onChange={(e) => handleScoreChange(q._id, e.target.value, ans.maxPoints)}
                      className="w-28 h-14 text-center font-black text-2xl text-amber-600 border-2 border-amber-300 bg-amber-50 focus-visible:ring-amber-500 rounded-xl"
                    />
                  ) : (
                    <div className={`w-28 h-14 rounded-xl flex items-center justify-center font-black text-2xl border-2 ${ans.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                      {ans.pointsAwarded}
                    </div>
                  )}
                </div>

              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

export default GradeStudent;