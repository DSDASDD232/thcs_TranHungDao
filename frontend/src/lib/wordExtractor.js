import mammoth from "mammoth";

// 1. HÀM TỰ ĐỘNG CẮT CÁC CHỮ BỊ DÍNH TRONG WORD
export const sanitizeRawText = (text) => {
  let t = text;
  
  // Sửa lỗi dính chữ trước "Câu X:" (VD: "2026Câu 1:" -> "2026\nCâu 1:")
  t = t.replace(/([^\n\s])\s*(Câu\s+\d+\s*[:.])/gi, "$1\n$2");
  
  // Sửa lỗi dính chữ trước đáp án A., B., C... (VD: "là:A." -> "là:\nA.")
  // Quét rộng từ A đến P (16 đáp án tối đa)
  t = t.replace(/([^\n\s])\s*(\*?[A-P][.)]\s)/g, "$1\n$2");
  
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
      
      // Kịch bản 1: Đáp án ghi rõ ràng (1. A | Câu 2: B)
      const numberedAnsRegex = /(?:Câu\s*)?(\d+)\s*[:.-]?\s*([A-P])(?!\w)/gi;
      let match;
      let foundNumbered = false;
      while ((match = numberedAnsRegex.exec(answerPart)) !== null) {
          globalAnswers[match[1]] = match[2].toUpperCase(); 
          foundNumbered = true;
      }

      // Kịch bản 2: Đáp án chỉ là cột chữ dọc trơ trọi (A \n B \n C)
      if (!foundNumbered) {
          // Lấy đoạn đầu tiên trước khi vào phần "Câu 1: Lời giải..."
          const answerListPart = answerPart.split(/(?:^|\n)\s*(?:Câu|Bài)\s+1\s*[:.]/i)[0];
          const letterRegex = /^[ \t]*([A-P])[ \t]*$/gm;
          let letMatch;
          let qIndex = 1;
          while ((letMatch = letterRegex.exec(answerListPart)) !== null) {
              globalAnswers[qIndex] = letMatch[1].toUpperCase();
              qIndex++;
          }
      }

      // Lấy lời giải chi tiết và bắt đáp án từ bên trong đó
      const ansBlocks = answerPart.split(/(?=(?:^|\n|\s)(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.])/i);
      ansBlocks.forEach(ansBlock => {
           const qMatch = ansBlock.match(/^\s*(?:Câu|Bài)\s+(\d+)(?:\s*[([].*?[)\]])?\s*[:.]/i);
           if (qMatch) {
               const qNum = qMatch[1];
               let explanation = ansBlock.replace(/^\s*(?:Câu|Bài)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
               
               // Dò tìm "Đáp án đúng là X" trong lời giải
               const ansLetterMatch = explanation.match(/(?:đáp án(?: đúng)? (?:là|chọn)|chọn đáp án|chọn)\s*([A-P])\b/i);
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

    // TÁCH CÁC ĐÁP ÁN ĐỘNG (Bao nhiêu đáp án lấy bấy nhiêu, max 16)
    const optionSplitRegex = /(?:^|\n|\t|\s+)\s*(\*?)\s*([A-P])[.)]\s+/;
    const optionParts = questionBody.split(optionSplitRegex);
    
    content = optionParts[0].replace(/^\s*(?:Câu|Bài|Question)\s+\d+(?:\s*[([].*?[)\]])?\s*[:.]\s*/i, "").trim();
    content = content.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();

    let detectedCorrectAnswer = null;

    // Vòng lặp gom đáp án
    for (let i = 1; i < optionParts.length; i += 3) {
        let isCorrectMark = optionParts[i] === '*';
        let letter = optionParts[i + 1].toUpperCase();
        let optText = optionParts[i + 2] ? optionParts[i + 2].trim() : "";

        // Tránh bắt nhầm phần tiêu đề kế tiếp
        optText = optText.split(/\n\s*PHẦN\s+[IVXLCDM]+\b/i)[0].trim();
        options.push(optText);

        if (isCorrectMark) detectedCorrectAnswer = letter;
    }

    // Đối chiếu đáp án
    if (detectedCorrectAnswer) {
        correctAnswer = detectedCorrectAnswer;
    } else if (essayAnswerText.match(/^[A-P]$/i)) { 
        correctAnswer = essayAnswerText.toUpperCase();
        essayAnswerText = ""; 
    } else if (qNumber && globalAnswers[qNumber]) {
        correctAnswer = globalAnswers[qNumber];
    } else {
        correctAnswer = "A"; // Mặc định
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