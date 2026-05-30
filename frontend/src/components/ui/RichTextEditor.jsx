import React, { useRef, useMemo, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from "katex";
import "katex/dist/katex.min.css";
import 'mathlive'; 
import { Button } from "@/components/ui/button";
import { Calculator, CheckCircle2, X } from "lucide-react";

// Gán thư viện Toán học vào window để trình soạn thảo nhận diện được
window.katex = katex;

// Tạo Icon nút gõ Toán học trên thanh công cụ (Chữ Sigma)
const CustomMathIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>`;
const icons = Quill.import('ui/icons');
icons['customMathLive'] = CustomMathIcon;

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);
  const mathFieldRef = useRef(null);
  
  // Trạng thái bật/tắt thanh gõ Toán dính liền
  const [isMathPanelOpen, setIsMathPanelOpen] = useState(false);

  // Mẹo để gọi state React từ bên trong cấu hình useMemo của Quill
  const toggleMathPanel = useRef(() => {});
  toggleMathPanel.current = () => setIsMathPanelOpen((prev) => !prev);

  // Cấu hình thanh công cụ Quill (ĐÃ BỎ NÚT VIDEO)
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        ['customMathLive'], // Nút chữ Sigma
        ['image'], // Chỉ giữ lại nút Image, đã xóa 'video'
        ['clean']
      ],
      handlers: {
        customMathLive: function() {
           toggleMathPanel.current();
        }
      }
    },
  }), []);

  // Fix z-index của bàn phím ảo MathLive để nó nổi lên trên cùng
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

  // Tự động focus vào ô gõ Toán khi thanh này mở ra
  useEffect(() => {
    if (isMathPanelOpen && mathFieldRef.current) {
      setTimeout(() => mathFieldRef.current.focus(), 150);
    }
  }, [isMathPanelOpen]);

  // Xử lý chèn Toán vào trình soạn thảo Quill
  const insertMathToQuill = () => {
    if (!quillRef.current || !mathFieldRef.current) return;
    
    const latex = mathFieldRef.current.value; 
    if (!latex) {
        setIsMathPanelOpen(false);
        return;
    }

    const editor = quillRef.current.getEditor();
    const cursorPosition = editor.getSelection()?.index || editor.getLength();
    
    // Chèn công thức vào vị trí con trỏ
    editor.insertEmbed(cursorPosition, 'formula', latex);
    editor.insertText(cursorPosition + 1, ' '); // Cách ra một khoảng cho dễ nhìn
    editor.setSelection(cursorPosition + 2);
    
    // Xóa ô gõ và tự động thu gọn thanh Toán học
    mathFieldRef.current.value = '';
    setIsMathPanelOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
        {/* KHUNG SOẠN THẢO CHÍNH (ĐÃ TINH CHỈNH CSS CHO ĐẸP VÀ MỀM MẠI HƠN) */}
        <div className="bg-white rounded-xl border border-sky-100 overflow-hidden shadow-sm focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
          <div className="
            [&_.ql-editor]:min-h-[120px] 
            [&_.ql-editor]:text-base 
            [&_.ql-editor]:text-slate-700
            [&_.ql-editor.ql-blank::before]:text-slate-400
            [&_.ql-editor.ql-blank::before]:font-medium
            [&_.ql-editor.ql-blank::before]:italic
            
            [&_.ql-toolbar]:bg-slate-50/80 
            [&_.ql-toolbar]:border-none 
            [&_.ql-toolbar]:border-b 
            [&_.ql-toolbar]:border-slate-100 
            [&_.ql-toolbar]:py-2
            [&_.ql-toolbar]:px-4
            
            [&_.ql-container]:border-none
            [&_.ql-picker-label]:font-bold
            [&_.ql-picker-label]:text-slate-600
            [&_button:hover_.ql-stroke]:stroke-sky-500
            [&_button:hover_.ql-fill]:fill-sky-500
          ">
            <ReactQuill 
              ref={quillRef}
              theme="snow" 
              value={value || ''} 
              onChange={onChange} 
              modules={modules}
              placeholder={placeholder || "Gõ ĐỀ BÀI hoặc DÁN ẢNH CÔNG THỨC TOÁN..."}
            />
          </div>
        </div>

        {/* THANH CÔNG CỤ GÕ TOÁN (HIỂN THỊ DÍNH LIỀN BÊN DƯỚI NẾU BẤM NÚT Σ) */}
        {isMathPanelOpen && (
          <div className="bg-sky-50/80 border-2 border-sky-200 rounded-xl p-3 sm:p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-3 border-b border-sky-100 pb-2">
               <h4 className="font-black text-sky-800 text-sm flex items-center gap-2">
                 <Calculator className="w-4 h-4 text-sky-500"/> Công cụ gõ Toán
                 <span className="font-medium text-xs text-sky-600 hidden sm:inline ml-2">- Bấm biểu tượng Bàn phím bên góc phải ô trắng để chọn Phân số, Căn...</span>
               </h4>
               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-colors" onClick={() => setIsMathPanelOpen(false)}>
                 <X className="w-4 h-4" />
               </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 bg-white rounded-lg">
                {/* COMPONENT GÕ TOÁN CỦA MATHLIVE */}
                <math-field 
                   ref={mathFieldRef}
                   style={{ 
                       fontSize: '24px', 
                       width: '100%', 
                       padding: '12px 16px', 
                       backgroundColor: 'white', 
                       borderRadius: '8px', 
                       border: '1px solid #bae6fd',
                   }}
                >
                </math-field>
              </div>
              
              <Button onClick={insertMathToQuill} className="bg-sky-500 hover:bg-sky-600 text-white h-[60px] sm:h-auto sm:self-stretch px-6 rounded-lg font-black shadow-md shrink-0 transition-transform active:scale-95">
                 <CheckCircle2 className="w-5 h-5 mr-2" /> Chèn vào ô
              </Button>
            </div>
          </div>
        )}
    </div>
  );
};

export default RichTextEditor;