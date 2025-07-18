// Dynamic viewport height for mobile browsers
function setAppHeight() {
  document.documentElement.style.setProperty('--oss-app-height', `${window.innerHeight}px`);
}
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
setAppHeight();

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'


createRoot(document.getElementById("root")!).render(<App />);
