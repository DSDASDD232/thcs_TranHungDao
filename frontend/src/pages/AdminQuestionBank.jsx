import React, { useState, useEffect } from "react";
import axios from "../lib/axios";
import { Card, CardTitle, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, Database, Search, Filter, FileQuestion, Image as ImageIcon, Eye, CheckCircle2, Lock, Unlock, Video, FileAudio, LibraryBig
} from "lucide-react";

import 'katex/dist/katex.min.css';

// ==========================================
// CÁC HÀM HỖ TRỢ XỬ LÝ NỘI DUNG VÀ RENDER
// ==========================================
const renderLatexContent = (htmlString) => {
  if (!htmlString) return "";
  return htmlString; 
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

const renderVideoUrl = (url) => {
    if(!url) return null;
    if(url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) {
        let videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
        if(videoId) {
            let ampersandPosition = videoId.indexOf('&');
            if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
            return <iframe className="w-full aspect-video rounded-xl shadow-sm mt-2 border border-slate-200" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
        }
    }
    if (url.includes("drive.google.com")) {
        return (
            <div className="w-full flex flex-col items-center mt-2">
                <div className="h-[200px] sm:h-[350px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                    <iframe className="w-full h-full relative z-10" src={getDriveEmbedUrl(url)} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
                </div>
            </div>
        );
    }
    if (isAudioFile(url) || (url.includes("/video/upload/") && url.match(/\.(mp3|wav|m4a|ogg)$/i))) {
        return (
            <div className="bg-white p-6 w-full max-w-md mx-auto rounded-xl flex flex-col items-center mt-2 border border-slate-200 shadow-sm">
                <FileAudio className="w-12 h-12 text-indigo-400 mb-4" />
                <audio controls className="w-full" src={url} />
            </div>
        );
    }
    if (url.includes("/video/upload/") || url.match(/\.(mp4|mov|webm)$/i)) {
        return (
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black flex justify-center mt-2">
                <video className="w-full max-h-[400px] object-contain" controls src={url} preload="metadata" playsInline />
            </div>
        );
    }
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline break-all mt-2 inline-block">{url}</a>;
};


const AdminQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterExam, setFilterExam] = useState("all");

  // State xem chi tiết câu hỏi
  const [viewQuestion, setViewQuestion] = useState(null);

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

  const handleToggleStatus = async (id) => {
      try {
          const res = await axios.put(`/questions/toggle-status/${id}`, {}, getHeader());
          setQuestions(prev => prev.map(q => q._id === id ? { ...q, isActive: res.data.isActive } : q));
          alert(res.data.message);
      } catch (error) {
          alert("Có lỗi xảy ra khi thay đổi trạng thái câu hỏi.");
      }
  };

  // 👉 LOGIC LỌC ĐỘNG: Danh sách Đề thi dựa vào Khối và Môn đã chọn
  const dynamicExamList = [...new Set(questions
    .filter(q => (filterSubject === "all" || q.subject === filterSubject) && 
                 (filterGrade === "all" || String(q.grade) === filterGrade))
    .map(q => q.examName)
    .filter(Boolean)
  )];

  const filteredQuestions = questions.filter(q => {
    const cleanContent = q.content ? q.content.replace(/<[^>]*>?/gm, '') : "";
    const matchesSearch = cleanContent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    const matchesType = filterType === "all" || q.type === filterType;
    const matchesExam = filterExam === "all" || q.examName === filterExam;
    
    return matchesSearch && matchesGrade && matchesSubject && matchesType && matchesExam;
  });

  return (
    <div className="space-y-6">
      <Card className="border-sky-100/50 shadow-sm rounded-3xl bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
        <CardHeader className="bg-sky-50/50 border-b border-sky-50 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <CardTitle className="text-xl font-bold text-sky-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-500" /> Quản lý Toàn bộ Kho Câu Hỏi
          </CardTitle>
          <Badge className="bg-sky-500 text-white shadow-none border-0 text-sm py-1">Tổng: {filteredQuestions.length} câu</Badge>
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

              <Select value={filterSubject} onValueChange={(val) => { setFilterSubject(val); setFilterExam("all"); }}>
                <SelectTrigger className="h-11 w-[130px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterSubject === 'all' ? 'Tất cả môn' : filterSubject}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="bg-white z-50">
                  <SelectItem value="all">Tất cả môn</SelectItem>
                  {subjectList.map(sub => (
                     <SelectItem key={sub._id} value={sub.name}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterGrade} onValueChange={(val) => { setFilterGrade(val); setFilterExam("all"); }}>
                <SelectTrigger className="h-11 w-[120px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterGrade === 'all' ? 'Tất cả khối' : `Khối ${filterGrade}`}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="bg-white z-50">
                  <SelectItem value="all">Tất cả khối</SelectItem>
                  <SelectItem value="6">Khối 6</SelectItem>
                  <SelectItem value="7">Khối 7</SelectItem>
                  <SelectItem value="8">Khối 8</SelectItem>
                  <SelectItem value="9">Khối 9</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-11 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterType === 'all' ? 'Tất cả loại' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="bg-white z-50">
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                  <SelectItem value="essay">Tự luận</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="h-11 w-[150px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                  <span className="truncate">{filterExam === 'all' ? 'Tất cả Tập câu hỏi' : filterExam}</span>
                </SelectTrigger>
                <SelectContent position="popper" className="bg-white z-50 max-h-[300px]">
                  <SelectItem value="all">Tất cả Tập câu hỏi</SelectItem>
                  {dynamicExamList.map((e, i) => (
                    <SelectItem key={i} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

           </div>
        </div>

        <div className="overflow-auto flex-1 p-4">
          <Table className="min-w-[800px] border-collapse relative">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[60px] text-center font-bold text-sky-800">STT</TableHead>
                <TableHead className="font-bold text-sky-800 w-[50%] min-w-[300px] max-w-[500px]">Nội dung</TableHead>
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
                filteredQuestions.map((q, index) => {
                  // Chặn render null isActive, quy ước undefined là true
                  const isQActive = q.isActive !== false; 

                  return (
                  <TableRow key={q._id} className={`${!isQActive ? 'bg-rose-50/30 grayscale-[50%]' : 'hover:bg-sky-50/50'} transition-colors border-b border-slate-100`}>
                    <TableCell className="text-center font-bold text-slate-400 align-middle text-lg">{index + 1}</TableCell>
                    
                    <TableCell className="align-middle py-4 w-[50%] max-w-[500px]">
                      <div className="flex flex-col gap-1 pr-4 w-full">
                         <div className="font-medium text-slate-700 text-[15px] leading-relaxed line-clamp-2 q-content-view break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }} />
                         <div className="flex items-center gap-2 mt-1">
                            {(q.imageUrl || (q.content && q.content.includes('<img'))) && <Badge variant="outline" className="text-[10px] text-sky-600 bg-sky-50 border-0 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/>Ảnh</Badge>}
                            {q.videoUrl && <Badge variant="outline" className="text-[10px] text-purple-600 bg-purple-50 border-0 flex items-center"><Video className="w-3 h-3 mr-1"/>Video</Badge>}
                            {q.examName && <Badge variant="outline" className="text-[10px] text-indigo-600 bg-indigo-50 border-0 flex items-center"><LibraryBig className="w-3 h-3 mr-1"/> Tập câu hỏi: {q.examName}</Badge>}
                         </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center align-middle py-4">
                       <div className="flex flex-col items-center gap-1.5">
                          <span className="text-sky-700 font-bold text-xs">{q.subject} - Khối {q.grade}</span>
                          <Badge variant="outline" className={`${q.type==='essay' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-50 text-slate-500 border-slate-200'} text-[11px] font-medium justify-center`}>{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                       </div>
                    </TableCell>
                    
                    <TableCell className="text-center font-medium text-slate-600 text-sm align-middle py-4">
                       <div className="flex flex-col items-center gap-1">
                           <span className="font-bold">{q.teacher ? q.teacher.fullName : "Hệ thống"}</span>
                           {isQActive ? (
                               <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">Đang phát hành</span>
                           ) : (
                               <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">Đã bị khóa</span>
                           )}
                       </div>
                    </TableCell>
                    
                    <TableCell className="text-center align-middle py-4 shrink-0">
                       <div className="flex justify-center items-center gap-1">
                         <Button onClick={() => handleToggleStatus(q._id)} variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${isQActive ? 'text-amber-500 hover:bg-amber-100' : 'text-emerald-500 hover:bg-emerald-100'}`} title={isQActive ? "Khóa câu hỏi này" : "Mở khóa câu hỏi"}>
                             {isQActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                         </Button>
                         <Button onClick={() => setViewQuestion(q)} variant="ghost" size="icon" className="h-8 w-8 text-sky-500 hover:bg-sky-100 rounded-lg" title="Xem chi tiết"><Eye className="w-4 h-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* DIALOG XEM CHI TIẾT CÂU HỎI */}
      <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
        <DialogContent className="sm:max-w-[700px] w-[95%] rounded-[2rem] border-none p-0 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex flex-row items-center justify-between sticky top-0 z-20">
              <DialogTitle className="text-xl font-black text-sky-950 flex items-center gap-3">
                  <Eye className="w-6 h-6 text-sky-500" /> Chi tiết câu hỏi
              </DialogTitle>
              <Badge className="bg-sky-100 text-sky-700 shadow-none border-0 px-3 py-1 text-sm">{viewQuestion?.subject} - Khối {viewQuestion?.grade}</Badge>
          </DialogHeader>
          
          {viewQuestion && (
            <div className="space-y-6 p-8 pt-6">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="font-bold text-slate-800 text-lg leading-relaxed q-content-view" dangerouslySetInnerHTML={{ __html: renderLatexContent(viewQuestion.content) }} />
                  {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-w-full max-h-72 mt-4 rounded-xl border border-slate-200 shadow-sm mx-auto" alt="Ảnh minh họa" />}
                  
                  {/* HIỂN THỊ VIDEO/AUDIO */}
                  {viewQuestion.videoUrl && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                         <p className="text-sm font-bold text-slate-600 mb-2 flex items-center"><Video className="w-4 h-4 mr-1 text-slate-500"/> Video / Link đính kèm</p>
                         {renderVideoUrl(viewQuestion.videoUrl)}
                      </div>
                  )}
              </div>

              {(viewQuestion.essayAnswerText || viewQuestion.essayAnswerImageUrl) && (
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
                      <p className="font-bold text-emerald-700 text-sm uppercase tracking-widest mb-3 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2"/> Hướng dẫn giải</p>
                      {viewQuestion.essayAnswerText && (
                        <div className="font-medium text-emerald-900 text-base leading-relaxed whitespace-pre-wrap q-content-view bg-white p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: renderLatexContent(viewQuestion.essayAnswerText) }} />
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
                              <span className={`text-base q-content-view break-words ${isCorrect ? 'font-bold text-sky-800' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{ __html: renderLatexContent(opt) }} />
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