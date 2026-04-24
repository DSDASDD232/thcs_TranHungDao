import React, { useRef, useMemo } from 'react';
import JoditEditor from 'jodit-react';
import axios from '../../lib/axios';

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editor = useRef(null);

  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: placeholder || 'Nhập nội dung...',
      height: 250,
      toolbarButtonSize: 'small',
      buttons: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|',
        'font', 'fontsize', 'paragraph', '|',
        'image', 'video', 'table', 'link', '|',
        'align', 'undo', 'redo', 'hr', '|',
        'superscript', 'subscript', 'source'
      ],
      // 👉 CẤU HÌNH UPLOADER ĐỂ BẮN ẢNH LÊN CLOUDINARY THÔNG QUA BACKEND
      uploader: {
        insertImageAsBase64URI: false, // TẮT lưu Base64
        url: `${axios.defaults.baseURL}/upload/editor`, // Link API Backend của bạn
        format: 'json',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        isSuccess: function (resp) {
          return resp.success || !resp.error;
        },
        process: function (resp) {
          // 👉 Đã xóa phần ghép chuỗi URL rườm rà.
          // Vì API giờ trả về link Cloudinary xịn (VD: https://res.cloudinary.com/...)
          return {
            files: [resp.url], 
            path: resp.url,
            baseurl: '',
            error: resp.error ? 1 : 0,
            msg: resp.msg || ''
          };
        },
        defaultHandlerSuccess: function (data) {
          // Cắm thẳng thẻ <img> chứa link Cloudinary vào văn bản
          if (data.files && data.files.length) {
            this.s.insertImage(data.files[0]); 
          }
        },
        error: function (e) {
          console.error("Lỗi upload ảnh:", e);
          alert("Lỗi dán ảnh lên server!");
        }
      },
      style: {
        fontFamily: 'Inter, sans-serif',
      },
    }),
    [placeholder]
  );

  return (
    <div className="rich-text-editor-container border rounded-xl overflow-hidden shadow-sm">
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={newContent => onChange(newContent)}
      />
    </div>
  );
};

export default RichTextEditor;