import mammoth from "mammoth";

/**
 * Hàm phân tích văn bản thô (thường lấy từ Word) để trích xuất ra các câu hỏi trắc nghiệm/tự luận.
 * @param {string} text - Văn bản thô cần bóc tách.
 * @param {boolean} isForPreview - True nếu đang dùng cho bước xem trước.
 */
export const extractQuestionsFromText = (text, isForPreview = false) => {
  // 1. CẮT PHẦN ĐỀ BÀI VÀ PHẦN ĐÁP ÁN (Sửa regex siêu chuẩn để bắt được chữ HẾT hoặc ĐÁP ÁN)
  const textParts = text.split(/(?:-{1,}\s*HẾT\s*-{1,}|\n\s*HẾT\s*\n|ĐÁP ÁN VÀ HƯỚNG DẪN|BẢNG ĐÁP ÁN|ĐÁP ÁN CHI TIẾT)/i);
  let mainPart = textParts[0]; 

  let globalAnswers = {};
  let globalEssayAnswers = {};

  if (textParts.length > 1) {
      // Gộp tất cả các phần phía sau (phòng trường hợp cắt bị dư)
      const answerPart = textParts.slice(1).join(" ");
      
      // a. Trích xuất đáp án Trắc nghiệm (VD: 1. B | 2. C | Câu 3: A)
      const ansRegex = /(?:Câu\s*)?(\d+)\s*[:.-]?\s*([A-D])(?!\w)/gi;
      let match;
      while ((match = ansRegex.exec(answerPart)) !== null) {
          globalAnswers[match[1]] = match[2].toUpperCase(); 
      }

      // b. Trích xuất Lời giải tự luận dưới phần đáp án (VD: Câu 36: a) 15*34...)
      const ansBlocks = answerPart.split(/(?=(?:^|\n|\s)(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.])/i);
      ansBlocks.forEach(ansBlock => {
           const qMatch = ansBlock.match(/^\s*(?:Câu|Bài)\s+(\d+)(?:\s*[([].*?[)\]])?\s*[:.]/i);
           if (qMatch) {
               const qNum = qMatch[1];
               let explanation = ansBlock.replace(/^\s*(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
               if (explanation) {
                   globalEssayAnswers[qNum] = explanation;
               }
           }
      });
  }

  // 2. TÁCH CÁC CÂU HỎI TRONG PHẦN ĐỀ BÀI
  // Bổ sung (?:\s*[([].*?[)\]])? để bắt được các câu có số điểm bên cạnh (VD: "Câu 36 (0.5 điểm):")
  const rawBlocks = mainPart.split(/(?=(?:^|\n|\s)(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.])/i);
  
  const questionBlocks = rawBlocks.filter(block => {
      return /^\s*(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]/i.test(block);
  });
  
  return questionBlocks.map((block) => {
    let type = "multiple_choice";
    let content = "";
    let options = [];
    let correctAnswer = "A";
    let essayAnswerText = "";

    const qMatch = block.match(/^\s*(?:Câu|Bài)\s+(\d+)(?:\s*[([].*?[)\]])?\s*[:.]/i);
    const qNumber = qMatch ? qMatch[1] : null;

    // Tách lời giải đính kèm ngay dưới câu hỏi (nếu có)
    const partsByExplanation = block.split(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|HDG|Giải|Đáp án)\s*[:.]\s*/i);
    let questionBody = partsByExplanation[0];
    
    if (partsByExplanation.length > 1) {
        essayAnswerText = partsByExplanation[1].trim();
    }

    // Tách các đáp án A, B, C, D (TUYỆT ĐỐI KHÔNG DÙNG cờ /i để tránh bắt nhầm câu a, b của Tự luận)
    const partsByOptions = questionBody.split(/(?:^|\n|\t|\s{3,})(?=[-*\u2022]?\s*[A-D][.)]\s)/);
    
    content = partsByOptions[0].replace(/^\s*(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
    content = content.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

    let detectedCorrectAnswer = null;
    partsByOptions.slice(1).forEach(optStr => {
      let textOpt = optStr.trim();
      let isCorrect = false;
      
      if (textOpt.startsWith('*')) {
         isCorrect = true;
         textOpt = textOpt.substring(1).trim();
      }

      textOpt = textOpt.replace(/^[-*\u2022]\s*/, "");

      const letterMatch = textOpt.match(/^([A-D])[.)]\s*(.*)/s); 
      if (letterMatch) {
          const letter = letterMatch[1].toUpperCase();
          let val = letterMatch[2].trim();
          val = val.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

          options.push(val);
          if (isCorrect) detectedCorrectAnswer = letter;
      }
    });

    // 3. ĐỐI CHIẾU ĐÁP ÁN TỪ BẢNG ĐÁP ÁN DƯỚI CÙNG
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

    // 4. BỔ SUNG LỜI GIẢI TỰ LUẬN TỪ BẢNG ĐÁP ÁN DƯỚI CÙNG VÀO ĐÚNG CÂU
    if (qNumber && globalEssayAnswers[qNumber]) {
        if (!essayAnswerText) essayAnswerText = globalEssayAnswers[qNumber];
        else essayAnswerText += "<br/><br/>" + globalEssayAnswers[qNumber];
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
        videoUrl: "", 
        options: options, 
        correctAnswer: correctAnswer,
        essayAnswerText: essayAnswerText, 
        difficulty: "medium" 
    };

    if (isForPreview) return { ...baseData, tempId: `ext_prev_${Date.now()}_${Math.random()}` };
    return baseData;
  });
};

/**
 * Hàm đọc file Word thông qua FileReader và Mammoth, sau đó bóc tách thành Array câu hỏi.
 */
export const processWordFile = (file, isForPreview = false) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        const questions = extractQuestionsFromText(text, isForPreview);
        resolve({ text, questions });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};