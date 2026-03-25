import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';

// Xử lý __dirname cho ES Module trong Vite
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  // Đảm bảo base là '/' để build ra đường dẫn tuyệt đối chuẩn cho Server
  base: '/', 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Đảm bảo thư mục đầu ra là dist
    outDir: 'dist',
    // Gom các file nhỏ lại để tránh lỗi chunk quá lớn
    chunkSizeWarningLimit: 1000,
  }
});