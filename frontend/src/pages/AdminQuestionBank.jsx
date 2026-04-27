import React, { useState, useEffect, useRef } from "react";
import axios from "../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, Database, Search, Filter, FileQuestion, Image as ImageIcon, Eye, Trash2, CheckCircle2, Pencil, PlusCircle
} from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import 'katex/dist/katex.min.css';

const AdminQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const editFileInputRef = useRef(null);
  const editEssayAnswerInputRef = useRef(null);

  // States cho Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // State xem chi tiết câu hỏi
  const [viewQuestion, setViewQuestion] = useState(null);

  // States cho Sửa câu hỏi
  const initialQuestionState = { 
      content: "", subject: "", type: "multiple_choice", difficulty: "medium", grade: "6", 
      options: ["", "", "", ""], correctAnswer: "A", points: "",
      essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" 
  };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(initialQuestionState);
  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  const [editSelectedFile, setEditSelectedFile] = useState(null);

  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/');
      if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
      return `${serverUrl}${cleanUrl}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectRes, questionRes] = await Promise.all([
        axios.get("/admin/subjects", getHeader()),
        axios.get("/questions/all", getHeader()) 
      ]);
      setSubjectList(subjectRes.data || []);
      setQuestions(questionRes.data.questions || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu Kho câu hỏi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi hệ thống?")) return;
    try {
      await axios.delete(`/questions/delete/${id}`, getHeader());
      setQuestions(prev => prev.filter(q => q._id !== id));
      alert("✅ Đã xóa câu hỏi thành công!");
    } catch (error) {
      alert("Lỗi khi xóa câu hỏi!");
    }
  };

  // =====================================
  // LOGIC SỬA CÂU HỎI CHO ADMIN
  // =====================================
  const handleEditClick = (q) => {
    setEditingQuestionId(q._id);
    let parsedOptions = [];
    
    if (Array.isArray(q.options) && q.options.length > 0) parsedOptions = q.options;
    else if (typeof q.options === 'string') {
      try { 
        parsedOptions = JSON.parse(q.options); 
        if (typeof parsedOptions[0] === 'string' && parsedOptions[0].startsWith('[')) parsedOptions = JSON.parse(parsedOptions[0]);
      } catch (e) { parsedOptions = [q.options]; }
    }
    
    let correctKey = "A";
    if (q.type === 'multiple_choice') {
      const validLetters = parsedOptions.map((_, i) => String.fromCharCode(65 + i));
      if (validLetters.includes(q.correctAnswer)) correctKey = q.correctAnswer;
      else {
          const index = parsedOptions.findIndex(opt => opt === q.correctAnswer);
          if (index !== -1) correctKey = validLetters[index];
      }
    }

    setEditQuestionData({
      content: q.content, 
      subject: q.subject || "Chung", 
      difficulty: q.difficulty, grade: q.grade || "6", type: q.type || "multiple_choice",
      options: parsedOptions, correctAnswer: correctKey,
      points: q.points || "",
      essayAnswerText: q.essayAnswerText || "", 
      essayAnswerImageFile: null,
      essayAnswerPreviewUrl: getImageUrl(q.essayAnswerImageUrl) || "" 
    });
    
    setEditPreviewUrl(getImageUrl(q.imageUrl));
    setIsEditDialogOpen(true);
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setEditSelectedFile(file); setEditPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleEditEssayAnswerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { 
        setEditQuestionData(prev => ({...prev, essayAnswerImageFile: file, essayAnswerPreviewUrl: URL.createObjectURL(file)})); 
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("content", editQuestionData.content); 
    formData.append("subject", editQuestionData.subject); 
    formData.append("difficulty", editQuestionData.difficulty); 
    formData.append("grade", editQuestionData.grade); 
    formData.append("type", editQuestionData.type);
    formData.append("points", editQuestionData.type === 'essay' ? (editQuestionData.points || 0) : 0);

    if (editQuestionData.type === "multiple_choice") {
      formData.append("correctAnswer", editQuestionData.correctAnswer);
      formData.append("options", JSON.stringify(editQuestionData.options));
    } else { 
      formData.append("correctAnswer", ""); 
      formData.append("options", "[]"); 
    }

    formData.append("essayAnswerText", editQuestionData.essayAnswerText || "");
    if (editQuestionData.essayAnswerImageFile) {
        formData.append("essayAnswerImage", editQuestionData.essayAnswerImageFile);
    } else if (!editQuestionData.essayAnswerPreviewUrl) {
        formData.append("essayAnswerImageUrl", ""); 
    }

    if (editSelectedFile) formData.append("image", editSelectedFile);
    else if (!editPreviewUrl) formData.append("imageUrl", ""); 

    try {
      const token = localStorage.getItem("token");
      await axios.put(`/questions/update/${editingQuestionId}`, formData, { 
          headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data" 
          } 
      });
      alert("✅ Cập nhật thành công!");
      setIsEditDialogOpen(false); 
      setEditPreviewUrl(""); 
      setEditSelectedFile(null); 
      fetchData(); // Tải lại danh sách sau khi sửa
    } catch (err) { 
      alert("Lỗi cập nhật!"); 
    }
  };

  const filteredQuestions = questions.filter(q => {
    const cleanContent = q.content ? q.content.replace(/<[^>]*>?/gm, '') : "";
    const matchesSearch = cleanContent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    const matchesType = filterType === "all" || q.type === filterType;
    
    return matchesSearch && matchesGrade && matchesSubject && matchesType;
  });

  return (
    <div className="space-y-6">
      <Card className="border-sky-100/50 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
        <CardHeader className="bg-sky-50/50 border-b border-sky-50 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <CardTitle className="text-xl font-bold text-sky-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-500" /> Quản lý Toàn bộ Kho Câu Hỏi
          </CardTitle>
          <Badge className="bg-sky-500 text-white shadow-none border-0 text-sm py-1">Tổng: {questions.length} câu</Badge>
        </CardHeader>
        
        <div className="p-4 sm:p-6 border-b border-slate-100 shrink-0">
           <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[250px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <Input
                   placeholder="Tìm nội dung câu hỏi..."
                   className="pl-9 h-11 bg-slate-50 border-sky-100 focus-visible:ring-sky-500 rounded-xl font-medium"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>

              <div className="flex items-center gap-2">
                 <Filter className="w-5 h-5 text-sky-500" />
                 <span className="text-sm font-bold text-slate-600 hidden sm:inline">Lọc:</span>
              </div>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-11 w-[130px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterSubject === 'all' ? 'Tất cả môn' : filterSubject}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả môn</SelectItem>
                  {subjectList.map(sub => (
                     <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="h-11 w-[120px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterGrade === 'all' ? 'Tất cả khối' : `Khối ${filterGrade}`}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khối</SelectItem>
                  <SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem>
                  <SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-11 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterType === 'all' ? 'Tất cả loại' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                  <SelectItem value="essay">Tự luận</SelectItem>
                </SelectContent>
              </Select>
           </div>
        </div>

        <div className="overflow-auto flex-1 p-4">
          <Table className="min-w-[800px] border-collapse relative">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[60px] text-center font-bold text-sky-800">STT</TableHead>
                <TableHead className="font-bold text-sky-800">Nội dung</TableHead>
                <TableHead className="w-[140px] font-bold text-center text-sky-800">Thông tin</TableHead>
                <TableHead className="w-[160px] font-bold text-center text-sky-800">Người tạo</TableHead>
                <TableHead className="w-[120px] text-center font-bold text-sky-800">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto" /></TableCell></TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500"><FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />Không tìm thấy câu hỏi nào.</TableCell></TableRow>
              ) : (
                filteredQuestions.map((q, index) => (
                  <TableRow key={q._id} className="hover:bg-sky-50/50 transition-colors">
                    <TableCell className="text-center font-bold text-slate-400 align-top pt-4">{index + 1}</TableCell>
                    
                    <TableCell className="align-top pt-4">
                      <div className="flex items-start gap-3 w-full">
                         {q.imageUrl && <ImageIcon className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />}
                         <div className="font-medium text-slate-700 text-sm line-clamp-3 break-words q-content-view" dangerouslySetInnerHTML={{ __html: q.content }} />
                      </div>
                    </TableCell>

                    <TableCell className="text-center align-top pt-4">
                       <div className="flex flex-col items-center gap-1.5">
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-0 whitespace-nowrap">{q.subject} - Khối {q.grade}</Badge>
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] whitespace-nowrap">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                       </div>
                    </TableCell>
                    
                    <TableCell className="text-center font-medium text-slate-600 text-sm align-top pt-4">
                       {q.teacher ? q.teacher.fullName : "Hệ thống"}
                    </TableCell>
                    
                    <TableCell className="text-center align-top pt-3">
                       <div className="flex justify-center gap-1">
                         {/* 👉 Nút Edit đã được thêm vào */}
                         <Button onClick={() => handleEditClick(q)} variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-100 rounded-lg"><Pencil className="w-4 h-4" /></Button>
                         <Button onClick={() => setViewQuestion(q)} variant="ghost" size="icon" className="h-8 w-8 text-sky-500 hover:bg-sky-100 rounded-lg"><Eye className="w-4 h-4" /></Button>
                         <Button onClick={() => handleDeleteQuestion(q._id)} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ======================================= */}
      {/* DIALOG SỬA CÂU HỎI CHUẨN */}
      {/* ======================================= */}
      <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setEditPreviewUrl(""); setEditSelectedFile(null); setEditQuestionData(initialQuestionState);}}}>
        <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-4 sm:p-8 bg-slate-50">
          <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2 border-b border-sky-100 pb-3"><Pencil className="h-5 sm:h-6 w-5 sm:w-6 text-sky-500"/> Chỉnh sửa câu hỏi (Admin)</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateQuestion} className="space-y-5 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger>
                <SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
              </Select>
              
              <Select value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger>
                <SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
              </Select>

              <Select value={editQuestionData.subject} onValueChange={(v) => setEditQuestionData({...editQuestionData, subject: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.subject}</span></SelectTrigger>
                <SelectContent>
                  {subjectList.map(sub => (
                     <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editQuestionData.type === 'essay' && (
               <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
                 <label className="text-sm font-bold text-slate-600 block mb-2">Điểm số định mức cho câu Tự luận</label>
                 <Input type="number" step="0.25" min="0" placeholder="" value={editQuestionData.points} onChange={(e) => setEditQuestionData({...editQuestionData, points: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-sky-100 font-black text-sky-700 w-full sm:w-1/2" />
               </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <RichTextEditor 
                  placeholder="Nhập nội dung đề bài..." 
                  value={editQuestionData.content} 
                  onChange={(val) => setEditQuestionData({...editQuestionData, content: val})} 
                />
              </div>
              <div className="w-full md:w-40 shrink-0 h-[140px]">
                {editPreviewUrl ? (
                  <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group bg-white">
                    <img src={editPreviewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => {setEditPreviewUrl(""); setEditSelectedFile(null);}} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button></div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-white cursor-pointer transition-all"><ImageIcon className="w-8 h-8 text-sky-400 mb-2" /><span className="text-sm font-bold text-sky-600 text-center px-1">Ảnh Đề bài</span><input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={handleEditFileChange} /></label>
                )}
              </div>
            </div>

            {/* Khung Hướng dẫn giải */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                <label className="text-sm font-bold text-emerald-700 block mb-3 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <RichTextEditor 
                      placeholder="Nhập lời giải..." 
                      value={editQuestionData.essayAnswerText} 
                      onChange={(val) => setEditQuestionData({...editQuestionData, essayAnswerText: val})} 
                    />
                  </div>
                  <div className="w-full md:w-32 shrink-0 h-[120px]">
                    {editQuestionData.essayAnswerPreviewUrl ? (
                      <div className="relative w-full h-full rounded-xl border border-emerald-200 overflow-hidden shadow-sm group bg-white">
                        <img src={editQuestionData.essayAnswerPreviewUrl} alt="Preview Answer" className="absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => setEditQuestionData(prev => ({...prev, essayAnswerPreviewUrl: "", essayAnswerImageFile: null}))} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button></div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-white cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-emerald-400 mb-2" /><span className="text-xs font-bold text-emerald-600 text-center px-1">Ảnh Lời giải</span><input type="file" ref={editEssayAnswerInputRef} className="hidden" accept="image/*" onChange={handleEditEssayAnswerImageChange} /></label>
                    )}
                  </div>
                </div>
            </div>

            {editQuestionData.type === "multiple_choice" && (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editQuestionData.options.map((opt, i) => {
                    const k = String.fromCharCode(65 + i);
                    return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-bold text-sky-800 w-5">{k}.</span>
                      <Input placeholder={`Nhập đáp án ${k}`} className="h-12 rounded-xl bg-slate-50 border-sky-100 font-medium" value={opt} onChange={(e) => {
                        const newOpts = [...editQuestionData.options];
                        newOpts[i] = e.target.value;
                        setEditQuestionData({...editQuestionData, options: newOpts});
                      }} required />
                      {editQuestionData.options.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => {
                              const newOpts = editQuestionData.options.filter((_, idx) => idx !== i);
                              setEditQuestionData({...editQuestionData, options: newOpts});
                          }} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0"><Trash2 className="w-4 h-4"/></Button>
                      )}
                    </div>
                  )})}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditQuestionData({...editQuestionData, options: [...editQuestionData.options, ""]})} className="text-sky-600 hover:bg-sky-100 w-max"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                    <Select value={editQuestionData.correctAnswer || ""} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}>
                      <SelectTrigger className="h-11 w-full sm:w-32 bg-rose-50 text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                      <SelectContent>
                        {editQuestionData.options.map((_, i) => {
                           const l = String.fromCharCode(65 + i);
                           return <SelectItem key={l} value={l}>Câu {l}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl mt-2">Cập nhật thay đổi</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG XEM CHI TIẾT CÂU HỎI */}
      <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
        <DialogContent className="sm:max-w-[700px] w-[95%] rounded-[2rem] border-none p-0 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-3">
                  <Eye className="w-6 h-6 text-sky-500" /> Chi tiết câu hỏi
              </DialogTitle>
              <Badge className="bg-sky-100 text-sky-700 shadow-none border-0 px-3 py-1 text-sm">{viewQuestion?.subject} - Khối {viewQuestion?.grade}</Badge>
          </DialogHeader>
          
          {viewQuestion && (
            <div className="space-y-6 p-8">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-800 text-lg leading-relaxed q-content-view" dangerouslySetInnerHTML={{ __html: viewQuestion.content }} />
                  {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-w-full max-h-72 mt-4 rounded-xl border border-slate-200 shadow-sm mx-auto" alt="Ảnh minh họa" />}
              </div>

              {/* Hướng dẫn giải hiển thị cho mọi loại câu hỏi */}
              {(viewQuestion.essayAnswerText || viewQuestion.essayAnswerImageUrl) && (
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
                      <p className="font-bold text-emerald-700 text-sm uppercase tracking-widest mb-3 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2"/> Hướng dẫn giải</p>
                      {viewQuestion.essayAnswerText && (
                        <div className="font-medium text-emerald-900 text-base leading-relaxed whitespace-pre-wrap q-content-view bg-white p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: viewQuestion.essayAnswerText }} />
                      )}
                      {viewQuestion.essayAnswerImageUrl && <img src={getImageUrl(viewQuestion.essayAnswerImageUrl)} className="max-w-full max-h-72 mt-4 rounded-xl border border-emerald-200 shadow-sm mx-auto" alt="Ảnh hướng dẫn giải" />}
                  </div>
              )}

              {viewQuestion.type === "multiple_choice" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    let parsedOpts = [];
                    try { parsedOpts = typeof viewQuestion.options === 'string' ? JSON.parse(viewQuestion.options) : (viewQuestion.options || []); } catch(e) {}
                    return parsedOpts.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrect = viewQuestion.correctAnswer === letter || viewQuestion.correctAnswer === opt;
                      return (
                          <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors ${isCorrect ? 'bg-sky-50 border-sky-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 ${isCorrect ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{letter}</div>
                              <span className={`text-base q-content-view break-words ${isCorrect ? 'font-bold text-sky-800' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{ __html: opt }} />
                              {isCorrect && <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0 ml-auto"/>}
                          </div>
                      )
                    });
                  })()}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4"><Button onClick={() => setViewQuestion(null)} className="h-12 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-bold px-8 transition-transform active:scale-95">Đóng xem trước</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuestionBank;