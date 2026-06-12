import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Sparkles } from "lucide-react";

const GeometryDrawing = ({ onSaveImage, onCancel }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hàm khởi tạo GeoGebra sau khi tải xong Script
    const loadGeoGebra = () => {
      const parameters = {
        id: "ggbApplet",
        width: 940,        // Mở rộng bề ngang tối đa cho học sinh vẽ thoải mái
        height: 500,       // Chiều cao chuẩn để không bị Modal cắt mất
        showToolBar: true,
        showAlgebraInput: true,
        showMenuBar: false,
        useBrowserForJS: false,
        language: "vi",
        appName: "classic" // 💡 Đổi thành "3d" nếu muốn vẽ không gian Oxyz
      };

      // Gọi API gốc của GeoGebra để nhúng vào thẻ div
      const applet = new window.GGBApplet(parameters, true);
      applet.inject("ggb-element");
      setIsLoading(false);
    };

    // Kiểm tra xem web đã tải file thư viện của GeoGebra chưa
    if (!document.getElementById("ggb-script")) {
      const script = document.createElement("script");
      script.id = "ggb-script";
      script.src = "https://www.geogebra.org/apps/deployggb.js"; // File thư viện gốc
      script.onload = loadGeoGebra;
      document.body.appendChild(script);
    } else {
      // Nếu có sẵn rồi thì render luôn
      setTimeout(loadGeoGebra, 200); 
    }
  }, []);

  const captureDrawing = () => {
    setIsSaving(true);
    try {
      // Do không dùng iframe, ta có thể lấy ảnh thoải mái không bị chặn
      if (window.ggbApplet) {
        // Lấy ảnh định dạng Base64 (tỉ lệ scale 1, ko nền trong suốt, độ phân giải 300)
        const base64Data = window.ggbApplet.getPNGBase64(1, false, 300);
        onSaveImage(`data:image/png;base64,${base64Data}`);
      } else {
        alert("Bảng vẽ chưa sẵn sàng!");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi chụp ảnh! Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 👉 ĐƯA NÚT NỘP BÀI LÊN TRÊN CÙNG ĐỂ KHÔNG BAO GIỜ BỊ KHUẤT */}
      <div className="flex items-center justify-between bg-sky-50 px-4 py-2.5 rounded-xl border border-sky-100 shadow-sm">
         <p className="text-sm font-bold text-sky-800 hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> Vẽ xong hãy bấm nút bên phải để nộp 👉
         </p>
         <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none h-10 rounded-lg text-slate-500 font-bold hover:bg-slate-200">
             Đóng lại
           </Button>
           <Button onClick={captureDrawing} disabled={isSaving || isLoading} className="flex-1 sm:flex-none h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm px-4">
             {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
             Chụp & Nộp hình này
           </Button>
         </div>
      </div>

      {/* Màn hình chờ load */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-3" />
          <p className="text-slate-500 font-medium animate-pulse">Đang nạp bảng vẽ siêu to khổng lồ...</p>
        </div>
      )}
      
      {/* Vùng chứa bảng vẽ */}
      <div className={`w-full flex justify-center rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-white ${isLoading ? 'hidden' : 'block'}`}>
        <div id="ggb-element" style={{ margin: '0 auto' }}></div>
      </div>
    </div>
  );
};

export default GeometryDrawing;