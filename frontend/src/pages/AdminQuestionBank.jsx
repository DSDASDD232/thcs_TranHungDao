import React, { useState, useEffect } from "react";
import axios from "../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, Database, Search, Filter, FileQuestion, Image as ImageIcon, Eye, Trash2, CheckCircle2 
} from "lucide-react";

const AdminQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Bộ lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");

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
      // Gọi API lấy môn học và toàn bộ câu hỏi
      const [subjectRes, questionRes] = await Promise.all([
        axios.get("/admin/subjects", getHeader()),
        axios.get("/questions/all", getHeader()) // API này tự động trả về ALL câu hỏi nếu là Admin
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

  // Lọc dữ liệu
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = (q.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchesSubject = filterSubject === "all" || q.subject === filterSubject;
    const matchesType = filterType === "all" || q.type === filterType;
    
    return matchesSearch && matchesGrade && matchesSubject && matchesType;
  });

  return (
    <div className="space-y-6">
      <Card className="border-sky-100/50 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-sky-50/50 border-b border-sky-50 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-sky-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-500" /> Quản lý Toàn bộ Kho Câu Hỏi
          </CardTitle>
          <Badge className="bg-sky-500 text-white shadow-none border-0 text-sm py-1">Tổng: {questions.length} câu</Badge>
        </CardHeader>
        
        <div className="p-4 sm:p-6 border-b border-slate-100">
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

        <div className="overflow-x-auto p-4">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center font-bold text-sky-800">STT</TableHead>
                <TableHead className="font-bold text-sky-800">Nội dung</TableHead>
                <TableHead className="font-bold text-center text-sky-800">Thông tin</TableHead>
                <TableHead className="font-bold text-center text-sky-800">Người tạo</TableHead>
                <TableHead className="text-right font-bold text-sky-800 w-[120px]">Thao tác</TableHead>
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
                    <TableCell className="text-center font-bold text-slate-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                         {q.imageUrl && <ImageIcon className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />}
                         <p className="font-bold text-slate-700 text-sm line-clamp-2">{q.content}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-0">{q.subject} - Khối {q.grade}</Badge>
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                       </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-600 text-sm">
                       {q.teacher ? q.teacher.fullName : "Hệ thống"}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
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

      {/* DIALOG XEM CHI TIẾT CÂU HỎI */}
      <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
        <DialogContent className="sm:max-w-[600px] w-[95%] rounded-3xl border-none p-6 bg-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black text-sky-950 border-b border-sky-100 pb-3 flex items-center justify-between">Chi tiết câu hỏi <Badge className="bg-sky-100 text-sky-700 shadow-none border-0">{viewQuestion?.subject}</Badge></DialogTitle></DialogHeader>
          {viewQuestion && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="font-bold text-slate-800 text-base leading-relaxed">{viewQuestion.content}</p>
                 {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-h-48 mt-3 rounded-xl border border-slate-200 shadow-sm mx-auto" alt="Ảnh minh họa" />}
              </div>
              {viewQuestion.type === "multiple_choice" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    let parsedOpts = [];
                    try { parsedOpts = typeof viewQuestion.options === 'string' ? JSON.parse(viewQuestion.options) : (viewQuestion.options || []); } catch(e) {}
                    return parsedOpts.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrect = viewQuestion.correctAnswer === letter || viewQuestion.correctAnswer === opt;
                      return (<div key={idx} className={`p-3 rounded-xl border-2 flex items-start gap-2 ${isCorrect ? 'bg-sky-50 border-sky-400' : 'bg-white border-slate-100'}`}><span className={`font-bold ${isCorrect ? 'text-sky-600' : 'text-slate-400'}`}>{letter}.</span><span className={`text-sm ${isCorrect ? 'font-bold text-sky-700' : 'text-slate-600 font-medium'}`}>{opt}</span>{isCorrect && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 ml-auto"/>}</div>)
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuestionBank;