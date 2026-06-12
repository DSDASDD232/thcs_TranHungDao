import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "../lib/axios"; 
import { processWordFile, extractQuestionsFromText } from "../lib/wordExtractor"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, UploadCloud, CheckCircle2, AlertTriangle, Eraser,
  Sparkles, FileText, Loader2, Image as ImageIcon, ListChecks,
  PenTool, Database, Calculator, Search, Eye, EyeOff, Trash2, PlusCircle, ArrowRight, FolderOpen, Lock,
  Calendar, Video, FileAudio, Sigma, X, RotateCcw, Save
} from "lucide-react"; 

import RichTextEditor from "@/components/ui/RichTextEditor";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'mathlive';

// ==========================================
// HÀM DỊCH MÃ LATEX
// ==========================================
const renderLatexContent = (htmlString) => {
  if (!htmlString) return "";
  let parsedHtml = htmlString.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });
  parsedHtml = parsedHtml.replace(/\$([^\$]+)\$/g, (match, math) => {
    try { return katex.renderToString(`\\displaystyle ${math}`, { displayMode: false, throwOnError: false }); } 
    catch (e) { return match; }
  });
  return parsedHtml;
};

// ==========================================
// HÀM XỬ LÝ LINK YOUTUBE VÀ GOOGLE DRIVE & KIỂM TRA AUDIO
// ==========================================
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

// ==========================================
// COMPONENT CHỌN NGÀY TÙY CHỈNH
// ==========================================
const CustomDateInput = ({ label, value, onChange, min }) => {
  const [textVal, setTextVal] = useState("");

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      setTextVal(`${d}/${m}/${y}`);
    } else {
      setTextVal("");
    }
  }, [value]);

  const handleTextChange = (e) => {
    let val = e.target.value.replace(/[^0-9/]/g, ""); 
    setTextVal(val);
    
    if (val.length === 10) {
      const [d, m, y] = val.split("/");
      if (d && m && y?.length === 4) {
        const typedDate = `${y}-${m}-${d}`;
        if (min && typedDate < min) {
          alert(`Không thể chọn ngày trong quá khứ hoặc nhỏ hơn Ngày mở đề!\nNgày hợp lệ nhỏ nhất là: ${min.split('-').reverse().join('/')}`);
          const [minY, minM, minD] = min.split("-");
          setTextVal(`${minD}/${minM}/${minY}`);
          onChange(min);
        } else {
          onChange(typedDate); 
        }
      }
    } else if (val === "") {
      onChange("");
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white px-3 h-11 sm:h-12 rounded-xl border border-slate-200 shadow-sm w-full">
      {label && <span className="text-xs font-bold text-slate-500 uppercase shrink-0">{label}</span>}
      <Input 
        type="text" 
        placeholder="dd/mm/yyyy" 
        value={textVal} 
        onChange={handleTextChange} 
        maxLength={10}
        className="h-full border-0 p-0 text-sm font-bold flex-1 bg-transparent text-slate-700 focus:ring-0 placeholder:font-normal placeholder:text-slate-400" 
      />
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-md transition-colors shrink-0">
         <Calendar className="w-4 h-4 text-sky-600 pointer-events-none absolute" />
         <input 
           type="date" 
           value={value} 
           min={min}
           onChange={(e) => {
             if (e.target.value) {
               if (min && e.target.value < min) {
                 alert(`Không thể chọn ngày trong quá khứ!\nNgày hợp lệ nhỏ nhất là: ${min.split('-').reverse().join('/')}`);
                 onChange(min);
               } else {
                 onChange(e.target.value);
               }
             }
           }} 
           className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
           title="Mở lịch"
         />
      </div>
    </div>
  );
};

const CreateAssignment = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const location = useLocation();
  const assignmentFileRef = useRef(null);
  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [allClasses, setAllClasses] = useState([]);

  const [creationMethod, setCreationMethod] = useState("manual"); 
  const [viewQuestion, setViewQuestion] = useState(null);
  
  const [isReviewingExtraction, setIsReviewingExtraction] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const mathFieldRef = useRef(null);
  const [mathModal, setMathModal] = useState({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false });
  
  const [openMediaPanels, setOpenMediaPanels] = useState({});
  const [openExtractedMediaPanels, setOpenExtractedMediaPanels] = useState({});

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ML__keyboard { z-index: 999999 !important; }
      math-field::part(virtual-keyboard-toggle) { color: #0ea5e9; }
      math-field:focus-within { outline: 2px solid #38bdf8 !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (mathModal.isOpen && mathFieldRef.current) {
      setTimeout(() => mathFieldRef.current.focus(), 150);
    }
  }, [mathModal.isOpen]);

  const confirmMathInsertion = () => {
    if (!mathFieldRef.current) return;
    const latex = mathFieldRef.current.value;
    if (!latex) {
        setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false });
        return;
    }

    const formattedLatex = `$$ ${latex} $$`; 

    if (mathModal.isExtracted) {
        setExtractedQuestions(extractedQuestions.map(q => {
            if (q.tempId === mathModal.targetTempId) {
                const newOptions = [...q.options];
                newOptions[mathModal.targetOptionIndex] = (newOptions[mathModal.targetOptionIndex] || '') + " " + formattedLatex;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    } else {
        setManualQuestions(manualQuestions.map(q => {
            if (q.tempId === mathModal.targetTempId) {
                const newOptions = [...q.options];
                newOptions[mathModal.targetOptionIndex] = (newOptions[mathModal.targetOptionIndex] || '') + " " + formattedLatex;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    }

    mathFieldRef.current.value = '';
    setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false });
  };

  const [templateConfig, setTemplateConfig] = useState({
    mcqCount: 0, essayCount: 0, essayPoints: []
  });

  const getCurrentDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  };
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const getDefaultDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 24); 
    return now.toISOString().slice(0, 10); 
  };
  const getDefaultTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 24); 
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`; 
  };

  const queryParams = new URLSearchParams(location.search);
  const currentAssignmentType = queryParams.get("type") === "exam" ? "exam" : "homework";

  const [newAssignment, setNewAssignment] = useState({ 
    title: "", targetClass: "", subject: "", duration: "45", semester: "1", 
    assignmentType: currentAssignmentType,
    startDate_date: getCurrentDate(), 
    startDate_time: getCurrentTime(), 
    dueDate_date: getDefaultDate(), 
    dueDate_time: getDefaultTime(),
    password: "",
    allowMultipleSubmissions: false
  });

  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!newAssignment.startDate_date || !newAssignment.startDate_time || !newAssignment.dueDate_date || !newAssignment.dueDate_time) return;

    const startDateTime = new Date(`${newAssignment.startDate_date}T${newAssignment.startDate_time}:00`);
    const currentDueDateTime = new Date(`${newAssignment.dueDate_date}T${newAssignment.dueDate_time}:00`);
    
    const durationMs = (parseInt(newAssignment.duration) || 0) * 60 * 1000;
    const minDueDateTime = new Date(startDateTime.getTime() + durationMs);

    if (currentDueDateTime.getTime() < minDueDateTime.getTime()) {
      const yyyy = minDueDateTime.getFullYear();
      const mm = String(minDueDateTime.getMonth() + 1).padStart(2, '0');
      const dd = String(minDueDateTime.getDate()).padStart(2, '0');
      const hh = String(minDueDateTime.getHours()).padStart(2, '0');
      const mins = String(minDueDateTime.getMinutes()).padStart(2, '0');

      setNewAssignment(prev => ({
        ...prev,
        dueDate_date: `${yyyy}-${mm}-${dd}`,
        dueDate_time: `${hh}:${mins}`
      }));
    }
  }, [
    newAssignment.startDate_date, 
    newAssignment.startDate_time, 
    newAssignment.dueDate_date, 
    newAssignment.dueDate_time, 
    newAssignment.duration
  ]);

  const [manualQuestions, setManualQuestions] = useState([]);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [questionPoints, setQuestionPoints] = useState({});

  // States lọc từ kho
  const [bankSearch, setBankSearch] = useState("");
  const [bankSubject, setBankSubject] = useState("all");
  const [bankSemester, setBankSemester] = useState("all");
  const [bankExam, setBankExam] = useState("all"); 
  const [bankType, setBankType] = useState("all"); 
  const [bankGrade, setBankGrade] = useState("all"); 
  const [bankSelected, setBankSelected] = useState([]); 

  const getHeader = (isMultipart = false) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    return { headers };
  };

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:image")) return url;
    let cleanUrl = url.replace(/\\/g, '/'); 
    return `${serverUrl}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  };

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!id) return; 
      try {
        const res = await axios.get(`/assignments/${id}`, getHeader());
        const data = res.data;

        const dateObj = new Date(data.dueDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const mins = String(dateObj.getMinutes()).padStart(2, '0');

        const startObj = data.startDate ? new Date(data.startDate) : new Date();
        const s_yyyy = startObj.getFullYear();
        const s_mm = String(startObj.getMonth() + 1).padStart(2, '0');
        const s_dd = String(startObj.getDate()).padStart(2, '0');
        const s_hh = String(startObj.getHours()).padStart(2, '0');
        const s_mins = String(startObj.getMinutes()).padStart(2, '0');

        setNewAssignment({
          title: data.title, targetClass: data.targetClass, subject: data.subject,
          duration: data.duration.toString(), 
          startDate_date: `${s_yyyy}-${s_mm}-${s_dd}`,
          startDate_time: `${s_hh}:${s_mins}`,
          dueDate_date: `${yyyy}-${mm}-${dd}`,
          dueDate_time: `${hh}:${mins}`,
          password: data.password || "",
          semester: data.semester || "1",
          assignmentType: data.assignmentType || currentAssignmentType,
          allowMultipleSubmissions: data.allowMultipleSubmissions || false 
        });

        if (data.password) setHasPassword(true);

        if (data.questions && data.questions.length > 0) {
          const loadedPoints = {};
          let mcqCount = 0, essayCount = 0;

          const formattedQuestions = data.questions.map((item) => {
            const q = item.questionId;
            if (q.type === 'multiple_choice') mcqCount++; else essayCount++;
            
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
                  const idx = parsedOptions.findIndex(opt => opt === q.correctAnswer);
                  if (idx !== -1) correctKey = validLetters[idx];
              }
            }

            const tempId = q._id; 
            loadedPoints[tempId] = item.points; 

            return {
              _id: q._id, tempId, content: q.content, type: q.type || "multiple_choice",
              options: parsedOptions, correctAnswer: correctKey, difficulty: q.difficulty || "medium",
              videoUrl: q.videoUrl || "", 
              videoFile: null, videoPreviewUrl: "",
              essayAnswerText: q.essayAnswerText || "",
              essayAnswerPreviewUrl: q.essayAnswerImageUrl ? getImageUrl(q.essayAnswerImageUrl) : "",
            };
          });

          const essayPtsArr = formattedQuestions.filter(q => q.type === 'essay').map(q => loadedPoints[q.tempId]);

          setTemplateConfig({ mcqCount, essayCount, essayPoints: essayPtsArr });
          setManualQuestions(formattedQuestions);
          setQuestionPoints(loadedPoints); 
          setCreationMethod("manual"); 
        }
      } catch (error) {
        alert("Không thể tải bản nháp.");
        navigate("/teacher-dashboard");
      }
    };
    fetchAssignmentData();
  }, [id, navigate, serverUrl, currentAssignmentType]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        const [profRes, classRes, questionsRes] = await Promise.all([
          axios.get("/teacher/me", getHeader()), 
          axios.get("/classes/all", getHeader()),
          axios.get("/questions/all", getHeader())
        ]);
        
        const teacherInfo = profRes.data;
        setTeacherProfile(teacherInfo);
        setAllClasses(classRes.data.classes || []);
        
        if (!id) {
            const defaultSub = Array.isArray(teacherInfo.subjects) && teacherInfo.subjects.length > 0 
                ? teacherInfo.subjects[0] 
                : teacherInfo.subject || "Chưa phân tổ";
                
            setNewAssignment(prev => ({ ...prev, subject: defaultSub }));
        }
        questionsRes.data && setQuestions(questionsRes.data.questions || []);
      } catch (error) {}
    };
    fetchData();
  }, [navigate, id]);

  const teacherSubjects = Array.isArray(teacherProfile?.subjects) && teacherProfile.subjects.length > 0 
    ? teacherProfile.subjects : teacherProfile?.subject ? [teacherProfile.subject] : [];

  // 👉 TỰ ĐỘNG KHÓA VÀ ĐỒNG BỘ BỘ LỌC KHO CÂU HỎI VỚI THÔNG TIN CHUNG
  const selectedGrade = useMemo(() => {
      if (!newAssignment.targetClass || !allClasses.length) return "";
      const cls = allClasses.find(c => c.name === newAssignment.targetClass);
      return cls ? String(cls.grade) : (newAssignment.targetClass.match(/\d+/)?.[0] || "");
  }, [newAssignment.targetClass, allClasses]);

  const allowedSubjects = newAssignment.subject ? [newAssignment.subject] : teacherSubjects;
  const allowedGrades = selectedGrade ? [selectedGrade] : [...new Set(teacherProfile?.assignedClasses?.map(c => {
      const clsObj = allClasses.find(ac => ac.name === c.name || ac._id === c._id) || c;
      return clsObj.grade || c.name?.match(/\d+/)?.[0];
  }).filter(Boolean))];
  const allowedSemesters = newAssignment.semester ? [newAssignment.semester] : ["1", "2", "Cả năm"];

  useEffect(() => {
      if (allowedSubjects.length > 0) setBankSubject(allowedSubjects[0]);
      if (allowedGrades.length > 0) setBankGrade(allowedGrades[0]);
      if (allowedSemesters.length > 0) setBankSemester(allowedSemesters[0]);
  }, [allowedSubjects.join(','), allowedGrades.join(','), allowedSemesters.join(',')]);

  const handleEssayCountChange = (e) => {
    const count = parseInt(e.target.value) || 0;
    const newPts = [...templateConfig.essayPoints];
    if (count > newPts.length) { while (newPts.length < count) newPts.push(""); } 
    else { newPts.length = count; }
    setTemplateConfig({...templateConfig, essayCount: count, essayPoints: newPts});
  };

  const isUglyDecimal = (num) => {
    const fixed = Number(num).toFixed(10);
    const decimal = fixed.split(".")[1]?.replace(/0+$/, "") || "";
    return (decimal.includes("333") || decimal.includes("666") || decimal.includes("999") || decimal.length > 2);
  };

  const checkPointValidity = () => {
    const mcq = Number(templateConfig.mcqCount) || 0;
    const essay = Number(templateConfig.essayCount) || 0;
    const essayPtsNum = templateConfig.essayPoints.map(p => Number(p) || 0);
    const totalEssayPoints = essayPtsNum.reduce((a, b) => a + b, 0);
    const totalQs = mcq + essay;

    if (totalQs === 0) return { valid: false, msg: "Vui lòng nhập số lượng câu hỏi (Trắc nghiệm hoặc Tự luận)." };

    let type = 'mixed';
    if (mcq > 0 && essay === 0) type = 'full_mcq';
    else if (mcq === 0 && essay > 0) type = 'full_essay';

    if (type === "full_mcq") {
      const pt = 10 / mcq;
      if ((pt * 100) % 5 !== 0 || isUglyDecimal(pt)) {
        return { valid: false, msg: `LỖI: Máy chia bị lẻ (${pt.toFixed(4)} đ/câu). Vui lòng đổi số lượng câu trắc nghiệm!` };
      }
      return { valid: true, msg: `Hợp lệ: Máy sẽ chia đều mỗi câu ${pt.toFixed(2)} điểm.` };
    }

    if (type === "full_essay") {
      if (essayPtsNum.some(p => p <= 0)) {
        return { valid: false, msg: "Vui lòng nhập điểm lớn hơn 0 cho các câu Tự luận." };
      }
      if (totalEssayPoints !== 10) {
        return { valid: false, msg: `LỖI: Tổng điểm đang là ${totalEssayPoints}. Phải bằng đúng 10.` };
      }
      return { valid: true, msg: "Hợp lệ: Đề có tổng 10 điểm." };
    }

    if (type === "mixed") {
      if (totalEssayPoints >= 10) {
        return { valid: false, msg: "LỖI: Tổng tự luận phải nhỏ hơn 10 để nhường điểm cho trắc nghiệm." };
      }
      const mcqPt = (10 - totalEssayPoints) / mcq;
      if ((mcqPt * 100) % 5 !== 0 || isUglyDecimal(mcqPt)) {
        return { valid: false, msg: `LỖI: Trắc nghiệm bị lẻ (${mcqPt.toFixed(4)} đ/câu). Vui lòng đổi số câu trắc nghiệm hoặc điểm tự luận.` };
      }
      return { valid: true, msg: `Hợp lệ: Tự luận ${totalEssayPoints}đ. Trắc nghiệm ${mcqPt.toFixed(2)}đ/câu.` };
    }

    return { valid: false, msg: "Vui lòng cấu hình đề." };
  };

  const pointStatus = checkPointValidity();

  const handleGenerateSlots = () => {
    if (!pointStatus.valid) {
       alert(pointStatus.msg);
       return;
    }

    let generatedSlots = [];
    const mcqCount = Number(templateConfig.mcqCount);
    const essayCount = Number(templateConfig.essayCount);
    let mcqPt = 0;
    
    if (mcqCount > 0 && essayCount === 0) mcqPt = 10 / mcqCount;
    else if (mcqCount > 0 && essayCount > 0) mcqPt = (10 - templateConfig.essayPoints.reduce((a, b) => a + (Number(b)||0), 0)) / mcqCount;
    
    const newPoints = {};
    for (let i = 0; i < mcqCount; i++) {
        const tempId = `mcq_${Date.now()}_${i}`;
        generatedSlots.push({ tempId, type: "multiple_choice", content: "", videoUrl: "", videoFile: null, videoPreviewUrl: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", essayAnswerText: "" });
        newPoints[tempId] = mcqPt; 
    }
    for (let i = 0; i < essayCount; i++) {
        const tempId = `essay_${Date.now()}_${i}`;
        generatedSlots.push({ tempId, type: "essay", content: "", videoUrl: "", videoFile: null, videoPreviewUrl: "", options: [], correctAnswer: "", difficulty: "medium", essayAnswerText: "" });
        newPoints[tempId] = Number(templateConfig.essayPoints[i]) || 0; 
    }
    setManualQuestions(generatedSlots);
    setQuestionPoints(newPoints);
    setCreationMethod("manual");
  };

  const recalculatePoints = (questionsArr, currentPoints) => {
    let updatedPoints = { ...currentPoints };
    const mcqs = questionsArr.filter(q => q.type === "multiple_choice");
    const essays = questionsArr.filter(q => q.type === "essay");
    if (mcqs.length > 0) {
        const totalEssay = essays.reduce((sum, q) => sum + (updatedPoints[q.tempId] || 0), 0);
        const mcqPt = (10 - totalEssay) > 0 ? (10 - totalEssay) / mcqs.length : 0;
        mcqs.forEach(q => { updatedPoints[q.tempId] = mcqPt; });
    }
    setQuestionPoints(updatedPoints);
  };

  const handleEssayPointChange = (qId, value) => {
    const valNum = Number(value) || 0;
    const newPoints = { ...questionPoints, [qId] : valNum };
    recalculatePoints(manualQuestions, newPoints);
  };

  const totalPoints = Object.values(questionPoints).reduce((sum, p) => sum + (Number(p) || 0), 0);
  const roundedTotal = Math.round(totalPoints * 100) / 100; 
  const isPointsValid = roundedTotal === 10; 

  const fillEmptySlots = (importedQs) => {
    let newManuals = [...manualQuestions];
    let updatedPoints = { ...questionPoints };
    let filledCount = 0;
    let duplicateCount = 0;
    let skippedFullCount = 0; 
    
    const stripHtml = (html) => {
      let tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    };

    const existingContents = new Set(newManuals.map(q => stripHtml(q.content).trim().toLowerCase()).filter(c => c !== ""));

    for (let i = 0; i < importedQs.length; i++) {
      const impQ = importedQs[i];
      const normalizedContent = stripHtml(impQ.content).trim().toLowerCase();

      if (existingContents.has(normalizedContent)) {
          duplicateCount++; continue; 
      }

      let targetSlotIndex = newManuals.findIndex(slot => slot.type === impQ.type && stripHtml(slot.content).trim() === "");

      if (targetSlotIndex !== -1) {
          let parsedOptions = [];
          if (Array.isArray(impQ.options) && impQ.options.length > 0) {
              parsedOptions = impQ.options;
          }
          
          let correctKey = impQ.correctAnswer || "A";

          const payloadToInject = {
            content: impQ.content || "",
            videoUrl: impQ.videoUrl || "",
            videoFile: null, videoPreviewUrl: "",
            options: impQ.type === 'multiple_choice' ? parsedOptions : [],
            correctAnswer: correctKey,
            difficulty: impQ.difficulty || "medium",
            essayAnswerText: impQ.essayAnswerText || "",
          };

          existingContents.add(normalizedContent);
          newManuals[targetSlotIndex] = { ...newManuals[targetSlotIndex], ...payloadToInject };
          filledCount++;
      } else {
          skippedFullCount++;
      }
    }

    setManualQuestions(newManuals);
    setQuestionPoints(updatedPoints);
    recalculatePoints(newManuals, updatedPoints); 
    
    let alertMsg = `✅ Đã rót thành công ${filledCount} câu vào Khung.`;
    if (duplicateCount > 0) alertMsg += `\n⚠️ Bỏ qua ${duplicateCount} câu do đã bị trùng lặp nội dung.`;
    if (skippedFullCount > 0) alertMsg += `\n❌ Bỏ qua ${skippedFullCount} câu do số lượng Khung trực tiếp đã đầy (hoặc không khớp loại).`;
    
    alert(alertMsg);
  };

  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAssignmentFile(file);
  };

  const handleExtractWord = async () => {
    if (!assignmentFile) return alert("Vui lòng chọn file Word trước!");
    setLoading(true);
    try {
      const { text, questions } = await processWordFile(assignmentFile, true);
      setRawExtractedText(text); 
      setExtractedQuestions(questions); 
      setIsReviewingExtraction(true); 
    } catch (error) { 
      alert("Lỗi bóc tách file Word. Vui lòng thử lại!"); 
    } finally {
      setLoading(false);
    }
  };

  const handleReuploadAndExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAssignmentFile(file);
    setLoading(true);
    try {
      const { text, questions } = await processWordFile(file, true);
      setRawExtractedText(text); 
      setExtractedQuestions(questions); 
    } catch (error) { 
      alert("Lỗi bóc tách. Vui lòng thử lại!"); 
    } finally {
      setLoading(false);
    }
  };

  const reparseTextToSlots = (text) => {
    const parsedQs = extractQuestionsFromText(text, true);
    setExtractedQuestions(parsedQs);
  };

  const handleCommitExtraction = () => {
    fillEmptySlots(extractedQuestions); 
    setIsReviewingExtraction(false);
    setAssignmentFile(null); 
    setCreationMethod("manual"); 
  };

  const handleExtractedChange = (tempId, field, value) => {
    setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  };
  const handleExtractedOptionChange = (tempId, optionIndex, value) => {
    setExtractedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };
  
  const handleAddExtractedOption = (tempId) => {
    setExtractedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, options: [...q.options, ""] } : q));
  };
  const handleRemoveExtractedOption = (tempId, optIndex) => {
    setExtractedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId && q.options.length > 2) {
        const newOpts = q.options.filter((_, i) => i !== optIndex);
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const handleManualChange = (tempId, field, value) => setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  const handleManualOptionChange = (tempId, optionIndex, value) => setManualQuestions(manualQuestions.map(q => { if (q.tempId === tempId) { const newOptions = [...q.options]; newOptions[optionIndex] = value; return { ...q, options: newOptions }; } return q; }));
  
  const handleAddManualOption = (tempId) => {
    setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, options: [...q.options, ""] } : q));
  };
  const handleRemoveManualOption = (tempId, optIndex) => {
    setManualQuestions(manualQuestions.map(q => {
      if (q.tempId === tempId && q.options.length > 2) {
        const newOpts = q.options.filter((_, i) => i !== optIndex);
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const handleAddSlot = (type) => {
    const tempId = `${type}_${Date.now()}`;
    const newSlot = { tempId, type, content: "", videoUrl: "", videoFile: null, videoPreviewUrl: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", essayAnswerText: "" };
    const updatedQuestions = [...manualQuestions, newSlot];
    const updatedPoints = { ...questionPoints, [tempId]: 0 }; 
    setManualQuestions(updatedQuestions);
    recalculatePoints(updatedQuestions, updatedPoints);
  };
  
  const handleDeleteSlot = (tempId) => {
    if (!window.confirm("XÓA HOÀN TOÀN khung này khỏi đề thi?")) return;
    const updatedQuestions = manualQuestions.filter(q => q.tempId !== tempId);
    const updatedPoints = { ...questionPoints };
    delete updatedPoints[tempId];
    setManualQuestions(updatedQuestions);
    recalculatePoints(updatedQuestions, updatedPoints);
  };

  const handleClearSlot = (tempId) => { 
    if(!window.confirm("Xóa nội dung khung này?")) return; 
    setManualQuestions(manualQuestions.map(q => { 
      if (q.tempId === tempId) { 
        return { ...q, content: "", videoUrl: "", videoFile: null, videoPreviewUrl: "", options: ["", "", "", ""], essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "", existingEssayAnswerImageUrl: "", _id: undefined }; 
      } 
      return q; 
    })); 
  };
  
  const handleManualVideoChange = (tempId, e) => {
    const file = e.target.files[0];
    if (file) {
      setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: file, videoPreviewUrl: URL.createObjectURL(file) } : q));
    }
  };
  const handleRemoveManualVideo = (tempId) => {
    setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: null, videoPreviewUrl: "", videoUrl: "" } : q));
  };
  const handleExtractedVideoChange = (tempId, e) => {
    const file = e.target.files[0];
    if (file) {
      setExtractedQuestions(extractedQuestions.map(q => q.tempId === tempId ? { ...q, videoFile: file, videoPreviewUrl: URL.createObjectURL(file) } : q));
    }
  };

  const handleSubmit = async (actionType) => {
    if (!newAssignment.title) return alert("Vui lòng nhập Tên bài tập / Đề thi trước khi lưu!");
    if (!newAssignment.targetClass) return alert("Vui lòng chọn lớp để giao bài!");
    
    let finalStartDate = new Date(`${newAssignment.startDate_date}T${newAssignment.startDate_time}:00`);
    let finalDueDate = new Date(`${newAssignment.dueDate_date}T${newAssignment.dueDate_time}:00`);
    
    if (actionType === 'published') {
      if (!isPointsValid) {
        return alert(`Tổng điểm hiện tại là ${roundedTotal.toFixed(2)}. Bạn bắt buộc phải chia điểm sao cho bằng đúng 10.00 mới được PHÁT HÀNH!`);
      }
      
      const hasUglyPoints = Object.values(questionPoints).some(p => isUglyDecimal(p));
      if (hasUglyPoints) {
        return alert("KHÔNG THỂ TẠO BÀI TẬP: Đề thi đang có câu hỏi chứa điểm bị lẻ. Vui lòng điều chỉnh lại số lượng câu hoặc điểm để tạo bài tập !");
      }
      
      if (hasPassword && (!newAssignment.password || newAssignment.password.trim() === "")) {
         return alert("Bạn đã chọn Yêu cầu Mật khẩu nhưng chưa nhập mật khẩu! Vui lòng nhập mật khẩu hoặc tắt tính năng này.");
      }

      const durationMs = (parseInt(newAssignment.duration) || 0) * 60 * 1000;
      if (finalDueDate.getTime() < finalStartDate.getTime() + durationMs) {
          const minDueTimeStr = new Date(finalStartDate.getTime() + durationMs).toLocaleString('vi-VN');
          return alert(`LỖI THỜI GIAN:\nHạn nộp bài phải nằm sau thời gian làm bài kết thúc!\n\nThời gian mở đề: ${finalStartDate.toLocaleString('vi-VN')}\nThời lượng: ${newAssignment.duration} phút\n👉 Hạn nộp TỐI THIỂU phải được đặt từ: ${minDueTimeStr} trở đi.`);
      }

      let questionsValid = true;
      for (let i = 0; i < manualQuestions.length; i++) {
        let q = manualQuestions[i];
        let textContent = q.content ? q.content.replace(/<[^>]*>/g, '').trim() : "";

        if (!textContent) {
          if (q.imageFile || q.existingImageUrl || q.videoFile || q.videoUrl || q.content.includes('<img')) {
            // Hợp lệ do có hình/video đính kèm
          } else {
            alert(`LỖI LƯU BÀI: Câu số ${i + 1} đang bị bỏ trống nội dung đề bài! Vui lòng gõ chữ hoặc tải file đính kèm trước khi lưu.`);
            questionsValid = false;
            break;
          }
        }

        if (q.type === 'multiple_choice') {
          const hasEmptyOption = q.options.some(opt => !opt || opt.replace(/<[^>]*>/g, '').trim() === "");
          if (hasEmptyOption) {
            alert(`LỖI LƯU BÀI: Câu trắc nghiệm số ${i + 1} đang có đáp án bị trống. Vui lòng điền đủ!`);
            questionsValid = false;
            break;
          }
        }
      }
      if (!questionsValid) return;
    }

    const finalStartDateISO = finalStartDate.toISOString();
    const finalDueDateISO = finalDueDate.toISOString();

    const updatedManualQuestions = [...manualQuestions];

    for (let i = 0; i < updatedManualQuestions.length; i++) {
      let q = updatedManualQuestions[i];
      let textContent = q.content ? q.content.replace(/<[^>]*>/g, '').trim() : "";

      if (!textContent && (q.imageFile || q.existingImageUrl || q.videoFile || q.videoUrl || q.content.includes('<img'))) {
        q.content = "<p><i>(Dựa vào dữ liệu đính kèm bên dưới để trả lời câu hỏi)</i></p>" + q.content;
      }
    }

    setManualQuestions(updatedManualQuestions);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", newAssignment.title); 
      formData.append("targetClass", newAssignment.targetClass); 
      formData.append("subject", newAssignment.subject); 
      formData.append("duration", newAssignment.duration); 
      formData.append("semester", newAssignment.semester); 
      formData.append("assignmentType", newAssignment.assignmentType); 
      formData.append("startDate", finalStartDateISO);
      formData.append("dueDate", finalDueDateISO);
      formData.append("status", actionType); 
      formData.append("allowMultipleSubmissions", newAssignment.allowMultipleSubmissions);

      if (hasPassword && newAssignment.password.trim() !== "") {
          formData.append("password", newAssignment.password.trim());
      } else {
          formData.append("password", ""); 
      }
      
      const questionsToSave = updatedManualQuestions.map(q => ({
          _id: q._id, 
          tempId: q.tempId, 
          content: q.content, 
          videoUrl: q.videoUrl || "", 
          type: q.type, 
          options: q.options, 
          correctAnswer: q.correctAnswer, 
          difficulty: q.difficulty, 
          subject: newAssignment.subject,
          semester: newAssignment.semester,
          points: questionPoints[q.tempId] || 0, 
          essayAnswerText: q.essayAnswerText || "",
          existingEssayAnswerImageUrl: q.existingEssayAnswerImageUrl || "" 
      }));
      formData.append("questionsData", JSON.stringify(questionsToSave));

      updatedManualQuestions.forEach(q => { 
          if (q.essayAnswerImageFile) formData.append(`essayImage_${q.tempId}`, q.essayAnswerImageFile);
          if (q.videoFile) formData.append(`video_${q.tempId}`, q.videoFile); 
      });
      
      if (id) await axios.put(`/assignments/update/${id}`, formData, getHeader(true));
      else await axios.post("/assignments/create-manual", formData, getHeader(true));

      if (actionType === 'draft') alert("💾 Đã lưu nháp bài tập thành công!"); else alert("✅ Giao bài thành công!");
      navigate("/teacher-dashboard");
    } catch (err) { alert("Lỗi xử lý! Vui lòng thử lại."); } finally { setLoading(false); }
  };

  const availableExams = [...new Set(questions.filter(q => (bankSubject === "all" || q.subject === bankSubject)).map(q => q.examName).filter(Boolean))];

  const filteredBankQuestions = questions.filter(q => {
    const matchSearch = (q.content || "").toLowerCase().includes(bankSearch.toLowerCase());
    const matchSubject = bankSubject === "all" || q.subject === bankSubject;
    const matchGrade = bankGrade === "all" || String(q.grade) === bankGrade;
    
    let matchSemester = false;
    const qSem = String(q.semester || "1");
    if (bankSemester === "all") {
       matchSemester = true;
    } else if (bankSemester === "Cả năm") {
       matchSemester = ["1", "2", "Cả năm"].includes(qSem);
    } else {
       matchSemester = qSem === bankSemester;
    }

    const matchType = bankType === "all" || q.type === bankType;
    const matchExam = bankExam === "all" || q.examName === bankExam;
    
    return matchSearch && matchSubject && matchGrade && matchSemester && matchType && matchExam;
  });

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredBankQuestions.map(q => q._id);
    const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => bankSelected.includes(id));
    
    if (isAllSelected) {
        setBankSelected(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
        const newSelected = [...new Set([...bankSelected, ...filteredIds])];
        setBankSelected(newSelected);
    }
  };

  const isAllFilteredSelected = filteredBankQuestions.length > 0 && filteredBankQuestions.every(q => bankSelected.includes(q._id));

  const toggleBankSelection = (qId) => {
    setBankSelected(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const handleImportFromBankToManual = () => {
    if (bankSelected.length === 0) return alert("Vui lòng tích chọn ít nhất 1 câu hỏi từ Kho!");
    const selectedQs = questions.filter(q => bankSelected.includes(q._id));
    fillEmptySlots(selectedQs);
    setCreationMethod("manual");
  };

  const handleOpenViewQuestion = (e, q) => { e.stopPropagation(); setViewQuestion(q); };

  return (
    <div className="min-h-screen bg-sky-50/40 p-4 sm:p-6 md:p-10 font-sans text-slate-800 relative">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/teacher-dashboard")} className="text-sky-600 hover:text-sky-700 hover:bg-sky-100 font-bold px-3 py-2 sm:px-0 mb-4 sm:mb-6 h-auto w-max"><ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Hủy & Quay lại</Button>

        {manualQuestions.length > 0 && creationMethod === "manual" && (
          <div className="sticky top-4 z-30 mb-6 transition-all">
            <Card className={`border-none shadow-lg ${isPointsValid ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6" />
                  <div>
                    <p className="font-black text-lg">Tổng điểm: {roundedTotal.toFixed(2)} / 10.00</p>
                    {!isPointsValid && <p className="text-sm font-medium mt-1">{roundedTotal < 10 ? `⚠️ Còn thiếu ${(10 - roundedTotal).toFixed(2)} điểm. Hãy điều chỉnh điểm Tự luận!` : `⚠️ Đang thừa ${(roundedTotal - 10).toFixed(2)} điểm. Hãy điều chỉnh điểm Tự luận!`}</p>}
                  </div>
                </div>
                <Progress value={Math.min((roundedTotal / 10) * 100, 100)} className="w-full sm:w-48 h-3 bg-white/30 [&>div]:bg-white" />
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden mb-10">
          <CardHeader className="bg-sky-500 text-white p-6 sm:p-8 border-b border-sky-600">
            <CardTitle className="text-2xl sm:text-3xl font-black">
               {id ? "Chỉnh sửa Bản nháp" : currentAssignmentType === "exam" ? "Tạo Đề Kiểm Tra Mới" : "Giao Bài Tập Về Nhà Mới"}
            </CardTitle>
            <p className="text-sky-100 font-medium mt-2 text-sm sm:text-base">Thiết lập thông số và cấu trúc để giao bài cho học sinh.</p>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-8">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-black text-sky-900 border-b border-sky-100 pb-2">1. Thông tin chung</h3>
                <Input placeholder={currentAssignmentType === "exam" ? "Nhập tên đề kiểm tra..." : "Nhập tên bài tập..."} className="h-12 sm:h-14 rounded-xl bg-slate-50 font-bold text-base sm:text-lg border-sky-100 focus-visible:ring-sky-500" value={newAssignment.title} onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})} required />
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Giao cho Lớp</label>
                    <Select value={newAssignment.targetClass || ""} onValueChange={(val) => setNewAssignment({...newAssignment, targetClass: val})} required>
                      <SelectTrigger className="h-11 sm:h-12 px-4 rounded-xl bg-slate-50 font-bold border-sky-100 w-full text-slate-700 [&>span]:truncate">
                        <SelectValue placeholder="Chọn Lớp" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                        {!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (
                          <SelectItem value="none" disabled>Chưa có lớp</SelectItem>
                        ) : (
                          teacherProfile.assignedClasses.map(c => <SelectItem key={c._id || c} value={c.name}>{c.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Môn học</label>
                      <Select value={newAssignment.subject} onValueChange={(val) => setNewAssignment({...newAssignment, subject: val})}>
                        <SelectTrigger className="h-11 sm:h-12 px-4 rounded-xl bg-slate-50 font-bold border-sky-100 text-sky-700 w-full [&>span]:truncate">
                          <SelectValue placeholder="Chọn môn" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                          {teacherSubjects.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                          {teacherSubjects.length === 0 && <SelectItem value="none" disabled>Chưa phân môn</SelectItem>}
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Học kỳ</label>
                      <Select value={newAssignment.semester} onValueChange={(val) => setNewAssignment({...newAssignment, semester: val})}>
                        <SelectTrigger className="h-11 sm:h-12 px-4 rounded-xl bg-slate-50 font-bold border-sky-100 text-sky-700 w-full [&>span]:truncate">
                          <SelectValue placeholder="Chọn Học kỳ" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="bg-white">
                          <SelectItem value="1">Học kỳ 1</SelectItem>
                          <SelectItem value="2">Học kỳ 2</SelectItem>
                          <SelectItem value="Cả năm">Cả năm</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Thời gian làm bài (Phút)</label>
                      <Input type="number" placeholder="VD: 45" className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-50 border-sky-100 font-bold text-sky-700 focus-visible:ring-sky-500" value={newAssignment.duration} onChange={(e) => setNewAssignment({...newAssignment, duration: e.target.value})} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                   <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-600 block">Ngày Mở đề (Bắt đầu)</label>
                      <div className="flex gap-2 relative">
                          <div className="flex-1">
                            <CustomDateInput 
                               value={newAssignment.startDate_date}
                               min={getCurrentDate()}
                               onChange={(val) => {
                                  if(!val) return;
                                  setNewAssignment(prev => {
                                      const newDueDate = (val > prev.dueDate_date) ? val : prev.dueDate_date;
                                      return { ...prev, startDate_date: val, dueDate_date: newDueDate };
                                  });
                               }}
                            />
                          </div>
                          <Input type="time" className="w-[120px] h-11 sm:h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700 shadow-sm relative z-10" value={newAssignment.startDate_time} onChange={(e) => setNewAssignment({...newAssignment, startDate_time: e.target.value})} required />
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-600 block">Ngày Đóng đề (Hạn nộp)</label>
                      <div className="flex gap-2">
                          <div className="flex-1">
                             <CustomDateInput 
                               value={newAssignment.dueDate_date}
                               min={newAssignment.startDate_date || getCurrentDate()}
                               onChange={(val) => {
                                  if(!val) return;
                                  setNewAssignment({...newAssignment, dueDate_date: val});
                               }}
                             />
                          </div>
                          <Input type="time" className="w-[120px] h-11 sm:h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700 shadow-sm relative z-10" value={newAssignment.dueDate_time} onChange={(e) => setNewAssignment({...newAssignment, dueDate_time: e.target.value})} required />
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 mt-2 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                     <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-sky-600" />
                            <label className="font-bold text-sky-900 cursor-pointer flex items-center select-none" onClick={() => setHasPassword(!hasPassword)}>
                               <input type="checkbox" className="mr-2 w-4 h-4 accent-sky-500 cursor-pointer" checked={hasPassword} onChange={() => setHasPassword(!hasPassword)} />
                               Yêu cầu Mật khẩu làm bài (Tùy chọn)
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 pl-7">Nếu tích chọn, học sinh phải nhập đúng mật khẩu mới xem được đề.</p>
                     </div>
                     
                     {hasPassword && (
                        <div className="relative w-full sm:w-[280px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Input 
                               type={showPassword ? "text" : "password"} 
                               placeholder="Nhập mật khẩu cho bài thi..." 
                               className="h-11 rounded-xl border-sky-300 focus-visible:ring-sky-500 font-bold text-sky-700 bg-white pr-10"
                               value={newAssignment.password}
                               onChange={(e) => setNewAssignment({...newAssignment, password: e.target.value})}
                               autoFocus
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600">
                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                            </button>
                        </div>
                     )}
                  </div>

                  {currentAssignmentType === "homework" && (
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center animate-in fade-in">
                       <div className="flex-1">
                          <div className="flex items-center gap-2">
                              <RotateCcw className="w-5 h-5 text-emerald-600" />
                              <label className="font-bold text-emerald-900 cursor-pointer flex items-center select-none" onClick={() => setNewAssignment({...newAssignment, allowMultipleSubmissions: !newAssignment.allowMultipleSubmissions})}>
                                 <input type="checkbox" className="mr-2 w-4 h-4 accent-emerald-500 cursor-pointer" checked={newAssignment.allowMultipleSubmissions} onChange={() => setNewAssignment({...newAssignment, allowMultipleSubmissions: !newAssignment.allowMultipleSubmissions})} />
                                 Cho phép học sinh làm bài nhiều lần
                              </label>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 pl-7">Học sinh có thể nộp lại bài trước hạn chót. Hệ thống sẽ lưu lại bài làm của lần nộp cuối cùng.</p>
                       </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="border-t border-sky-100 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg sm:text-xl font-black text-sky-900">2. Cấu trúc {currentAssignmentType === "exam" ? "Đề thi" : "Bài tập"}</h3>
                   {manualQuestions.length > 0 && !id && (
                     <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 h-9 font-bold" onClick={() => {
                        if(window.confirm("Các câu hỏi đã điền sẽ bị xóa sạch. Bạn có chắc chắn muốn làm lại cấu trúc?")) {
                           setManualQuestions([]);
                           setTemplateConfig({ mcqCount:0, essayCount:0, essayPoints:[] });
                        }
                     }}>
                        <Eraser className="w-4 h-4 mr-2"/> Xóa & Làm lại
                     </Button>
                   )}
                </div>

                {manualQuestions.length === 0 && (
                  <div className="p-5 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="font-bold text-slate-700 flex items-center gap-2"><ListChecks className="w-4 h-4 text-sky-500"/> Số lượng câu Trắc nghiệm</label>
                               <Input type="number" min="0" value={templateConfig.mcqCount} onChange={(e) => setTemplateConfig({...templateConfig, mcqCount: e.target.value})} className="h-12 rounded-xl border-slate-200 font-bold text-lg bg-slate-50 focus-visible:ring-sky-500" />
                            </div>
                            <div className="space-y-2">
                               <label className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500"/> Số lượng câu Tự luận</label>
                               <Input type="number" min="0" value={templateConfig.essayCount} onChange={handleEssayCountChange} className="h-12 rounded-xl border-slate-200 font-bold text-lg bg-slate-50 focus-visible:ring-emerald-500" />
                            </div>
                         </div>

                         {Number(templateConfig.essayCount) > 0 && (
                           <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 animate-in fade-in">
                             <label className="font-bold text-indigo-700 flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-500"/> Điểm chi tiết cho TỪNG câu Tự luận</label>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                               {templateConfig.essayPoints.map((pt, idx) => (
                                 <div key={idx} className="flex flex-col gap-1">
                                   <span className="text-xs font-bold text-slate-500">Câu {idx + 1}</span>
                                   <Input type="number" step="0.25" min="0" value={pt} onChange={(e) => { const newPts = [...templateConfig.essayPoints]; newPts[idx] = e.target.value; setTemplateConfig({...templateConfig, essayPoints: newPts}); }} className="h-10 rounded-lg border-indigo-200 font-bold bg-indigo-50 text-indigo-900 focus-visible:ring-indigo-500" />
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                      </div>
                      
                      <div className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${pointStatus.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                         {pointStatus.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />}
                         <p className={`font-bold text-sm ${pointStatus.valid ? 'text-emerald-800' : 'text-rose-800'}`}>{pointStatus.msg}</p>
                      </div>
                      
                      <Button type="button" onClick={handleGenerateSlots} className="w-full mt-6 h-14 bg-sky-500 hover:bg-sky-600 text-white font-black text-lg rounded-xl shadow-md transition-transform active:scale-95">
                         TẠO SẴN KHUNG ĐỀ BÀI
                      </Button>
                  </div>
                )}

                {manualQuestions.length > 0 && (
                   <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                         <div>
                            <p className="font-bold text-emerald-800">Đã thiết lập <strong className="text-emerald-600">{manualQuestions.length}</strong> khung câu hỏi.</p>
                            <p className="text-xs text-emerald-600 font-medium">Kéo xuống dưới để điền nội dung.</p>
                         </div>
                      </div>
                   </div>
                )}
              </div>

              {manualQuestions.length > 0 && (
                <div className="border-t border-sky-100 pt-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-lg sm:text-xl font-black text-sky-900 mb-4">3. Nội dung chi tiết</h3>

                  <div className="flex bg-slate-100 rounded-xl w-full p-1 overflow-x-auto no-scrollbar mb-6 gap-1">
                    <button type="button" onClick={() => setCreationMethod("manual")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${(creationMethod === 'manual' || creationMethod === 'smart_extract') ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><PenTool className="w-4 h-4 shrink-0"/> Xem khung Trực tiếp</button>
                    <button type="button" onClick={() => setCreationMethod("upload")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${creationMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><FileText className="w-4 h-4 shrink-0"/> Bóc tách từ Word</button>
                    <button type="button" onClick={() => setCreationMethod("bank")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${creationMethod === 'bank' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><Database className="w-4 h-4 shrink-0"/> Rót từ Kho</button>
                  </div>

                  {creationMethod === "upload" && (
                    <div className="border border-sky-100 bg-sky-50/30 rounded-2xl p-3 sm:p-4 md:p-6 space-y-4">
                      {!isReviewingExtraction ? (
                         <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-100 shadow-sm text-center">
                            <h4 className="font-bold text-sky-900 text-base sm:text-lg mb-1 sm:mb-2">Bóc tách tự động</h4>
                            <p className="text-slate-500 text-xs sm:text-sm mb-4">Hệ thống sẽ bóc tách văn bản thô từ Word. Sau đó bạn có thể rà soát lại trước khi rót vào Form trực tiếp.</p>
                            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setAssignmentFile(f);}} onClick={() => assignmentFileRef.current.click()} className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 max-w-lg mx-auto ${assignmentFile ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-400 bg-slate-50/50'}`}>
                              <input type="file" ref={assignmentFileRef} onChange={handleAssignmentFileChange} className="hidden" accept=".doc,.docx" />
                              {assignmentFile ? (<><FileText className="h-8 w-8 text-indigo-600 mb-2" /><p className="font-black text-indigo-900 text-base line-clamp-1">{assignmentFile.name}</p><p className="text-xs text-indigo-600 mt-1">Click để chọn file khác</p></>) : (<><UploadCloud className="h-8 w-8 text-indigo-400 mb-2" /><p className="font-bold text-slate-700">Nhấn hoặc Kéo thả file vào đây</p></>)}
                            </div>
                            {assignmentFile && <Button type="button" onClick={handleExtractWord} disabled={loading} className="mt-4 sm:mt-6 w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white font-bold h-11 sm:h-12 px-6 sm:px-8 rounded-xl shadow-md">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2" />} Bắt đầu bóc tách văn bản</Button>}
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
                                  <Button size="sm" variant="outline" className="h-8 text-sky-600 border-sky-300 hover:bg-sky-50 font-bold shadow-sm" onClick={() => {
                                      reparseTextToSlots(rawExtractedText);
                                  }}>
                                    <Sparkles className="w-3.5 h-3.5 mr-1"/> Rót lại Text
                                  </Button>
                                </div>
                              </div>
                              <textarea 
                                value={rawExtractedText} 
                                onChange={(e) => setRawExtractedText(e.target.value)}
                                className="w-full h-[600px] p-4 rounded-b-xl border border-slate-200 font-mono text-sm leading-relaxed bg-white shadow-inner resize-none focus-visible:ring-sky-500 outline-none"
                                placeholder="Nội dung file Word sẽ hiển thị ở đây..."
                              />
                           </div>

                           <div className="w-full lg:w-3/5 space-y-4 sm:space-y-6">
                              <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-sky-800 uppercase">Xem trước & Chỉnh sửa ({extractedQuestions.length} câu)</span>
                                <Button type="button" onClick={() => setExtractedQuestions([...extractedQuestions, { tempId: `ext_new_${Date.now()}`, type: "multiple_choice", content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium" }])} size="sm" variant="outline" className="h-8 bg-white rounded-lg"><PlusCircle className="w-4 h-4 mr-1"/> Thêm câu</Button>
                              </div>

                              {extractedQuestions.map((q, index) => (
                                  <Card key={q.tempId} className="border-sky-200 shadow-sm relative overflow-visible transition-all">
                                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                                      <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                        <CardTitle className="text-base font-black text-slate-700 flex items-center gap-2">
                                          Câu {index + 1} 
                                          <Badge variant="outline" className="text-[10px] ml-2 bg-white text-slate-500 rounded-md">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                        </CardTitle>
                                        <Button type="button" onClick={() => setExtractedQuestions(extractedQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                                      </CardHeader>
                                      <CardContent className="p-4 space-y-4 bg-white">
                                        <div className="flex flex-col">
                                            <RichTextEditor placeholder="Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC TOÁN..." value={q.content} onChange={(val) => handleExtractedChange(q.tempId, 'content', val)} />
                                            
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
                                                                      <iframe 
                                                                         className="w-full h-full relative z-10" 
                                                                         src={getDriveEmbedUrl(q.videoUrl)} 
                                                                         allow="autoplay; fullscreen; encrypted-media" 
                                                                         allowFullScreen
                                                                         referrerPolicy="no-referrer"
                                                                         sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                                      ></iframe>
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
                                        
                                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                                          <h4 className="text-sm font-bold text-emerald-700 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Hướng dẫn giải</h4>
                                          <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleExtractedChange(q.tempId, 'essayAnswerText', val)} />
                                        </div>

                                        {q.type === 'multiple_choice' && (
                                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mt-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              {q.options.map((opt, i) => {
                                                const letter = String.fromCharCode(65 + i);
                                                return (
                                                <div key={i} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base mt-2">{letter}.</span>
                                                      <div className="flex-1 flex items-center gap-2">
                                                        <Input className={`h-11 rounded-xl bg-white text-sm sm:text-base ${isSlotEmpty ? 'border-dashed border-slate-300' : 'border-sky-100'}`} value={q.options[i]} onChange={(e) => handleExtractedOptionChange(q.tempId, i, e.target.value)} />
                                                        <Button type="button" variant="outline" onClick={() => setMathModal({ isOpen: true, targetTempId: q.tempId, targetOptionIndex: i, isExtracted: true, isEditing: false })} className="h-11 px-3 border-sky-200 text-sky-600 hover:bg-sky-50 shrink-0 rounded-xl" title="Mở bàn phím gõ Phân số / Toán học"><Sigma className="w-5 h-5"/></Button>
                                                      </div>
                                                      {q.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExtractedOption(q.tempId, i)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0 mt-1.5"><Trash2 className="w-4 h-4"/></Button>}
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
                              ))}

                              <Button type="button" onClick={handleCommitExtraction} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all mt-4">
                                  XÁC NHẬN RÓT VÀO KHUNG TRỰC TIẾP <ArrowRight className="ml-2 w-5 h-5"/>
                              </Button>
                           </div>
                         </div>
                      )}
                    </div>
                  )}

                  {/* BỘ LỌC TỪ KHO CÂU HỎI */}
                  {creationMethod === "bank" && (
                    <div className="border border-sky-200 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
                      <div className="bg-sky-50 px-3 sm:px-4 py-4 flex flex-col space-y-4 border-b border-sky-100">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <span className="font-bold text-sky-800 flex items-center text-sm sm:text-base"><Database className="w-4 h-4 mr-2 shrink-0"/> Chọn câu hỏi từ hệ thống</span>
                          <div className="flex gap-2">
                            <Button type="button" onClick={handleImportFromBankToManual} variant="outline" className="h-9 border-sky-300 text-sky-700 hover:bg-sky-100 font-bold px-3 shadow-sm text-xs sm:text-sm"><PenTool className="w-3.5 h-3.5 mr-1.5" /> Rót vào khung trực tiếp</Button>
                            <Badge className="bg-sky-500 font-bold px-3 py-1 text-white flex items-center h-9">Đã chọn: {bankSelected.length}</Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Select value={bankType || "all"} onValueChange={(val) => {setBankType(val); if(val !== 'essay') setBankPoints("");}}>
                             <SelectTrigger className="h-10 w-[140px] bg-white border-sky-200 font-bold text-sky-700">
                               <span className="truncate">
                                 {bankType === 'all' ? 'Tất cả loại' : bankType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                               </span>
                             </SelectTrigger>
                             <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                               <SelectItem value="all">Tất cả loại</SelectItem>
                               <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                               <SelectItem value="essay">Tự luận</SelectItem>
                             </SelectContent>
                          </Select>

                          <Select value={bankGrade} onValueChange={setBankGrade} disabled={allowedGrades.length === 1 && allowedGrades[0] !== "all"}>
                            <SelectTrigger className="h-10 w-[120px] bg-white border-sky-200 font-bold text-sky-700 disabled:opacity-50">
                              <span className="truncate">{bankGrade === 'all' ? 'Tất cả Khối' : `Khối ${bankGrade}`}</span>
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                              {allowedGrades.length > 1 && <SelectItem value="all">Tất cả Khối</SelectItem>}
                              {allowedGrades.map(g => g !== "all" && <SelectItem key={g} value={g}>Khối {g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          
                          <Select value={bankSubject} onValueChange={setBankSubject} disabled={allowedSubjects.length === 1}>
                            <SelectTrigger className="h-10 w-[160px] bg-white border-sky-200 font-bold text-sky-700 disabled:opacity-50">
                              <span className="truncate">{bankSubject === 'all' ? 'Tất cả môn' : `Môn: ${bankSubject}`}</span>
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                              {allowedSubjects.length > 1 && <SelectItem value="all">Tất cả môn</SelectItem>}
                              {allowedSubjects.map(sub => <SelectItem key={sub} value={sub}>Môn: {sub}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          
                          <Select value={bankSemester} onValueChange={setBankSemester} disabled={allowedSemesters.length === 1 && allowedSemesters[0] !== "all"}>
                            <SelectTrigger className="h-10 w-[150px] bg-white border-sky-200 font-bold text-sky-700 disabled:opacity-50">
                              <span className="truncate">{bankSemester === 'all' ? 'Tất cả Học kỳ' : bankSemester === 'Cả năm' ? 'Cả năm' : `Học kỳ ${bankSemester}`}</span>
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                              {allowedSemesters.length > 1 && <SelectItem value="all">Tất cả Học kỳ</SelectItem>}
                              {allowedSemesters.map(s => s !== "all" && <SelectItem key={s} value={s}>{s === 'Cả năm' ? 'Cả năm' : `Học kỳ ${s}`}</SelectItem>)}
                            </SelectContent>
                          </Select>

                          <Select value={bankExam || "all"} onValueChange={setBankExam}>
                            <SelectTrigger className="h-10 w-[160px] bg-white border-sky-200 font-bold text-sky-700">
                              <span className="truncate">{bankExam === 'all' ? 'Tất cả Tập câu hỏi' : bankExam}</span>
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="bg-white max-h-[300px]">
                              <SelectItem value="all">Tất cả Tập câu hỏi</SelectItem>
                              {availableExams.map((e, idx) => (<SelectItem key={idx} value={e}>{e}</SelectItem>))}
                            </SelectContent>
                          </Select>

                          {bankType === 'essay' && (<Input type="number" step="0.25" placeholder="Lọc điểm..." className="h-10 w-[110px] bg-white border-sky-200 text-sky-700 font-bold" value={bankPoints} onChange={(e) => setBankPoints(e.target.value)} />)}
                          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Tìm nội dung..." className="pl-9 h-10 bg-white border-sky-200" value={bankSearch} onChange={e => setBankSearch(e.target.value)} /></div>
                          
                          {filteredBankQuestions.length > 0 && (
                             <Button type="button" variant={isAllFilteredSelected ? "secondary" : "outline"} onClick={handleSelectAllFiltered} className={`h-10 font-bold ${isAllFilteredSelected ? 'bg-sky-100 text-sky-700' : 'border-sky-300 text-sky-600'}`}>
                               <ListChecks className="w-4 h-4 mr-2" />
                               {isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả đang lọc"}
                             </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto p-1 sm:p-2">
                        <div className="overflow-x-auto">
                          <Table className="min-w-[400px] w-full">
                            <TableBody>
                              {filteredBankQuestions.length === 0 ? (<TableRow><TableCell className="text-center py-10 text-slate-400 italic">Không tìm thấy câu hỏi phù hợp.</TableCell></TableRow>) : filteredBankQuestions.map((q) => {
                                const isSelected = bankSelected.includes(q._id);
                                return (
                                  <TableRow key={q._id} className={`${isSelected ? 'bg-sky-50' : ''} cursor-pointer hover:bg-sky-50/50`} onClick={() => toggleBankSelection(q._id)}>
                                    
                                    <TableCell className="w-10 sm:w-12 text-center align-top pt-4 sm:pt-3 shrink-0">
                                      <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 accent-sky-500 cursor-pointer" checked={isSelected} onChange={() => toggleBankSelection(q._id)} onClick={(e) => e.stopPropagation()} />
                                    </TableCell>

                                    <TableCell className="font-medium text-slate-700 text-sm sm:text-base py-3 max-w-[200px] sm:max-w-[400px] lg:max-w-[600px]">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-start gap-2">
                                          {q.imageUrl && <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 shrink-0 mt-0.5" />}
                                          
                                          <div className="line-clamp-2 leading-relaxed q-content-view break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: q.content }} />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px] font-bold truncate max-w-[120px]" title={q.examName || "Đề chung"}>📄 {q.examName || "Chưa có tập"}</Badge>
                                          <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 text-[10px]">Khối {q.grade}</Badge>
                                          <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-600 text-[10px]">HK {q.semester || "1"}</Badge>
                                          <Badge variant="outline" className="bg-sky-50 border-sky-100 text-sky-600 text-[10px]">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="text-right pr-2 sm:pr-4 align-top pt-3 w-14 shrink-0">
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-100 hover:text-sky-700 rounded-full" onClick={(e) => handleOpenViewQuestion(e, q)}>
                                        <Eye className="w-5 h-5" />
                                      </Button>
                                    </TableCell>

                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  {creationMethod === "manual" && (
                    <div className="w-full space-y-4 sm:space-y-6 mt-4">
                      {manualQuestions.map((q, index) => {
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
                                  <input type="number" step="0.25" min="0" className="w-12 sm:w-16 text-center font-black text-sky-600 focus:outline-none" value={questionPoints[q.tempId] === 0 ? "" : questionPoints[q.tempId]} placeholder="Nhập" onChange={(e) => handleEssayPointChange(q.tempId, e.target.value)} />
                                ) : (
                                  <input type="number" className="w-12 sm:w-16 text-center font-black text-slate-400 bg-transparent focus:outline-none cursor-not-allowed" value={(questionPoints[q.tempId] || 0).toFixed(2)} readOnly title="Điểm trắc nghiệm được chia tự động" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <Button type="button" onClick={() => handleClearSlot(q.tempId)} variant="ghost" size="icon" title="Xóa nội dung, làm trống khung" className="h-8 w-8 text-slate-400 hover:bg-amber-50 hover:text-amber-500"><Eraser className="w-4 h-4"/></Button>
                              <Button type="button" onClick={() => handleDeleteSlot(q.tempId)} variant="ghost" size="icon" title="Xóa hoàn toàn khung này" className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-4 h-4"/></Button>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="p-4 sm:p-5 space-y-4 relative z-10">
                            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                              <div className={`flex-1 transition-all ${isSlotEmpty ? 'border-dashed border-2 border-slate-300 rounded-xl p-1 bg-white' : ''}`}>
                                <RichTextEditor placeholder="Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC TOÁN..." value={q.content} onChange={(val) => handleManualChange(q.tempId, 'content', val)} />
                                
                                {!openMediaPanels[q.tempId] && !q.videoFile && !q.videoUrl && (
                                   <Button type="button" variant="ghost" size="sm" onClick={() => setOpenMediaPanels(prev => ({...prev, [q.tempId]: true}))} className="mt-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold self-start w-max">
                                      <Video className="w-4 h-4 mr-2" /> Thêm Video / Audio / Link
                                   </Button>
                                )}

                                {(openMediaPanels[q.tempId] || q.videoFile || q.videoUrl) && (
                                   <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative">
                                      <div className="flex justify-between items-center mb-3">
                                         <h4 className="text-sm font-bold text-indigo-700 flex items-center"><Video className="w-4 h-4 mr-2" /> Đính kèm Video / Audio / Link</h4>
                                         <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-100 rounded-full" title="Đóng và Xóa đính kèm" onClick={() => { setOpenMediaPanels(prev => ({...prev, [q.tempId]: false})); handleRemoveManualVideo(q.tempId); }}>
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
                                                          <iframe 
                                                             className="w-full h-full relative z-10" 
                                                             src={getDriveEmbedUrl(q.videoUrl)} 
                                                             allow="autoplay; fullscreen; encrypted-media" 
                                                             allowFullScreen
                                                             referrerPolicy="no-referrer"
                                                             sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                          ></iframe>
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
                                             <Input placeholder="Dán link YouTube / Google Drive vào đây..." value={q.videoUrl || ""} onChange={(e) => handleManualChange(q.tempId, 'videoUrl', e.target.value)} className="bg-white border-indigo-200 focus-visible:ring-indigo-400 font-medium" />
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
                                                <input type="file" className="hidden" accept="video/*,audio/*" onChange={(e) => handleManualVideoChange(q.tempId, e)} />
                                             </label>
                                          </div>
                                      )}
                                   </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                              <h4 className="text-sm font-bold text-emerald-700 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Hướng dẫn giải</h4>
                              <RichTextEditor value={q.essayAnswerText} onChange={(val) => handleManualChange(q.tempId, 'essayAnswerText', val)} />
                            </div>

                            {q.type === 'multiple_choice' && (
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((optLabel, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    return (
                                    <div key={optIdx} className="flex flex-col gap-1">
                                        <div className="flex items-start gap-2">
                                          <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base mt-2">{letter}.</span>
                                          <div className="flex-1 flex items-center gap-2">
                                            <Input className={`h-11 rounded-xl bg-white text-sm sm:text-base ${isSlotEmpty ? 'border-dashed border-slate-300' : 'border-sky-100'}`} value={q.options[optIdx]} onChange={(e) => handleManualOptionChange(q.tempId, optIdx, e.target.value)} placeholder={`Gõ đáp án ${letter}...`} />
                                            <Button type="button" variant="outline" onClick={() => setMathModal({ isOpen: true, targetTempId: q.tempId, targetOptionIndex: optIdx, isExtracted: false, isEditing: false })} className="h-11 px-3 border-sky-200 text-sky-600 hover:bg-sky-50 shrink-0 rounded-xl" title="Mở bàn phím gõ Phân số / Toán học"><Sigma className="w-5 h-5"/></Button>
                                          </div>
                                          {q.options.length > 2 && (
                                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveManualOption(q.tempId, optIdx)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0 mt-1.5"><Trash2 className="w-4 h-4"/></Button>
                                          )}
                                        </div>
                                    </div>
                                  )})}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-sky-100 mt-2">
                                  {/* Giới hạn tối đa 16 đáp án */}
                                  {q.options.length < 16 ? (
                                      <Button type="button" variant="ghost" size="sm" onClick={() => handleAddManualOption(q.tempId)} className="text-sky-600 hover:bg-sky-100"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                                  ) : <div className="text-xs text-rose-500 font-bold">Đã đạt tối đa 16 đáp án</div>}

                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-bold text-rose-600">ĐÁP ÁN ĐÚNG:</label>
                                    <Select value={q.correctAnswer || ""} onValueChange={(val) => handleManualChange(q.tempId, 'correctAnswer', val)}>
                                      <SelectTrigger className="h-10 w-28 bg-white text-rose-600 font-bold border-rose-200 rounded-xl [&>span]:truncate">
                                        <SelectValue placeholder="Chọn" />
                                      </SelectTrigger>
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
                      )})}
                      <div className="flex flex-col sm:flex-row gap-3 mt-6">
                         <Button type="button" onClick={() => handleAddSlot('multiple_choice')} variant="outline" className="flex-1 border-dashed border-2 border-sky-300 text-sky-600 hover:bg-sky-50 hover:border-sky-400 font-bold h-12 rounded-xl transition-all"><PlusCircle className="w-5 h-5 mr-2"/> Thêm câu Trắc nghiệm</Button>
                         <Button type="button" onClick={() => handleAddSlot('essay')} variant="outline" className="flex-1 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 font-bold h-12 rounded-xl transition-all"><PlusCircle className="w-5 h-5 mr-2"/> Thêm câu Tự luận</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NÚT PHÁT HÀNH \& LƯU NHÁP */}
              {manualQuestions.length > 0 && (
                <div className="pt-6 sm:pt-8 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button type="button" onClick={() => handleSubmit('draft')} disabled={loading} variant="outline" className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-black text-lg shadow-sm transition-all active:scale-95 disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}Lưu Nháp (Chưa giao)
                    </Button>
                    <Button type="button" onClick={() => handleSubmit('published')} disabled={loading || !isPointsValid} className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}Phát hành {currentAssignmentType === "exam" ? "Đề Kiểm Tra" : "Bài Tập"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        {/* MODAL VIEW QUESTION */}
        <Dialog open={!!viewQuestion} onOpenChange={(open) => { if(!open) setViewQuestion(null) }}>
          <DialogContent className="sm:max-w-[800px] w-[95%] rounded-[2rem] border-none p-0 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100"><DialogTitle className="text-2xl font-black text-sky-950 flex items-center gap-3"><Eye className="w-6 h-6 text-sky-500" /> Xem trước Nội dung</DialogTitle></DialogHeader>
            {viewQuestion && (
              <div className="space-y-6 p-8">
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-800 text-lg leading-relaxed q-content-view" dangerouslySetInnerHTML={{ __html: viewQuestion.content }} />
                    {viewQuestion.imageUrl && <img src={getImageUrl(viewQuestion.imageUrl)} className="max-w-full max-h-72 mt-4 rounded-xl border border-slate-200 shadow-sm mx-auto" />}
                    
                    {viewQuestion.videoUrl && (
                      <div className="w-full mt-4 flex justify-center">
                         {(viewQuestion.videoUrl.includes("youtube.com") || viewQuestion.videoUrl.includes("youtu.be")) ? (
                             <div className="h-[250px] sm:h-[400px] w-full max-w-3xl rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                 <iframe className="w-full h-full" src={getYoutubeEmbedUrl(viewQuestion.videoUrl)} allow="autoplay; fullscreen" allowFullScreen></iframe>
                             </div>
                         ) : viewQuestion.videoUrl.includes("drive.google.com") ? (
                             <div className="flex flex-col items-center w-full">
                                 <div className="h-[200px] sm:h-[350px] w-full max-w-2xl rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center relative">
                                     <iframe 
                                        className="w-full h-full relative z-10" 
                                        src={getDriveEmbedUrl(viewQuestion.videoUrl)} 
                                        allow="autoplay; fullscreen; encrypted-media" 
                                        allowFullScreen
                                        referrerPolicy="no-referrer"
                                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                     ></iframe>
                                     <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
                                         <Video className="w-8 h-8 text-slate-300 mb-2" />
                                         <p className="text-slate-500 font-medium text-xs">Video đang bị Google Drive chặn hiển thị trực tiếp do cài đặt trình duyệt.</p>
                                     </div>
                                 </div>
                                 <a href={viewQuestion.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center h-10 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm transition-colors border border-indigo-200 shadow-sm">
                                    <Video className="w-4 h-4 mr-2" /> Click mở Video sang Tab mới
                                 </a>
                             </div>
                         ) : isAudioFile(viewQuestion.videoUrl) ? (
                             <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                                <FileAudio className="w-12 h-12 text-indigo-400 mb-4" />
                                <audio controls className="w-full rounded-full" src={viewQuestion.videoUrl} preload="metadata" />
                             </div>
                         ) : (
                             <div className="w-full max-w-3xl rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black flex justify-center">
                                <video controls className="w-full max-h-[450px]" src={viewQuestion.videoUrl} preload="metadata" playsInline />
                             </div>
                         )}
                      </div>
                    )}
                </div>
                {(viewQuestion.essayAnswerText || viewQuestion.essayAnswerImageUrl) && (
                    <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
                        <p className="font-bold text-emerald-700 text-sm uppercase tracking-widest mb-3 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2"/> Hướng dẫn giải</p>
                        {viewQuestion.essayAnswerText && <div className="font-medium text-emerald-900 text-base leading-relaxed whitespace-pre-wrap q-content-view bg-white p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: viewQuestion.essayAnswerText }} />}
                        {viewQuestion.essayAnswerImageUrl && <img src={getImageUrl(viewQuestion.essayAnswerImageUrl)} className="max-w-full max-h-72 mt-4 rounded-xl border border-emerald-200 shadow-sm mx-auto" />}
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
                                <span className={`text-base q-content-view ${isCorrect ? 'font-bold text-sky-800' : 'text-slate-700 font-medium'}`} dangerouslySetInnerHTML={{ __html: opt }} />
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
              <p className="text-sm text-slate-500 font-medium pt-1">
                Bấm vào <strong>Biểu tượng Bàn Phím</strong> ở góc phải ô đứt nét bên dưới để chọn Phân số, Căn bậc, Ký tự đặc biệt...
              </p>
            </DialogHeader>
            
            <div className="my-6 p-4 bg-sky-50/50 rounded-2xl border-2 border-sky-200 shadow-inner">
              <math-field 
                 ref={mathFieldRef}
                 style={{ 
                     fontSize: '28px', 
                     width: '100%', 
                     padding: '16px', 
                     backgroundColor: 'white', 
                     borderRadius: '12px', 
                     border: '1px solid #bae6fd',
                     boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                 }}
              >
              </math-field>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setMathModal({ isOpen: false, targetTempId: null, targetOptionIndex: null, isExtracted: false, isEditing: false })} className="rounded-xl h-11 font-bold text-slate-500 hover:text-slate-700">Hủy bỏ</Button>
              <Button onClick={confirmMathInsertion} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-11 px-8 font-black shadow-md transition-all active:scale-95">
                 <CheckCircle2 className="w-5 h-5 mr-2" /> Chèn vào Đáp án
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default CreateAssignment;