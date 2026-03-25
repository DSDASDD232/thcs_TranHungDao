import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, UploadCloud, CheckCircle, AlertCircle, 
  Sparkles, FileText, Loader2, Image as ImageIcon,
  PenTool, Database, PlusCircle, Trash2
} from "lucide-react";

const CreateAssignment = () => {
  const navigate = useNavigate();
  const assignmentFileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [creationMethod, setCreationMethod] = useState("manual"); 
  
  const [newAssignment, setNewAssignment] = useState({ 
    title: "", targetClass: "", subject: "Toán", duration: "", dueDate: "", questions: [] 
  });

  const [manualQuestions, setManualQuestions] = useState([
    { 
      tempId: Date.now(), 
      content: "", 
      type: "multiple_choice", 
      options: ["", "", "", ""], 
      correctAnswer: "A", 
      difficulty: "medium", 
      imageFile: null, 
      previewUrl: "" 
    }
  ]);

  const [assignmentFile, setAssignmentFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [profRes, questionsRes] = await Promise.all([
          axios.get("http://localhost:5001/api/teacher/me", config),
          axios.get("http://localhost:5001/api/questions/all", config)
        ]);
        
        setTeacherProfile(profRes.data);
        setQuestions(questionsRes.data?.questions || []);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      }
    };
    fetchData();
  }, [navigate]);

  const handleAddManualQuestion = () => {
    setManualQuestions([...manualQuestions, {
      tempId: Date.now(), 
      content: "", 
      type: "multiple_choice", 
      options: ["", "", "", ""], 
      correctAnswer: "A", 
      difficulty: "medium",
      imageFile: null,
      previewUrl: ""
    }]);
  };

  const handleRemoveManualQuestion = (tempId) => {
    setManualQuestions(manualQuestions.filter(q => q.tempId !== tempId));
  };

  const handleManualChange = (tempId, field, value) => {
    setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  };

  const handleManualOptionChange = (tempId, optionIndex, value) => {
    setManualQuestions(manualQuestions.map(q => {
      if (q.tempId === tempId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleManualImageChange = (tempId, e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setManualQuestions(manualQuestions.map(q => 
        q.tempId === tempId ? { ...q, imageFile: file, previewUrl: previewUrl } : q
      ));
    }
  };

  const handleRemoveManualImage = (tempId) => {
    setManualQuestions(manualQuestions.map(q => 
      q.tempId === tempId ? { ...q, imageFile: null, previewUrl: "" } : q
    ));
  };

  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAssignmentFile(file);
  };

  const handleExtractWord = async () => {
    if (!assignmentFile) return alert("Vui lòng chọn file Word trước!");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", assignmentFile);
      formData.append("subject", newAssignment.subject);
      formData.append("grade", newAssignment.targetClass ? newAssignment.targetClass.replace(/\D/g, '').substring(0, 1) : "6");

      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:5001/api/assignments/extract-word", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      
      setManualQuestions(res.data.questions);
      setCreationMethod("manual"); 
      alert("✅ Đã bóc tách xong! Thầy/cô vui lòng kiểm tra lại câu hỏi bên dưới.");
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi bóc tách file Word. Hãy chắc chắn file Word tuân thủ mẫu.");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelection = (id) => {
    setNewAssignment(p => ({ 
      ...p, questions: p.questions.includes(id) ? p.questions.filter(x => x !== id) : [...p.questions, id] 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAssignment.targetClass) return alert("Vui lòng chọn lớp để giao bài!");
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (creationMethod === "bank") {
        if (newAssignment.questions.length === 0) {
          setLoading(false); return alert("Chọn ít nhất 1 câu hỏi từ kho!");
        }
        await axios.post("http://localhost:5001/api/assignments/create", newAssignment, { headers: { Authorization: `Bearer ${token}` } });
      } 
      else if (creationMethod === "manual" || creationMethod === "upload") {
        const isValid = manualQuestions.every(q => q.content.trim() !== "");
        if (!isValid) { setLoading(false); return alert("Vui lòng điền nội dung cho tất cả câu hỏi thủ công!"); }

        const formData = new FormData();
        formData.append("title", newAssignment.title);
        formData.append("targetClass", newAssignment.targetClass);
        formData.append("subject", newAssignment.subject);
        formData.append("duration", newAssignment.duration);
        formData.append("dueDate", newAssignment.dueDate);
        
        const questionsToSave = manualQuestions.map(q => ({
            tempId: q.tempId, content: q.content, type: q.type, options: q.options, correctAnswer: q.correctAnswer, difficulty: q.difficulty, subject: q.subject
        }));
        formData.append("questionsData", JSON.stringify(questionsToSave));

        manualQuestions.forEach(q => {
            if (q.imageFile) formData.append(`image_${q.tempId}`, q.imageFile);
        });

        await axios.post("http://localhost:5001/api/assignments/create-manual", formData, { 
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } 
        });
      }

      alert("✅ Giao bài thành công!");
      navigate("/teacher-dashboard");
    } catch (err) { 
      alert(err.response?.data?.message || "Lỗi giao bài! Vui lòng thử lại."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/40 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/teacher-dashboard")}
          className="text-sky-600 hover:text-sky-700 hover:bg-sky-100 font-bold px-0 mb-6 h-auto"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Hủy & Quay lại
        </Button>

        <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden mb-10">
          <CardHeader className="bg-sky-500 text-white p-8 border-b border-sky-600">
            <CardTitle className="text-3xl font-black">Phát hành Bài tập mới</CardTitle>
            <p className="text-sky-100 font-medium mt-2">Thiết lập các thông số để giao bài cho học sinh.</p>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* --- BƯỚC 1: THÔNG TIN CHUNG --- */}
              <div className="space-y-4">
                <h3 className="text-xl font-black text-sky-900 border-b border-sky-100 pb-2">1. Thông tin chung</h3>
                <Input 
                  placeholder="Nhập tên bài tập (VD: Bài kiểm tra 15 phút)..." 
                  className="h-14 rounded-xl bg-slate-50 font-bold text-lg border-sky-100 focus-visible:ring-sky-500" 
                  value={newAssignment.title} 
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})} 
                  required 
                />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 ml-1">Giao cho Lớp</label>
                    <Select value={newAssignment.targetClass} onValueChange={(val) => setNewAssignment({...newAssignment, targetClass: val})} required>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 font-bold border-sky-100">
                        <SelectValue placeholder="Chọn Lớp" />
                      </SelectTrigger>
                      <SelectContent>
                        {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
                          <SelectItem value="none" disabled>Chưa chọn lớp phụ trách</SelectItem>
                        ) : (
                          teacherProfile.assignedClasses.map(c => <SelectItem key={c._id || c} value={c.name}>{c.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 ml-1">Môn học</label>
                    <Select value={newAssignment.subject} onValueChange={(val) => setNewAssignment({...newAssignment, subject: val})} required>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 font-bold border-sky-100">
                        <SelectValue placeholder="Chọn môn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Toán">Toán</SelectItem>
                        <SelectItem value="Ngữ Văn">Ngữ Văn</SelectItem>
                        <SelectItem value="Tiếng Anh">Tiếng Anh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 ml-1">Thời gian (Phút)</label>
                    <Input type="number" placeholder="VD: 45" className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold" value={newAssignment.duration} onChange={(e) => setNewAssignment({...newAssignment, duration: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 ml-1">Hạn nộp</label>
                    <Input type="datetime-local" className="h-12 rounded-xl bg-slate-50 border-sky-100 font-bold text-slate-600" value={newAssignment.dueDate} onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})} required />
                  </div>
                </div>
              </div>

              {/* --- BƯỚC 2: CHỌN NỘI DUNG ĐỀ THI --- */}
              <div className="space-y-4">
                <h3 className="text-xl font-black text-sky-900 border-b border-sky-100 pb-2">2. Xây dựng Đề thi</h3>
                
                {/* MENU 3 TAB */}
                <div className="flex bg-slate-100 rounded-xl w-full p-1 overflow-x-auto">
                  <button type="button" onClick={() => setCreationMethod("manual")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${creationMethod === 'manual' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}>
                    <PenTool className="w-4 h-4"/> Nhập thủ công
                  </button>
                  <button type="button" onClick={() => setCreationMethod("upload")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${creationMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}>
                    <FileText className="w-4 h-4"/> Tải file Word mẫu
                  </button>
                  <button type="button" onClick={() => setCreationMethod("bank")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${creationMethod === 'bank' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}>
                    <Database className="w-4 h-4"/> Chọn từ Kho câu hỏi
                  </button>
                </div>

                <div className="mt-4 border border-sky-100 bg-sky-50/30 rounded-2xl p-4 md:p-6">
                  
                  {/* TAB 1: NHẬP THỦ CÔNG */}
                  {creationMethod === "manual" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
                        <span className="font-bold text-sky-800">Danh sách câu hỏi đang soạn ({manualQuestions.length} câu)</span>
                        <Button type="button" onClick={handleAddManualQuestion} variant="outline" className="bg-sky-50 text-sky-600 hover:bg-sky-100 border-sky-200 font-bold"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu hỏi</Button>
                      </div>

                      {manualQuestions.map((q, index) => (
                        <Card key={q.tempId} className="border-sky-200 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-2 h-full bg-sky-500"></div>
                          <CardHeader className="bg-slate-50/50 py-3 flex flex-row justify-between items-center border-b border-sky-50">
                            <CardTitle className="text-base font-black text-sky-900">Câu {index + 1}</CardTitle>
                            <Button type="button" onClick={() => handleRemoveManualQuestion(q.tempId)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-4 h-4"/></Button>
                          </CardHeader>
                          <CardContent className="p-5 space-y-4">
                            
                            <div className="flex gap-4">
                              <Select value={q.type} onValueChange={(val) => handleManualChange(q.tempId, 'type', val)}>
                                <SelectTrigger className="h-11 rounded-xl bg-white border-sky-100 font-bold w-[180px]">
                                  {/* ÉP CỨNG TIẾNG VIỆT */}
                                  <span className="truncate">{q.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                                  <SelectItem value="essay">Tự luận</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={q.difficulty} onValueChange={(val) => handleManualChange(q.tempId, 'difficulty', val)}>
                                <SelectTrigger className="h-11 rounded-xl bg-white border-sky-100 font-medium w-[150px]">
                                  {/* ÉP CỨNG TIẾNG VIỆT */}
                                  <span className="truncate">{q.difficulty === "easy" ? "Dễ" : q.difficulty === "hard" ? "Khó" : "Trung bình"}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Dễ</SelectItem>
                                  <SelectItem value="medium">Trung bình</SelectItem>
                                  <SelectItem value="hard">Khó</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                              <Textarea 
                                placeholder="Nội dung câu hỏi..." 
                                className="flex-1 rounded-xl min-h-[120px] border-sky-100 font-medium bg-white" 
                                value={q.content} 
                                onChange={(e) => handleManualChange(q.tempId, 'content', e.target.value)} 
                              />
                              
                              <div className="w-full md:w-36 shrink-0 h-[120px]">
                                {q.previewUrl ? (
                                  <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group">
                                    <img src={q.previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button type="button" onClick={() => handleRemoveManualImage(q.tempId)} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform">
                                        <Trash2 className="w-4 h-4"/>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50 cursor-pointer transition-all">
                                    <ImageIcon className="w-6 h-6 text-sky-400 mb-1" />
                                    <span className="text-xs font-bold text-sky-600 text-center px-1">Thêm ảnh</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualImageChange(q.tempId, e)} />
                                  </label>
                                )}
                              </div>
                            </div>

                            {q.type === "multiple_choice" && (
                              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-3 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {['A', 'B', 'C', 'D'].map((optLabel, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className="font-bold text-slate-500 w-6">{optLabel}.</span>
                                      <Input 
                                        placeholder={`Đáp án ${optLabel}`} 
                                        className="h-11 rounded-xl bg-white border-sky-100" 
                                        value={q.options[optIdx]} 
                                        onChange={(e) => handleManualOptionChange(q.tempId, optIdx, e.target.value)} 
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-end pt-2 border-t border-sky-100 gap-3">
                                  <label className="text-sm font-bold text-rose-600">Đáp án ĐÚNG:</label>
                                  <Select value={q.correctAnswer} onValueChange={(val) => handleManualChange(q.tempId, 'correctAnswer', val)}>
                                    <SelectTrigger className="h-10 w-28 bg-white text-rose-600 font-bold border-rose-200 rounded-xl">
                                      <span className="truncate">{q.correctAnswer ? `Câu ${q.correctAnswer}` : "Chọn"}</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A">Câu A</SelectItem>
                                      <SelectItem value="B">Câu B</SelectItem>
                                      <SelectItem value="C">Câu C</SelectItem>
                                      <SelectItem value="D">Câu D</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button type="button" onClick={handleAddManualQuestion} variant="outline" className="w-full h-14 border-dashed border-2 border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-400 font-bold text-lg rounded-2xl transition-all">
                        <PlusCircle className="w-5 h-5 mr-2"/> Thêm câu hỏi tiếp theo
                      </Button>
                    </div>
                  )}

                  {/* TAB 2: UPLOAD FILE WORD */}
                  {creationMethod === "upload" && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm text-center">
                        <h4 className="font-bold text-sky-900 text-lg mb-2">Bóc tách câu hỏi tự động</h4>
                        <p className="text-slate-500 text-sm mb-4">Tải file Word lên, hệ thống sẽ đọc và tự động đẩy dữ liệu sang phần <strong>Nhập thủ công</strong> để thầy/cô rà soát lại.</p>
                        
                        <div 
                          onDragOver={(e) => e.preventDefault()} 
                          onDrop={(e) => {e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setAssignmentFile(f);}} 
                          onClick={() => assignmentFileRef.current.click()} 
                          className={`border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 max-w-lg mx-auto ${assignmentFile ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-400 bg-slate-50/50'}`}
                        >
                          <input type="file" ref={assignmentFileRef} onChange={handleAssignmentFileChange} className="hidden" accept=".doc,.docx" />
                          {assignmentFile ? (
                            <>
                              <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mb-1"><FileText className="h-7 w-7 text-sky-600" /></div>
                              <p className="font-black text-sky-900 text-lg line-clamp-1">{assignmentFile.name}</p>
                              <p className="text-xs text-sky-600 font-medium bg-white px-3 py-1 rounded-full border border-sky-100">Click để đổi file khác</p>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-1"><UploadCloud className="h-8 w-8 text-sky-400" /></div>
                              <p className="text-base font-black text-slate-700">Kéo thả file Word (.docx) vào đây</p>
                            </>
                          )}
                        </div>
                        
                        {assignmentFile && (
                          <Button type="button" onClick={handleExtractWord} className="mt-6 bg-teal-500 hover:bg-teal-600 text-white font-bold h-12 px-8 rounded-xl shadow-md">
                            <Sparkles className="w-4 h-4 mr-2" /> Bắt đầu bóc tách
                          </Button>
                        )}
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start max-w-2xl mx-auto">
                        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium leading-relaxed">Hệ thống nhận diện dựa trên định dạng chuẩn. Bạn có thể <a href="#" className="font-bold text-sky-600 underline">tải File mẫu tại đây</a> để xem cách cấu trúc câu hỏi.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TỪ KHO CÂU HỎI */}
                  {creationMethod === "bank" && (
                    <div className="border border-sky-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-sky-50 px-4 py-3 flex justify-between items-center border-b border-sky-100">
                        <span className="font-bold text-sky-800 flex items-center"><Database className="w-4 h-4 mr-2"/> Danh sách câu hỏi trong hệ thống</span>
                        <Badge className="bg-sky-500 hover:bg-sky-600 font-bold px-3 py-1 text-white">Đã chọn: {newAssignment.questions.length}</Badge>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2">
                        <Table>
                          <TableBody>
                            {questions.length === 0 ? (
                              <TableRow><TableCell className="text-center py-10 text-slate-400 italic">Kho câu hỏi trống.</TableCell></TableRow>
                            ) : questions.map((q) => (
                              <TableRow key={q._id} className="cursor-pointer hover:bg-sky-50 transition-colors" onClick={() => toggleQuestionSelection(q._id)}>
                                <TableCell className="w-12 text-center"><input type="checkbox" className="w-5 h-5 accent-sky-500 cursor-pointer" checked={newAssignment.questions.includes(q._id)} readOnly /></TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  <div className="flex items-start gap-3">
                                    {q.imageUrl && <ImageIcon className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />}
                                    <span className="line-clamp-2 leading-relaxed"><strong className="text-sky-700">[{q.grade ? `Khối ${q.grade}` : '?'}]</strong> {q.content}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xl shadow-xl shadow-sky-200 transition-all active:scale-95">
                  {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <CheckCircle className="mr-2 h-6 w-6" />}
                  Lưu & Phát hành Bài tập
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAssignment;