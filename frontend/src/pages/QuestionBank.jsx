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
  const [groupedSets, setGroupedSets] = useState([]); 
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [folderSubject, setFolderSubject] = useState("all");
  const [folderGrade, setFolderGrade] = useState("all");
  const [folderSemester, setFolderSemester] = useState("all"); // Lọc theo Học kỳ

  // Cấu trúc 3 cấp: list (Thư mục) -> folder_detail (Đề thi) -> exam_detail (Câu hỏi)
  const [viewMode, setViewMode] = useState("list"); 
  const [currentFolder, setCurrentFolder] = useState(null); 
  const [currentExam, setCurrentExam] = useState(null); 
  
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderInfo, setNewFolderInfo] = useState({ folderName: "", subject: "", grade: "6", semester: "1" });

  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [newExamName, setNewExamName] = useState("");

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [creationMethod, setCreationMethod] = useState("manual"); 
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [draftQuestions, setDraftQuestions] = useState([]); 

  const [isReviewingExtraction, setIsReviewingExtraction] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const initialQuestionState = { 
      content: "", subject: "", type: "multiple_choice", difficulty: "medium", grade: "6", semester: "1",
      options: ["", "", "", ""], correctAnswer: "A", points: "",
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
      // Giả định backend trả về groupedSets có dạng: { folderName, subject, grade, semester, exams: [{ examName, questions: [] }] }
      const sets = res.data.groupedSets || [];
      setGroupedSets(sets);

      if (currentFolder) {
         const updatedFolder = sets.find(g => g.folderName === currentFolder.folderName);
         if (updatedFolder) {
            setCurrentFolder(updatedFolder);
            if (currentExam) {
               const updatedExam = updatedFolder.exams?.find(e => e.examName === currentExam.examName);
               if (updatedExam) setCurrentExam(updatedExam);
               else setViewMode("folder_detail");
            }
         }
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
        
        const defaultSub = Array.isArray(profRes.data.subjects) && profRes.data.subjects.length > 0 
           ? profRes.data.subjects[0] 
           : profRes.data.subject || "Chưa phân tổ";

        setNewFolderInfo(prev => ({ ...prev, subject: defaultSub }));
        setFolderSubject("all"); 
        
        await fetchBankData();
      } catch (error) {
        console.error("Lỗi lấy dữ liệu ban đầu", error);
      }
    };
    initData();
  }, []);

  const teacherSubjects = Array.isArray(teacherProfile?.subjects) && teacherProfile.subjects.length > 0 
    ? teacherProfile.subjects 
    : teacherProfile?.subject ? [teacherProfile.subject] : [];

  const getTeacherDeptInfo = () => {
    if(!teacherProfile) return "Đang tải...";
    const deptStr = teacherProfile.department === "KHTN" ? "Tổ KHTN" : teacherProfile.department === "KHXH" ? "Tổ KHXH" : "Chưa phân tổ";
    const subStr = teacherSubjects.length > 0 ? teacherSubjects.join(", ") : "Chưa đăng ký môn";
    return `${deptStr} • ${subStr}`;
  };

  // ================= TẠO THƯ MỤC =================
  const handleCreateNewFolder = async () => {
    const trimmedName = newFolderInfo.folderName.trim();
    if (!trimmedName) return alert("Vui lòng nhập tên Thư mục!");
    
    const isExist = groupedSets.find(s => s.folderName?.toLowerCase() === trimmedName.toLowerCase());
    if (isExist) return alert("Tên Thư mục này đã tồn tại!");

    setLoading(true);
    try {
      await axios.post("/question-sets/create-folder", {
          folderName: trimmedName, 
          subject: newFolderInfo.subject || "Chung",
          grade: newFolderInfo.grade,
          semester: newFolderInfo.semester
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      
      alert("✅ Tạo Thư mục mới thành công!");
      setIsCreateFolderModalOpen(false);
      setNewFolderInfo({ folderName: "", subject: teacherSubjects[0] || "Chung", grade: "6", semester: "1" }); 
      await fetchBankData();
      const newEmptyFolder = { folderName: trimmedName, subject: newFolderInfo.subject || "Chung", grade: newFolderInfo.grade, semester: newFolderInfo.semester, exams: [] };
      handleOpenFolder(newEmptyFolder);

    } catch (err) { alert("Lỗi khi tạo Thư mục!"); } finally { setLoading(false); }
  };

  const handleDeleteFolder = async (e, folder) => {
    if (e) e.stopPropagation(); 
    if (!window.confirm(`🚨 CẢNH BÁO: Bạn sắp xóa toàn bộ thư mục "${folder.folderName}".\nTẤT CẢ đề thi và câu hỏi bên trong sẽ bị xóa vĩnh viễn.\nBạn chắc chắn chứ?`)) return;

    setLoading(true);
    try {
      await axios.delete(`/question-sets/delete-folder/${encodeURIComponent(folder.folderName)}`, { 
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
      });
      alert(`✅ Đã xóa thư mục "${folder.folderName}"!`);
      if (viewMode !== "list") setViewMode("list");
      await fetchBankData();
    } catch (error) { alert("Lỗi khi xóa thư mục!"); } finally { setLoading(false); }
  };

  // ================= TẠO ĐỀ THI =================
  const handleCreateNewExam = async () => {
    const trimmedName = newExamName.trim();
    if (!trimmedName) return alert("Vui lòng nhập tên Đề thi!");
    
    const isExist = currentFolder.exams?.find(e => e.examName.toLowerCase() === trimmedName.toLowerCase());
    if (isExist) return alert("Tên Đề thi này đã tồn tại trong thư mục!");

    setLoading(true);
    try {
      await axios.post("/question-sets/create-exam", {
          folderName: currentFolder.folderName,
          examName: trimmedName,
          subject: currentFolder.subject,
          grade: currentFolder.grade,
          semester: currentFolder.semester
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      
      alert("✅ Tạo Đề thi mới thành công!");
      setIsCreateExamModalOpen(false);
      setNewExamName(""); 
      await fetchBankData();
      
      // Mở luôn đề thi vừa tạo
      const newExamObj = { examName: trimmedName, questions: [] };
      handleOpenExam(newExamObj);

    } catch (err) { alert("Lỗi khi tạo Đề thi!"); } finally { setLoading(false); }
  };

  const handleDeleteExam = async (e, exam) => {
    if (e) e.stopPropagation(); 
    if (!window.confirm(`Xóa đề thi "${exam.examName}" và toàn bộ câu hỏi bên trong?`)) return;

    setLoading(true);
    try {
      await axios.delete(`/question-sets/delete-exam/${encodeURIComponent(currentFolder.folderName)}/${encodeURIComponent(exam.examName)}`, { 
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
      });
      alert(`✅ Đã xóa đề thi "${exam.examName}"!`);
      await fetchBankData();
    } catch (error) { alert("Lỗi khi xóa đề thi!"); } finally { setLoading(false); }
  };

  const handleOpenFolder = (folder) => {
    setCurrentFolder(folder); setViewMode("folder_detail");
  };

  const handleOpenExam = (exam) => {
    setCurrentExam(exam); setViewMode("exam_detail"); setIsAddingNew(false);
    setFilterType("all"); setFilterPoints("");
  };

  const handleDeleteDbQuestion = async (id) => {
    if(!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?")) return;
    try {
        await axios.delete(`/questions/delete/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        fetchBankData(); 
    } catch (e) { alert("Lỗi xóa câu hỏi!"); }
  };

  // CÁC HÀM XỬ LÝ CHỈNH SỬA, BÓC TÁCH WORD ĐƯỢC GIỮ NGUYÊN (Chỉ cập nhật payload API)
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
      subject: q.subject || teacherSubjects[0] || "Chung", 
      difficulty: q.difficulty, grade: q.grade || "6", semester: q.semester || "1", type: q.type || "multiple_choice",
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
    formData.append("semester", editQuestionData.semester); 
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
    if (editQuestionData.essayAnswerImageFile) formData.append("essayAnswerImage", editQuestionData.essayAnswerImageFile);
    else if (!editQuestionData.essayAnswerPreviewUrl) formData.append("essayAnswerImageUrl", ""); 

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

  const extractQuestionsFromText = (text, isForPreview = false) => {
    const textParts = text.split(/(?:\n\s*HẾT\b|\n\s*Hết\b|\n\s*Bảng đáp án\b)/i);
    let mainPart = textParts[0]; 

    let globalAnswers = {};
    if (textParts.length > 1) {
        const answerPart = textParts.slice(1).join(" ");
        const ansRegex = /(?:Câu\s*)?(\d+)\s*[:.-]?\s*([A-D])/gi;
        let match;
        while ((match = ansRegex.exec(answerPart)) !== null) {
            globalAnswers[match[1]] = match[2].toUpperCase(); 
        }
    }

    const rawBlocks = mainPart.split(/(?=(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[:.])/i);
    const questionBlocks = rawBlocks.filter(block => /^\s*(?:Câu|Bài)\s+\d+\s*[:.]/i.test(block));
    
    return questionBlocks.map((block) => {
      let type = "multiple_choice", content = "", options = [], correctAnswer = "A", essayAnswerText = "";

      const qMatch = block.match(/^\s*(?:Câu|Bài)\s+(\d+)\s*[:.]/i);
      const qNumber = qMatch ? qMatch[1] : null;

      const partsByExplanation = block.split(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|HDG|Giải|Đáp án)\s*[:.]\s*/i);
      let questionBody = partsByExplanation[0];
      if (partsByExplanation.length > 1) essayAnswerText = partsByExplanation[1].trim();

      const partsByOptions = questionBody.split(/(?:^|\n|\t|\s{3,})(?=\*?\s*[A-D][.)]\s)/i);
      content = partsByOptions[0].replace(/^\s*(?:Câu|Bài)\s+\d+\s*[:.]\s*/i, "").trim();
      content = content.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

      let detectedCorrectAnswer = null;
      partsByOptions.slice(1).forEach(optStr => {
        let textOpt = optStr.trim();
        let isCorrect = false;
        
        if (textOpt.startsWith('*')) { isCorrect = true; textOpt = textOpt.substring(1).trim(); }
        const letterMatch = textOpt.match(/^([A-D])[.)]\s*(.*)/is);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            let val = letterMatch[2].trim().split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();
            options.push(val);
            if (isCorrect) detectedCorrectAnswer = letter;
        }
      });

      if (detectedCorrectAnswer) correctAnswer = detectedCorrectAnswer;
      else if (essayAnswerText.match(/^[A-D]$/i)) { correctAnswer = essayAnswerText.toUpperCase(); essayAnswerText = ""; } 
      else if (qNumber && globalAnswers[qNumber]) correctAnswer = globalAnswers[qNumber];
      else correctAnswer = "A";

      if (options.length === 0) { type = "essay"; options = []; correctAnswer = ""; } 
      else type = "multiple_choice";
      
      const baseData = { type, content, options, correctAnswer, essayAnswerText, difficulty: "medium" };
      if (isForPreview) return { ...baseData, tempId: `ext_prev_${Date.now()}_${Math.random()}` };
      return baseData;
    });
  };

  const handleAssignmentFileChange = (e) => { const file = e.target.files[0]; if (file) setAssignmentFile(file); };

  const handleExtractWord = async () => {
    if (!assignmentFile) return alert("Vui lòng chọn file Word trước!");
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (await mammoth.extractRawText({ arrayBuffer: event.target.result })).value;
        setRawExtractedText(text); setExtractedQuestions(extractQuestionsFromText(text, true)); 
        setIsReviewingExtraction(true); setLoading(false);
      };
      reader.readAsArrayBuffer(assignmentFile);
    } catch (error) { alert("Lỗi bóc tách file Word. Vui lòng thử lại!"); setLoading(false); }
  };

  const handleReuploadAndExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAssignmentFile(file); setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (await mammoth.extractRawText({ arrayBuffer: event.target.result })).value;
        setRawExtractedText(text); setExtractedQuestions(extractQuestionsFromText(text, true)); setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) { alert("Lỗi bóc tách. Vui lòng thử lại!"); setLoading(false); }
  };

  const reparseTextToSlots = (text) => setExtractedQuestions(extractQuestionsFromText(text, true));

  const handleCommitExtraction = () => {
    const formattedQs = extractedQuestions.map(q => {
        let finalOptions = Array.isArray(q.options) ? [...q.options] : [];
        let finalCorrect = q.correctAnswer || "A";
        if (q.type === 'multiple_choice') {
            const validLetters = finalOptions.map((_, i) => String.fromCharCode(65 + i));
            if (!validLetters.includes(finalCorrect)) {
                const idx = finalOptions.findIndex(opt => opt === q.correctAnswer);
                finalCorrect = idx !== -1 ? validLetters[idx] : "A";
            }
        }
        return { 
            ...q, tempId: Date.now() + Math.random(), options: finalOptions, correctAnswer: q.type === 'multiple_choice' ? finalCorrect : "",
            imageFile: null, previewUrl: "", points: "", essayAnswerText: q.essayAnswerText || "", essayAnswerImageFile: null, essayAnswerPreviewUrl: ""
        };
    });

    if (draftQuestions.length === 1 && !draftQuestions[0].content) setDraftQuestions(formattedQs);
    else setDraftQuestions([...draftQuestions, ...formattedQs]); 
    
    setIsReviewingExtraction(false); setAssignmentFile(null); setCreationMethod("manual"); 
  };

  const handleExtractedChange = (tempId, field, value) => setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  const handleExtractedOptionChange = (tempId, optionIndex, value) => setExtractedQuestions(prev => prev.map(q => { if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; } return q; }));
  const handleAddExtractedOption = (tempId) => setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, options: [...q.options, ""] } : q));
  const handleRemoveExtractedOption = (tempId, optIndex) => setExtractedQuestions(prev => prev.map(q => { if (q.tempId === tempId && q.options.length > 2) { const newOpts = q.options.filter((_, i) => i !== optIndex); return { ...q, options: newOpts }; } return q; }));

  const handleSaveDraftsToExam = async () => {
    const stripHtml = (html) => { let tmp = document.createElement("DIV"); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; };

    const isContentValid = draftQuestions.every(q => stripHtml(q.content).trim() !== "");
    if (!isContentValid) return alert("Vui lòng điền nội dung cho tất cả câu hỏi đang soạn!");

    const isEssayPointsValid = draftQuestions.every(q => { if (q.type !== 'essay') return true; return (Number(q.points) || 0) > 0; });
    if (!isEssayPointsValid) return alert("Vui lòng nhập điểm số hợp lệ (> 0) cho các câu Tự luận!");

    if (currentExam && currentExam.questions) {
        const existingContents = currentExam.questions.map(q => stripHtml(q.content).trim().toLowerCase());
        const hasDuplicate = draftQuestions.some(q => existingContents.includes(stripHtml(q.content).trim().toLowerCase()));
        if (hasDuplicate) return alert("LỖI: Có câu hỏi đang bị TRÙNG LẶP nội dung với câu hỏi đã có sẵn trong Đề thi này!");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("folderName", currentFolder.folderName); 
      formData.append("examName", currentExam.examName); 
      formData.append("subject", currentFolder.subject); 
      formData.append("grade", currentFolder.grade);
      formData.append("semester", currentFolder.semester);
      
      const questionsToSave = draftQuestions.map(q => ({
          tempId: q.tempId, content: q.content, type: q.type, options: q.options, correctAnswer: q.correctAnswer, difficulty: q.difficulty,
          points: q.type === 'essay' ? (Number(q.points) || 0) : 0, essayAnswerText: q.essayAnswerText || ""
      }));
      
      formData.append("questionsData", JSON.stringify(questionsToSave));
      
      draftQuestions.forEach(q => { 
        if (q.imageFile) formData.append(`image_${q.tempId}`, q.imageFile); 
        if (q.essayAnswerImageFile) formData.append(`essayImage_${q.tempId}`, q.essayAnswerImageFile);
      });

      await axios.post("/questions/create-exam-questions", formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" } });
      alert(`✅ Đã lưu thêm ${draftQuestions.length} câu hỏi vào Đề thi: ${currentExam.examName}`);
      setIsAddingNew(false); setDraftQuestions([]); setAssignmentFile(null); fetchBankData(); 
    } catch (err) { alert("Lỗi khi lưu câu hỏi!"); } finally { setLoading(false); }
  };

  const filteredSets = groupedSets.filter(set => {
     const matchSearch = set.folderName?.toLowerCase().includes(searchQuery.toLowerCase());
     const matchSub = folderSubject === "all" || set.subject === folderSubject;
     const matchGrade = folderGrade === "all" || set.grade === folderGrade;
     const matchSemester = folderSemester === "all" || set.semester === folderSemester;
     return matchSearch && matchSub && matchGrade && matchSemester;
  });

  const displayedQuestions = currentExam ? currentExam.questions.filter(q => {
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
              <p className="text-slate-500 font-medium text-sm sm:text-base">Quản lý học liệu <strong className="text-sky-600">{getTeacherDeptInfo()}</strong></p>
            </div>
          </div>
          {viewMode === "list" ? (
             <Button onClick={() => navigate("/teacher-dashboard")} variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50 font-bold rounded-xl hidden sm:flex">
               <ArrowLeft className="w-4 h-4 mr-2" /> Về Tổng quan
             </Button>
          ) : viewMode === "folder_detail" ? (
             <Button onClick={() => setViewMode("list")} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl">
               <ArrowLeft className="w-4 h-4 mr-2" /> Trở lại danh sách Thư mục
             </Button>
          ) : (
             <Button onClick={() => setViewMode("folder_detail")} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl">
               <ArrowLeft className="w-4 h-4 mr-2" /> Trở lại Đề thi
             </Button>
          )}
        </div>

        {/* LỚP 1: DANH SÁCH THƯ MỤC */}
        {viewMode === "list" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-sky-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-bold text-sky-900 whitespace-nowrap text-lg">Danh sách Thư mục ({filteredSets.length})</h3>
                  <Button onClick={() => setIsCreateFolderModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md w-full sm:w-auto h-11 px-6">
                     <PlusCircle className="w-4 h-4 mr-2"/> Tạo Thư mục Mới
                  </Button>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-sky-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                  
                  <Select value={folderSubject} onValueChange={setFolderSubject}>
                    <SelectTrigger className="h-10 w-auto min-w-[140px] max-w-[200px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl">
                      <span className="truncate">{folderSubject === 'all' ? 'Tất cả môn' : `Môn: ${folderSubject}`}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả môn</SelectItem>
                      {teacherSubjects.map(sub => <SelectItem key={sub} value={sub} className="font-bold">Môn: {sub}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={folderGrade} onValueChange={setFolderGrade}>
                    <SelectTrigger className="h-10 w-[120px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{folderGrade === 'all' ? 'Tất cả khối' : `Khối ${folderGrade}`}</span></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                  </Select>

                  <Select value={folderSemester} onValueChange={setFolderSemester}>
                    <SelectTrigger className="h-10 w-[130px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{folderSemester === 'all' ? 'Tất cả học kỳ' : `Học kỳ ${folderSemester}`}</span></SelectTrigger>
                    <SelectContent><SelectItem value="all">Tất cả học kỳ</SelectItem><SelectItem value="1">Học kỳ 1</SelectItem><SelectItem value="2">Học kỳ 2</SelectItem></SelectContent>
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
                  <p className="text-slate-500 mb-6 mt-2">Không tìm thấy thư mục nào phù hợp với bộ lọc.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredSets.map((folder, idx) => (
                    <Card key={idx} onClick={() => handleOpenFolder(folder)} className="relative border-sky-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-sky-300 transition-all cursor-pointer group bg-white rounded-3xl overflow-hidden">
                       <Button onClick={(e) => handleDeleteFolder(e, folder)} variant="ghost" className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl p-2 h-9 w-9 shadow-sm" title="Xóa toàn bộ thư mục này"><Trash2 className="w-4 h-4" /></Button>
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                           <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center group-hover:bg-sky-100 transition-colors"><FolderOpen className="w-7 h-7" /></div>
                           <Badge className="bg-sky-100 text-sky-700 border-0 shadow-none font-bold rounded-xl">{folder.exams?.length || 0} Đề thi</Badge>
                         </div>
                         <h3 className="text-xl font-black text-sky-950 mb-3 line-clamp-2 group-hover:text-sky-600 transition-colors pr-8">{folder.folderName}</h3>
                         <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
                           <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium rounded-lg">Khối {folder.grade}</Badge>
                           <Badge variant="outline" className="border-amber-200 text-amber-600 font-medium rounded-lg bg-amber-50">HK {folder.semester}</Badge>
                           <Badge variant="outline" className="border-slate-200 text-sky-600 font-bold bg-sky-50 rounded-lg">{folder.subject}</Badge>
                         </div>
                       </CardContent>
                    </Card>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* LỚP 2: DANH SÁCH ĐỀ THI TRONG THƯ MỤC */}
        {viewMode === "folder_detail" && currentFolder && (
          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-sky-500 text-white p-6 sm:p-8 border-b border-sky-600">
                <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3"><FolderOpen className="w-7 h-7 sm:w-8 sm:h-8"/> Thư mục: {currentFolder.folderName}</CardTitle>
                <p className="text-sky-50 font-medium mt-2 text-sm sm:text-base">Môn: {currentFolder.subject} • Khối: {currentFolder.grade} • HK: {currentFolder.semester}</p>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-8 bg-slate-50/50 min-h-[400px]">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm gap-4">
                    <h3 className="font-bold text-sky-900 text-lg">Danh sách Đề thi ({currentFolder.exams?.length || 0})</h3>
                    <Button onClick={() => setIsCreateExamModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md h-11 px-6 transition-all hover:scale-105 w-full sm:w-auto"><PlusCircle className="w-4 h-4 mr-2"/> Tạo Đề thi Mới</Button>
                 </div>

                 {(!currentFolder.exams || currentFolder.exams.length === 0) ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-sky-200 shadow-sm">
                       <FileText className="w-16 h-16 text-sky-100 mx-auto mb-3" />
                       <h3 className="text-xl font-bold text-slate-700">Chưa có đề thi</h3>
                       <p className="text-slate-500 mb-6 mt-1">Thư mục này chưa có đề thi nào.</p>
                       <Button onClick={() => setIsCreateExamModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold h-11 px-6"><PlusCircle className="w-4 h-4 mr-2"/> Tạo đề thi đầu tiên</Button>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentFolder.exams.map((exam, idx) => (
                         <Card key={idx} onClick={() => handleOpenExam(exam)} className="relative border-indigo-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all cursor-pointer group bg-white rounded-3xl overflow-hidden">
                            <Button onClick={(e) => handleDeleteExam(e, exam)} variant="ghost" className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl p-2 h-9 w-9 shadow-sm" title="Xóa đề thi"><Trash2 className="w-4 h-4" /></Button>
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><FileText className="w-6 h-6" /></div>
                                <Badge className="bg-indigo-100 text-indigo-700 border-0 shadow-none font-bold rounded-xl">{exam.questions?.length || 0} Câu hỏi</Badge>
                              </div>
                              <h3 className="text-lg font-black text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors pr-8">{exam.examName}</h3>
                            </CardContent>
                         </Card>
                      ))}
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* LỚP 3: DANH SÁCH CÂU HỎI TRONG ĐỀ THI */}
        {viewMode === "exam_detail" && currentFolder && currentExam && (
          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-indigo-500 text-white p-6 sm:p-8 border-b border-indigo-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3"><FileText className="w-7 h-7 sm:w-8 sm:h-8"/> Đề: {currentExam.examName}</CardTitle>
                  <p className="text-indigo-100 font-medium mt-2 text-sm sm:text-base">Thuộc thư mục: {currentFolder.folderName} • Tổng: {currentExam.questions?.length || 0} câu</p>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-8 bg-slate-50/50 min-h-[400px]">
                 {!isAddingNew && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm gap-4">
                       <h3 className="font-bold text-indigo-900 text-lg">Danh sách câu hỏi trong đề</h3>
                       <Button onClick={() => { setIsAddingNew(true); setDraftQuestions([{ tempId: Date.now(), content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", imageFile: null, previewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }]); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md h-11 px-6 transition-all hover:scale-105 w-full sm:w-auto"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu hỏi</Button>
                    </div>
                 )}

                 {!isAddingNew && currentExam.questions?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                       <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-indigo-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                       <Select value={filterType} onValueChange={(val) => { setFilterType(val); if(val !== 'essay') setFilterPoints(""); }}>
                         <SelectTrigger className="h-10 w-[180px] bg-slate-50 border-indigo-100 font-bold text-indigo-700 rounded-xl"><span className="truncate">{filterType === 'all' ? 'Tất cả loại' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span></SelectTrigger>
                         <SelectContent><SelectItem value="all">Tất cả loại</SelectItem><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                       </Select>
                       {filterType === 'essay' && (<Input type="number" step="0.25" placeholder="Lọc theo điểm..." value={filterPoints} onChange={(e) => setFilterPoints(e.target.value)} className="h-10 w-[140px] bg-slate-50 border-indigo-100 font-bold text-indigo-700 rounded-xl" />)}
                    </div>
                 )}

                 {/* GIAO DIỆN THÊM CÂU HỎI */}
                 {isAddingNew && (
                    <div className="bg-white border border-indigo-200 rounded-3xl p-6 shadow-sm mb-8 relative">
                       <Button onClick={() => setIsAddingNew(false)} variant="ghost" className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 rounded-xl">Hủy bỏ</Button>
                       <h3 className="text-xl font-black text-indigo-800 mb-4 flex items-center"><Layers className="w-5 h-5 mr-2"/> Bổ sung câu hỏi mới</h3>
                       
                       <div className="flex bg-slate-100 rounded-xl w-full p-1 mb-6">
                          <button onClick={() => setCreationMethod("manual")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><PenTool className="w-4 h-4 inline mr-2"/> Soạn thủ công</button>
                          <button onClick={() => setCreationMethod("upload")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><FileText className="w-4 h-4 inline mr-2"/> Bóc tách từ Word</button>
                       </div>

                        {creationMethod === "upload" && (
                          <div className="space-y-4">
                            {!isReviewingExtraction ? (
                               <div className="bg-slate-50 p-6 sm:p-10 rounded-2xl border border-dashed border-indigo-300 text-center">
                                  <h4 className="font-bold text-indigo-900 text-base sm:text-lg mb-2">Tải lên file Word (.docx)</h4>
                                  <p className="text-slate-500 text-xs sm:text-sm mb-6">Hệ thống sẽ tự động bóc tách thành danh sách câu hỏi để bạn chỉnh sửa.</p>
                                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setAssignmentFile(f);}} onClick={() => assignmentFileRef.current.click()} className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all cursor-pointer flex flex-col items-center justify-center max-w-lg mx-auto ${assignmentFile ? 'border-indigo-500 bg-indigo-100' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}>
                                    <input type="file" ref={assignmentFileRef} onChange={handleAssignmentFileChange} className="hidden" accept=".doc,.docx" />
                                    {assignmentFile ? (<><FileText className="h-8 w-8 text-indigo-600 mb-2" /><p className="font-black text-indigo-900 text-base line-clamp-1">{assignmentFile.name}</p><p className="text-xs text-indigo-600 mt-1">Click để chọn file khác</p></>) : (<><UploadCloud className="h-8 w-8 text-indigo-400 mb-2" /><p className="font-bold text-slate-700">Nhấn hoặc Kéo thả file vào đây</p></>)}
                                  </div>
                                  {assignmentFile && <Button type="button" onClick={handleExtractWord} disabled={loading} className="mt-6 w-full max-w-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-12 rounded-xl shadow-md">{loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <Sparkles className="w-5 h-5 mr-2" />} Bắt đầu bóc tách</Button>}
                               </div>
                            ) : (
                               <div className="flex flex-col lg:flex-row gap-6 items-start">
                                 <div className="w-full lg:w-2/5 flex flex-col gap-0 sticky top-4 z-10">
                                    <div className="flex justify-between items-center bg-slate-100 p-3 rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
                                      <span className="text-sm font-bold text-slate-700 uppercase">Văn bản thô (File gốc)</span>
                                      <div className="flex gap-2">
                                        <label className="h-8 px-3 inline-flex items-center justify-center rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                                          <FolderOpen className="w-3.5 h-3.5 mr-1.5"/> Chọn lại
                                          <input type="file" className="hidden" accept=".doc,.docx" onChange={handleReuploadAndExtract} />
                                        </label>
                                        <Button size="sm" variant="outline" className="h-8 text-indigo-600 border-indigo-300 hover:bg-indigo-50 font-bold shadow-sm" onClick={() => reparseTextToSlots(rawExtractedText)}>
                                          <Sparkles className="w-3.5 h-3.5 mr-1"/> Rót lại
                                        </Button>
                                      </div>
                                    </div>
                                    <textarea 
                                      value={rawExtractedText} 
                                      onChange={(e) => setRawExtractedText(e.target.value)}
                                      className="w-full h-[600px] p-4 rounded-b-xl border border-slate-200 font-mono text-sm leading-relaxed bg-white shadow-inner resize-none focus-visible:ring-indigo-500 outline-none"
                                    />
                                 </div>

                                 <div className="w-full lg:w-3/5 space-y-4">
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                                      <span className="text-sm font-bold text-indigo-800 uppercase">Xem trước ({extractedQuestions.length} câu)</span>
                                      <Button onClick={() => setExtractedQuestions([...extractedQuestions, { tempId: `ext_new_${Date.now()}`, type: "multiple_choice", content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium" }])} size="sm" variant="outline" className="h-8 bg-white rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm câu</Button>
                                    </div>

                                    {extractedQuestions.map((q, index) => (
                                        <Card key={q.tempId} className="border-indigo-200 shadow-sm relative rounded-2xl overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                                            <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                              <CardTitle className="text-base font-black text-slate-700 flex items-center gap-2">
                                                Câu {index + 1} 
                                                <Badge variant="outline" className="text-[10px] ml-2 bg-white text-slate-500 rounded-md">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                              </CardTitle>
                                              <Button type="button" onClick={() => setExtractedQuestions(extractedQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-4 bg-white">
                                              <RichTextEditor value={q.content} onChange={(val) => handleExtractedChange(q.tempId, 'content', val)} />
                                              
                                              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                                                <h4 className="text-sm font-bold text-emerald-700 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Hướng dẫn giải</h4>
                                                <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleExtractedChange(q.tempId, 'essayAnswerText', val)} />
                                              </div>

                                              {q.type === 'multiple_choice' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.options.map((opt, i) => {
                                                      const letter = String.fromCharCode(65 + i);
                                                      return (
                                                      <div key={i} className="flex items-center gap-2">
                                                        <span className="font-black text-slate-500 w-6">{letter}.</span>
                                                        <Input className="h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm" value={opt} onChange={(e) => handleExtractedOptionChange(q.tempId, i, e.target.value)} />
                                                        {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExtractedOption(q.tempId, i)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                                                      </div>
                                                    )})}
                                                  </div>
                                                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleAddExtractedOption(q.tempId)} className="text-indigo-600 hover:bg-indigo-100 rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm đáp án</Button>
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

                                    <Button type="button" onClick={handleCommitExtraction} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all mt-4">
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
                              <Card key={q.tempId} className="border-indigo-200 shadow-sm relative overflow-hidden group rounded-2xl">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-400"></div>
                                <CardHeader className="bg-slate-50/50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                  <CardTitle className="text-base font-black text-slate-700">Câu mới {index + 1} (Đang soạn)</CardTitle>
                                  <Button onClick={() => setDraftQuestions(draftQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4 bg-white">
                                   
                                   <div className={`grid gap-4 ${q.type === 'essay' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                                     <Select value={q.type} onValueChange={(val) => handleDraftChange(q.tempId, 'type', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700"><span className="truncate">{q.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                                     <Select value={q.difficulty} onValueChange={(val) => handleDraftChange(q.tempId, 'difficulty', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700"><span className="truncate">{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
                                     {q.type === "essay" && (<Input type="number" step="0.25" min="0" placeholder="Điểm ()" value={q.points} onChange={(e) => handleDraftChange(q.tempId, 'points', e.target.value)} className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-black text-indigo-700 focus-visible:ring-indigo-500" />)}
                                   </div>

                                   <div className="flex flex-col md:flex-row gap-4">
                                     <div className="flex-1">
                                        <RichTextEditor placeholder="Nhập nội dung đề bài và công thức toán học..." value={q.content} onChange={(val) => handleDraftChange(q.tempId, 'content', val)} />
                                     </div>
                                     <div className="w-full md:w-36 shrink-0 h-[100px]">
                                       {q.previewUrl ? (
                                         <div className="relative w-full h-full rounded-xl border border-slate-200 overflow-hidden shadow-sm group/img">
                                           <img src={q.previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => setDraftQuestions(draftQuestions.map(m => m.tempId === q.tempId ? { ...m, imageFile: null, previewUrl: "" } : m))} className="bg-rose-500 text-white rounded-full p-2"><Trash2 className="w-4 h-4"/></button></div>
                                         </div>
                                       ) : (
                                         <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-indigo-400 mb-1" /><span className="text-xs font-bold text-indigo-600 text-center">Ảnh Đề bài</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleDraftImageChange(q.tempId, e)} /></label>
                                       )}
                                     </div>
                                   </div>

                                   <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                      <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải </h4>
                                      <div className="flex flex-col md:flex-row gap-4">
                                          <div className="flex-1">
                                            <RichTextEditor placeholder="Nhập lời giải..." value={q.essayAnswerText} onChange={(val) => handleDraftChange(q.tempId, 'essayAnswerText', val)} />
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

                                   {q.type === "multiple_choice" && (
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          {q.options.map((optLabel, i) => (
                                            <div key={i} className="flex items-center gap-2"><span className="font-bold text-slate-500 w-6">{String.fromCharCode(65 + i)}.</span><Input className="h-10 rounded-xl bg-white border-slate-200 shadow-sm text-sm" value={optLabel} onChange={(e) => handleDraftOptionChange(q.tempId, i, e.target.value)} />
                                            {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setDraftQuestions(draftQuestions.map(draft => draft.tempId === q.tempId ? {...draft, options: draft.options.filter((_, idx) => idx !== i)} : draft))} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                                            </div>
                                          ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                          <Button type="button" variant="ghost" size="sm" onClick={() => setDraftQuestions(draftQuestions.map(draft => draft.tempId === q.tempId ? {...draft, options: [...draft.options, ""]} : draft))} className="text-indigo-600 hover:bg-indigo-100 rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm đáp án</Button>
                                          <div className="flex items-center gap-2">
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
                                      </div>
                                   )}
                                </CardContent>
                              </Card>
                            ))}
                            <Button type="button" onClick={() => setDraftQuestions([...draftQuestions, { tempId: Date.now(), content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", imageFile: null, previewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }])} variant="outline" className="w-full h-12 border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl">
                               <PlusCircle className="w-5 h-5 mr-2"/> Thêm câu hỏi tiếp theo
                            </Button>
                            <Button onClick={handleSaveDraftsToExam} disabled={loading} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all mt-4">
                                {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />} LƯU VÀO ĐỀ THI "{currentExam.examName}"
                            </Button>
                          </div>
                        )}
                    </div>
                 )}

                 {displayedQuestions.length === 0 && !isAddingNew ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-indigo-200 shadow-sm">
                       <FileQuestion className="w-16 h-16 text-indigo-100 mx-auto mb-3" />
                       <h3 className="text-xl font-bold text-slate-700">Đề thi trống</h3>
                       <p className="text-slate-500 mb-6 mt-1">Đề thi này chưa có câu hỏi nào hoặc không khớp bộ lọc.</p>
                       <Button onClick={() => setIsAddingNew(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold h-11 px-6"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu đầu tiên</Button>
                    </div>
                 ) : (
                    <div className={`space-y-4 ${isAddingNew ? 'opacity-50 pointer-events-none' : ''}`}>
                       {displayedQuestions.map((q, i) => (
                          <Card key={q._id} className="border-indigo-100 shadow-sm bg-white hover:border-indigo-300 transition-colors rounded-2xl overflow-hidden">
                              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 relative">
                                <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-indigo-400"></div>
                                <div className="font-black text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg h-max shrink-0 w-max">Câu {i+1}</div>
                                <div className="flex-1 space-y-3">
                                   
                                   <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[10px] rounded-md">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                      {q.type === 'essay' && q.points > 0 && <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 font-black text-[10px] rounded-md">{q.points} Điểm</Badge>}
                                   </div>

                                   <div 
                                      className="font-bold text-slate-800 text-base leading-relaxed q-content-view line-clamp-3"
                                      dangerouslySetInnerHTML={{ __html: q.content }}
                                   />

                                   {q.imageUrl && <img src={getImageUrl(q.imageUrl)} className="max-h-40 mt-2 rounded-xl border border-slate-200 shadow-sm" alt="Đề bài" />}
                                   
                                   {(q.essayAnswerText || q.essayAnswerImageUrl) && (
                                      <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                         <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Hướng dẫn giải</p>
                                         {q.essayAnswerText && (
                                           <div 
                                             className="text-sm text-slate-700 italic line-clamp-2 q-content-view"
                                             dangerouslySetInnerHTML={{ __html: q.essayAnswerText }}
                                           />
                                         )}
                                         {q.essayAnswerImageUrl && <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-0 shadow-none text-[10px] rounded-md">Có đính kèm ảnh</Badge>}
                                      </div>
                                   )}

                                   {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                       {q.options.map((opt, idx) => {
                                          const letter = String.fromCharCode(65 + idx);
                                          const isCorrect = q.correctAnswer === letter || q.correctAnswer === opt;
                                          return (
                                            <div key={idx} className="flex items-start gap-2 text-sm">
                                              <span className={`font-bold ${isCorrect ? 'text-indigo-600' : 'text-slate-400'}`}>{letter}.</span>
                                              <span className={`${isCorrect ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>{opt}</span>
                                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0"/>}
                                            </div>
                                          );
                                       })}
                                     </div>
                                   )}
                                </div>
                                <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                                   <Button onClick={() => handleEditClick(q)} variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-lg flex-1 sm:flex-none"><Pencil className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Sửa</span></Button>
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

        {/* MODAL TẠO THƯ MỤC */}
        <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
          <DialogContent className="sm:max-w-[500px] w-[95%] rounded-3xl border-none p-6">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-2"><FolderOpen className="w-6 h-6 text-sky-500"/> Tạo Thư mục Mới</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Tên Thư mục <span className="text-rose-500">*</span></label>
                <Input placeholder="" className="h-12 rounded-xl bg-slate-50 font-bold border-sky-200 focus-visible:ring-sky-500" value={newFolderInfo.folderName} onChange={(e) => setNewFolderInfo({...newFolderInfo, folderName: e.target.value})} autoFocus />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Môn học</label>
                  <Select value={newFolderInfo.subject} onValueChange={(val) => setNewFolderInfo({...newFolderInfo, subject: val})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-200 font-bold">
                      <SelectValue placeholder="Chọn môn" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherSubjects.map(sub => <SelectItem key={sub} value={sub}>Môn: {sub}</SelectItem>)}
                      {teacherSubjects.length === 0 && <SelectItem value="none" disabled>Chưa có môn</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Khối lớp</label>
                  <Select value={newFolderInfo.grade} onValueChange={(val) => setNewFolderInfo({...newFolderInfo, grade: val})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-200 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-slate-700">Học kỳ</label>
                  <Select value={newFolderInfo.semester} onValueChange={(val) => setNewFolderInfo({...newFolderInfo, semester: val})}><SelectTrigger className="h-12 rounded-xl bg-slate-50 border-sky-200 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">HK 1</SelectItem><SelectItem value="2">HK 2</SelectItem></SelectContent></Select>
                </div>
              </div>
              <Button onClick={handleCreateNewFolder} className="w-full h-12 mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md text-lg">Xác nhận Tạo Thư mục</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL TẠO ĐỀ THI */}
        <Dialog open={isCreateExamModalOpen} onOpenChange={setIsCreateExamModalOpen}>
          <DialogContent className="sm:max-w-[400px] w-[95%] rounded-3xl border-none p-6">
            <DialogHeader><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-2"><FileText className="w-6 h-6 text-sky-500"/> Tạo Đề thi Mới</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="font-bold text-slate-700">Tên Đề thi <span className="text-rose-500">*</span></label>
                <Input placeholder="" className="h-12 rounded-xl bg-slate-50 font-bold border-sky-200 focus-visible:ring-sky-500" value={newExamName} onChange={(e) => setNewExamName(e.target.value)} autoFocus />
              </div>
              <Button onClick={handleCreateNewExam} className="w-full h-12 mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md text-lg">Tạo Đề thi</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CÁC MODAL EDIT VÀ VIEW CÂU HỎI */}
        <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setEditPreviewUrl(""); setEditSelectedFile(null); setEditQuestionData(initialQuestionState);}}}>
          <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-4 sm:p-8 bg-slate-50">
            <DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black text-sky-950 flex items-center gap-2 border-b border-sky-100 pb-3"><Pencil className="h-5 sm:h-6 w-5 sm:w-6 text-sky-500"/> Chỉnh sửa câu hỏi</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger><SelectContent><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.semester} onValueChange={(v) => setEditQuestionData({...editQuestionData, semester: v})}><SelectTrigger className="h-12 rounded-xl bg-white border-sky-100 font-bold"><span className="truncate">HK {editQuestionData.semester}</span></SelectTrigger><SelectContent><SelectItem value="1">Học kỳ 1</SelectItem><SelectItem value="2">Học kỳ 2</SelectItem></SelectContent></Select>
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
                            }} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                        )}
                      </div>
                    )})}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-100">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditQuestionData({...editQuestionData, options: [...editQuestionData.options, ""]})} className="text-sky-600 hover:bg-sky-100 w-max rounded-lg"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                      <Select value={editQuestionData.correctAnswer} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}>
                        <SelectTrigger className="h-11 w-full sm:w-32 bg-white text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm">
                          <span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span>
                        </SelectTrigger>
                        <SelectContent><SelectItem value="A">Câu A</SelectItem><SelectItem value="B">Câu B</SelectItem><SelectItem value="C">Câu C</SelectItem><SelectItem value="D">Câu D</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl mt-2">
                Cập nhật thay đổi
              </Button>
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

                {(viewQuestion.essayAnswerText || viewQuestion.essayAnswerImageUrl) && (
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