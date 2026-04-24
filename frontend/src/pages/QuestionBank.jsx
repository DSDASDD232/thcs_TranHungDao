import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, PenTool, FileText, UploadCloud, Sparkles, PlusCircle, Trash2, 
  Loader2, Database, Image as ImageIcon, CheckCircle2, FolderOpen, BookOpen, Layers, Save, Pencil, Search, FileQuestion, Filter, Eye, ArrowRight 
} from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import 'katex/dist/katex.min.css';

const QuestionBank = () => {
  const navigate = useNavigate();
  const assignmentFileRef = useRef(null);
  const editFileInputRef = useRef(null);
  const editEssayAnswerInputRef = useRef(null); 
  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';
  
  const [loading, setLoading] = useState(false);
  const [dbQuestions, setDbQuestions] = useState([]); 
  const [groupedSets, setGroupedSets] = useState([]); 
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [folderSubject, setFolderSubject] = useState("all");
  const [folderGrade, setFolderGrade] = useState("all");

  const [viewMode, setViewMode] = useState("list"); 
  const [currentSet, setCurrentSet] = useState(null); 
  
  const [isCreateSetModalOpen, setIsCreateSetModalOpen] = useState(false);
  const [newSetInfo, setNewSetInfo] = useState({ setName: "", subject: "", grade: "6" });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [creationMethod, setCreationMethod] = useState("manual"); 
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [draftQuestions, setDraftQuestions] = useState([]); 

  const [isReviewingExtraction, setIsReviewingExtraction] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const initialQuestionState = { 
      content: "", subject: "", type: "multiple_choice", difficulty: "medium", grade: "6", 
      optA: "", optB: "", optC: "", optD: "", correctAnswer: "A", points: "",
      essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" 
  };
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(initialQuestionState);
  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  const [editSelectedFile, setEditSelectedFile] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [filterPoints, setFilterPoints] = useState("");

  const [viewQuestion, setViewQuestion] = useState(null);

  const getImageUrl = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("blob:")) return url;
      let cleanUrl = url.replace(/\\/g, '/'); 
      if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
      return `${serverUrl}${cleanUrl}`;
  };

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/question-sets/all", { 
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
      });
      const sets = res.data.groupedSets || [];
      setGroupedSets(sets);

      if (currentSet) {
         const updatedSet = sets.find(g => g.setName === currentSet.setName);
         if (updatedSet) setCurrentSet(updatedSet);
         else setViewMode("list"); 
      }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu kho:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const profRes = await axios.get("/teacher/me", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        setTeacherProfile(profRes.data);
        setNewSetInfo(prev => ({ ...prev, subject: profRes.data.subject || "Chưa phân tổ" }));
        setFolderSubject(profRes.data.subject || "Chưa phân tổ");
        
        await fetchBankData();
      } catch (error) {
        console.error("Lỗi lấy dữ liệu ban đầu", error);
      }
    };
    initData();
  }, []);

  const handleCreateNewSet = async () => {
    const trimmedName = newSetInfo.setName.trim();
    if (!trimmedName) return alert("Vui lòng nhập tên Kho câu hỏi!");
    
    const isExist = groupedSets.find(s => s.setName.toLowerCase() === trimmedName.toLowerCase());
    if (isExist) return alert("Tên Kho câu hỏi này đã tồn tại!");

    setLoading(true);
    try {
      await axios.post("/question-sets/create", {
          setName: trimmedName, 
          subject: teacherProfile?.subject || "Chung",
          grade: newSetInfo.grade
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      
      alert("✅ Tạo Kho câu hỏi mới thành công!");
      setIsCreateSetModalOpen(false);
      setNewSetInfo({ setName: "", subject: teacherProfile?.subject || "", grade: "6" }); 
      await fetchBankData();
      const newEmptySet = { setName: trimmedName, subject: teacherProfile?.subject || "Chung", grade: newSetInfo.grade, questions: [] };
      handleOpenSet(newEmptySet);

    } catch (err) { alert("Lỗi khi tạo Kho câu hỏi!"); } finally { setLoading(false); }
  };

  const handleOpenSet = (set) => {
    setCurrentSet(set); setViewMode("detail"); setIsAddingNew(false);
    setFilterType("all"); setFilterPoints("");
  };

  const handleDeleteDbQuestion = async (id) => {
    if(!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi kho?")) return;
    try {
        await axios.delete(`/questions/delete/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        fetchBankData(); 
    } catch (e) { alert("Lỗi xóa câu hỏi!"); }
  };

  const handleEditClick = (q) => {
    setEditingQuestionId(q._id);
    let parsedOptions = ["", "", "", ""];
    
    if (Array.isArray(q.options) && q.options.length > 0) parsedOptions = q.options;
    else if (typeof q.options === 'string') {
      try { 
        parsedOptions = JSON.parse(q.options); 
        if (typeof parsedOptions[0] === 'string' && parsedOptions[0].startsWith('[')) parsedOptions = JSON.parse(parsedOptions[0]);
      } catch (e) { parsedOptions = [q.options, "", "", ""]; }
    }
    while (parsedOptions.length < 4) parsedOptions.push("");
    
    let correctKey = "A";
    if (q.type === 'multiple_choice') {
      if (["A", "B", "C", "D"].includes(q.correctAnswer)) correctKey = q.correctAnswer;
      else {
          const index = parsedOptions.findIndex(opt => opt === q.correctAnswer);
          if (index === 0) correctKey = "A"; else if (index === 1) correctKey = "B"; else if (index === 2) correctKey = "C"; else if (index === 3) correctKey = "D";
      }
    }

    setEditQuestionData({
      content: q.content, 
      subject: q.subject || teacherProfile?.subject, 
      difficulty: q.difficulty, grade: q.grade || "6", type: q.type || "multiple_choice",
      optA: parsedOptions[0] || "", optB: parsedOptions[1] || "", optC: parsedOptions[2] || "", optD: parsedOptions[3] || "", correctAnswer: correctKey,
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
    formData.append("subject", teacherProfile?.subject || "Chung"); 
    formData.append("difficulty", editQuestionData.difficulty); formData.append("grade", editQuestionData.grade); formData.append("type", editQuestionData.type);
    formData.append("points", editQuestionData.type === 'essay' ? (editQuestionData.points || 0) : 0);

    if (editQuestionData.type === "multiple_choice") {
      formData.append("correctAnswer", editQuestionData.correctAnswer);
      formData.append("options", JSON.stringify([editQuestionData.optA, editQuestionData.optB, editQuestionData.optC, editQuestionData.optD]));
    } else { 
      formData.append("correctAnswer", ""); 
      formData.append("options", "[]"); 
      formData.append("essayAnswerText", editQuestionData.essayAnswerText);
      if (editQuestionData.essayAnswerImageFile) {
          formData.append("essayAnswerImage", editQuestionData.essayAnswerImageFile);
      } else if (!editQuestionData.essayAnswerPreviewUrl) {
          formData.append("essayAnswerImageUrl", ""); 
      }
    }

    if (editSelectedFile) formData.append("image", editSelectedFile);
    else if (!editPreviewUrl) formData.append("imageUrl", ""); 

    setLoading(true);
    try {
      await axios.put(`/questions/update/${editingQuestionId}`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" } });
      alert("✅ Cập nhật thành công!");
      setIsEditDialogOpen(false); setEditPreviewUrl(""); setEditSelectedFile(null); fetchBankData();
    } catch (err) { alert("Lỗi cập nhật!"); } finally { setLoading(false); }
  };

  const handleDraftChange = (tempId, field, value) => { setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, [field]: value } : q)); };
  const handleDraftOptionChange = (tempId, optionIndex, value) => { setDraftQuestions(draftQuestions.map(q => { if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; } return q; })); };
  const handleDraftImageChange = (tempId, e) => { const file = e.target.files[0]; if (file) setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, imageFile: file, previewUrl: URL.createObjectURL(file) } : q)); };
  const handleDraftEssayImageChange = (tempId, e) => { const file = e.target.files[0]; if (file) setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, essayAnswerImageFile: file, essayAnswerPreviewUrl: URL.createObjectURL(file) } : q)); };

  // ======================================================================
  // HÀM BÓC TÁCH THÔNG MINH (TỰ ĐỘNG PHÂN BIỆT TRẮC NGHIỆM/TỰ LUẬN)
  // ======================================================================
  const extractQuestionsFromText = (text, isForPreview = false) => {
    // 1. Cắt bỏ phần Bảng đáp án ở cuối file (nếu có)
    const textParts = text.split(/(?:\n\s*HẾT\b|\n\s*Hết\b|\n\s*Bảng đáp án\b)/i);
    let mainPart = textParts[0]; 

    // 2. Cắt văn bản thành từng khối dựa vào chữ "Câu X:" hoặc "Bài X:"
    const questionBlocks = mainPart.split(/(?=(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[:.])/i).filter(b => b.trim() !== "");
    
    return questionBlocks.map((block) => {
      let type = "multiple_choice";
      let content = "";
      let options = [];
      let correctAnswer = "A";
      let essayAnswerText = "";

      // 3. Tách phần "Lời giải/Hướng dẫn" ra khỏi câu hỏi
      const partsByExplanation = block.split(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|HDG|Giải|Đáp án)\s*[:.]\s*/i);
      let questionBody = partsByExplanation[0];
      
      // Nếu có phần lời giải ở dưới
      if (partsByExplanation.length > 1) {
          essayAnswerText = partsByExplanation[1].trim();
      }

      // 4. Tách nội dung Đề bài và các Đáp án A, B, C, D
      const partsByOptions = questionBody.split(/(?:^|\n|\t|\s{3,})(?=\*?[A-D][.)]\s)/i);
      
      // Khúc đầu tiên chính là đề bài
      content = partsByOptions[0].replace(/^\s*(?:Câu|Bài)\s+\d+\s*[:.]\s*/i, "").trim();

      // 5. Quét các đáp án
      let detectedCorrectAnswer = null;
      partsByOptions.slice(1).forEach(optStr => {
        let textOpt = optStr.trim();
        let isCorrect = false;
        
        // Nếu có dấu * đằng trước thì đó là đáp án đúng
        if (textOpt.startsWith('*')) {
           isCorrect = true;
           textOpt = textOpt.substring(1).trim();
        }

        const letterMatch = textOpt.match(/^([A-D])[.)]\s*(.*)/is);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            let val = letterMatch[2].trim();
            options.push(val);
            if (isCorrect) detectedCorrectAnswer = letter;
        }
      });

      // 6. LOGIC PHÂN LOẠI THÔNG MINH
      if (options.length === 0) {
          // KHÔNG TÌM THẤY A, B, C, D -> ĐÂY LÀ CÂU TỰ LUẬN
          type = "essay";
          options = []; 
          correctAnswer = "";
      } else {
          // CÓ A, B, C, D -> LÀ TRẮC NGHIỆM
          type = "multiple_choice";
          while (options.length < 4) options.push(""); 
          correctAnswer = detectedCorrectAnswer || "A";
      }
      
      const baseData = { 
          type: type, 
          content: content, 
          options: options, 
          correctAnswer: correctAnswer,
          essayAnswerText: essayAnswerText, 
          difficulty: "medium" 
      };

      if (isForPreview) return { ...baseData, tempId: `ext_prev_${Date.now()}_${Math.random()}` };
      return baseData;
    });
  };

  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAssignmentFile(file);
  };

  const handleExtractWord = async () => {
    if (!assignmentFile) return alert("Vui lòng chọn file Word trước!");
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        
        setRawExtractedText(text); 
        setExtractedQuestions(extractQuestionsFromText(text, true)); 
        setIsReviewingExtraction(true); 
        setLoading(false);
      };
      reader.readAsArrayBuffer(assignmentFile);
    } catch (error) { 
      alert("Lỗi bóc tách file Word. Vui lòng thử lại!"); 
      setLoading(false); 
    }
  };

  const handleReuploadAndExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAssignmentFile(file);
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        setRawExtractedText(text); 
        setExtractedQuestions(extractQuestionsFromText(text, true)); 
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) { 
      alert("Lỗi bóc tách. Vui lòng thử lại!"); setLoading(false); 
    }
  };

  const reparseTextToSlots = (text) => {
    const parsedQs = extractQuestionsFromText(text, true);
    setExtractedQuestions(parsedQs);
  };

  const handleCommitExtraction = () => {
    const formattedQs = extractedQuestions.map(q => {
        let finalOptions = Array.isArray(q.options) ? [...q.options] : [];
        if (q.type === 'multiple_choice') {
            while (finalOptions.length < 4) finalOptions.push("");
        }
        let finalCorrect = q.correctAnswer || "A";
        if (q.type === 'multiple_choice' && !["A", "B", "C", "D"].includes(finalCorrect)) {
            const idx = finalOptions.findIndex(opt => opt === q.correctAnswer);
            finalCorrect = idx !== -1 ? ["A", "B", "C", "D"][idx] : "A";
        }
        return { 
            ...q, 
            tempId: Date.now() + Math.random(), 
            options: finalOptions,
            correctAnswer: q.type === 'multiple_choice' ? finalCorrect : "",
            imageFile: null, 
            previewUrl: "", 
            points: "",
            essayAnswerText: q.essayAnswerText || "", 
            essayAnswerImageFile: null,
            essayAnswerPreviewUrl: ""
        };
    });

    const isCurrentDraftEmpty = draftQuestions.length === 1 && !draftQuestions[0].content;
    if (isCurrentDraftEmpty) {
        setDraftQuestions(formattedQs);
    } else {
        setDraftQuestions([...draftQuestions, ...formattedQs]); 
    }
    
    setIsReviewingExtraction(false);
    setAssignmentFile(null); 
    setCreationMethod("manual"); 
  };

  const handleExtractedChange = (tempId, field, value) => setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  const handleExtractedOptionChange = (tempId, optionIndex, value) => setExtractedQuestions(prev => prev.map(q => { if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; } return q; }));
  const handleAddExtractedOption = (tempId) => setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, options: [...q.options, ""] } : q));
  const handleRemoveExtractedOption = (tempId, optIndex) => setExtractedQuestions(prev => prev.map(q => { if (q.tempId === tempId && q.options.length > 2) { const newOpts = q.options.filter((_, i) => i !== optIndex); return { ...q, options: newOpts }; } return q; }));
  // ======================================================================

  const handleSaveDraftsToSet = async () => {
    const stripHtml = (html) => {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const isValid = draftQuestions.every(q => stripHtml(q.content).trim() !== "");
    if (!isValid) return alert("Vui lòng điền nội dung cho tất cả câu hỏi đang soạn!");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("setName", currentSet.setName); 
      formData.append("subject", teacherProfile?.subject || "Chung"); 
      formData.append("grade", currentSet.grade);
      
      const questionsToSave = draftQuestions.map(q => ({
          tempId: q.tempId, content: q.content, type: q.type, options: q.options, correctAnswer: q.correctAnswer, difficulty: q.difficulty,
          points: q.type === 'essay' ? (Number(q.points) || 0) : 0,
          essayAnswerText: q.type === 'essay' ? (q.essayAnswerText || "") : ""
      }));
      
      formData.append("questionsData", JSON.stringify(questionsToSave));
      
      draftQuestions.forEach(q => { 
        if (q.imageFile) formData.append(`image_${q.tempId}`, q.imageFile); 
        if (q.type === 'essay' && q.essayAnswerImageFile) formData.append(`essayImage_${q.tempId}`, q.essayAnswerImageFile);
      });

      await axios.post("/questions/create-set", formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" } });
      alert(`✅ Đã lưu thêm ${draftQuestions.length} câu hỏi vào Kho: ${currentSet.setName}`);
      setIsAddingNew(false); setDraftQuestions([]); setAssignmentFile(null); fetchBankData(); 
    } catch (err) { alert("Lỗi khi lưu câu hỏi!"); } finally { setLoading(false); }
  };

  const filteredSets = groupedSets.filter(set => {
     const matchSearch = set.setName.toLowerCase().includes(searchQuery.toLowerCase());
     const matchSub = folderSubject === "all" || set.subject === folderSubject;
     const matchGrade = folderGrade === "all" || set.grade === folderGrade;
     return matchSearch && matchSub && matchGrade;
  });

  const displayedQuestions = currentSet ? currentSet.questions.filter(q => {
     const matchType = filterType === "all" || q.type === filterType;
     const matchPoints = filterType !== "essay" || !filterPoints || Number(q.points) === Number(filterPoints);
     return matchType && matchPoints;
  }) : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-10 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
               <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-sky-950">Kho Câu Hỏi</h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base">Quản lý học liệu <strong className="text-sky-600">Tổ {teacherProfile?.subject || "Đang tải..."}</strong></p>
            </div>
          </div>
          {viewMode === "list" ? (
             <Button onClick={() => navigate("/teacher-dashboard")} variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50 font-bold rounded-xl hidden sm:flex">
               <ArrowLeft className="w-4 h-4 mr-2" /> Về Tổng quan
             </Button>
          ) : (
             <Button onClick={() => setViewMode("list")} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl">
               <ArrowLeft className="w-4 h-4 mr-2" /> Trở lại danh sách Kho
             </Button>
          )}
        </div>

        {viewMode === "list" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-sky-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-bold text-sky-900 whitespace-nowrap text-lg">Danh sách Thư mục ({filteredSets.length})</h3>
                  <Button onClick={() => setIsCreateSetModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md w-full sm:w-auto h-11 px-6">
                     <PlusCircle className="w-4 h-4 mr-2"/> Tạo Thư mục Mới
                  </Button>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-sky-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                  
                  <Input 
                    value={`Môn: ${folderSubject}`} 
                    readOnly 
                    title=""
                    className="h-10 w-[140px] bg-slate-100 border-slate-200 font-bold text-sky-700 cursor-not-allowed text-sm" 
                  />

                  <Select value={folderGrade} onValueChange={setFolderGrade}>
                    <SelectTrigger className="h-10 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700"><span className="truncate">{folderGrade === 'all' ? 'Tất cả khối' : `Khối ${folderGrade}`}</span></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[200px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <Input placeholder="Tìm tên Thư mục..." className="pl-9 h-10 bg-slate-50 border-sky-100 focus-visible:ring-sky-500 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
               </div>
            </div>

            {loading ? (
               <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /></div>
            ) : filteredSets.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200">
                  <FolderOpen className="w-16 h-16 text-sky-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-700">Kho đang trống</h3>
                  <p className="text-slate-500 mb-6 mt-2">Không tìm thấy kho câu hỏi nào phù hợp với bộ lọc.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredSets.map((set, idx) => (
                    <Card key={idx} onClick={() => handleOpenSet(set)} className="border-sky-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-sky-300 transition-all cursor-pointer group bg-white rounded-3xl overflow-hidden">
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                           <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center group-hover:bg-sky-100 transition-colors"><FolderOpen className="w-7 h-7" /></div>
                           <Badge className="bg-sky-100 text-sky-700 border-0 shadow-none font-bold">{set.questions.length} Câu</Badge>
                         </div>
                         <h3 className="text-xl font-black text-sky-950 mb-3 line-clamp-2 group-hover:text-sky-600 transition-colors">{set.setName}</h3>
                         <div className="flex gap-2 border-t border-slate-50 pt-3">
                           <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium">Khối {set.grade}</Badge>
                           <Badge variant="outline" className="border-slate-200 text-sky-600 font-bold bg-sky-50">{set.subject}</Badge>
                         </div>
                       </CardContent>
                    </Card>
                 ))}
               </div>
            )}
          </div>
        )}

        {viewMode === "detail" && currentSet && (
          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-sky-500 text-white p-6 sm:p-8 border-b border-sky-600 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3"><BookOpen className="w-7 h-7 sm:w-8 sm:h-8"/> Kho: {currentSet.setName}</CardTitle>
                  <p className="text-sky-50 font-medium mt-2 text-sm sm:text-base">Môn: {currentSet.subject} • Khối: {currentSet.grade} • Tổng: {currentSet.questions.length} câu</p>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-8 bg-slate-50/50 min-h-[400px]">
                 {!isAddingNew && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm gap-4">
                       <h3 className="font-bold text-sky-900 text-lg">Danh sách câu hỏi trong kho</h3>
                       <Button onClick={() => { setIsAddingNew(true); setDraftQuestions([{ tempId: Date.now(), content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", imageFile: null, previewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }]); }} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md h-11 px-6 transition-all hover:scale-105 w-full sm:w-auto"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu hỏi</Button>
                    </div>
                 )}

                 {!isAddingNew && currentSet.questions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
                       <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-sky-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                       <Select value={filterType} onValueChange={(val) => { setFilterType(val); if(val !== 'essay') setFilterPoints(""); }}>
                         <SelectTrigger className="h-10 w-[180px] bg-slate-50 border-sky-100 font-bold text-sky-700"><span className="truncate">{filterType === 'all' ? 'Tất cả loại' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span></SelectTrigger>
                         <SelectContent><SelectItem value="all">Tất cả loại</SelectItem><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                       </Select>
                       {filterType === 'essay' && (<Input type="number" step="0.25" placeholder="Lọc theo điểm..." value={filterPoints} onChange={(e) => setFilterPoints(e.target.value)} className="h-10 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700" />)}
                    </div>
                 )}

                 {isAddingNew && (
                    <div className="bg-white border border-sky-200 rounded-3xl p-6 shadow-sm mb-8 relative">
                       <Button onClick={() => setIsAddingNew(false)} variant="ghost" className="absolute top-4 right-4 text-slate-400 hover:text-rose-500">Hủy bỏ</Button>
                       <h3 className="text-xl font-black text-sky-800 mb-4 flex items-center"><Layers className="w-5 h-5 mr-2"/> Bổ sung câu hỏi mới</h3>
                       
                       <div className="flex bg-slate-100 rounded-xl w-full p-1 mb-6">
                          <button onClick={() => setCreationMethod("manual")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'manual' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}><PenTool className="w-4 h-4 inline mr-2"/> Soạn thủ công</button>
                          <button onClick={() => setCreationMethod("upload")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}><FileText className="w-4 h-4 inline mr-2"/> Bóc tách từ Word</button>
                       </div>

                        {creationMethod === "upload" && (
                          <div className="space-y-4">
                            {!isReviewingExtraction ? (
                               <div className="bg-slate-50 p-6 sm:p-10 rounded-2xl border border-dashed border-sky-300 text-center">
                                  <h4 className="font-bold text-sky-900 text-base sm:text-lg mb-2">Tải lên file Word (.docx)</h4>
                                  <p className="text-slate-500 text-xs sm:text-sm mb-6">Hệ thống sẽ tự động bóc tách thành danh sách câu hỏi để bạn chỉnh sửa.</p>
                                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setAssignmentFile(f);}} onClick={() => assignmentFileRef.current.click()} className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all cursor-pointer flex flex-col items-center justify-center max-w-lg mx-auto ${assignmentFile ? 'border-sky-500 bg-sky-100' : 'border-slate-300 hover:border-sky-400 bg-white'}`}>
                                    <input type="file" ref={assignmentFileRef} onChange={handleAssignmentFileChange} className="hidden" accept=".doc,.docx" />
                                    {assignmentFile ? (<><FileText className="h-8 w-8 text-sky-600 mb-2" /><p className="font-black text-sky-900 text-base line-clamp-1">{assignmentFile.name}</p><p className="text-xs text-sky-600 mt-1">Click để chọn file khác</p></>) : (<><UploadCloud className="h-8 w-8 text-sky-400 mb-2" /><p className="font-bold text-slate-700">Nhấn hoặc Kéo thả file vào đây</p></>)}
                                  </div>
                                  {assignmentFile && <Button type="button" onClick={handleExtractWord} disabled={loading} className="mt-6 w-full max-w-xs bg-sky-500 hover:bg-sky-600 text-white font-bold h-12 rounded-xl shadow-md">{loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <Sparkles className="w-5 h-5 mr-2" />} Bắt đầu bóc tách</Button>}
                               </div>
                            ) : (
                               <div className="flex flex-col lg:flex-row gap-6 items-start">
                                 {/* Khung trái: Raw Text */}
                                 <div className="w-full lg:w-2/5 flex flex-col gap-0 sticky top-4 z-10">
                                    <div className="flex justify-between items-center bg-slate-100 p-3 rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
                                      <span className="text-sm font-bold text-slate-700 uppercase">Văn bản thô (File gốc)</span>
                                      <div className="flex gap-2">
                                        <label className="h-8 px-3 inline-flex items-center justify-center rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                                          <FolderOpen className="w-3.5 h-3.5 mr-1.5"/> Chọn lại
                                          <input type="file" className="hidden" accept=".doc,.docx" onChange={handleReuploadAndExtract} />
                                        </label>
                                        <Button size="sm" variant="outline" className="h-8 text-sky-600 border-sky-300 hover:bg-sky-50 font-bold shadow-sm" onClick={() => reparseTextToSlots(rawExtractedText)}>
                                          <Sparkles className="w-3.5 h-3.5 mr-1"/> Rót lại
                                        </Button>
                                      </div>
                                    </div>
                                    <textarea 
                                      value={rawExtractedText} 
                                      onChange={(e) => setRawExtractedText(e.target.value)}
                                      className="w-full h-[600px] p-4 rounded-b-xl border border-slate-200 font-mono text-sm leading-relaxed bg-white shadow-inner resize-none focus-visible:ring-sky-500 outline-none"
                                    />
                                 </div>

                                 {/* Khung phải: Danh sách đã bóc */}
                                 <div className="w-full lg:w-3/5 space-y-4">
                                    <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex justify-between items-center">
                                      <span className="text-sm font-bold text-sky-800 uppercase">Xem trước ({extractedQuestions.length} câu)</span>
                                      <Button onClick={() => setExtractedQuestions([...extractedQuestions, { tempId: `ext_new_${Date.now()}`, type: "multiple_choice", content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium" }])} size="sm" variant="outline" className="h-8 bg-white"><PlusCircle className="w-4 h-4 mr-1"/> Thêm câu</Button>
                                    </div>

                                    {extractedQuestions.map((q, index) => (
                                        <Card key={q.tempId} className="border-sky-200 shadow-sm relative">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                                            <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                              <CardTitle className="text-base font-black text-slate-700 flex items-center gap-2">
                                                Câu {index + 1} 
                                                <Badge variant="outline" className="text-[10px] ml-2 bg-white text-slate-500">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                              </CardTitle>
                                              <Button type="button" onClick={() => setExtractedQuestions(extractedQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></Button>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-4 bg-white">
                                              <RichTextEditor value={q.content} onChange={(val) => handleExtractedChange(q.tempId, 'content', val)} />
                                              
                                              {q.type === 'essay' && (
                                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                                                  <h4 className="text-sm font-bold text-emerald-700 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Hướng dẫn giải</h4>
                                                  <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleExtractedChange(q.tempId, 'essayAnswerText', val)} />
                                                </div>
                                              )}

                                              {q.type === 'multiple_choice' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.options.map((opt, i) => (
                                                      <div key={i} className="flex items-center gap-2">
                                                        <span className="font-black text-slate-500 w-6">{String.fromCharCode(65 + i)}.</span>
                                                        <Input className="h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm" value={opt} onChange={(e) => handleExtractedOptionChange(q.tempId, i, e.target.value)} />
                                                        {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExtractedOption(q.tempId, i)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0"><Trash2 className="w-4 h-4"/></Button>}
                                                      </div>
                                                    ))}
                                                  </div>
                                                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleAddExtractedOption(q.tempId)} className="text-sky-600 hover:bg-sky-100"><PlusCircle className="w-4 h-4 mr-1"/> Thêm đáp án</Button>
                                                    <div className="flex items-center gap-2">
                                                      <label className="text-xs font-bold text-rose-500">ĐÁP ÁN ĐÚNG:</label>
                                                      <Select value={q.correctAnswer || ""} onValueChange={(val) => handleExtractedChange(q.tempId, 'correctAnswer', val)}>
                                                        <SelectTrigger className="h-9 w-24 bg-white text-rose-600 font-bold border-rose-200 rounded-lg"><span className="truncate">{q.correctAnswer ? `Câu ${q.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                                                        <SelectContent>
                                                          {q.options.map((_, i) => {
                                                            const l = String.fromCharCode(65 + i);
                                                            return <SelectItem key={l} value={l}>Câu {l}</SelectItem>
                                                          })}
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    <Button type="button" onClick={handleCommitExtraction} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 transition-all mt-4">
                                        XÁC NHẬN RÓT VÀO DANH SÁCH ĐANG SOẠN <ArrowRight className="ml-2 w-5 h-5"/>
                                    </Button>
                                 </div>
                               </div>
                            )}
                          </div>
                        )}

                        {creationMethod === "manual" && (
                          <div className="space-y-6">
                            {draftQuestions.map((q, index) => (
                              <Card key={q.tempId} className="border-sky-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-400"></div>
                                <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                  <CardTitle className="text-base font-black text-slate-700">Câu mới {index + 1} (Đang soạn)</CardTitle>
                                  <Button onClick={() => setDraftQuestions(draftQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></Button>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4 bg-white">
                                   
                                   <div className={`grid gap-4 ${q.type === 'essay' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                                     <Select value={q.type} onValueChange={(val) => handleDraftChange(q.tempId, 'type', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700"><span className="truncate">{q.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                                     <Select value={q.difficulty} onValueChange={(val) => handleDraftChange(q.tempId, 'difficulty', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700"><span className="truncate">{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
                                     {q.type === "essay" && (<Input type="number" step="0.25" min="0" placeholder="Điểm ()" value={q.points} onChange={(e) => handleDraftChange(q.tempId, 'points', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-sky-200 font-black text-sky-700 focus-visible:ring-sky-500" />)}
                                   </div>

                                   <div className="flex flex-col md:flex-row gap-4">
                                     <div className="flex-1">
                                        <RichTextEditor 
                                          placeholder="Nhập nội dung đề bài và công thức toán học..."
                                          value={q.content}
                                          onChange={(val) => handleDraftChange(q.tempId, 'content', val)}
                                        />
                                     </div>
                                     <div className="w-full md:w-36 shrink-0 h-[100px]">
                                       {q.previewUrl ? (
                                         <div className="relative w-full h-full rounded-xl border border-slate-200 overflow-hidden shadow-sm group/img">
                                           <img src={q.previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => setDraftQuestions(draftQuestions.map(m => m.tempId === q.tempId ? { ...m, imageFile: null, previewUrl: "" } : m))} className="bg-rose-500 text-white rounded-full p-2"><Trash2 className="w-4 h-4"/></button></div>
                                         </div>
                                       ) : (
                                         <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-400 bg-slate-50 cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-sky-400 mb-1" /><span className="text-xs font-bold text-sky-600 text-center">Ảnh Đề bài</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleDraftImageChange(q.tempId, e)} /></label>
                                       )}
                                     </div>
                                   </div>

                                   {q.type === "essay" && (
                                     <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải </h4>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                              <RichTextEditor 
                                                placeholder="Nhập lời giải tự luận..."
                                                value={q.essayAnswerText}
                                                onChange={(val) => handleDraftChange(q.tempId, 'essayAnswerText', val)}
                                              />
                                            </div>
                                            <div className="w-full md:w-36 shrink-0 h-[100px]">
                                              {q.essayAnswerPreviewUrl ? (
                                                <div className="relative w-full h-full rounded-xl border border-emerald-200 overflow-hidden shadow-sm group/img2">
                                                  <img src={q.essayAnswerPreviewUrl} alt="Đáp án" className="absolute inset-0 w-full h-full object-cover" />
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img2:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => setDraftQuestions(draftQuestions.map(m => m.tempId === q.tempId ? { ...m, essayAnswerImageFile: null, essayAnswerPreviewUrl: "" } : m))} className="bg-rose-500 text-white rounded-full p-2"><Trash2 className="w-4 h-4"/></button></div>
                                                </div>
                                              ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-white cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-emerald-400 mb-1" /><span className="text-xs font-bold text-emerald-600 text-center">Ảnh Lời giải</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleDraftEssayImageChange(q.tempId, e)} /></label>
                                              )}
                                            </div>
                                        </div>
                                     </div>
                                   )}

                                   {q.type === "multiple_choice" && (
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          {q.options.map((optLabel, i) => (
                                            <div key={i} className="flex items-center gap-2"><span className="font-black text-slate-500 w-6">{String.fromCharCode(65 + i)}.</span><Input className="h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm" value={optLabel} onChange={(e) => handleDraftOptionChange(q.tempId, i, e.target.value)} /></div>
                                          ))}
                                        </div>
                                        <div className="flex justify-end items-center pt-2 gap-3">
                                          <label className="text-sm font-bold text-rose-500">ĐÁP ÁN ĐÚNG:</label>
                                          <Select value={q.correctAnswer || ""} onValueChange={(val) => handleDraftChange(q.tempId, 'correctAnswer', val)}>
                                            <SelectTrigger className="h-10 w-28 bg-white text-rose-600 font-bold border-rose-200 rounded-xl"><span className="truncate">{q.correctAnswer ? `Câu ${q.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                                            <SelectContent>
                                              {q.options.map((_, i) => {
                                                const l = String.fromCharCode(65 + i);
                                                return <SelectItem key={l} value={l}>Câu {l}</SelectItem>
                                              })}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                   )}
                                </CardContent>
                              </Card>
                            ))}
                            <Button type="button" onClick={() => setDraftQuestions([...draftQuestions, { tempId: Date.now(), content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", imageFile: null, previewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }])} variant="outline" className="w-full h-12 border-dashed border-2 border-sky-200 text-sky-600 hover:bg-sky-50 font-bold rounded-xl">
                               <PlusCircle className="w-5 h-5 mr-2"/> Thêm câu hỏi tiếp theo
                            </Button>
                            <Button onClick={handleSaveDraftsToSet} disabled={loading} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 transition-all mt-4">
                                {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />} LƯU CÁC CÂU NÀY VÀO KHO
                            </Button>
                          </div>
                        )}
                    </div>
                 )}

                 {displayedQuestions.length === 0 && !isAddingNew ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200 shadow-sm">
                       <FileQuestion className="w-16 h-16 text-sky-100 mx-auto mb-3" />
                       <h3 className="text-xl font-bold text-slate-700">Chưa có câu hỏi</h3>
                       <p className="text-slate-500 mb-6 mt-1">Không có câu hỏi nào khớp với bộ lọc hoặc kho trống.</p>
                       <Button onClick={() => setIsAddingNew(true)} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold h-11 px-6"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu đầu tiên</Button>
                    </div>
                 ) : (
                    <div className={`space-y-4 ${isAddingNew ? 'opacity-50 pointer-events-none' : ''}`}>
                       {displayedQuestions.map((q, i) => (
                          <Card key={q._id} className="border-sky-100 shadow-sm bg-white hover:border-sky-300 transition-colors">
                              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 relative">
                                <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-sky-400 rounded-l-3xl"></div>
                                <div className="font-black text-sky-700 bg-sky-100 px-3 py-1 rounded-lg h-max shrink-0 w-max">Câu {i+1}</div>
                                <div className="flex-1 space-y-3">
                                   
                                   <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[10px]">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                      {q.type === 'essay' && q.points > 0 && <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 font-black text-[10px]">{q.points} Điểm</Badge>}
                                   </div>

                                   <div 
                                      className="font-bold text-slate-800 text-base leading-relaxed q-content-view line-clamp-3"
                                      dangerouslySetInnerHTML={{ __html: q.content }}
                                   />

                                   {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-h-40 mt-2 rounded-xl border border-slate-200 shadow-sm" alt="Đề bài" />}
                                   
                                   {q.type === 'essay' && (q.essayAnswerText || q.essayAnswerImageUrl) && (
                                      <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                         <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Hướng dẫn giải</p>
                                         {q.essayAnswerText && (
                                           <div 
                                             className="text-sm text-slate-700 italic line-clamp-2 q-content-view"
                                             dangerouslySetInnerHTML={{ __html: q.essayAnswerText }}
                                           />
                                         )}
                                         {q.essayAnswerImageUrl && <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-0 shadow-none text-[10px]">Có đính kèm ảnh</Badge>}
                                      </div>
                                   )}

                                   {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                       {['A', 'B', 'C', 'D'].map((letter, idx) => {
                                          const isCorrect = q.correctAnswer === letter || q.correctAnswer === q.options[idx];
                                          return (
                                            <div key={idx} className="flex items-start gap-2 text-sm">
                                              <span className={`font-bold ${isCorrect ? 'text-sky-600' : 'text-slate-400'}`}>{letter}.</span>
                                              <span className={`${isCorrect ? 'font-bold text-sky-700' : 'text-slate-600'}`}>{q.options[idx]}</span>
                                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0"/>}
                                            </div>
                                          );
                                       })}
                                     </div>
                                   )}
                                </div>
                                <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                                   <Button onClick={() => handleEditClick(q)} variant="outline" size="sm" className="text-sky-600 border-sky-200 hover:bg-sky-50 rounded-lg flex-1 sm:flex-none"><Pencil className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Sửa</span></Button>
                                   <Button onClick={() => handleDeleteDbQuestion(q._id)} variant="outline" size="sm" className="text-rose-500 border-rose-200 hover:bg-rose-50 rounded-lg flex-1 sm:flex-none"><Trash2 className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Xóa</span></Button>
                                   <Button onClick={() => setViewQuestion(q)} variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg flex-1 sm:flex-none"><Eye className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Xem</span></Button>
                                </div>
                              </div>
                          </Card>
                       ))}
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isCreateSetModalOpen} onOpenChange={setIsCreateSetModalOpen}>
          <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none p-6">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-2"><FolderOpen className="w-6 h-6 text-sky-500"/> Tạo Kho Câu Hỏi Mới</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Tên Kho Câu Hỏi <span className="text-rose-500">*</span></label>
                <Input placeholder="" className="h-12 rounded-xl bg-slate-50 font-bold border-sky-200 focus-visible:ring-sky-500" value={newSetInfo.setName} onChange={(e) => setNewSetInfo({...newSetInfo, setName: e.target.value})} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Môn học</label>
                  <Input 
                    value={teacherProfile?.subject || "Chưa rõ"} 
                    readOnly 
                    className="h-12 rounded-xl bg-slate-100 border-slate-200 font-bold text-sky-700 cursor-not-allowed" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Khối lớp</label>
                  <Select value={newSetInfo.grade} onValueChange={(val) => setNewSetInfo({...newSetInfo, grade: val})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-200 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                </div>
              </div>
              <Button onClick={handleCreateNewSet} className="w-full h-12 mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md text-lg">Xác nhận Tạo</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setEditPreviewUrl(""); setEditSelectedFile(null); setEditQuestionData(initialQuestionState);}}}>
          <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-4 sm:p-8 bg-slate-50">
            <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2 border-b border-sky-100 pb-3"><Pencil className="h-5 sm:h-6 w-5 sm:w-6 text-sky-500"/> Chỉnh sửa câu hỏi</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.difficulty} onValueChange={(v) => setEditQuestionData({...editQuestionData, difficulty: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.difficulty === 'easy' ? 'Dễ' : editQuestionData.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
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

              {editQuestionData.type === "essay" && (
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
              )}

              {editQuestionData.type === "multiple_choice" && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map((k) => (
                      <div key={k} className="flex items-center gap-2"><span className="font-bold text-sky-800 w-5">{k}.</span><Input placeholder={`Nhập đáp án ${k}`} className="h-12 rounded-xl bg-slate-50 border-sky-100 font-medium" value={editQuestionData[`opt${k}`]} onChange={(e) => setEditQuestionData({...editQuestionData, [`opt${k}`]: e.target.value})} required /></div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                    <Select value={editQuestionData.correctAnswer || ""} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}><SelectTrigger className="h-11 w-full sm:w-32 bg-rose-50 text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span></SelectTrigger><SelectContent><SelectItem value="A">Câu A</SelectItem><SelectItem value="B">Câu B</SelectItem><SelectItem value="C">Câu C</SelectItem><SelectItem value="D">Câu D</SelectItem></SelectContent></Select>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl mt-2">Cập nhật thay đổi</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
          <DialogContent className="sm:max-w-[700px] w-[95%] rounded-3xl border-none p-0 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100"><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-3"><Eye className="w-6 h-6 text-sky-500" /> Chi tiết câu hỏi</DialogTitle></DialogHeader>
            {viewQuestion && (
              <div className="space-y-6 p-8 pt-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="font-bold text-slate-800 text-lg leading-relaxed q-content-view" dangerouslySetInnerHTML={{ __html: viewQuestion.content }} />
                    {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-w-full max-h-64 mt-4 rounded-xl border border-slate-200 shadow-sm mx-auto" />}
                </div>

                {viewQuestion.type === "essay" && (viewQuestion.essayAnswerText || viewQuestion.essayAnswerImageUrl) && (
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                        <p className="font-bold text-emerald-700 text-sm uppercase tracking-widest mb-3 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2"/> Hướng dẫn giải</p>
                        {viewQuestion.essayAnswerText && (
                          <div className="font-medium text-emerald-900 text-base leading-relaxed whitespace-pre-wrap q-content-view bg-white p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: viewQuestion.essayAnswerText }} />
                        )}
                        {viewQuestion.essayAnswerImageUrl && <img src={getImageUrl(viewQuestion.essayAnswerImageUrl)} className="max-w-full max-h-64 mt-4 rounded-xl border border-emerald-200 shadow-sm mx-auto" />}
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
                            <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors ${isCorrect ? 'bg-sky-50 border-sky-400 shadow-sm' : 'bg-white border-slate-100'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 ${isCorrect ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{letter}</div>
                                <span className={`text-base q-content-view ${isCorrect ? 'font-bold text-sky-800' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{ __html: opt }} />
                                {isCorrect && <CheckCircle2 className="w-6 h-6 text-sky-500 shrink-0 ml-auto"/>}
                            </div>
                        )
                      });
                    })()}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-4"><Button onClick={() => setViewQuestion(null)} className="h-12 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-bold px-8 transition-transform active:scale-95">Đóng</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default QuestionBank;