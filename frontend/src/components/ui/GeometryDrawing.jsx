import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

const GeometryDrawing = ({ onSaveImage, onCancel }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hàm khởi tạo GeoGebra sau khi tải xong Script
    const loadGeoGebra = () => {
      const parameters = {
        id: "ggbApplet",
        width: 900,        // Chiều rộng bảng vẽ
        height: 600,       // Chiều cao bảng vẽ
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
    <div className="flex flex-col gap-4 w-full">
      {/* Màn hình chờ load */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-3" />
          <p className="text-slate-500 font-medium animate-pulse">Đang nạp công cụ Vẽ hình GeoGebra...</p>
        </div>
      )}
      
      {/* Vùng chứa bảng vẽ */}
      <div className={`w-full flex justify-center rounded-2xl overflow-hidden border-2 border-sky-200 shadow-inner bg-white ${isLoading ? 'hidden' : 'block'}`}>
        <div id="ggb-element" style={{ margin: '0 auto' }}></div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-2">
        <Button variant="outline" onClick={onCancel} className="h-12 rounded-xl text-slate-500 font-bold border-slate-200 hover:bg-slate-100">
          Hủy bỏ
        </Button>
        <Button onClick={captureDrawing} disabled={isSaving || isLoading} className="h-12 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-200 px-6 transition-all">
          {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Camera className="w-5 h-5 mr-2" />}
          Chụp và nộp hình này
        </Button>
      </div>
    </div>
  );
};

export default GeometryDrawing;