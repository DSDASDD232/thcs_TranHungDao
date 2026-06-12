import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { processWordFile, extractQuestionsFromText } from "../lib/wordExtractor"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { 
  ArrowLeft, PenTool, FileText, UploadCloud, Sparkles, PlusCircle, Trash2, 
  Loader2, Database, Image as ImageIcon, CheckCircle2, FolderOpen, Layers, Save, Pencil, Search, FileQuestion, Filter, Eye, ArrowRight, Sigma, Settings, Calculator, CheckSquare, LibraryBig, Video, FileAudio, X, Eraser
} from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'mathlive';

// ==========================================
// HÀM DỊCH MÃ LATEX "SIÊU CẤP"
// ==========================================
const renderLatexContent = (htmlString) => {
  if (!htmlString) return "";
  let processedHtml = htmlString;

  if (!/<[a-z][\s\S]*>/i.test(processedHtml) && (processedHtml.includes('\\') || processedHtml.includes('^') || processedHtml.includes('_'))) {
      try {
          const cleanMath = processedHtml.replace(/\$/g, '').trim();
          return katex.renderToString(`\\displaystyle ${cleanMath}`, { displayMode: false, throwOnError: true });
      } catch (e) {}
  }

  if (processedHtml.includes('ql-formula')) {
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(processedHtml, 'text/html');
          const formulas = doc.querySelectorAll('.ql-formula');
          formulas.forEach(formula => {
              const latex = formula.getAttribute('data-value') || formula.textContent;
              if (latex) {
                  try { formula.innerHTML = katex.renderToString(`\\displaystyle ${latex}`, { displayMode: false, throwOnError: false }); } 
                  catch (e) {}
              }
          });
          processedHtml = doc.body.innerHTML;
      } catch (e) {}
  }

  processedHtml = processedHtml.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });
  processedHtml = processedHtml.replace(/\$([^\$]+)\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });

  if (processedHtml.includes('\\') || processedHtml.includes('^') || processedHtml.includes('_')) {
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(processedHtml, 'text/html');
          const walkTextNodes = (node) => {
              if (node.nodeType === 3) { 
                  let text = node.nodeValue;
                  if (node.parentNode && !node.parentNode.closest('.katex')) {
                       const simpleMathRegex = /(\\(?:[a-zA-Z]+)[0-9a-zA-Z\+\-\*\/\^\_\{\}\(\)\.=]*|[a-zA-Z][\^_][0-9a-zA-Z\{\}]+[\+\-\*\/\^\_\{\}\(\)\.=0-9a-zA-Z]*)/g;
                       if (simpleMathRegex.test(text)) {
                          const newHtml = text.replace(simpleMathRegex, (match) => {
                              try { return katex.renderToString(`\\displaystyle ${match}`, { displayMode: false, throwOnError: true }); } 
                              catch (e) { return match; }
                          });
                          const span = document.createElement('span');
                          span.innerHTML = newHtml;
                          node.replaceWith(span);
                       }
                  }
              } else if (node.nodeType === 1) { 
                  if (!node.classList.contains('katex') && !node.classList.contains('ql-formula')) Array.from(node.childNodes).forEach(walkTextNodes);
              }
          };
          Array.from(doc.body.childNodes).forEach(walkTextNodes);
          processedHtml = doc.body.innerHTML;
      } catch (e) {}
  }
  return processedHtml;
};

const hasContent = (htmlString) => {
    if (!htmlString) return false;
    const strippedText = htmlString.replace(/<[^>]*>?/gm, '').trim();
    return strippedText.length > 0;
};
const hasLatex = (text) => text && (text.includes('$$') || text.includes('$') || text.includes('\\') || text.includes('^') || text.includes('_') || text.includes('ql-formula'));

const stripHtmlForCompare = (html) => {
    if (!html) return "";
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim().toLowerCase();
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

const QuestionBank = () => {
  const navigate = useNavigate();
  const assignmentFileRef = useRef(null);
  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';
  
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [viewMode, setViewMode] = useState("overview"); 
  const [groupedSets, setGroupedSets] = useState([]); 
  const [currentExam, setCurrentExam] = useState(null); 

  const [filterSubject, setFilterSubject] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterExam, setFilterExam] = useState("all"); 

  const [bankSelected, setBankSelected] = useState([]);

  // TẠO TẬP MỚI & SỬA TẬP
  const [isCreateSetModalOpen, setIsCreateSetModalOpen] = useState(false);
  const [newSetInfo, setNewSetInfo] = useState({ examName: "", subject: "", grade: "", semester: "1" });
  const [isEditSetModalOpen, setIsEditSetModalOpen] = useState(false);
  const [editSetInfo, setEditSetInfo] = useState(null);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [creationMethod, setCreationMethod] = useState("manual"); 
  const [assignmentFile, setAssignmentFile] = useState(null);
  
  // DỮ LIỆU SOẠN THẢO & SỬA CHỮA
  const [draftQuestions, setDraftQuestions] = useState([]); 
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [isReviewingExtraction, setIsReviewingExtraction] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");

  const [openMediaPanels, setOpenMediaPanels] = useState({});
  const [openExtractedMediaPanels, setOpenExtractedMediaPanels] = useState({});
  const [openEditMediaPanel, setOpenEditMediaPanel] = useState(false);

  // LỚP PHỦ THÔNG MINH (OVERLAY) CHO SOẠN/SỬA
  const [activeRTE, setActiveRTE] = useState(null);
  const [focusedOption, setFocusedOption] = useState({ tempId: null, optIdx: null, isExtracted: false });

  // DỮ LIỆU CHỈNH SỬA CÂU HỎI
  const initialQuestionState = { 
      content: "", subject: "", type: "multiple_choice", difficulty: "medium", grade: "6", semester: "1",
      options: ["", "", "", ""], correctAnswer: "A", points: "", videoUrl: "",
      essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" 
  };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState(initialQuestionState);
  const [editVideoFile, setEditVideoFile] = useState(null);
  const [editVideoPreviewUrl, setEditVideoPreviewUrl] = useState("");

  const [viewQuestion, setViewQuestion] = useState(null);
  const [mathModal, setMathModal] = useState({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false });
  const mathFieldRef = useRef(null);

  const getHeader = (isMultipart = false) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    return { headers };
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ML__keyboard { z-index: 999999 !important; }
      math-field::part(virtual-keyboard-toggle) { color: #0ea5e9; }
      math-field:focus-within { outline: 2px solid #38bdf8 !important; }
      
      .q-content-view-table img, 
      .q-content-view-table video, 
      .q-content-view-table iframe {
         display: none !important;
      }
      
      .modal-detail-view .q-content-view img {
         max-height: 350px !important;
         width: auto !important;
         object-fit: contain;
         border-radius: 8px;
         margin-top: 10px;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => { if (mathModal.isOpen && mathFieldRef.current) { setTimeout(() => mathFieldRef.current.focus(), 150); } }, [mathModal.isOpen]);

  const confirmMathInsertion = () => {
    if (!mathFieldRef.current) return;
    const latex = mathFieldRef.current.value;
    if (!latex) { setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false }); return; }
    const formattedLatex = ` $$ ${latex} $$ `; 
    if (mathModal.isEditing) {
        const newOptions = [...editQuestionData.options];
        newOptions[mathModal.targetOptionIndex] = (newOptions[mathModal.targetOptionIndex] || '') + formattedLatex;
        setEditQuestionData({ ...editQuestionData, options: newOptions });
    } else if (mathModal.isExtracted) {
        setExtractedQuestions(extractedQuestions.map(q => {
            if (q.tempId === mathModal.targetTempId) {
                const newOptions = [...q.options];
                newOptions[mathModal.targetOptionIndex] = (newOptions[mathModal.targetOptionIndex] || '') + formattedLatex;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    } else {
        setDraftQuestions(draftQuestions.map(q => {
            if (q.tempId === mathModal.targetTempId) {
                const newOptions = [...q.options];
                newOptions[mathModal.targetOptionIndex] = (newOptions[mathModal.targetOptionIndex] || '') + formattedLatex;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    }
    mathFieldRef.current.value = '';
    setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false });
  };

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
      const resSets = await axios.get("/questionSet/all", getHeader());
      const fetchedSets = resSets.data.groupedSets || [];
      
      setGroupedSets(fetchedSets);

      let allQuestionsFlat = [];
      fetchedSets.forEach(set => {
         if(set.questions && set.questions.length > 0) {
            set.questions.forEach(q => {
               allQuestionsFlat.push({...q, _setId: set._id});
            });
         }
      });
      setQuestions(allQuestionsFlat);

      if (currentExam) {
         const updatedExam = fetchedSets.find(e => e._id === currentExam._id);
         if (updatedExam) setCurrentExam(updatedExam);
         else setViewMode("sets_list"); 
      }
    } catch (error) { console.error("Lỗi lấy dữ liệu kho:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const profRes = await axios.get("/teacher/me", getHeader());
        setTeacherProfile(profRes.data);
        await fetchBankData();
      } catch (error) { console.error("Lỗi lấy dữ liệu ban đầu", error); }
    };
    initData();
  }, []);

  const teacherSubjects = Array.isArray(teacherProfile?.subjects) && teacherProfile.subjects.length > 0 
    ? teacherProfile.subjects : teacherProfile?.subject ? [teacherProfile.subject] : [];

  const getTeacherDeptInfo = () => {
    if(!teacherProfile) return "Đang tải...";
    const deptStr = teacherProfile.department === "KHTN" ? "Tổ KHTN" : teacherProfile.department === "KHXH" ? "Tổ KHXH" : "Chưa phân tổ";
    const subStr = teacherSubjects.length > 0 ? teacherSubjects.join(", ") : "Chưa đăng ký môn";
    return `${deptStr} • ${subStr}`;
  };

  // 👉 TỰ ĐỘNG PHÂN TÍCH KHỐI DỰA TRÊN LỚP ĐƯỢC PHÂN CÔNG (KHÔNG GIỚI HẠN)
  const allowedGrades = useMemo(() => {
    if (!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0) return ["6", "7", "8", "9"];
    const grades = teacherProfile.assignedClasses.map(c => c.grade || c.name?.match(/\d+/)?.[0]).filter(Boolean);
    return [...new Set(grades)].sort();
  }, [teacherProfile]);

  const availableExams = [...new Set(groupedSets.filter(s => (filterSubject === "all" || s.subject === filterSubject)).map(s => s.examName))];

  const filteredOverviewQuestions = questions.filter(q => {
    const matchSearch = (q.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = filterSubject === "all" || q.subject === filterSubject;
    const matchGrade = filterGrade === "all" || String(q.grade) === filterGrade;
    const matchType = filterType === "all" || q.type === filterType;
    const matchExam = filterExam === "all" || q.examName === filterExam;
    return matchSearch && matchSubject && matchGrade && matchType && matchExam;
  });

  const filteredSets = groupedSets.filter(set => {
     const matchSearch = set.examName?.toLowerCase().includes(searchQuery.toLowerCase());
     const matchSub = filterSubject === "all" || set.subject === filterSubject;
     const matchGrade = filterGrade === "all" || set.grade === filterGrade;
     return matchSearch && matchSub && matchGrade;
  });

  const displayedSetQuestions = (currentExam?.questions || []).filter(q => {
    const matchSearch = (q.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === "all" || q.type === filterType;
    return matchSearch && matchType;
  });

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredOverviewQuestions.map(q => q._id);
    const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => bankSelected.includes(id));
    if (isAllSelected) { setBankSelected(prev => prev.filter(id => !filteredIds.includes(id))); } 
    else { const newSelected = [...new Set([...bankSelected, ...filteredIds])]; setBankSelected(newSelected); }
  };

  const isAllFilteredSelected = filteredOverviewQuestions.length > 0 && filteredOverviewQuestions.every(q => bankSelected.includes(q._id));
  const toggleBankSelection = (qId) => { setBankSelected(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]); };

  const handleDeleteDbQuestion = async (id) => {
    if(!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi kho?")) return;
    try { await axios.delete(`/questions/delete/${id}`, getHeader()); fetchBankData(); } 
    catch (e) { alert("Lỗi xóa câu hỏi!"); }
  };

  const handleBatchDelete = async () => {
    if(!window.confirm(`Bạn sắp xóa VĨNH VIỄN ${bankSelected.length} câu hỏi khỏi kho. Tiếp tục?`)) return;
    setLoading(true);
    try { for (let id of bankSelected) { await axios.delete(`/questions/delete/${id}`, getHeader()); } alert("✅ Xóa hàng loạt thành công!"); setBankSelected([]); fetchBankData(); } 
    catch (e) { alert("Có lỗi xảy ra khi xóa hàng loạt!"); } setLoading(false);
  };

  const handleDeleteSet = async (e, set) => {
    e.stopPropagation();
    if(!window.confirm(`🚨 CẢNH BÁO: Xóa Tập câu hỏi "${set.examName}" sẽ XÓA VĨNH VIỄN toàn bộ ${set.questions.length} câu hỏi bên trong.\nBạn có chắc chắn muốn xóa?`)) return;
    setLoading(true);
    try {
        await axios.delete(`/questionSet/delete-set/${set._id}`, getHeader());
        alert(`✅ Đã xóa Tập câu hỏi "${set.examName}" thành công!`);
        if (viewMode === "set_detail") { setViewMode("sets_list"); setSearchQuery(""); }
        fetchBankData();
    } catch (err) { alert("Có lỗi xảy ra khi xóa Tập câu hỏi!"); }
    setLoading(false);
  };

  const openCreateSetModal = () => {
    setIsCreateSetModalOpen(true);
    setNewSetInfo({ examName: "", subject: teacherSubjects[0] || "", grade: allowedGrades[0] || "6", semester: "1" });
  };

  const handleCreateNewSet = async () => {
    const trimmedName = newSetInfo.examName.trim();
    if (!trimmedName) return alert("Vui lòng nhập tên Tập câu hỏi!");
    if (!newSetInfo.subject) return alert("Vui lòng chọn môn học!");
    
    setLoading(true);
    try {
      const res = await axios.post("/questionSet/create-set", {
         examName: trimmedName,
         subject: newSetInfo.subject,
         grade: newSetInfo.grade,
         semester: newSetInfo.semester
      }, getHeader());
      
      const createdSet = { ...res.data.questionSet, questions: [] };
      setCurrentExam(createdSet);
      setViewMode("set_detail");
      setSearchQuery("");
      setIsCreateSetModalOpen(false);
      setIsAddingNew(true);
      setDraftQuestions([{ tempId: `draft_${Date.now()}`, content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", videoUrl: "", videoFile: null, videoPreviewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }]);
      fetchBankData();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi tạo tập câu hỏi!");
    }
    setLoading(false);
  };

  const openEditSetModal = () => {
    setEditSetInfo({ ...currentExam });
    setIsEditSetModalOpen(true);
  };

  const handleUpdateSetInfo = async () => {
    if (!editSetInfo.examName.trim()) return alert("Tên Tập không được để trống!");
    if (!editSetInfo._id) return alert("Không tìm thấy ID Tập câu hỏi!");

    setLoading(true);
    try {
      await axios.put(`/questionSet/update-set/${editSetInfo._id}`, {
         examName: editSetInfo.examName.trim(),
         subject: editSetInfo.subject,
         grade: editSetInfo.grade,
         semester: editSetInfo.semester
      }, getHeader());
      
      alert("Cập nhật thông tin Tập câu hỏi thành công!");
      setCurrentExam({ ...editSetInfo });
      setIsEditSetModalOpen(false);
      fetchBankData();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi cập nhật Tập câu hỏi!");
    }
    setLoading(false);
  };

  const handleEditClick = (q) => {
    setEditingQuestionId(q._id);
    let parsedOptions = [];
    if (Array.isArray(q.options) && q.options.length > 0) parsedOptions = q.options;
    else if (typeof q.options === 'string') {
      try { parsedOptions = JSON.parse(q.options); if (typeof parsedOptions[0] === 'string' && parsedOptions[0].startsWith('[')) parsedOptions = JSON.parse(parsedOptions[0]); } 
      catch (e) { parsedOptions = [q.options]; }
    }
    let correctKey = "A";
    if (q.type === 'multiple_choice') {
      const validLetters = parsedOptions.map((_, i) => String.fromCharCode(65 + i));
      if (validLetters.includes(q.correctAnswer)) correctKey = q.correctAnswer;
      else { const index = parsedOptions.findIndex(opt => opt === q.correctAnswer); if (index !== -1) correctKey = validLetters[index]; }
    }
    
    setEditQuestionData({
      tempId: 'edit',
      examName: q.examName || "", 
      content: q.content, subject: q.subject || teacherSubjects[0] || "Chung", difficulty: q.difficulty, grade: q.grade || "6", semester: q.semester || "1", type: q.type || "multiple_choice",
      options: parsedOptions, correctAnswer: correctKey, points: q.points || "", videoUrl: q.videoUrl || "", essayAnswerText: q.essayAnswerText || "", essayAnswerImageFile: null, essayAnswerPreviewUrl: getImageUrl(q.essayAnswerImageUrl) || "" 
    });
    setEditVideoPreviewUrl("");
    setEditVideoFile(null);
    setOpenEditMediaPanel(!!q.videoUrl);
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (editQuestionData.type === 'essay' && (!editQuestionData.points || Number(editQuestionData.points) <= 0)) {
        return alert("Vui lòng nhập điểm (lớn hơn 0) cho câu Tự luận!");
    }

    let textContent = editQuestionData.content ? editQuestionData.content.replace(/<[^>]*>/g, '').trim() : "";
    let finalContent = editQuestionData.content;
    
    if (!textContent) {
        if (editVideoFile || editQuestionData.videoUrl || editQuestionData.content.includes('<img')) {
             // Đã có nội dung hợp lệ
        } else {
            return alert("Vui lòng nhập nội dung đề bài hoặc đính kèm Video/Audio!");
        }
    }

    const formData = new FormData();
    formData.append("content", finalContent); 
    formData.append("subject", editQuestionData.subject); 
    formData.append("difficulty", editQuestionData.difficulty); 
    formData.append("grade", editQuestionData.grade); 
    formData.append("semester", editQuestionData.semester); 
    formData.append("type", editQuestionData.type);
    formData.append("points", editQuestionData.type === 'essay' ? (Number(editQuestionData.points) || 0) : 0);
    formData.append("videoUrl", editQuestionData.videoUrl || "");

    if (editQuestionData.type === "multiple_choice") {
      formData.append("correctAnswer", editQuestionData.correctAnswer);
      formData.append("options", JSON.stringify(editQuestionData.options));
    } else { formData.append("correctAnswer", ""); formData.append("options", "[]"); }

    formData.append("essayAnswerText", editQuestionData.essayAnswerText || "");
    if (editQuestionData.essayAnswerImageFile) formData.append("essayAnswerImage", editQuestionData.essayAnswerImageFile);
    else if (!editQuestionData.essayAnswerPreviewUrl) formData.append("essayAnswerImageUrl", ""); 

    if (editVideoFile) formData.append("video", editVideoFile);

    setLoading(true);
    try {
      await axios.put(`/questions/update/${editingQuestionId}`, formData, getHeader(true));
      alert("✅ Cập nhật thành công!");
      setIsEditDialogOpen(false); fetchBankData();
    } catch (err) { alert("Lỗi cập nhật!"); } finally { setLoading(false); }
  };

  const handleDraftChange = (tempId, field, value) => { setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, [field]: value } : q)); };
  const handleDraftOptionChange = (tempId, optionIndex, value) => { setDraftQuestions(draftQuestions.map(q => { if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; } return q; })); };
  const handleDraftVideoChange = (tempId, e) => {
      const file = e.target.files[0];
      if (file) setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: file, videoPreviewUrl: URL.createObjectURL(file) } : q));
  };
  const handleRemoveDraftVideo = (tempId) => {
      setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: null, videoPreviewUrl: "", videoUrl: "" } : q));
  };
  const handleClearDraftSlot = (tempId) => {
      if(!window.confirm("Làm sạch toàn bộ dữ liệu của khung này?")) return;
      setDraftQuestions(draftQuestions.map(q => q.tempId === tempId ? { ...q, content: "", videoUrl: "", videoFile: null, videoPreviewUrl: "", options: ["", "", "", ""], essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" } : q));
  };

  const handleAssignmentFileChange = (e) => { const file = e.target.files[0]; if (file) setAssignmentFile(file); };
  const handleExtractWord = async () => {
    if (!assignmentFile) return alert("Vui lòng chọn file Word trước!");
    setLoading(true);
    try {
      const { text, questions } = await processWordFile(assignmentFile, true);
      setRawExtractedText(text); setExtractedQuestions(questions); setIsReviewingExtraction(true); 
    } catch (error) { alert("Lỗi bóc tách file Word. Vui lòng thử lại!"); } finally { setLoading(false); }
  };

  const handleReuploadAndExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAssignmentFile(file);
    setLoading(true);
    try {
      const { text, questions } = await processWordFile(file, true);
      setRawExtractedText(text); setExtractedQuestions(questions); 
    } catch (error) { alert("Lỗi bóc tách. Vui lòng thử lại!"); } finally { setLoading(false); }
  };

  const reparseTextToSlots = (text) => setExtractedQuestions(extractQuestionsFromText(text, true));

  const handleCommitExtraction = () => {
    const formattedQs = extractedQuestions.map((q, i) => {
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
            ...q, 
            tempId: `ext_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`, 
            options: finalOptions, 
            correctAnswer: q.type === 'multiple_choice' ? finalCorrect : "",
            videoUrl: q.videoUrl || "", videoFile: q.videoFile || null, videoPreviewUrl: q.videoPreviewUrl || "", points: q.points || "", essayAnswerText: q.essayAnswerText || "", essayAnswerImageFile: null, essayAnswerPreviewUrl: ""
        };
    });

    if (draftQuestions.length === 1 && !hasContent(draftQuestions[0].content)) {
        setDraftQuestions(formattedQs);
    } else {
        setDraftQuestions([...draftQuestions, ...formattedQs]); 
    }
    
    setIsReviewingExtraction(false); setAssignmentFile(null); setCreationMethod("manual"); 
  };

  const handleExtractedChange = (tempId, field, value) => { setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q)); };
  const handleExtractedOptionChange = (tempId, optionIndex, value) => {
    setExtractedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; }
      return q;
    }));
  };
  const handleAddExtractedOption = (tempId) => { setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, options: [...q.options, ""] } : q)); };
  const handleRemoveExtractedOption = (tempId, optIndex) => {
    setExtractedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId && q.options.length > 2) { return { ...q, options: q.options.filter((_, i) => i !== optIndex) }; }
      return q;
    }));
  };
  const handleExtractedVideoChange = (tempId, e) => {
      const file = e.target.files[0];
      if (file) setExtractedQuestions(extractedQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: file, videoPreviewUrl: URL.createObjectURL(file) } : q));
  };

  const handleSaveDraftsToBank = async () => {
    let questionsValid = true;
    const updatedDrafts = [...draftQuestions];

    for (let i = 0; i < updatedDrafts.length; i++) {
        let q = updatedDrafts[i];
        let textContent = q.content ? q.content.replace(/<[^>]*>/g, '').trim() : "";

        if (!textContent) {
            if (q.videoFile || q.videoUrl || q.content.includes('<img')) {
                // Hợp lệ do có hình/video
            } else {
                alert(`LỖI: Câu số ${i + 1} đang bị bỏ trống nội dung đề bài! Vui lòng gõ chữ hoặc tải file đính kèm trước khi lưu.`);
                questionsValid = false;
                break;
            }
        }
    }
    if (!questionsValid) return;
    
    const invalidEssay = updatedDrafts.find(q => q.type === 'essay' && (!q.points || Number(q.points) <= 0));
    if (invalidEssay) return alert("Vui lòng nhập điểm (lớn hơn 0) cho các câu hỏi Tự luận đang soạn!");

    if (!currentExam) return alert("Không tìm thấy Tập câu hỏi để lưu!");

    const draftContents = updatedDrafts.map(q => stripHtmlForCompare(q.content)).filter(c => c !== "" && !c.includes("dựa vào dữ liệu đính kèm bên dưới"));
    const globalDbContents = questions.map(q => stripHtmlForCompare(q.content)).filter(c => c !== "" && !c.includes("dựa vào dữ liệu đính kèm bên dưới"));

    const uniqueDrafts = new Set(draftContents);
    if (uniqueDrafts.size !== draftContents.length) {
        return alert("🚨 CẢNH BÁO: Phát hiện các câu hỏi BỊ TRÙNG NHAU trong danh sách bạn đang soạn. Vui lòng kiểm tra lại!");
    }

    for (let content of draftContents) {
        if (globalDbContents.includes(content)) {
            return alert(`🚨 CẢNH BÁO TRÙNG LẶP: Câu hỏi "${content.substring(0, 40)}..." ĐÃ TỒN TẠI TRONG KHO! Vui lòng xóa hoặc sửa lại.`);
        }
    }
    
    setDraftQuestions(updatedDrafts);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("examName", currentExam.examName); 
      formData.append("subject", currentExam.subject); 
      formData.append("grade", currentExam.grade); 
      formData.append("semester", currentExam.semester);
      
      const questionsToSave = updatedDrafts.map(q => ({
          tempId: q.tempId, content: q.content, type: q.type, options: q.options, correctAnswer: q.correctAnswer, difficulty: q.difficulty,
          points: q.type === 'essay' ? (Number(q.points) || 0) : 0, 
          essayAnswerText: q.essayAnswerText || "",
          videoUrl: q.videoUrl || ""
      }));
      formData.append("questionsData", JSON.stringify(questionsToSave));
      
      updatedDrafts.forEach(q => { 
        if (q.videoFile) formData.append(`video_${q.tempId}`, q.videoFile);
        if (q.essayAnswerImageFile) formData.append(`essayImage_${q.tempId}`, q.essayAnswerImageFile);
      });

      await axios.post("/questions/create-exam-questions", formData, getHeader(true));
      alert(`✅ Đã lưu ${updatedDrafts.length} câu hỏi thành công!`);
      setIsAddingNew(false); setDraftQuestions([]); setAssignmentFile(null); fetchBankData(); 
    } catch (err) { 
        alert(err.response?.data?.message || "Lỗi khi lưu câu hỏi!"); 
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-10 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-200">
               <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-sky-950">Kho Câu Hỏi Toàn Trường</h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base">Quản lý học liệu phẳng • <strong className="text-sky-600">{getTeacherDeptInfo()}</strong></p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <Button onClick={() => navigate('/teacher-dashboard')} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl h-11">
                <ArrowLeft className="w-4 h-4 mr-2" /> Về Trang chính
             </Button>
             {viewMode === "sets_list" && (
               <Button onClick={() => { setViewMode("overview"); setSearchQuery(""); }} className="bg-sky-50 border border-sky-100 text-sky-700 hover:bg-sky-100 font-bold rounded-xl h-11">
                 <Database className="w-4 h-4 mr-2" /> Về Bảng Tổng quan
               </Button>
             )}
             {viewMode === "set_detail" && (
               <Button onClick={() => { setViewMode("sets_list"); setIsAddingNew(false); setSearchQuery(""); }} className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl h-11">
                 <LibraryBig className="w-4 h-4 mr-2" /> Về Danh sách Tập
               </Button>
             )}
          </div>
        </div>

        {/* VIEW 1: OVERVIEW (BẢNG TỔNG QUAN) */}
        {viewMode === "overview" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-none shadow-sm rounded-3xl bg-white">
               <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <h3 className="font-bold text-sky-900 text-lg flex items-center gap-2">
                       <Layers className="w-5 h-5 text-sky-500"/> Tất cả câu hỏi ({filteredOverviewQuestions.length})
                     </h3>
                     <Button onClick={() => { setViewMode("sets_list"); setSearchQuery(""); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md h-11 px-6 w-full sm:w-auto">
                        <LibraryBig className="w-5 h-5 mr-2"/> Quản lý Tập câu hỏi
                     </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                     <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-sky-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                     
                     <Select value={filterSubject} onValueChange={setFilterSubject}>
                       <SelectTrigger className="h-10 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{filterSubject === 'all' ? 'Tất cả môn' : filterSubject}</span></SelectTrigger>
                       <SelectContent position="popper" className="bg-white z-50">
                         <SelectItem value="all">Tất cả môn</SelectItem>
                         {teacherSubjects.map(sub => <SelectItem key={sub} value={sub}>Môn: {sub}</SelectItem>)}
                       </SelectContent>
                     </Select>

                     <Select value={filterGrade} onValueChange={setFilterGrade}>
                       <SelectTrigger className="h-10 w-[140px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{filterGrade === 'all' ? 'Khối (Tất cả)' : `Khối ${filterGrade}`}</span></SelectTrigger>
                       <SelectContent position="popper" className="bg-white z-50">
                          <SelectItem value="all">Khối (Tất cả)</SelectItem>
                          {allowedGrades.map(g => (
                              <SelectItem key={g} value={g}>Khối {g}</SelectItem>
                          ))}
                       </SelectContent>
                     </Select>

                     <Select value={filterType} onValueChange={(val) => setFilterType(val)}>
                       <SelectTrigger className="h-10 w-[160px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{filterType === 'all' ? 'Loại (Tất cả)' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span></SelectTrigger>
                       <SelectContent position="popper" className="bg-white z-50"><SelectItem value="all">Loại (Tất cả)</SelectItem><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                     </Select>

                     <Select value={filterExam} onValueChange={setFilterExam}>
                        <SelectTrigger className="h-10 w-[160px] bg-slate-50 border-sky-100 font-bold text-sky-700 rounded-xl"><span className="truncate">{filterExam === 'all' ? 'Tập (Tất cả)' : filterExam}</span></SelectTrigger>
                        <SelectContent position="popper" className="bg-white z-50">
                          <SelectItem value="all">Tập (Tất cả)</SelectItem>
                          {availableExams.map((e, idx) => (<SelectItem key={idx} value={e}>{e}</SelectItem>))}
                        </SelectContent>
                     </Select>

                     <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Tìm nội dung câu hỏi..." className="pl-9 h-10 bg-slate-50 border-sky-100 focus-visible:ring-sky-500 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                     </div>
                  </div>
               </CardContent>
            </Card>

            {(bankSelected.length > 0 || isAllFilteredSelected) && (
               <div className="bg-sky-50 border border-sky-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                     <Badge className="bg-sky-500 text-white font-bold px-3 py-1 text-sm rounded-lg border-0">Đã chọn: {bankSelected.length} câu</Badge>
                     <Button type="button" variant={isAllFilteredSelected ? "secondary" : "outline"} onClick={handleSelectAllFiltered} className={`h-9 font-bold rounded-lg text-xs ${isAllFilteredSelected ? 'bg-sky-200 text-sky-800' : 'bg-white border-sky-300 text-sky-700'}`}>
                        <CheckSquare className="w-4 h-4 mr-1.5" /> {isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả đang lọc"}
                     </Button>
                  </div>
                  <div className="flex gap-2">
                     <Button onClick={handleBatchDelete} className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-9 rounded-lg shadow-sm">
                        <Trash2 className="w-4 h-4 mr-2"/> Xóa hàng loạt
                     </Button>
                  </div>
               </div>
            )}

            <Card className="border-sky-100 shadow-sm rounded-3xl bg-white overflow-hidden">
               <div className="overflow-x-auto min-h-[500px]">
                  <Table className="min-w-[1000px] w-full border-collapse">
                     <TableHeader className="bg-slate-50 border-b border-sky-100">
                        <TableRow>
                           <TableHead className="w-12 text-center shrink-0"></TableHead>
                           <TableHead className="w-14 text-center font-bold text-sky-800">STT</TableHead>
                           <TableHead className="font-bold text-sky-800 w-auto">Nội dung câu hỏi</TableHead>
                           <TableHead className="font-bold text-sky-800 text-center w-[160px]">Thông tin</TableHead>
                           <TableHead className="font-bold text-sky-800 text-center w-[140px] shrink-0">Hành động</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading ? (
                           <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto" /></TableCell></TableRow>
                        ) : filteredOverviewQuestions.length === 0 ? (
                           <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">Không tìm thấy câu hỏi phù hợp với bộ lọc.</TableCell></TableRow>
                        ) : (
                           filteredOverviewQuestions.map((q, idx) => {
                              const isSelected = bankSelected.includes(q._id);
                              return (
                              <TableRow key={q._id} className={`${isSelected ? 'bg-sky-50/50' : ''} hover:bg-sky-50 transition-colors cursor-pointer border-b border-slate-100`} onClick={() => toggleBankSelection(q._id)}>
                                 <TableCell className="text-center align-middle shrink-0">
                                    <input type="checkbox" className="w-5 h-5 accent-sky-500 cursor-pointer" checked={isSelected} onChange={() => toggleBankSelection(q._id)} onClick={(e) => e.stopPropagation()} />
                                 </TableCell>
                                 <TableCell className="text-center align-middle font-bold text-slate-400 text-lg">{idx + 1}</TableCell>
                                 
                                 <TableCell className="align-middle py-4 max-w-[250px] sm:max-w-[400px] lg:max-w-[500px]">
                                    <div className="flex flex-col gap-1 pr-4">
                                       <div 
                                          className="font-medium text-slate-700 text-[15px] leading-relaxed line-clamp-3 q-content-view-table break-words overflow-hidden" 
                                          dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }} 
                                       />
                                       <div className="flex items-center gap-2 mt-1">
                                          {(q.imageUrl || (q.content && q.content.includes('<img'))) && <Badge variant="outline" className="text-[10px] text-sky-600 bg-sky-50 border-0 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Có ảnh</Badge>}
                                          {q.videoUrl && <Badge variant="outline" className="text-[10px] text-purple-600 bg-purple-50 border-0 flex items-center"><Video className="w-3 h-3 mr-1"/> Có Video</Badge>}
                                          {q.examName && <Badge variant="outline" className="text-[10px] text-indigo-600 bg-indigo-50 border-0 flex items-center"><LibraryBig className="w-3 h-3 mr-1"/> Tập: {q.examName}</Badge>}
                                       </div>
                                    </div>
                                 </TableCell>
                                 
                                 <TableCell className="text-center align-middle py-4 w-[160px]">
                                    <div className="flex flex-col items-center gap-1.5">
                                       <span className="text-sky-700 font-bold text-xs">{q.subject} - Khối {q.grade}</span>
                                       <Badge variant="outline" className={`${q.type==='essay' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-50 text-slate-500 border-slate-200'} text-[11px] font-medium justify-center`}>{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                       {q.type === 'essay' && q.points > 0 && <span className="text-indigo-600 font-bold text-xs">{q.points} Điểm</span>}
                                    </div>
                                 </TableCell>
                                 
                                 <TableCell className="text-center align-middle py-4 shrink-0 w-[140px]">
                                    <div className="flex justify-center items-center gap-2">
                                       <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-100 rounded-lg" onClick={(e) => { e.stopPropagation(); setViewQuestion(q); }} title="Xem chi tiết"><Eye className="w-4 h-4"/></Button>
                                       <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-100 rounded-lg" onClick={(e) => { e.stopPropagation(); handleEditClick(q); }} title="Sửa"><Pencil className="w-4 h-4"/></Button>
                                       <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-100 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDeleteDbQuestion(q._id); }} title="Xóa"><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           )})
                        )}
                     </TableBody>
                  </Table>
               </div>
            </Card>
          </div>
        )}

        {/* VIEW 2: QUẢN LÝ TẬP CÂU HỎI */}
        {viewMode === "sets_list" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-indigo-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-bold text-indigo-900 whitespace-nowrap text-lg">Tập Câu Hỏi đã tạo ({filteredSets.length})</h3>
                  <Button onClick={openCreateSetModal} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md w-full sm:w-auto h-11 px-6">
                     <PlusCircle className="w-4 h-4 mr-2"/> Tạo Tập câu hỏi mới
                  </Button>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mr-2"><Filter className="w-5 h-5 text-indigo-500" /><span className="text-sm font-bold text-slate-600">Bộ lọc:</span></div>
                  
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="h-10 w-auto min-w-[140px] max-w-[200px] bg-white border-indigo-100 font-bold text-indigo-700 rounded-xl shadow-sm">
                      <span className="truncate">{filterSubject === 'all' ? 'Tất cả môn' : `Môn: ${filterSubject}`}</span>
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-50">
                      <SelectItem value="all">Tất cả môn</SelectItem>
                      {teacherSubjects.map(sub => <SelectItem key={sub} value={sub} className="font-bold">Môn: {sub}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="h-10 w-[140px] bg-white border-indigo-100 font-bold text-indigo-700 rounded-xl shadow-sm">
                      <span className="truncate">{filterGrade === 'all' ? 'Tất cả khối' : `Khối ${filterGrade}`}</span>
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-50">
                      <SelectItem value="all">Tất cả khối</SelectItem>
                      {allowedGrades.map(g => (
                          <SelectItem key={g} value={g}>Khối {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[200px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <Input placeholder="Tìm tên Tập câu hỏi..." className="pl-9 h-10 bg-white shadow-sm border-indigo-100 focus-visible:ring-indigo-500 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
               </div>
            </div>

            {loading ? (
               <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
            ) : filteredSets.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-indigo-200">
                  <LibraryBig className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-700">Chưa có Tập câu hỏi nào</h3>
                  <p className="text-slate-500 mb-6 mt-2">Hãy tạo một tập câu hỏi mới để bắt đầu lưu trữ.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredSets.map((set, idx) => (
                    <Card key={idx} onClick={() => { setCurrentExam(set); setViewMode("set_detail"); setIsAddingNew(false); setSearchQuery(""); }} className="relative border-indigo-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all cursor-pointer group bg-white rounded-3xl overflow-hidden">
                       <Button onClick={(e) => handleDeleteSet(e, set)} variant="ghost" className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl p-2 h-9 w-9 shadow-sm" title="Xóa toàn bộ tập này"><Trash2 className="w-4 h-4" /></Button>
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                           <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><LibraryBig className="w-7 h-7" /></div>
                           <Badge className="bg-indigo-100 text-indigo-700 border-0 shadow-none font-bold rounded-xl">{set.questions?.length || 0} Câu hỏi</Badge>
                         </div>
                         <h3 className="text-xl font-black text-indigo-950 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors pr-8">{set.examName}</h3>
                         <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
                           <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium rounded-lg">Khối {set.grade}</Badge>
                           <Badge variant="outline" className="border-amber-200 text-amber-600 font-medium rounded-lg bg-amber-50">{set.semester === 'Cả năm' ? 'Cả năm' : `HK ${set.semester}`}</Badge>
                           <Badge variant="outline" className="border-slate-200 text-indigo-600 font-bold bg-indigo-50 rounded-lg">{set.subject}</Badge>
                         </div>
                       </CardContent>
                    </Card>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* VIEW 3: CHI TIẾT TẬP CÂU HỎI BÊN TRONG */}
        {viewMode === "set_detail" && currentExam && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-indigo-500 text-white p-6 sm:p-8 border-b border-indigo-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-black flex items-center gap-3"><LibraryBig className="w-7 h-7 sm:w-8 sm:h-8"/> Tập câu hỏi: {currentExam.examName}</CardTitle>
                  <p className="text-indigo-100 font-medium mt-2 text-sm sm:text-base">Môn: {currentExam.subject} • Khối: {currentExam.grade} • {currentExam.semester === 'Cả năm' ? 'Cả năm' : `HK: ${currentExam.semester}`} • Tổng: {currentExam.questions?.length || 0} câu</p>
                </div>
                <Button onClick={openEditSetModal} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-11 border border-indigo-400 font-bold">
                    <Settings className="w-4 h-4 mr-2"/> Cài đặt Tập câu hỏi
                </Button>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-8 bg-slate-50/50 min-h-[400px]">
                 {!isAddingNew && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm gap-4">
                       <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <Select value={filterType} onValueChange={(val) => setFilterType(val)}>
                            <SelectTrigger className="h-11 w-[160px] bg-slate-50 border-indigo-100 font-bold text-indigo-700 rounded-xl">
                              <span className="truncate">{filterType === 'all' ? 'Loại (Tất cả)' : filterType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span>
                            </SelectTrigger>
                            <SelectContent position="popper" className="bg-white z-50">
                               <SelectItem value="all">Loại (Tất cả)</SelectItem>
                               <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                               <SelectItem value="essay">Tự luận</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="relative flex-1 sm:w-[300px]">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                             <Input placeholder="Tìm câu hỏi trong Tập..." className="pl-9 h-11 bg-slate-50 border-indigo-100 focus-visible:ring-indigo-500 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                          </div>
                       </div>
                       
                       <Button onClick={() => { setIsAddingNew(true); setDraftQuestions([{ tempId: `draft_${Date.now()}`, content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", videoUrl: "", videoFile: null, videoPreviewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }]); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md h-11 px-6 transition-all hover:scale-105 w-full sm:w-auto"><PlusCircle className="w-4 h-4 mr-2"/> Thêm câu hỏi mới</Button>
                    </div>
                 )}

                 {isAddingNew && (
                    <div className="bg-white border border-indigo-200 rounded-3xl p-6 shadow-sm mb-8 relative animate-in fade-in slide-in-from-top-4">
                       <Button onClick={() => setIsAddingNew(false)} variant="ghost" className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 rounded-xl">Hủy bỏ</Button>
                       <h3 className="text-xl font-black text-indigo-800 mb-4 flex items-center"><Layers className="w-5 h-5 mr-2"/> Bổ sung câu hỏi vào Tập</h3>
                       
                       <div className="flex bg-slate-100 rounded-xl w-full p-1 mb-6">
                          <button onClick={() => setCreationMethod("manual")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><PenTool className="w-4 h-4 inline mr-2"/> Soạn thủ công</button>
                          <button onClick={() => setCreationMethod("upload")} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${creationMethod === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><FileText className="w-4 h-4 inline mr-2"/> Bóc tách từ Word</button>
                       </div>

                        {creationMethod === "upload" && (
                          <div className="space-y-4">
                            {!isReviewingExtraction ? (
                               <div className="bg-slate-50 p-6 sm:p-10 rounded-2xl border border-dashed border-indigo-300 text-center">
                                  <h4 className="font-bold text-indigo-900 text-base sm:text-lg mb-2">Tải lên file Word (.docx)</h4>
                                  <p className="text-slate-500 text-xs sm:text-sm mb-6">Hệ thống sẽ tự động bóc tách thành danh sách câu hỏi.</p>
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
                                          <Sparkles className="w-3.5 h-3.5 mr-1"/> Rót lại Text
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

                                    {extractedQuestions.map((q, index) => {
                                        const isSlotEmpty = !q.content || q.content.replace(/<[^>]*>/g, '').trim() === "";
                                        return (
                                        <Card key={q.tempId} className={`shadow-sm relative overflow-visible transition-all ${isSlotEmpty ? 'border-sky-300 bg-white shadow-md' : 'border-sky-200'}`}>
                                            <div className={`absolute top-0 left-0 w-1.5 sm:w-2 h-full ${isSlotEmpty ? 'bg-sky-300' : 'bg-emerald-400'}`}></div>
                                            
                                            <CardHeader className="bg-slate-50/50 py-3 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-sky-50 rounded-t-3xl">
                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    <CardTitle className="text-sm sm:text-base font-black text-sky-900 whitespace-nowrap">Câu {index + 1} <span className="text-slate-400 font-medium text-xs sm:text-sm ml-1">({q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'})</span></CardTitle>
                                                    {isSlotEmpty && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold ml-2">Khung trống</Badge>}
                                                    
                                                    <div className="flex items-center bg-white border border-sky-200 rounded-lg px-2 py-1 gap-2 shadow-sm ml-auto sm:ml-0">
                                                        <Calculator className="w-4 h-4 text-sky-500" />
                                                        <span className="text-sm font-bold text-slate-600 hidden sm:inline">Điểm:</span>
                                                        {q.type === "essay" ? (
                                                            <input type="number" step="0.25" min="0" className="w-12 sm:w-16 text-center font-black text-sky-600 focus:outline-none" value={q.points || ""} placeholder="Nhập" onChange={(e) => handleExtractedChange(q.tempId, 'points', e.target.value)} />
                                                        ) : (
                                                            <span className="text-sm font-black text-slate-400 pl-2">0</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                    <Button type="button" onClick={() => setExtractedQuestions(extractedQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" title="Xóa hoàn toàn" className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-4 h-4"/></Button>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="p-4 sm:p-5 space-y-4 relative z-10">
                                              <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                                                <div className={`flex-1 transition-all ${isSlotEmpty ? 'border-dashed border-2 border-slate-300 rounded-xl p-1 bg-white' : ''}`}>
                                                    
                                                    {/* 👉 SỬ DỤNG GIAO DIỆN LỚP PHỦ CHO SOẠN ĐỀ BÀI (BÓC TÁCH) */}
                                                    <div 
                                                        className="relative w-full"
                                                        onFocusCapture={() => setActiveRTE(`ext-content-${q.tempId}`)}
                                                        onBlurCapture={(e) => {
                                                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                                                setActiveRTE(null);
                                                            }
                                                        }}
                                                    >
                                                        <RichTextEditor value={q.content} onChange={(val) => handleExtractedChange(q.tempId, 'content', val)} />
                                                        {activeRTE !== `ext-content-${q.tempId}` && hasLatex(q.content) && (
                                                            <div 
                                                                className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                                                                onClick={() => setActiveRTE(`ext-content-${q.tempId}`)}
                                                                dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }}
                                                            />
                                                        )}
                                                    </div>
                                                    
                                                    {!openExtractedMediaPanels[q.tempId] && !q.videoFile && !q.videoUrl && (
                                                       <Button type="button" variant="ghost" size="sm" onClick={() => setOpenExtractedMediaPanels(prev => ({...prev, [q.tempId]: true}))} className="mt-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold self-start w-max">
                                                          <Video className="w-4 h-4 mr-2" /> Thêm Video / Audio / Link
                                                       </Button>
                                                    )}

                                                    {(openExtractedMediaPanels[q.tempId] || q.videoFile || q.videoUrl) && (
                                                       <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative">
                                                          <div className="flex justify-between items-center mb-3">
                                                             <h4 className="text-sm font-bold text-indigo-700 flex items-center"><Video className="w-4 h-4 mr-2" /> Đính kèm Video / Audio / Link</h4>
                                                             <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-100 rounded-full" title="Đóng và Xóa đính kèm" onClick={() => { setOpenExtractedMediaPanels(prev => ({...prev, [q.tempId]: false})); handleExtractedChange(q.tempId, 'videoUrl', ''); handleExtractedChange(q.tempId, 'videoFile', null); handleExtractedChange(q.tempId, 'videoPreviewUrl', ''); }}>
                                                                <X className="w-4 h-4" />
                                                             </Button>
                                                          </div>
                                                          
                                                          {q.videoFile || (q.videoUrl && !q.videoUrl.includes("youtube") && !q.videoUrl.includes("drive.google.com")) ? (
                                                              <div className="relative w-full max-w-[450px] mx-auto rounded-xl overflow-hidden border border-indigo-200 shadow-sm bg-black group flex flex-col items-center justify-center p-4">
                                                                  {isAudioFile(q.videoUrl) || (q.videoFile && q.videoFile.type.includes("audio")) ? (
                                                                     <div className="bg-white p-4 w-full rounded-xl flex flex-col items-center">
                                                                        <FileAudio className="w-12 h-12 text-indigo-400 mb-3" />
                                                                        <audio controls className="w-full" src={q.videoPreviewUrl || q.videoUrl} />
                                                                     </div>
                                                                  ) : (
                                                                     <video className="w-full max-h-[300px] object-contain" controls src={q.videoPreviewUrl || q.videoUrl} />
                                                                  )}
                                                              </div>
                                                          ) : (q.videoUrl && (q.videoUrl.includes("youtube") || q.videoUrl.includes("youtu.be") || q.videoUrl.includes("drive.google.com"))) ? (
                                                              <div className="relative w-full flex flex-col items-center group">
                                                                  {(q.videoUrl.includes("youtube.com") || q.videoUrl.includes("youtu.be")) ? (
                                                                      <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                                                          <iframe className="w-full h-full" src={getYoutubeEmbedUrl(q.videoUrl)} allow="autoplay; fullscreen" allowFullScreen></iframe>
                                                                      </div>
                                                                  ) : (
                                                                      <div className="w-full flex flex-col items-center">
                                                                          <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                                                                              <iframe className="w-full h-full relative z-10" src={getDriveEmbedUrl(q.videoUrl)} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
                                                                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
                                                                                 <Video className="w-8 h-8 text-slate-300 mb-2" />
                                                                                 <p className="text-slate-500 font-medium text-xs">Video bị chặn. Nhấn link để xem.</p>
                                                                              </div>
                                                                          </div>
                                                                          <a href={q.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center h-10 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm transition-colors border border-indigo-200 shadow-sm">
                                                                             <Video className="w-4 h-4 mr-2" /> Click mở Video sang Tab mới
                                                                          </a>
                                                                      </div>
                                                                  )}
                                                              </div>
                                                          ) : (
                                                              <div className="flex flex-col gap-3">
                                                                 <Input placeholder="Dán link YouTube / Google Drive vào đây..." value={q.videoUrl || ""} onChange={(e) => handleExtractedChange(q.tempId, 'videoUrl', e.target.value)} className="bg-white border-indigo-200 focus-visible:ring-indigo-400 font-medium" />
                                                                 <div className="flex items-center gap-4">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoặc tải tệp lên</span>
                                                                    <hr className="flex-1 border-slate-200" />
                                                                 </div>
                                                                 <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100 bg-white cursor-pointer transition-all">
                                                                    <div className="flex gap-3 mb-2">
                                                                       <Video className="w-6 h-6 text-indigo-400" />
                                                                       <FileAudio className="w-6 h-6 text-indigo-400" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-indigo-600 text-center px-1">Nhấp để tải lên Video / Audio</span>
                                                                    <input type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => handleExtractedVideoChange(q.tempId, e)} />
                                                                 </label>
                                                              </div>
                                                          )}
                                                       </div>
                                                    )}
                                                </div>
                                              </div>
                                              
                                              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                                                <h4 className="text-sm font-bold text-emerald-700 flex items-center mb-2"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải</h4>
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <div className="flex-1">
                                                      {/* 👉 SỬ DỤNG GIAO DIỆN LỚP PHỦ CHO LỜI GIẢI (BÓC TÁCH) */}
                                                      <div 
                                                          className="relative w-full"
                                                          onFocusCapture={() => setActiveRTE(`ext-essay-${q.tempId}`)}
                                                          onBlurCapture={(e) => {
                                                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                                                  setActiveRTE(null);
                                                              }
                                                          }}
                                                      >
                                                          <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleExtractedChange(q.tempId, 'essayAnswerText', val)} />
                                                          {activeRTE !== `ext-essay-${q.tempId}` && hasLatex(q.essayAnswerText) && (
                                                              <div 
                                                                  className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                                                                  onClick={() => setActiveRTE(`ext-essay-${q.tempId}`)}
                                                                  dangerouslySetInnerHTML={{ __html: renderLatexContent(q.essayAnswerText) }}
                                                              />
                                                          )}
                                                      </div>
                                                    </div>
                                                </div>
                                              </div>

                                              {q.type === 'multiple_choice' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mt-4">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.options.map((opt, i) => {
                                                      const letter = String.fromCharCode(65 + i);
                                                      const mathExists = hasLatex(q.options[i]);

                                                      return (
                                                      <div key={i} className="flex flex-col gap-1 w-full mt-1">
                                                          <div className="flex items-start gap-2">
                                                            <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base mt-3 shrink-0">{letter}.</span>
                                                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                                              {/* 👉 GIAO DIỆN PREVIEW ĐÁP ÁN CHO SOẠN TRẮC NGHIỆM (BÓC TÁCH) */}
                                                              <div className="flex items-center gap-2">
                                                                <Input 
                                                                  className="h-11 rounded-xl bg-white text-sm sm:text-base border-sky-100 flex-1" 
                                                                  value={q.options[i]} 
                                                                  onChange={(e) => handleExtractedOptionChange(q.tempId, i, e.target.value)} 
                                                                  onFocus={() => setFocusedOption({ tempId: q.tempId, optIdx: i, isExtracted: true })}
                                                                  onBlur={() => { setTimeout(() => setFocusedOption({ tempId: null, optIdx: null, isExtracted: true }), 200); }}
                                                                />
                                                                <Button type="button" variant="outline" onClick={() => setMathModal({ isOpen: true, targetTempId: q.tempId, targetOptionIndex: i, isExtracted: true, isEditing: false })} className="h-11 px-3 border-sky-200 text-sky-600 hover:bg-sky-50 shrink-0 rounded-xl" title="Mở bàn phím gõ Phân số / Toán học"><Sigma className="w-5 h-5"/></Button>
                                                                {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExtractedOption(q.tempId, i)} className="h-11 w-11 text-rose-400 hover:bg-rose-100 shrink-0 rounded-xl"><Trash2 className="w-4 h-4"/></Button>}
                                                              </div>
                                                              
                                                              {mathExists && (
                                                                <div className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center min-h-[48px] overflow-x-auto shadow-sm text-slate-800 text-base">
                                                                  <div className="q-content-view font-medium" dangerouslySetInnerHTML={{ __html: renderLatexContent(q.options[i]) }} />
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                      </div>
                                                    )})}
                                                  </div>
                                                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                                    {q.options.length < 16 ? (
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAddExtractedOption(q.tempId)} className="text-indigo-600 hover:bg-indigo-100 rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm đáp án</Button>
                                                    ) : <div className="text-xs text-rose-500 font-bold">Đã đạt tối đa 16 đáp án</div>}
                                                    
                                                    <div className="flex items-center gap-2">
                                                      <label className="text-xs font-bold text-rose-500">ĐÁP ÁN ĐÚNG:</label>
                                                      <Select value={q.correctAnswer || ""} onValueChange={(val) => handleExtractedChange(q.tempId, 'correctAnswer', val)}>
                                                        <SelectTrigger className="h-9 w-24 bg-white text-rose-600 font-bold border-rose-200 rounded-lg"><span className="truncate">{q.correctAnswer ? `Câu ${q.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                                                        <SelectContent position="popper" className="bg-white z-50">
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
                                    )})}

                                    <Button type="button" onClick={handleCommitExtraction} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all mt-4">
                                        XÁC NHẬN RÓT VÀO KHUNG TRỰC TIẾP <ArrowRight className="ml-2 w-5 h-5"/>
                                    </Button>
                                 </div>
                               </div>
                            )}
                          </div>
                        )}

                        {/* 👉 GIAO DIỆN MANUAL SOẠN THẢO TRỰC TIẾP ĐƯỢC ĐỒNG BỘ UI */}
                        {creationMethod === "manual" && (
                          <div className="space-y-6 mt-4">
                            {draftQuestions.map((q, index) => {
                              const isSlotEmpty = !q.content || q.content.replace(/<[^>]*>/g, '').trim() === "";
                              const currentVideoUrl = q.videoPreviewUrl || q.videoUrl;

                              return (
                              <Card key={q.tempId} className={`shadow-sm relative overflow-visible transition-all ${isSlotEmpty ? 'border-sky-300 bg-white shadow-md' : 'border-sky-200'}`}>
                                <div className={`absolute top-0 left-0 w-1.5 sm:w-2 h-full ${isSlotEmpty ? 'bg-sky-300' : 'bg-sky-500'}`}></div>
                                
                                <CardHeader className="bg-slate-50/50 py-3 px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-sky-50 rounded-t-3xl">
                                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                    <CardTitle className="text-sm sm:text-base font-black text-sky-900 whitespace-nowrap">Câu {index + 1} <span className="text-slate-400 font-medium text-xs sm:text-sm ml-1">({q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'})</span></CardTitle>
                                    {isSlotEmpty && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold ml-2">Khung trống</Badge>}
                                    
                                    <div className="flex items-center bg-white border border-sky-200 rounded-lg px-2 py-1 gap-2 shadow-sm ml-auto sm:ml-0">
                                      <Calculator className="w-4 h-4 text-sky-500" />
                                      <span className="text-sm font-bold text-slate-600 hidden sm:inline">Điểm:</span>
                                      {q.type === "essay" ? (
                                        <input type="number" step="0.25" min="0" className="w-12 sm:w-16 text-center font-black text-sky-600 focus:outline-none" value={q.points || ""} placeholder="Nhập" onChange={(e) => handleDraftChange(q.tempId, 'points', e.target.value)} />
                                      ) : (
                                        <span className="text-sm font-black text-slate-400 pl-2">0</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <Button type="button" onClick={() => handleClearDraftSlot(q.tempId)} variant="ghost" size="icon" title="Làm trống nội dung" className="h-8 w-8 text-slate-400 hover:bg-amber-50 hover:text-amber-500"><Eraser className="w-4 h-4"/></Button>
                                    <Button type="button" onClick={() => setDraftQuestions(draftQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" title="Xóa câu hỏi này" className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-4 h-4"/></Button>
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="p-4 sm:p-5 space-y-4 relative z-10">
                                   
                                   <div className={`grid gap-4 ${q.type === 'essay' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                     <Select value={q.type} onValueChange={(val) => handleDraftChange(q.tempId, 'type', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700"><span className="truncate">{q.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50"><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                                     <Select value={q.difficulty} onValueChange={(val) => handleDraftChange(q.tempId, 'difficulty', val)}><SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700"><span className="truncate">{q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50"><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
                                   </div>

                                   <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                                     <div className={`flex-1 transition-all ${isSlotEmpty ? 'border-dashed border-2 border-slate-300 rounded-xl p-1 bg-white' : ''}`}>
                                        
                                        {/* 👉 LỚP PHỦ RICH TEXT EDITOR CHO SOẠN ĐỀ THỦ CÔNG */}
                                        <div 
                                            className="relative w-full"
                                            onFocusCapture={() => setActiveRTE(`draft-content-${q.tempId}`)}
                                            onBlurCapture={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                                    setActiveRTE(null);
                                                }
                                            }}
                                        >
                                            <RichTextEditor placeholder="Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC TOÁN..." value={q.content} onChange={(val) => handleDraftChange(q.tempId, 'content', val)} />
                                            {activeRTE !== `draft-content-${q.tempId}` && hasLatex(q.content) && (
                                                <div 
                                                    className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                                                    onClick={() => setActiveRTE(`draft-content-${q.tempId}`)}
                                                    dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }}
                                                />
                                            )}
                                        </div>
                                        
                                        {!openMediaPanels[q.tempId] && !q.videoFile && !q.videoUrl && (
                                           <Button type="button" variant="ghost" size="sm" onClick={() => setOpenMediaPanels(prev => ({...prev, [q.tempId]: true}))} className="mt-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold self-start w-max">
                                              <Video className="w-4 h-4 mr-2" /> Thêm Video / Audio / Link
                                           </Button>
                                        )}

                                        {(openMediaPanels[q.tempId] || q.videoFile || q.videoUrl) && (
                                           <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative">
                                              <div className="flex justify-between items-center mb-3">
                                                 <h4 className="text-sm font-bold text-indigo-700 flex items-center"><Video className="w-4 h-4 mr-2" /> Đính kèm Video / Audio / Link</h4>
                                                 <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-100 rounded-full" title="Đóng và Xóa đính kèm" onClick={() => { setOpenMediaPanels(prev => ({...prev, [q.tempId]: false})); handleRemoveDraftVideo(q.tempId); }}>
                                                    <X className="w-4 h-4" />
                                                 </Button>
                                              </div>
                                              
                                              {q.videoFile || (q.videoUrl && !q.videoUrl.includes("youtube") && !q.videoUrl.includes("drive.google.com")) ? (
                                                  <div className="relative w-full max-w-[450px] mx-auto rounded-xl overflow-hidden border border-indigo-200 shadow-sm bg-black group flex flex-col items-center justify-center p-4">
                                                      {isAudioFile(q.videoUrl) || (q.videoFile && q.videoFile.type.includes("audio")) ? (
                                                         <div className="bg-white p-4 w-full rounded-xl flex flex-col items-center">
                                                            <FileAudio className="w-12 h-12 text-indigo-400 mb-3" />
                                                            <audio controls className="w-full" src={currentVideoUrl} />
                                                         </div>
                                                      ) : (
                                                         <video className="w-full max-h-[300px] object-contain" controls src={currentVideoUrl} />
                                                      )}
                                                  </div>
                                              ) : (q.videoUrl && (q.videoUrl.includes("youtube") || q.videoUrl.includes("youtu.be") || q.videoUrl.includes("drive.google.com"))) ? (
                                                  <div className="relative w-full flex flex-col items-center group">
                                                      {(q.videoUrl.includes("youtube.com") || q.videoUrl.includes("youtu.be")) ? (
                                                          <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                                              <iframe className="w-full h-full" src={getYoutubeEmbedUrl(q.videoUrl)} allow="autoplay; fullscreen" allowFullScreen></iframe>
                                                          </div>
                                                      ) : (
                                                          <div className="w-full flex flex-col items-center">
                                                              <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                                                                  <iframe className="w-full h-full relative z-10" src={getDriveEmbedUrl(q.videoUrl)} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
                                                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
                                                                     <Video className="w-8 h-8 text-slate-300 mb-2" />
                                                                     <p className="text-slate-500 font-medium text-xs">Video bị chặn. Nhấn link để xem.</p>
                                                                  </div>
                                                              </div>
                                                              <a href={q.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center h-10 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm transition-colors border border-indigo-200 shadow-sm">
                                                                 <Video className="w-4 h-4 mr-2" /> Click mở Video sang Tab mới
                                                              </a>
                                                          </div>
                                                      )}
                                                  </div>
                                              ) : (
                                                  <div className="flex flex-col gap-3">
                                                     <Input placeholder="Dán link YouTube / Google Drive vào đây..." value={q.videoUrl || ""} onChange={(e) => handleDraftChange(q.tempId, 'videoUrl', e.target.value)} className="bg-white border-indigo-200 focus-visible:ring-indigo-400 font-medium" />
                                                     <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoặc tải tệp lên</span>
                                                        <hr className="flex-1 border-slate-200" />
                                                     </div>
                                                     <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100 bg-white cursor-pointer transition-all">
                                                        <div className="flex gap-3 mb-2">
                                                           <Video className="w-6 h-6 text-indigo-400" />
                                                           <FileAudio className="w-6 h-6 text-indigo-400" />
                                                        </div>
                                                        <span className="text-xs font-bold text-indigo-600 text-center px-1">Nhấp để tải lên Video / Audio</span>
                                                        <input type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => handleDraftVideoChange(q.tempId, e)} />
                                                     </label>
                                                  </div>
                                              )}
                                           </div>
                                        )}
                                     </div>
                                   </div>

                                   <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                                      <h4 className="text-sm font-bold text-emerald-700 flex items-center mb-2"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải</h4>
                                      <div className="flex flex-col md:flex-row gap-4">
                                          <div className="flex-1">
                                            {/* 👉 LỚP PHỦ RICH TEXT EDITOR CHO LỜI GIẢI THỦ CÔNG */}
                                            <div 
                                                className="relative w-full"
                                                onFocusCapture={() => setActiveRTE(`draft-essay-${q.tempId}`)}
                                                onBlurCapture={(e) => {
                                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                                        setActiveRTE(null);
                                                    }
                                                }}
                                            >
                                                <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleDraftChange(q.tempId, 'essayAnswerText', val)} />
                                                {activeRTE !== `draft-essay-${q.tempId}` && hasLatex(q.essayAnswerText) && (
                                                    <div 
                                                        className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                                                        onClick={() => setActiveRTE(`draft-essay-${q.tempId}`)}
                                                        dangerouslySetInnerHTML={{ __html: renderLatexContent(q.essayAnswerText) }}
                                                    />
                                                )}
                                            </div>
                                          </div>
                                      </div>
                                   </div>

                                   {q.type === "multiple_choice" && (
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {q.options.map((optLabel, optIdx) => {
                                            const letter = String.fromCharCode(65 + optIdx);
                                            const mathExists = hasLatex(q.options[optIdx]);

                                            return (
                                            <div key={optIdx} className="flex flex-col gap-1 w-full mt-1">
                                                <div className="flex items-start gap-2">
                                                  <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base mt-3 shrink-0">{letter}.</span>
                                                  
                                                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                                                    {/* 👉 GIAO DIỆN PREVIEW ĐÁP ÁN CHO SOẠN THỦ CÔNG */}
                                                    <div className="flex items-center gap-2">
                                                      <Input 
                                                        className={`h-11 rounded-xl bg-white text-sm sm:text-base flex-1 ${isSlotEmpty ? 'border-dashed border-slate-300' : 'border-sky-100'}`} 
                                                        value={q.options[optIdx]} 
                                                        onChange={(e) => handleDraftOptionChange(q.tempId, optIdx, e.target.value)} 
                                                        placeholder={`Gõ đáp án ${letter}...`} 
                                                        onFocus={() => setFocusedOption({ tempId: q.tempId, optIdx: optIdx, isExtracted: false })}
                                                        onBlur={() => { setTimeout(() => setFocusedOption({ tempId: null, optIdx: null, isExtracted: false }), 200); }}
                                                      />
                                                      <Button type="button" variant="outline" onClick={() => setMathModal({ isOpen: true, targetTempId: q.tempId, targetOptionIndex: optIdx, isExtracted: false, isEditing: false })} className="h-11 px-3 border-sky-200 text-sky-600 hover:bg-sky-50 shrink-0 rounded-xl" title="Mở bàn phím gõ Phân số / Toán học"><Sigma className="w-5 h-5"/></Button>
                                                      {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setDraftQuestions(draftQuestions.map(draft => draft.tempId === q.tempId ? {...draft, options: draft.options.filter((_, i) => i !== optIdx)} : draft))} className="h-11 w-11 text-rose-400 hover:bg-rose-100 shrink-0 rounded-xl"><Trash2 className="w-4 h-4"/></Button>}
                                                    </div>
                                                    
                                                    {mathExists && (
                                                      <div className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center min-h-[48px] overflow-x-auto shadow-sm text-slate-800 text-base">
                                                        <div className="q-content-view font-medium" dangerouslySetInnerHTML={{ __html: renderLatexContent(q.options[optIdx]) }} />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                            </div>
                                          )})}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                          {q.options.length < 16 ? (
                                              <Button type="button" variant="ghost" size="sm" onClick={() => setDraftQuestions(draftQuestions.map(draft => draft.tempId === q.tempId ? {...draft, options: [...draft.options, ""]} : draft))} className="text-indigo-600 hover:bg-indigo-100 rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm đáp án</Button>
                                          ) : <div className="text-xs text-rose-500 font-bold">Đã đạt tối đa 16 đáp án</div>}

                                          <div className="flex items-center gap-2">
                                            <label className="text-sm font-bold text-rose-500 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                                            <Select value={q.correctAnswer || ""} onValueChange={(val) => handleDraftChange(q.tempId, 'correctAnswer', val)}>
                                              <SelectTrigger className="h-10 w-28 bg-white text-rose-600 font-bold border-rose-200 rounded-xl"><span className="truncate">{q.correctAnswer ? `Câu ${q.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                                              <SelectContent position="popper" className="bg-white z-50">
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
                            )})}
                            
                            {draftQuestions.length === 0 && (
                               <div className="text-center py-20 border-2 border-dashed border-indigo-200 rounded-3xl">
                                  <FileQuestion className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
                                  <p className="text-slate-500 font-medium">Chưa có câu hỏi nào được tạo. Nhấn "Thêm câu hỏi tiếp theo" để bắt đầu soạn.</p>
                               </div>
                            )}

                            <Button type="button" onClick={() => setDraftQuestions([...draftQuestions, { tempId: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, content: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", videoUrl: "", videoFile: null, videoPreviewUrl: "", points: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "" }])} variant="outline" className="w-full h-12 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl shadow-sm">
                               <PlusCircle className="w-5 h-5 mr-2"/> Thêm câu hỏi tiếp theo
                            </Button>
                            
                            <Button onClick={handleSaveDraftsToBank} disabled={loading || draftQuestions.length === 0} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all mt-4">
                                {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />} LƯU VÀO TẬP "{currentExam.examName}"
                            </Button>
                          </div>
                        )}
                    </div>
                 )}

                 {/* 👉 GIAO DIỆN HIỂN THỊ CÂU HỎI TRONG CHI TIẾT TẬP */}
                 {!isAddingNew && displayedSetQuestions.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-indigo-200 shadow-sm mt-4 animate-in fade-in zoom-in-95">
                       <FileQuestion className="w-16 h-16 text-indigo-100 mx-auto mb-3" />
                       <h3 className="text-xl font-bold text-slate-700">Tập câu hỏi trống</h3>
                       <p className="text-slate-500 mb-6 mt-1">Tập này chưa có câu hỏi nào (hoặc không khớp với bộ lọc).</p>
                    </div>
                 )}

                 {!isAddingNew && displayedSetQuestions.length > 0 && (
                    <div className="space-y-4 mt-4 animate-in fade-in">
                       <div className="overflow-x-auto min-h-[300px]">
                          <Table className="min-w-[1000px] w-full border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-indigo-100">
                             <TableHeader className="bg-slate-50 border-b border-indigo-100">
                                <TableRow>
                                   <TableHead className="w-14 text-center font-bold text-indigo-800">STT</TableHead>
                                   <TableHead className="font-bold text-indigo-800 w-auto">Nội dung câu hỏi</TableHead>
                                   <TableHead className="font-bold text-indigo-800 text-center w-[160px]">Thông tin</TableHead>
                                   <TableHead className="font-bold text-indigo-800 text-center w-[140px] shrink-0">Hành động</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {displayedSetQuestions.map((q, i) => (
                                   <TableRow key={q._id} className="hover:bg-indigo-50/50 transition-colors border-b border-slate-100">
                                      <TableCell className="text-center align-middle font-black text-slate-400 text-lg">{i + 1}</TableCell>
                                      
                                      {/* 👉 ĐÃ KHÓA CHIỀU RỘNG TỐI ĐA CỦA CỘT NỘI DUNG ĐỂ KHÔNG BỊ VỠ BẢNG */}
                                      <TableCell className="align-middle py-4 max-w-[250px] sm:max-w-[400px] lg:max-w-[500px]">
                                         <div className="flex flex-col gap-1 pr-4">
                                            <div 
                                               className="font-medium text-slate-700 text-[15px] leading-relaxed line-clamp-3 q-content-view-table break-words overflow-hidden" 
                                               dangerouslySetInnerHTML={{ __html: renderLatexContent(q.content) }} 
                                            />
                                            <div className="flex items-center gap-2 mt-1">
                                               {(q.imageUrl || (q.content && q.content.includes('<img'))) && <Badge variant="outline" className="text-[10px] text-sky-600 bg-sky-50 border-0 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Có ảnh</Badge>}
                                               {q.videoUrl && <Badge variant="outline" className="text-[10px] text-purple-600 bg-purple-50 border-0 flex items-center"><Video className="w-3 h-3 mr-1"/> Có Video</Badge>}
                                            </div>
                                         </div>
                                      </TableCell>
                                      
                                      <TableCell className="text-center align-middle py-4 w-[160px]">
                                         <div className="flex flex-col items-center gap-1.5">
                                            <Badge variant="outline" className={`${q.type==='essay' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'} text-[11px] font-medium justify-center`}>{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                            {q.type === 'essay' && q.points > 0 && <span className="text-indigo-600 font-bold text-xs">{q.points} Điểm</span>}
                                         </div>
                                      </TableCell>
                                      
                                      <TableCell className="text-center align-middle py-4 shrink-0 w-[140px]">
                                         <div className="flex justify-center items-center gap-2">
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-100 rounded-lg" onClick={(e) => { e.stopPropagation(); setViewQuestion(q); }} title="Xem chi tiết"><Eye className="w-4 h-4"/></Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-100 rounded-lg" onClick={(e) => { e.stopPropagation(); handleEditClick(q); }} title="Sửa"><Pencil className="w-4 h-4"/></Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-100 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDeleteDbQuestion(q._id); }} title="Xóa"><Trash2 className="w-4 h-4"/></Button>
                                         </div>
                                      </TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                       </div>
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- CÁC MODAL CHUNG --- */}

        {/* MODAL TẠO TẬP CÂU HỎI MỚI */}
        <Dialog open={isCreateSetModalOpen} onOpenChange={setIsCreateSetModalOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-indigo-900 flex items-center gap-2">
                        <PlusCircle className="w-6 h-6 text-indigo-500" /> Tạo Tập Câu Hỏi Mới
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-600">Tên Tập / Đề kiểm tra</label>
                        <Input 
                            placeholder="Nhập tên tập câu hỏi..." 
                            value={newSetInfo.examName} 
                            onChange={(e) => setNewSetInfo({...newSetInfo, examName: e.target.value})} 
                            className="h-11 rounded-xl bg-slate-50 border-indigo-200 focus-visible:ring-indigo-500 font-bold text-indigo-900" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-600">Môn học</label>
                        <Select value={newSetInfo.subject} onValueChange={(val) => setNewSetInfo({...newSetInfo, subject: val})}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                <SelectValue placeholder="Chọn môn" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {teacherSubjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600">Khối lớp</label>
                            <Select value={newSetInfo.grade} onValueChange={(val) => setNewSetInfo({...newSetInfo, grade: val})}>
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                    <SelectValue placeholder="Chọn khối" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {allowedGrades.map(g => (
                                        <SelectItem key={g} value={g}>Khối {g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600">Học kỳ</label>
                            <Select value={newSetInfo.semester} onValueChange={(val) => setNewSetInfo({...newSetInfo, semester: val})}>
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                    <SelectValue placeholder="Chọn HK" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="1">Học kỳ 1</SelectItem>
                                    <SelectItem value="2">Học kỳ 2</SelectItem>
                                    <SelectItem value="Cả năm">Cả năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsCreateSetModalOpen(false)} className="rounded-xl font-bold text-slate-500">Hủy</Button>
                    <Button onClick={handleCreateNewSet} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Tạo Tập & Bắt đầu soạn
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL CÀI ĐẶT/SỬA TẬP CÂU HỎI */}
        <Dialog open={isEditSetModalOpen} onOpenChange={setIsEditSetModalOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-indigo-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-indigo-500" /> Cài đặt Tập câu hỏi
                    </DialogTitle>
                </DialogHeader>
                {editSetInfo && (
                    <div className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600">Tên Tập / Đề kiểm tra</label>
                            <Input 
                                placeholder="Nhập tên tập câu hỏi..." 
                                value={editSetInfo.examName} 
                                onChange={(e) => setEditSetInfo({...editSetInfo, examName: e.target.value})} 
                                className="h-11 rounded-xl bg-slate-50 border-indigo-200 focus-visible:ring-indigo-500 font-bold text-indigo-900" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-600">Môn học</label>
                            <Select value={editSetInfo.subject} onValueChange={(val) => setEditSetInfo({...editSetInfo, subject: val})}>
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                    <SelectValue placeholder="Chọn môn" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {teacherSubjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-600">Khối lớp</label>
                                <Select value={editSetInfo.grade} onValueChange={(val) => setEditSetInfo({...editSetInfo, grade: val})}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                        <SelectValue placeholder="Chọn khối" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {allowedGrades.map(g => (
                                            <SelectItem key={g} value={g}>Khối {g}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-600">Học kỳ</label>
                                <Select value={editSetInfo.semester} onValueChange={(val) => setEditSetInfo({...editSetInfo, semester: val})}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-indigo-200 font-bold text-indigo-900">
                                        <SelectValue placeholder="Chọn HK" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="1">Học kỳ 1</SelectItem>
                                        <SelectItem value="2">Học kỳ 2</SelectItem>
                                        <SelectItem value="Cả năm">Cả năm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsEditSetModalOpen(false)} className="rounded-xl font-bold text-slate-500">Hủy</Button>
                    <Button onClick={handleUpdateSetInfo} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-md">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Cập nhật
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* 👉 MODAL EDIT CÂU HỎI (ĐÃ ĐỒNG BỘ GIAO DIỆN LỚP PHỦ) */}
        <Dialog open={isEditDialogOpen} onOpenChange={(val) => { setIsEditDialogOpen(val); if(!val) {setEditVideoPreviewUrl(""); setEditVideoFile(null); setEditQuestionData(initialQuestionState);}}}>
          <DialogContent className="sm:max-w-[800px] w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-0 bg-slate-50 modal-detail-view">
            <DialogHeader className="bg-sky-500 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-t-3xl">
                <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2"><Pencil className="h-5 sm:h-6 w-5 sm:w-6 text-white"/> Chỉnh sửa câu hỏi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-6 p-4 sm:p-8">
              
              <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
                <Select value={editQuestionData.type} onValueChange={(v) => setEditQuestionData({...editQuestionData, type: v})}><SelectTrigger className="h-11 w-max rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-700"><span className="truncate">{editQuestionData.type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50"><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent></Select>
                <Select disabled={!!editQuestionData.examName} value={editQuestionData.grade} onValueChange={(v) => setEditQuestionData({...editQuestionData, grade: v})}><SelectTrigger className="h-11 w-max rounded-xl bg-slate-50 border-slate-200 font-bold disabled:bg-slate-100 disabled:opacity-50 text-slate-700"><span className="truncate">{editQuestionData.grade ? `Khối ${editQuestionData.grade}` : "Chọn khối"}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50">{allowedGrades.map(g => <SelectItem key={g} value={g}>Khối {g}</SelectItem>)}</SelectContent></Select>
                <Select disabled={!!editQuestionData.examName} value={editQuestionData.semester} onValueChange={(v) => setEditQuestionData({...editQuestionData, semester: v})}><SelectTrigger className="h-11 w-max rounded-xl bg-slate-50 border-slate-200 font-bold disabled:bg-slate-100 disabled:opacity-50 text-slate-700"><span className="truncate">{editQuestionData.semester === 'Cả năm' ? 'Cả năm' : `HK ${editQuestionData.semester}`}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50"><SelectItem value="1">Học kỳ 1</SelectItem><SelectItem value="2">Học kỳ 2</SelectItem><SelectItem value="Cả năm">Cả năm</SelectItem></SelectContent></Select>
                <Select value={editQuestionData.difficulty} onValueChange={(v) => setEditQuestionData({...editQuestionData, difficulty: v})}><SelectTrigger className="h-11 w-max rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700"><span className="truncate">{editQuestionData.difficulty === 'easy' ? 'Dễ' : editQuestionData.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span></SelectTrigger><SelectContent position="popper" className="bg-white z-50"><SelectItem value="easy">Dễ</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="hard">Khó</SelectItem></SelectContent></Select>
                
                {editQuestionData.type === 'essay' && (
                    <div className="flex items-center bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 gap-2 shadow-sm ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                        <Calculator className="w-4 h-4 text-sky-600" />
                        <span className="text-sm font-bold text-sky-900">Điểm:</span>
                        <input type="number" step="0.25" min="0" value={editQuestionData.points} onChange={(e) => setEditQuestionData({...editQuestionData, points: e.target.value})} className="w-16 text-center font-black text-sky-600 bg-white border border-sky-200 rounded-md focus:outline-none h-8" />
                    </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 mb-2 block">Nội dung Đề bài</span>
                  <div 
                      className="relative w-full"
                      onFocusCapture={() => setActiveRTE(`edit-content`)}
                      onBlurCapture={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                              setActiveRTE(null);
                          }
                      }}
                  >
                      <RichTextEditor placeholder="Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC TOÁN..." value={editQuestionData.content} onChange={(val) => setEditQuestionData({...editQuestionData, content: val})} />
                      {activeRTE !== `edit-content` && hasLatex(editQuestionData.content) && (
                          <div 
                              className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                              onClick={() => setActiveRTE(`edit-content`)}
                              dangerouslySetInnerHTML={{ __html: renderLatexContent(editQuestionData.content) }}
                          />
                      )}
                  </div>
                  
                  {!openEditMediaPanel && !editVideoFile && !editQuestionData.videoUrl && (
                     <Button type="button" variant="ghost" size="sm" onClick={() => setOpenEditMediaPanel(true)} className="mt-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold self-start w-max">
                        <Video className="w-4 h-4 mr-2" /> Thêm Video / Audio / Link
                     </Button>
                  )}

                  {(openEditMediaPanel || editVideoFile || editQuestionData.videoUrl) && (
                     <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative">
                        <div className="flex justify-between items-center mb-3">
                           <h4 className="text-sm font-bold text-indigo-700 flex items-center"><Video className="w-4 h-4 mr-2" /> Đính kèm Video / Audio / Link</h4>
                           <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-100 rounded-full" title="Đóng và Xóa đính kèm" onClick={() => { setOpenEditMediaPanel(false); setEditVideoFile(null); setEditVideoPreviewUrl(""); setEditQuestionData({...editQuestionData, videoUrl: ""}); }}>
                              <X className="w-4 h-4" />
                           </Button>
                        </div>
                        
                        {editVideoFile || (editQuestionData.videoUrl && !editQuestionData.videoUrl.includes("youtube") && !editQuestionData.videoUrl.includes("drive.google.com")) ? (
                            <div className="relative w-full max-w-[450px] mx-auto rounded-xl overflow-hidden border border-indigo-200 shadow-sm bg-black group flex flex-col items-center justify-center p-4">
                                {isAudioFile(editQuestionData.videoUrl) || (editVideoFile && editVideoFile.type.includes("audio")) ? (
                                   <div className="bg-white p-4 w-full rounded-xl flex flex-col items-center">
                                      <FileAudio className="w-12 h-12 text-indigo-400 mb-3" />
                                      <audio controls className="w-full" src={editVideoPreviewUrl || editQuestionData.videoUrl} />
                                   </div>
                                ) : (
                                   <video className="w-full max-h-[300px] object-contain" controls src={editVideoPreviewUrl || editQuestionData.videoUrl} />
                                )}
                            </div>
                        ) : (editQuestionData.videoUrl && (editQuestionData.videoUrl.includes("youtube") || editQuestionData.videoUrl.includes("youtu.be") || editQuestionData.videoUrl.includes("drive.google.com"))) ? (
                            <div className="relative w-full flex flex-col items-center group">
                                {(editQuestionData.videoUrl.includes("youtube.com") || editQuestionData.videoUrl.includes("youtu.be")) ? (
                                    <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <iframe className="w-full h-full" src={getYoutubeEmbedUrl(editQuestionData.videoUrl)} allow="autoplay; fullscreen" allowFullScreen></iframe>
                                    </div>
                                ) : (
                                    <div className="w-full flex flex-col items-center">
                                        <div className="h-[200px] sm:h-[300px] w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                                            <iframe className="w-full h-full relative z-10" src={getDriveEmbedUrl(editQuestionData.videoUrl)} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
                                               <Video className="w-8 h-8 text-slate-300 mb-2" />
                                               <p className="text-slate-500 font-medium text-xs">Video bị chặn. Nhấn link để xem.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                               <Input placeholder="Dán link YouTube / Google Drive vào đây..." value={editQuestionData.videoUrl || ""} onChange={(e) => setEditQuestionData({...editQuestionData, videoUrl: e.target.value})} className="bg-white border-indigo-200 focus-visible:ring-indigo-400 font-medium" />
                               <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoặc tải tệp lên</span>
                                  <hr className="flex-1 border-slate-200" />
                               </div>
                               <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100 bg-white cursor-pointer transition-all">
                                  <div className="flex gap-3 mb-2">
                                     <Video className="w-6 h-6 text-indigo-400" />
                                     <FileAudio className="w-6 h-6 text-indigo-400" />
                                  </div>
                                  <span className="text-xs font-bold text-indigo-600 text-center px-1">Nhấp để tải lên Video / Audio</span>
                                  <input type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => { const f = e.target.files[0]; if(f){ setEditVideoFile(f); setEditVideoPreviewUrl(URL.createObjectURL(f)); } }} />
                               </label>
                            </div>
                        )}
                     </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <label className="text-sm font-bold text-emerald-700 block mb-3 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div 
                          className="relative w-full"
                          onFocusCapture={() => setActiveRTE(`edit-essay`)}
                          onBlurCapture={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                  setActiveRTE(null);
                              }
                          }}
                      >
                          <RichTextEditor placeholder="Nhập lời giải..." value={editQuestionData.essayAnswerText} onChange={(val) => setEditQuestionData({...editQuestionData, essayAnswerText: val})} />
                          {activeRTE !== `edit-essay` && hasLatex(editQuestionData.essayAnswerText) && (
                              <div 
                                  className="absolute inset-0 z-10 bg-white border border-slate-200 rounded-lg p-4 cursor-text overflow-y-auto q-content-view shadow-sm text-lg leading-relaxed"
                                  onClick={() => setActiveRTE(`edit-essay`)}
                                  dangerouslySetInnerHTML={{ __html: renderLatexContent(editQuestionData.essayAnswerText) }}
                              />
                          )}
                      </div>
                    </div>
                  </div>
              </div>

              {editQuestionData.type === "multiple_choice" && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editQuestionData.options.map((opt, i) => {
                      const k = String.fromCharCode(65 + i);
                      const mathExists = hasLatex(opt);
                      const isEditingThis = focusedOption.tempId === 'edit' && focusedOption.optIdx === i;

                      return (
                      <div key={i} className="flex flex-col gap-1 w-full mt-1">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base mt-3 shrink-0">{k}.</span>
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                               <div className="flex items-center gap-2">
                                 <Input 
                                    placeholder={`Nhập đáp án ${k}`} 
                                    className="h-11 rounded-xl bg-slate-50 border-sky-100 font-medium flex-1" 
                                    value={opt} 
                                    onChange={(e) => {
                                      const newOpts = [...editQuestionData.options];
                                      newOpts[i] = e.target.value;
                                      setEditQuestionData({...editQuestionData, options: newOpts});
                                    }} 
                                    onFocus={() => setFocusedOption({ tempId: 'edit', optIdx: i, isExtracted: false })}
                                    onBlur={() => { setTimeout(() => setFocusedOption({ tempId: null, optIdx: null, isExtracted: false }), 200); }}
                                    required 
                                 />
                                 <Button type="button" variant="outline" onClick={() => setMathModal({ isOpen: true, targetTempId: null, targetOptionIndex: i, isExtracted: false, isEditing: true })} className="h-11 px-3 border-sky-200 text-sky-600 hover:bg-sky-50 shrink-0 rounded-xl" title="Mở bàn phím gõ Phân số / Toán học"><Sigma className="w-5 h-5"/></Button>
                                 {editQuestionData.options.length > 2 && (
                                     <Button type="button" variant="ghost" size="icon" onClick={() => {
                                         const newOpts = editQuestionData.options.filter((_, idx) => idx !== i);
                                         setEditQuestionData({...editQuestionData, options: newOpts});
                                     }} className="h-11 w-11 text-rose-400 hover:bg-rose-100 shrink-0 rounded-xl"><Trash2 className="w-4 h-4"/></Button>
                                 )}
                               </div>
                               
                               {mathExists && (
                                 <div className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center min-h-[48px] overflow-x-auto shadow-sm text-slate-800 text-base">
                                   <div className="q-content-view font-medium" dangerouslySetInnerHTML={{ __html: renderLatexContent(opt) }} />
                                 </div>
                               )}
                            </div>
                          </div>
                      </div>
                    )})}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    {editQuestionData.options.length < 16 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditQuestionData({...editQuestionData, options: [...editQuestionData.options, ""]})} className="text-sky-600 hover:bg-sky-100 w-max rounded-lg"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                    ) : <div className="text-xs text-rose-500 font-bold">Đã đạt tối đa 16 đáp án</div>}

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-rose-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Chọn đáp án ĐÚNG:</label>
                      <Select value={editQuestionData.correctAnswer} onValueChange={(v) => setEditQuestionData({...editQuestionData, correctAnswer: v})}>
                        <SelectTrigger className="h-11 w-full sm:w-32 bg-white text-rose-600 font-bold border-rose-200 rounded-xl shadow-sm"><span className="truncate">{editQuestionData.correctAnswer ? `Câu ${editQuestionData.correctAnswer}` : "Chọn"}</span></SelectTrigger>
                        <SelectContent position="popper" className="bg-white z-50">
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
              <Button type="submit" disabled={loading} className="w-full h-12 sm:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl mt-2">
                Cập nhật thay đổi
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* 👉 MODAL XEM CHI TIẾT CÂU HỎI (ĐÃ ĐỒNG BỘ GIAO DIỆN XEM TRƯỚC) */}
        <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
          <DialogContent className="sm:max-w-[700px] w-[95%] rounded-3xl border-none p-0 bg-white shadow-2xl max-h-[90vh] overflow-y-auto modal-detail-view">
            <DialogHeader className="bg-sky-500 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-t-3xl">
                <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3"><Eye className="w-6 h-6 text-white" /> Chi tiết câu hỏi</DialogTitle>
            </DialogHeader>
            {viewQuestion && (
              <div className="space-y-6 p-6 sm:p-8 pt-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="font-bold text-slate-800 text-lg leading-relaxed q-content-view whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderLatexContent(viewQuestion.content) }} />
                    {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-w-full mt-4 rounded-xl border border-slate-200 shadow-sm mx-auto object-contain max-h-[400px]" />}
                    
                    {viewQuestion.videoUrl && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                           <p className="text-sm font-bold text-slate-600 mb-2 flex items-center"><Video className="w-4 h-4 mr-1 text-slate-500"/> Video / Link đính kèm</p>
                           {renderVideoUrl(viewQuestion.videoUrl)}
                        </div>
                    )}
                </div>

                {(hasContent(viewQuestion.essayAnswerText) || viewQuestion.essayAnswerImageUrl) && (
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                        <p className="font-bold text-emerald-700 text-sm uppercase tracking-widest mb-3 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2"/> Hướng dẫn giải</p>
                        {hasContent(viewQuestion.essayAnswerText) && (
                          <div className="font-medium text-emerald-900 text-base leading-relaxed whitespace-pre-wrap q-content-view bg-white p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: renderLatexContent(viewQuestion.essayAnswerText) }} />
                        )}
                        {viewQuestion.essayAnswerImageUrl && <img src={getImageUrl(viewQuestion.essayAnswerImageUrl)} className="max-w-full mt-4 rounded-xl border border-emerald-200 shadow-sm mx-auto object-contain max-h-[400px]" />}
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
                                <span className={`text-base q-content-view whitespace-pre-wrap ${isCorrect ? 'font-bold text-sky-800' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{ __html: renderLatexContent(opt) }} />
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

        {/* MODAL BÀN PHÍM ẢO TOÁN HỌC */}
        <Dialog open={mathModal.isOpen} onOpenChange={(open) => {
            if (!open) {
                if(mathFieldRef.current) mathFieldRef.current.value = '';
                setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false });
            }
        }}>
          <DialogContent className="sm:max-w-[700px] w-[95%] rounded-3xl p-6 bg-white border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-sky-900 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-sky-500" /> Bàn phím Ảo (Ký tự & Toán học)
              </DialogTitle>
            </DialogHeader>
            <div className="my-6 p-4 bg-sky-50/50 rounded-2xl border-2 border-sky-200 shadow-inner">
              <math-field ref={mathFieldRef} style={{ fontSize: '28px', width: '100%', padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #bae6fd', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}></math-field>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false })} className="rounded-xl h-11 font-bold text-slate-500 hover:text-slate-700">Hủy bỏ</Button>
              <Button onClick={confirmMathInsertion} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-11 px-8 font-black shadow-md transition-all active:scale-95"><CheckCircle2 className="w-5 h-5 mr-2" /> Chèn vào Đáp án</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default QuestionBank;