import mammoth from "mammoth";

// 1. HÀM TỰ ĐỘNG CẮT CÁC CHỮ BỊ DÍNH VÀ XUỐNG DÒNG TRONG WORD
export const sanitizeRawText = (text) => {
  if (!text) return "";
  let t = text;
  
  // Ép xuống 2 dòng trước chữ "Câu X:" để dễ nhìn trên UI (VD: "2026Câu 1:" -> "2026\n\nCâu 1:")
  t = t.replace(/([^\n\s])\s*(Câu\s+\d+\s*[:.])/gi, "$1\n\n$2");
  
  // Ép xuống 1 dòng trước đáp án A., B., C... nếu nó bị dính chữ (VD: "sángB. Chỉ" -> "sáng\nB. Chỉ")
  t = t.replace(/([^\n\s])\s*(\*?[A-P][.)])/g, "$1\n$2");
  
  return t;
};

/**
 * Hàm phân tích văn bản thô (thường lấy từ Word) để trích xuất ra các câu hỏi trắc nghiệm/tự luận.
 */
export const extractQuestionsFromText = (text, isForPreview = false) => {
  // Đi qua bộ lọc chống dính chữ trước
  const cleanText = sanitizeRawText(text);

  // CẮT PHẦN ĐỀ BÀI VÀ PHẦN ĐÁP ÁN
  const textParts = cleanText.split(/(?:-{1,}\s*HẾT\s*-{1,}|\n\s*HẾT\s*\n|ĐÁP ÁN VÀ HƯỚNG DẪN|BẢNG ĐÁP ÁN|ĐÁP ÁN CHI TIẾT)/i);
  let mainPart = textParts[0]; 

  let globalAnswers = {};
  let globalEssayAnswers = {};

  if (textParts.length > 1) {
      const answerPart = textParts.slice(1).join("\n");
      
      // Kịch bản 1: Quét đáp án dạng bảng / cột dọc (A, B, C đứng 1 mình 1 dòng, hoặc 1. A, 2. B)
      // 👉 FIX LỖI \r TRÊN WINDOWS: Thêm \r vào regex để không bị trượt dấu xuống dòng
      const answerListPart = answerPart.split(/(?:^|\n)\s*(?:Câu|Bài)\s+1\s*[:.]/i)[0];
      const lineRegex = /^[ \t]*(?:(?:\d+)[ \t]*[:.-]?[ \t]*)?([A-P])[ \t\r]*[.)]?[ \t\r]*$/gm;
      let letMatch;
      let qIndex = 1;
      let foundVertical = false;
      while ((letMatch = lineRegex.exec(answerListPart)) !== null) {
          globalAnswers[qIndex] = letMatch[1].toUpperCase();
          qIndex++;
          foundVertical = true;
      }

      // Kịch bản 2: Nếu không có cột dọc, tìm dạng nằm ngang "Câu 1: A"
      if (!foundVertical) {
          // 👉 FIX LỖI BẮT NHẦM CHỮ M (Mặt Trời): Bắt buộc sau chữ A-P phải là khoảng trắng hoặc dấu câu
          const numberedAnsRegex = /(?:Câu|Bài)\s*(\d+)\s*[:.-]\s*([A-P])(?=[\s\n\r.,;]|$)/gi;
          let match;
          while ((match = numberedAnsRegex.exec(answerPart)) !== null) {
              globalAnswers[match[1]] = match[2].toUpperCase(); 
          }
      }

      // Lấy lời giải chi tiết và bắt đáp án từ bên trong đó
      const ansBlocks = answerPart.split(/(?=(?:^|\n|\s)(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.])/i);
      ansBlocks.forEach(ansBlock => {
           const qMatch = ansBlock.match(/^\s*(?:Câu|Bài)\s+(\d+)(?:\s*[([].*?[)\]])?\s*[:.]/i);
           if (qMatch) {
               const qNum = qMatch[1];
               let explanation = ansBlock.replace(/^\s*(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
               
               // 👉 FIX LỖI TƯƠNG TỰ Ở PHẦN LỜI GIẢI
               const ansLetterMatch = explanation.match(/(?:đáp án(?: đúng)? (?:là|chọn)|chọn đáp án|chọn)\s*([A-P])(?=[\s\n\r.,;]|$)/i);
               if (ansLetterMatch) {
                   globalAnswers[qNum] = ansLetterMatch[1].toUpperCase();
               }

               if (explanation) {
                   globalEssayAnswers[qNum] = explanation;
               }
           }
      });
  }

  // TÁCH CÁC CÂU HỎI TRONG PHẦN ĐỀ BÀI
  const rawBlocks = mainPart.split(/(?=(?:^|\n)\s*(?:Câu|Bài|Question)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.])/i);
  
  const questionBlocks = rawBlocks.filter(block => {
      return /^\s*(?:Câu|Bài|Question)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]/i.test(block);
  });
  
  return questionBlocks.map((block) => {
    let type = "multiple_choice";
    let content = "";
    let options = [];
    let correctAnswer = "A";
    let essayAnswerText = "";

    const qMatch = block.match(/^\s*(?:Câu|Bài|Question)\s+(\d+)(?:\s*[([].*?[)\]])?\s*[:.]/i);
    const qNumber = qMatch ? qMatch[1] : null;

    const partsByExplanation = block.split(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|HDG|Giải|Đáp án)\s*[:.]\s*/i);
    let questionBody = partsByExplanation[0];
    
    if (partsByExplanation.length > 1) {
        essayAnswerText = partsByExplanation[1].trim();
    }

    const optionSplitRegex = /(?:^|\n|\t|\s+)\s*(\*?)\s*([A-P])[.)]\s*/;
    const optionParts = questionBody.split(optionSplitRegex);
    
    content = optionParts[0].replace(/^\s*(?:Câu|Bài|Question)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
    content = content.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

    let detectedCorrectAnswer = null;

    // Vòng lặp gom đáp án
    for (let i = 1; i < optionParts.length; i += 3) {
        let isCorrectMark = optionParts[i] === '*';
        let letter = optionParts[i + 1].toUpperCase();
        let optText = optionParts[i + 2] ? optionParts[i + 2].trim() : "";

        optText = optText.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();
        options.push(optText);

        if (isCorrectMark) detectedCorrectAnswer = letter;
    }

    // Đối chiếu đáp án chuẩn xác
    if (detectedCorrectAnswer) {
        correctAnswer = detectedCorrectAnswer;
    } else if (qNumber && globalAnswers[qNumber]) {
        correctAnswer = globalAnswers[qNumber];
    } else if (essayAnswerText && essayAnswerText.match(/^[A-P]$/i)) { 
        correctAnswer = essayAnswerText.toUpperCase();
        essayAnswerText = ""; 
    } else {
        correctAnswer = "A"; 
    }

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

export const processWordFile = (file, isForPreview = false) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        // 👉 FIX LỖI GIAO DIỆN VĂN BẢN THÔ BỊ DÍNH CỤC: 
        // Dọn dẹp text NGAY LÚC NÀY trước khi ném lên UI
        const cleanText = sanitizeRawText(result.value);
        
        const questions = extractQuestionsFromText(cleanText, isForPreview);
        
        // Trả về cleanText (đã xuống dòng đẹp đẽ) thay vì text gốc
        resolve({ text: cleanText, questions });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};