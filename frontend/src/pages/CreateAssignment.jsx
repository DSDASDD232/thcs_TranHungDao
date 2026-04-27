import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../lib/axios"; 
import mammoth from "mammoth"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, UploadCloud, CheckCircle, CheckCircle2, AlertTriangle, Eraser,
  Sparkles, FileText, Loader2, Image as ImageIcon, ListChecks, Layers,
  PenTool, Database, Calculator, Save, Search, Filter, Eye, Trash2, PlusCircle, ArrowRight, FolderOpen
} from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import 'katex/dist/katex.min.css';

const CreateAssignment = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const assignmentFileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [creationMethod, setCreationMethod] = useState("manual"); 
  const [viewQuestion, setViewQuestion] = useState(null);
  
  const [isReviewingExtraction, setIsReviewingExtraction] = useState(false);
  const [rawExtractedText, setRawExtractedText] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const [step, setStep] = useState(1);
  const [templateConfig, setTemplateConfig] = useState({
    type: null, mcqCount: 0, essayCount: 0, essayPoints: [], totalPoints: 10
  });

  const getDefaultDueDate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 24); 
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [newAssignment, setNewAssignment] = useState({ 
    title: "", targetClass: "", subject: "", duration: "45", dueDate: getDefaultDueDate()
  });

  const [manualQuestions, setManualQuestions] = useState([]);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [questionPoints, setQuestionPoints] = useState({});

  const [bankSearch, setBankSearch] = useState("");
  const [bankGrade, setBankGrade] = useState("all");
  const [bankSubject, setBankSubject] = useState("");
  const [bankSetName, setBankSetName] = useState("all"); 
  const [bankType, setBankType] = useState("all"); 
  const [bankPoints, setBankPoints] = useState(""); 
  const [bankSelected, setBankSelected] = useState([]); 

  const [isSetSelectionEnabled, setIsSetSelectionEnabled] = useState(true);

  const serverUrl = axios.defaults.baseURL?.replace('/api', '') || '';

  const getHeader = (isMultipart = false) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    return { headers };
  };

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!id) return; 
      try {
        const res = await axios.get(`/assignments/${id}`, getHeader());
        const data = res.data;

        setNewAssignment({
          title: data.title, targetClass: data.targetClass, subject: data.subject,
          duration: data.duration.toString(), dueDate: new Date(data.dueDate).toISOString().slice(0, 16),
        });

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
              imageFile: null, previewUrl: q.imageUrl ? `${serverUrl}${q.imageUrl}` : "", existingImageUrl: q.imageUrl,
              essayAnswerText: q.essayAnswerText || "",
              essayAnswerPreviewUrl: q.essayAnswerImageUrl ? `${serverUrl}${q.essayAnswerImageUrl}` : "",
            };
          });

          let type = 'mixed';
          if (mcqCount > 0 && essayCount === 0) type = 'full_mcq';
          if (essayCount > 0 && mcqCount === 0) type = 'full_essay';

          const essayPtsArr = formattedQuestions.filter(q => q.type === 'essay').map(q => loadedPoints[q.tempId]);

          setTemplateConfig({ type, mcqCount, essayCount, essayPoints: essayPtsArr, totalPoints: 10 });
          setManualQuestions(formattedQuestions);
          setQuestionPoints(loadedPoints); 
          setCreationMethod("manual"); 
          setStep(3); 
        }
      } catch (error) {
        alert("Không thể tải bản nháp.");
        navigate("/teacher-dashboard");
      }
    };
    fetchAssignmentData();
  }, [id, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        const [profRes, questionsRes] = await Promise.all([
          axios.get("/teacher/me", getHeader()), axios.get("/questions/all", getHeader())
        ]);
        
        const teacherInfo = profRes.data;
        setTeacherProfile(teacherInfo);
        
        if (!id) {
            const subject = teacherInfo.subject || "Chưa phân tổ";
            setNewAssignment(prev => ({ ...prev, subject }));
            setBankSubject(subject); 
        }
        setQuestions(questionsRes.data?.questions || []);
      } catch (error) {}
    };
    fetchData();
  }, [navigate, id]);

  const handleSelectTemplate = (type) => {
    setTemplateConfig({ ...templateConfig, type, mcqCount: 0, essayCount: 0, essayPoints: [] });
    setStep(2);
  };

  const handleEssayCountChange = (e) => {
    const count = parseInt(e.target.value) || 0;
    const newPts = [...templateConfig.essayPoints];
    if (count > newPts.length) { while (newPts.length < count) newPts.push(""); } 
    else { newPts.length = count; }
    setTemplateConfig({...templateConfig, essayCount: count, essayPoints: newPts});
  };

  const checkPointValidity = () => {
    const mcq = Number(templateConfig.mcqCount) || 0;
    const essay = Number(templateConfig.essayCount) || 0;
    const essayPtsNum = templateConfig.essayPoints.map(p => Number(p) || 0);
    const totalEssayPoints = essayPtsNum.reduce((a, b) => a + b, 0);
    const totalQs = mcq + essay;
    
    if (totalQs === 0) return { valid: false, msg: "Vui lòng nhập số lượng câu hỏi." };
    if (templateConfig.type === 'full_mcq') {
      const pt = 10 / mcq;
      if ((pt * 100) % 5 !== 0) return { valid: false, msg: `CẢNH BÁO: Điểm lẻ (${pt.toFixed(2)} đ/câu). Hãy đổi số lượng câu!` };
      return { valid: true, msg: `Hợp lệ: Máy sẽ tự chia mỗi câu ${pt.toFixed(2)} điểm.` };
    }
    if (templateConfig.type === 'full_essay') {
      if (essay > 0 && essayPtsNum.some(p => p <= 0)) return { valid: false, msg: "Vui lòng nhập điểm cho các câu Tự luận." };
      if (totalEssayPoints !== 10) return { valid: false, msg: `LỖI: Tổng điểm đang là ${totalEssayPoints}. Phải bằng 10.` };
      return { valid: true, msg: `Hợp lệ: Đề có tổng 10 điểm.` };
    }
    if (templateConfig.type === 'mixed') {
      if (mcq === 0 || essay === 0) return { valid: false, msg: "Đề hỗn hợp cần nhập cả Trắc nghiệm và Tự luận." };
      if (totalEssayPoints >= 10) return { valid: false, msg: `LỖI: Tổng tự luận phải nhỏ hơn 10.` };
      const mcqPt = (10 - totalEssayPoints) / mcq;
      if ((mcqPt * 100) % 5 !== 0) return { valid: false, msg: `CẢNH BÁO: Trắc nghiệm bị lẻ (${mcqPt.toFixed(2)} đ/câu).` };
      return { valid: true, msg: `Hợp lệ: Tổng Tự luận ${totalEssayPoints}đ. Trắc nghiệm ${mcqPt.toFixed(2)}đ/câu.` };
    }
  };

  const pointStatus = checkPointValidity();

  const handleGenerateSlots = () => {
    if (!pointStatus.valid && !pointStatus.msg.includes("CẢNH BÁO")) return;
    let generatedSlots = [];
    const mcqCount = Number(templateConfig.mcqCount);
    const essayCount = Number(templateConfig.essayCount);
    let mcqPt = 0;
    if (templateConfig.type === 'full_mcq') mcqPt = 10 / mcqCount;
    else if (templateConfig.type === 'mixed') mcqPt = (10 - templateConfig.essayPoints.reduce((a, b) => a + (Number(b)||0), 0)) / mcqCount;
    
    const newPoints = {};
    for (let i = 0; i < mcqCount; i++) {
        const tempId = `mcq_${Date.now()}_${i}`;
        generatedSlots.push({ tempId, type: "multiple_choice", content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", essayAnswerText: "" });
        newPoints[tempId] = mcqPt; 
    }
    for (let i = 0; i < essayCount; i++) {
        const tempId = `essay_${Date.now()}_${i}`;
        generatedSlots.push({ tempId, type: "essay", content: "", options: [], correctAnswer: "", difficulty: "medium", essayAnswerText: "" });
        newPoints[tempId] = Number(templateConfig.essayPoints[i]) || 0; 
    }
    setManualQuestions(generatedSlots);
    setQuestionPoints(newPoints);
    setCreationMethod("manual");
    setStep(3);
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

  useEffect(() => { setBankSetName("all"); }, [bankGrade, bankSubject]);

  const fillEmptySlots = (importedQs) => {
    let newManuals = [...manualQuestions];
    let updatedPoints = { ...questionPoints };
    let filledCount = 0;
    let duplicateCount = 0;
    
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

      let parsedOptions = [];
      if (Array.isArray(impQ.options) && impQ.options.length > 0) {
          parsedOptions = impQ.options;
      }
      
      let correctKey = impQ.correctAnswer || "A";

      const payloadToInject = {
        content: impQ.content || "",
        options: impQ.type === 'multiple_choice' ? parsedOptions : [],
        correctAnswer: correctKey,
        difficulty: impQ.difficulty || "medium",
        previewUrl: impQ.previewUrl || "",
        essayAnswerText: impQ.essayAnswerText || "",
      };

      if (targetSlotIndex !== -1) {
          existingContents.add(normalizedContent);
          newManuals[targetSlotIndex] = { ...newManuals[targetSlotIndex], ...payloadToInject };
      } else {
          existingContents.add(normalizedContent);
          const newTempId = `appended_${Date.now()}_${Math.random()}`;
          newManuals.push({ tempId: newTempId, type: impQ.type || "multiple_choice", ...payloadToInject });
          updatedPoints[newTempId] = impQ.points || 0; 
      }
      filledCount++;
    }

    setManualQuestions(newManuals);
    setQuestionPoints(updatedPoints);
    recalculatePoints(newManuals, updatedPoints); 
    
    let alertMsg = `✅ Đã rót thành công ${filledCount} câu vào Form trực tiếp.`;
    if (duplicateCount > 0) alertMsg += `\n⚠️ Bỏ qua ${duplicateCount} câu do đã bị trùng lặp.`;
    alert(alertMsg);
  };

  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAssignmentFile(file);
  };

  // ======================================================================
  // HÀM BÓC TÁCH THÔNG MINH ĐỒNG BỘ TỪ QUESTIONBANK
  // ======================================================================
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
    
    const questionBlocks = rawBlocks.filter(block => {
        return /^\s*(?:Câu|Bài)\s+\d+\s*[:.]/i.test(block);
    });
    
    return questionBlocks.map((block) => {
      let type = "multiple_choice";
      let content = "";
      let options = [];
      let correctAnswer = "A";
      let essayAnswerText = "";

      const qMatch = block.match(/^\s*(?:Câu|Bài)\s+(\d+)\s*[:.]/i);
      const qNumber = qMatch ? qMatch[1] : null;

      const partsByExplanation = block.split(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|HDG|Giải|Đáp án)\s*[:.]\s*/i);
      let questionBody = partsByExplanation[0];
      
      if (partsByExplanation.length > 1) {
          essayAnswerText = partsByExplanation[1].trim();
      }

      const partsByOptions = questionBody.split(/(?:^|\n|\t|\s{3,})(?=\*?\s*[A-D][.)]\s)/i);
      
      content = partsByOptions[0].replace(/^\s*(?:Câu|Bài)\s+\d+\s*[:.]\s*/i, "").trim();
      content = content.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

      let detectedCorrectAnswer = null;
      partsByOptions.slice(1).forEach(optStr => {
        let textOpt = optStr.trim();
        let isCorrect = false;
        
        if (textOpt.startsWith('*')) {
           isCorrect = true;
           textOpt = textOpt.substring(1).trim();
        }

        const letterMatch = textOpt.match(/^([A-D])[.)]\s*(.*)/is);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            let val = letterMatch[2].trim();
            val = val.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

            options.push(val);
            if (isCorrect) detectedCorrectAnswer = letter;
        }
      });

      if (detectedCorrectAnswer) {
          correctAnswer = detectedCorrectAnswer;
      } else if (essayAnswerText.match(/^[A-D]$/i)) { 
          correctAnswer = essayAnswerText.toUpperCase();
          essayAnswerText = ""; 
      } else if (qNumber && globalAnswers[qNumber]) {
          correctAnswer = globalAnswers[qNumber];
      } else {
          correctAnswer = "A";
      }

      if (options.length === 0) {
          type = "essay";
          options = []; 
          correctAnswer = "";
      } else {
          type = "multiple_choice";
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
    const newSlot = { tempId, type, content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium", essayAnswerText: "" };
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
        return { ...q, content: "", options: ["", "", "", ""], imageFile: null, previewUrl: "", existingImageUrl: "", essayAnswerText: "", essayAnswerImageFile: null, essayAnswerPreviewUrl: "", existingEssayAnswerImageUrl: "", _id: undefined }; 
      } 
      return q; 
    })); 
  };

  const handleManualImageChange = (tempId, e) => { const file = e.target.files[0]; if (file) setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, imageFile: file, previewUrl: URL.createObjectURL(file) } : q)); };
  const handleRemoveManualImage = (tempId) => { setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, imageFile: null, previewUrl: "" } : q)); };
  const handleManualEssayImageChange = (tempId, e) => { const file = e.target.files[0]; if (file) setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, essayAnswerImageFile: file, essayAnswerPreviewUrl: URL.createObjectURL(file) } : q)); };
  const handleRemoveManualEssayImage = (tempId) => { setManualQuestions(manualQuestions.map(q => q.tempId === tempId ? { ...q, essayAnswerImageFile: null, essayAnswerPreviewUrl: "" } : q)); };

  const handleSubmit = async (actionType) => {
    if (!newAssignment.targetClass) return alert("Vui lòng chọn lớp để giao bài!");
    if (actionType === 'published' && !isPointsValid) return alert(`Tổng điểm hiện tại là ${roundedTotal.toFixed(2)}. Bạn bắt buộc phải chia điểm sao cho bằng đúng 10.00 mới được PHÁT HÀNH!`);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", newAssignment.title); formData.append("targetClass", newAssignment.targetClass); 
      formData.append("subject", newAssignment.subject); formData.append("duration", newAssignment.duration); 
      formData.append("dueDate", newAssignment.dueDate); formData.append("status", actionType); 
      
      const questionsToSave = manualQuestions.map(q => ({
          _id: q._id, tempId: q.tempId, content: q.content, type: q.type, options: q.options, correctAnswer: q.correctAnswer, difficulty: q.difficulty, subject: newAssignment.subject,
          points: questionPoints[q.tempId] || 0, essayAnswerText: q.essayAnswerText || "",
          existingImageUrl: q.existingImageUrl || "",
          existingEssayAnswerImageUrl: q.existingEssayAnswerImageUrl || "" 
      }));
      formData.append("questionsData", JSON.stringify(questionsToSave));

      manualQuestions.forEach(q => { 
          if (q.imageFile) formData.append(`image_${q.tempId}`, q.imageFile); 
          if (q.essayAnswerImageFile) formData.append(`essayImage_${q.tempId}`, q.essayAnswerImageFile);
      });
      
      if (id) await axios.put(`/assignments/update/${id}`, formData, getHeader(true));
      else await axios.post("/assignments/create-manual", formData, getHeader(true));

      if (actionType === 'draft') alert("💾 Đã lưu nháp bài tập thành công!"); else alert("✅ Giao bài thành công!");
      navigate("/teacher-dashboard");
    } catch (err) { alert("Lỗi xử lý! Vui lòng thử lại."); } finally { setLoading(false); }
  };

  const availableSets = [...new Set(questions.map(q => q.questionSet).filter(Boolean))];

  const filteredBankQuestions = questions.filter(q => {
    const matchSearch = (q.content || "").toLowerCase().includes(bankSearch.toLowerCase());
    const matchGrade = bankGrade === "all" || q.grade === bankGrade;
    const matchType = bankType === "all" || q.type === bankType;
    const matchSet = bankSetName === "all" || q.questionSet === bankSetName;
    const matchPoints = !bankPoints || Number(q.points) === Number(bankPoints);
    return matchSearch && matchGrade && matchType && matchSet && matchPoints;
  });

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

        {step === 3 && creationMethod === "manual" && (
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
            <CardTitle className="text-2xl sm:text-3xl font-black">{id ? "Chỉnh sửa Bản nháp" : "Phát hành Bài tập mới"}</CardTitle>
            <p className="text-sky-100 font-medium mt-2 text-sm sm:text-base">Thiết lập các thông số để giao bài cho học sinh.</p>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-8">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-black text-sky-900 border-b border-sky-100 pb-2">1. Thông tin chung</h3>
                <Input placeholder="Nhập tên bài tập " className="h-12 sm:h-14 rounded-xl bg-slate-50 font-bold text-base sm:text-lg border-sky-100 focus-visible:ring-sky-500" value={newAssignment.title} onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Giao cho Lớp</label>
                    <Select value={newAssignment.targetClass || ""} onValueChange={(val) => setNewAssignment({...newAssignment, targetClass: val})} required>
                      <SelectTrigger className="h-11 sm:h-12 rounded-xl bg-slate-50 font-bold border-sky-100 w-full"><SelectValue placeholder="Chọn Lớp" /></SelectTrigger>
                      <SelectContent>{!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0 ? (<SelectItem value="none" disabled>Chưa có lớp</SelectItem>) : (teacherProfile.assignedClasses.map(c => <SelectItem key={c._id || c} value={c.name}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Môn học phụ trách</label><Input value={newAssignment.subject} readOnly className="h-11 sm:h-12 rounded-xl bg-slate-100 border-slate-200 font-bold text-sky-700 cursor-not-allowed shadow-none" /></div>
                  <div className="space-y-1.5"><label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Thời gian (Phút)</label><Input type="number" placeholder="VD: 45" className="h-11 sm:h-12 rounded-xl bg-slate-50 border-sky-100 font-bold" value={newAssignment.duration} onChange={(e) => setNewAssignment({...newAssignment, duration: e.target.value})} required /></div>
                  <div className="space-y-1.5"><label className="text-xs sm:text-sm font-bold text-slate-500 ml-1">Hạn nộp</label><Input type="datetime-local" className="h-11 sm:h-12 rounded-xl bg-slate-50 border-sky-100 font-bold text-slate-600" value={newAssignment.dueDate} onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})} required /></div>
                </div>
              </div>

              <div className="border-t border-sky-100 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg sm:text-xl font-black text-sky-900">2. Cấu trúc Đề thi</h3>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
                    <Badge className={step >= 1 ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}>Chọn mẫu</Badge><div className={`w-6 h-1 rounded ${step >= 2 ? "bg-sky-500" : "bg-slate-100"}`}></div>
                    <Badge className={step >= 2 ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}>Số lượng & Điểm</Badge><div className={`w-6 h-1 rounded ${step >= 3 ? "bg-sky-500" : "bg-slate-100"}`}></div>
                    <Badge className={step >= 3 ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"}>Nội dung</Badge>
                  </div>
                </div>

                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in zoom-in duration-300">
                    <Card onClick={() => handleSelectTemplate('full_mcq')} className="cursor-pointer border-2 hover:border-sky-500 hover:bg-sky-50 transition-all text-center p-6 rounded-3xl group shadow-sm"><ListChecks className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-sky-400 group-hover:text-sky-600 mb-4 transition-colors" /><h3 className="text-lg sm:text-xl font-black text-slate-800">Trắc nghiệm 100%</h3><p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">Chỉ gồm các câu hỏi chọn đáp án. Máy tự chia điểm.</p></Card>
                    <Card onClick={() => handleSelectTemplate('mixed')} className="cursor-pointer border-2 hover:border-purple-500 hover:bg-purple-50 transition-all text-center p-6 rounded-3xl group shadow-sm"><Layers className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-purple-400 group-hover:text-purple-600 mb-4 transition-colors" /><h3 className="text-lg sm:text-xl font-black text-slate-800">Hỗn hợp</h3><p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">Kết hợp cả Trắc nghiệm và Tự luận trong 1 đề.</p></Card>
                    <Card onClick={() => handleSelectTemplate('full_essay')} className="cursor-pointer border-2 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center p-6 rounded-3xl group shadow-sm"><FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-emerald-400 group-hover:text-emerald-600 mb-4 transition-colors" /><h3 className="text-lg sm:text-xl font-black text-slate-800">Tự luận 100%</h3><p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">Học sinh tự gõ văn bản hoặc upload ảnh bài làm.</p></Card>
                  </div>
                )}

                {step === 2 && (
                  <Card className="max-w-2xl mx-auto rounded-3xl border-sky-100 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                         <Button type="button" onClick={() => setStep(1)} variant="ghost" className="w-fit p-0 hover:bg-transparent text-slate-500 hover:text-sky-600 mb-2"><ArrowLeft className="w-4 h-4 mr-2"/> Đổi mẫu khác</Button>
                         <CardTitle className="text-xl font-black text-sky-950">Nhập số lượng & Chia điểm</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                          <div className="space-y-4">
                             {templateConfig.type !== 'full_essay' && (<div className="space-y-2"><label className="font-bold text-slate-700 flex items-center gap-2"><ListChecks className="w-4 h-4 text-sky-500"/> Số lượng câu Trắc nghiệm</label><Input type="number" min="0" value={templateConfig.mcqCount} onChange={(e) => setTemplateConfig({...templateConfig, mcqCount: e.target.value})} className="h-12 rounded-xl border-slate-200 font-bold text-lg" /></div>)}
                             {templateConfig.type !== 'full_mcq' && (<div className="space-y-2"><label className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500"/> Số lượng câu Tự luận</label><Input type="number" min="0" value={templateConfig.essayCount} onChange={handleEssayCountChange} className="h-12 rounded-xl border-slate-200 font-bold text-lg" /></div>)}
                             {templateConfig.type !== 'full_mcq' && Number(templateConfig.essayCount) > 0 && (
                               <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 animate-in fade-in">
                                 <label className="font-bold text-indigo-700 flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-500"/> Điểm chi tiết cho TỪNG câu Tự luận</label>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                          <div className={`p-4 rounded-xl border flex items-start gap-3 ${pointStatus.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>{pointStatus.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />}<p className={`font-bold text-sm ${pointStatus.valid ? 'text-emerald-800' : 'text-rose-800'}`}>{pointStatus.msg}</p></div>
                          <Button type="button" onClick={handleGenerateSlots} className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white font-black text-lg rounded-xl shadow-md transition-transform active:scale-95">TẠO SẴN KHUNG ĐỀ BÀI</Button>
                      </CardContent>
                  </Card>
                )}

                {step === 3 && (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-bold text-slate-600">Điền nội dung cho <strong className="text-sky-600">{manualQuestions.length}</strong> khung câu hỏi đã tạo.</p>
                      {!id && (<Button type="button" onClick={() => {if(window.confirm("Các câu hỏi hiện tại sẽ bị xóa. Bạn có chắc chắn muốn làm lại?")) setStep(1)}} variant="ghost" className="text-rose-500 hover:bg-rose-50">Làm lại cấu trúc đề</Button>)}
                    </div>

                    <div className="flex bg-slate-100 rounded-xl w-full p-1 overflow-x-auto no-scrollbar">
                      <button type="button" onClick={() => setCreationMethod("manual")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${(creationMethod === 'manual' || creationMethod === 'smart_extract') ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><PenTool className="w-4 h-4 shrink-0"/> Xem khung Trực tiếp</button>
                      <button type="button" onClick={() => setCreationMethod("upload")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${creationMethod === 'upload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><FileText className="w-4 h-4 shrink-0"/> Bóc tách từ Word</button>
                      <button type="button" onClick={() => setCreationMethod("bank")} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${creationMethod === 'bank' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-sky-600'}`}><Database className="w-4 h-4 shrink-0"/> Rót từ Kho Câu hỏi</button>
                    </div>

                    <div className="mt-4 border border-sky-100 bg-sky-50/30 rounded-2xl p-3 sm:p-4 md:p-6">
                      
                      {creationMethod === "upload" && (
                        <div className="space-y-4">
                          {!isReviewingExtraction ? (
                             <div className="bg-white p-4 sm:p-6 rounded-2xl border border-sky-100 shadow-sm text-center">
                                <h4 className="font-bold text-sky-900 text-base sm:text-lg mb-1 sm:mb-2">Bóc tách tự động</h4>
                                <p className="text-slate-500 text-xs sm:text-sm mb-4">Hệ thống sẽ bóc tách văn bản thô từ Word. Sau đó bạn có thể rà soát lại trước khi rót vào Form trực tiếp.</p>
                                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setAssignmentFile(f);}} onClick={() => assignmentFileRef.current.click()} className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 max-w-lg mx-auto ${assignmentFile ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-400 bg-slate-50/50'}`}>
                                  <input type="file" ref={assignmentFileRef} onChange={handleAssignmentFileChange} className="hidden" accept=".doc,.docx" />
                                  {assignmentFile ? (<><div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-100 rounded-full flex items-center justify-center mb-1"><FileText className="h-6 w-6 sm:h-7 sm:w-7 text-sky-600" /></div><p className="font-black text-sky-900 text-base sm:text-lg line-clamp-1 break-all px-2">{assignmentFile.name}</p><p className="text-[10px] sm:text-xs text-sky-600 font-medium bg-white px-2 sm:px-3 py-1 rounded-full border border-sky-100">Click để đổi file khác</p></>) : (<><div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-1"><UploadCloud className="h-6 w-6 sm:h-8 sm:w-8 text-sky-400" /></div><p className="text-sm sm:text-base font-black text-slate-700">Kéo thả file Word (.docx) vào đây</p></>)}
                                </div>
                                {assignmentFile && <Button type="button" onClick={handleExtractWord} disabled={loading} className="mt-4 sm:mt-6 w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white font-bold h-11 sm:h-12 px-6 sm:px-8 rounded-xl shadow-md">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2" />} Bắt đầu bóc tách văn bản</Button>}
                             </div>
                          ) : (
                             <div className="flex flex-col lg:flex-row gap-6 items-start">
                               <div className="w-full lg:w-2/5 flex flex-col gap-0 sticky top-4 z-10">
                                  <div className="flex justify-between items-center bg-slate-100 p-3 rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
                                    <span className="text-sm font-bold text-slate-700 uppercase">Văn bản thô (File gốc)</span>
                                    <div className="flex gap-2">
                                      <label className="h-8 px-3 inline-flex items-center justify-center rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                                        <FolderOpen className="w-3.5 h-3.5 mr-1.5"/> Chọn file khác
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
                                  <div className="bg-amber-50 p-3 mt-2 rounded-lg border border-amber-200">
                                    <p className="text-xs text-amber-700 font-medium">
                                      💡 <b>Mẹo sửa lỗi:</b> Chỉnh sửa văn bản ở trên (thêm chữ <b>Câu X:</b> hoặc <b>A. B. C. D.</b> nếu máy bị thiếu), sau đó ấn nút <b>Rót lại Text</b> để cập nhật danh sách bên phải.
                                    </p>
                                  </div>
                               </div>

                               <div className="w-full lg:w-3/5 space-y-4 sm:space-y-6">
                                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-sky-800 uppercase">Xem trước & Chỉnh sửa ({extractedQuestions.length} câu)</span>
                                    <Button onClick={() => setExtractedQuestions([...extractedQuestions, { tempId: `ext_new_${Date.now()}`, type: "multiple_choice", content: "", options: ["", "", "", ""], correctAnswer: "A", difficulty: "medium" }])} size="sm" variant="outline" className="h-8 bg-white"><PlusCircle className="w-4 h-4 mr-1"/> Thêm câu</Button>
                                  </div>

                                  {extractedQuestions.map((q, index) => (
                                      <Card key={q.tempId} className="border-sky-200 shadow-sm relative overflow-visible transition-all">
                                          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                                          <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100 flex flex-row justify-between items-center">
                                            <CardTitle className="text-base font-black text-slate-700 flex items-center gap-2">
                                              Câu {index + 1} 
                                              <Badge variant="outline" className="text-[10px] ml-2 bg-white text-slate-500">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                            </CardTitle>
                                            <Button type="button" onClick={() => setExtractedQuestions(extractedQuestions.filter(x => x.tempId !== q.tempId))} variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></Button>
                                          </CardHeader>
                                          <CardContent className="p-4 space-y-4 bg-white">
                                            <div className="flex flex-col">
                                                <RichTextEditor placeholder="Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC..." value={q.content} onChange={(val) => handleExtractedChange(q.tempId, 'content', val)} />
                                            </div>
                                            
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
                                                      {q.options.length > 2 && (
                                                         <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExtractedOption(q.tempId, i)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0"><Trash2 className="w-4 h-4"/></Button>
                                                      )}
                                                    </div>
                                                  )})}
                                                </div>

                                                <div className="flex justify-between items-center pt-2 gap-3 border-t border-slate-200 mt-2">
                                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleAddExtractedOption(q.tempId)} className="text-sky-600 hover:bg-sky-100"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                                                  
                                                  <div className="flex items-center gap-2">
                                                    <label className="text-sm font-bold text-rose-500">ĐÁP ÁN ĐÚNG:</label>
                                                    <Select value={q.correctAnswer || ""} onValueChange={(val) => handleExtractedChange(q.tempId, 'correctAnswer', val)}>
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

                                  <Button type="button" onClick={handleCommitExtraction} className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 transition-all mt-4">
                                      XÁC NHẬN RÓT VÀO KHUNG TRỰC TIẾP <ArrowRight className="ml-2 w-5 h-5"/>
                                  </Button>
                               </div>
                             </div>
                          )}
                        </div>
                      )}

                      {creationMethod === "manual" && (
                        <div className="w-full space-y-4 sm:space-y-6">
                          {manualQuestions.map((q, index) => {
                            const isSlotEmpty = !q.content || q.content.replace(/<[^>]*>/g, '').trim() === "";
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
                                      <input type="number" step="0.1" className="w-12 sm:w-16 text-center font-black text-sky-600 focus:outline-none" value={questionPoints[q.tempId] === 0 ? "" : questionPoints[q.tempId]} placeholder="Nhập" onChange={(e) => handleEssayPointChange(q.tempId, e.target.value)} />
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
                                  </div>
                                  <div className="w-full md:w-36 shrink-0 h-[120px] sm:h-[120px]">
                                    {q.previewUrl ? (
                                      <div className="relative w-full h-full rounded-xl border border-sky-200 overflow-hidden shadow-sm group/img"><img src={q.previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => handleRemoveManualImage(q.tempId)} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button></div></div>
                                    ) : (
                                      <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50 cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-sky-400 mb-1" /><span className="text-xs font-bold text-sky-600 text-center px-1">Ảnh Phụ (Đề bài)</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualImageChange(q.tempId, e)} /></label>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm">
                                   <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Đáp án / Hướng dẫn giải </h4>
                                   <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                                       <div className="flex-1"><RichTextEditor placeholder="Gõ lời giải hoặc DÁN ẢNH CÔNG THỨC TOÁN..." value={q.essayAnswerText} onChange={(val) => handleManualChange(q.tempId, 'essayAnswerText', val)} /></div>
                                       <div className="w-full md:w-36 shrink-0 h-[100px] sm:h-[100px]">
                                         {q.essayAnswerPreviewUrl ? (
                                           <div className="relative w-full h-full rounded-xl border border-emerald-200 overflow-hidden shadow-sm group/img2"><img src={q.essayAnswerPreviewUrl} alt="Preview Answer" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img2:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => handleRemoveManualEssayImage(q.tempId)} className="bg-rose-500 text-white rounded-full p-2 hover:scale-110 transition-transform"><Trash2 className="w-4 h-4"/></button></div></div>
                                         ) : (
                                           <label className="flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white cursor-pointer transition-all"><ImageIcon className="w-6 h-6 text-emerald-400 mb-1" /><span className="text-xs font-bold text-emerald-600 text-center px-1">Ảnh Phụ (Lời giải)</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleManualEssayImageChange(q.tempId, e)} /></label>
                                         )}
                                       </div>
                                   </div>
                                </div>

                                {q.type === "multiple_choice" && (
                                  <div className="bg-sky-50/50 p-3 sm:p-4 rounded-xl border border-sky-100 space-y-3 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {q.options.map((optLabel, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        return (
                                        <div key={optIdx} className="flex items-center gap-2">
                                          <span className="font-bold text-slate-500 w-5 sm:w-6 text-sm sm:text-base">{letter}.</span>
                                          <Input className={`h-11 rounded-xl bg-white text-sm sm:text-base ${isSlotEmpty ? 'border-dashed border-slate-300' : 'border-sky-100'}`} value={q.options[optIdx]} onChange={(e) => handleManualOptionChange(q.tempId, optIdx, e.target.value)} />
                                          {q.options.length > 2 && (
                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveManualOption(q.tempId, optIdx)} className="h-8 w-8 text-rose-400 hover:bg-rose-100 shrink-0"><Trash2 className="w-4 h-4"/></Button>
                                          )}
                                        </div>
                                      )})}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-sky-100 mt-2">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => handleAddManualOption(q.tempId)} className="text-sky-600 hover:bg-sky-100"><PlusCircle className="w-4 h-4 mr-2"/> Thêm đáp án</Button>
                                      <div className="flex items-center gap-2">
                                        <label className="text-sm font-bold text-rose-600">ĐÁP ÁN ĐÚNG:</label>
                                        <Select value={q.correctAnswer || ""} onValueChange={(val) => handleManualChange(q.tempId, 'correctAnswer', val)}>
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
                          )})}
                          <div className="flex flex-col sm:flex-row gap-3 mt-6">
                             <Button type="button" onClick={() => handleAddSlot('multiple_choice')} variant="outline" className="flex-1 border-dashed border-2 border-sky-300 text-sky-600 hover:bg-sky-50 hover:border-sky-400 font-bold h-12 rounded-xl transition-all"><PlusCircle className="w-5 h-5 mr-2"/> Thêm câu Trắc nghiệm</Button>
                             <Button type="button" onClick={() => handleAddSlot('essay')} variant="outline" className="flex-1 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 font-bold h-12 rounded-xl transition-all"><PlusCircle className="w-5 h-5 mr-2"/> Thêm câu Tự luận</Button>
                          </div>
                        </div>
                      )}

                      {creationMethod === "bank" && (
                        <div className="border border-sky-200 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="bg-sky-50 px-3 sm:px-4 py-4 flex flex-col space-y-4 border-b border-sky-100">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                              <span className="font-bold text-sky-800 flex items-center text-sm sm:text-base"><Database className="w-4 h-4 mr-2 shrink-0"/> Chọn câu hỏi từ hệ thống</span>
                              <div className="flex gap-2">
                                <Button type="button" onClick={handleImportFromBankToManual} variant="outline" className="h-9 border-sky-300 text-sky-700 hover:bg-sky-100 font-bold px-3 shadow-sm text-xs sm:text-sm"><PenTool className="w-3.5 h-3.5 mr-1.5" /> Rót vào khung trực tiếp</Button>
                                <Badge className="bg-sky-500 font-bold px-3 py-1 text-white flex items-center h-9">Đã chọn: {bankSelected.length}</Badge>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <Select value={bankType || ""} onValueChange={(val) => {setBankType(val); if(val !== 'essay') setBankPoints("");}}>
                                 <SelectTrigger className="h-10 w-[140px] bg-white border-sky-200 font-bold text-sky-700"><span className="truncate">{bankType === 'all' ? 'Tất cả loại' : bankType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}</span></SelectTrigger>
                                 <SelectContent><SelectItem value="all">Tất cả loại</SelectItem><SelectItem value="multiple_choice">Trắc nghiệm</SelectItem><SelectItem value="essay">Tự luận</SelectItem></SelectContent>
                              </Select>
                              <Input value={`Môn: ${bankSubject || "Chưa rõ"}`} readOnly className="h-10 w-[120px] bg-slate-100 border-slate-200 font-bold text-sky-700 cursor-not-allowed" />
                              <Select value={bankGrade || ""} onValueChange={setBankGrade}>
                                <SelectTrigger className="h-10 w-[110px] bg-white border-sky-200 font-bold text-sky-700"><span className="truncate">{bankGrade === 'all' ? 'Tất cả khối' : `Khối ${bankGrade}`}</span></SelectTrigger>
                                <SelectContent><SelectItem value="all">Tất cả khối</SelectItem><SelectItem value="6">Khối 6</SelectItem><SelectItem value="7">Khối 7</SelectItem><SelectItem value="8">Khối 8</SelectItem><SelectItem value="9">Khối 9</SelectItem></SelectContent>
                              </Select>
                              
                              <Select value={bankSetName || ""} onValueChange={setBankSetName} disabled={!isSetSelectionEnabled}>
                                <SelectTrigger className={`h-10 w-[160px] bg-white border-sky-200 font-bold text-sky-700 ${!isSetSelectionEnabled ? 'opacity-50' : ''}`}><span className="truncate">{!isSetSelectionEnabled ? "Chọn Khối" : bankSetName === 'all' ? 'Tất cả bộ đề' : bankSetName}</span></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tất cả</SelectItem>
                                  {availableSets.map((setName, idx) => (<SelectItem key={idx} value={setName}>{setName}</SelectItem>))}
                                </SelectContent>
                              </Select>
                              {bankType === 'essay' && (<Input type="number" step="0.25" placeholder="Lọc điểm..." className="h-10 w-[110px] bg-white border-sky-200 text-sky-700 font-bold" value={bankPoints} onChange={(e) => setBankPoints(e.target.value)} />)}
                              <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Tìm nội dung..." className="pl-9 h-10 bg-white border-sky-200" value={bankSearch} onChange={e => setBankSearch(e.target.value)} /></div>
                            </div>
                          </div>
                          
                          <div className="max-h-[400px] overflow-y-auto p-1 sm:p-2">
                            <div className="overflow-x-auto">
                              <Table className="min-w-[400px]">
                                <TableBody>
                                  {filteredBankQuestions.length === 0 ? (<TableRow><TableCell className="text-center py-10 text-slate-400 italic">Không tìm thấy câu hỏi phù hợp.</TableCell></TableRow>) : filteredBankQuestions.map((q) => {
                                    const isSelected = bankSelected.includes(q._id);
                                    return (
                                      <TableRow key={q._id} className={`${isSelected ? 'bg-sky-50' : ''} cursor-pointer hover:bg-sky-50/50`} onClick={() => toggleBankSelection(q._id)}>
                                        <TableCell className="w-10 sm:w-12 text-center align-top pt-4 sm:pt-3"><input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 accent-sky-500 cursor-pointer" checked={isSelected} onChange={() => toggleBankSelection(q._id)} onClick={(e) => e.stopPropagation()} /></TableCell>
                                        <TableCell className="font-medium text-slate-700 text-sm sm:text-base py-3">
                                          <div className="flex flex-col gap-1.5">
                                            <div className="flex items-start gap-2">
                                              {q.imageUrl && <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 shrink-0 mt-0.5" />}
                                              <div className="line-clamp-2 leading-relaxed q-content-view" dangerouslySetInnerHTML={{ __html: q.content }} />
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                              <Badge variant="outline" className="bg-sky-50 border-sky-200 text-sky-700 text-[10px] font-bold">{q.questionSet || "Ngân hàng chung"}</Badge>
                                              <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 text-[10px]">Khối {q.grade}</Badge>
                                              <Badge variant="outline" className="bg-sky-50 border-sky-100 text-sky-600 text-[10px]">{q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'}</Badge>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-4 align-top pt-3"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-100 hover:text-sky-700 rounded-full" onClick={(e) => handleOpenViewQuestion(e, q)}><Eye className="w-5 h-5" /></Button></TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {step === 3 && (
                <div className="pt-6 sm:pt-8 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button type="button" onClick={() => handleSubmit('draft')} disabled={loading} variant="outline" className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-black text-lg shadow-sm transition-all active:scale-95 disabled:opacity-50">{loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}Lưu Nháp (Chưa giao)</Button>
                    <Button type="button" onClick={() => handleSubmit('published')} disabled={loading || !isPointsValid} className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle className="mr-2 h-5 w-5" />}Phát hành Bài tập</Button>
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
      </div>
    </div>
  );
};

export default CreateAssignment;