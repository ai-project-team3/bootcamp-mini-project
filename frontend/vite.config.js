import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 백엔드를 같은 오리진으로 프록시한다.
//
// 프론트와 백엔드가 다른 포트에 있으면 팀원끼리 테스트할 때마다 주소를 두 개
// 열어야 하고, CORS와 QR 링크(window.location.origin 기준)가 전부 어긋난다.
// 여기로 묶어두면 **주소 하나만 공유하면 된다** — 같은 Wi-Fi든 터널이든.
const API = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0으로 열어 같은 네트워크의 폰에서 들어올 수 있게 한다.
    host: true,
    // 터널(cloudflared·ngrok)이 붙여주는 임의 도메인을 막지 않는다.
    allowedHosts: true,
    proxy: {
      '/rooms': { target: API, changeOrigin: true },
      '/health': { target: API, changeOrigin: true },
    },
  },
})
