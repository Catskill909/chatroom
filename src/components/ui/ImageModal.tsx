import React from "react";

interface ImageModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ open, imageUrl, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all">
      <button
        aria-label="Close image preview"
        onClick={onClose}
        className="absolute top-8 right-8 text-white bg-black/60 rounded-full p-2 hover:bg-white/10 hover:text-red-400 transition-colors shadow-xl focus:outline-none"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img
        src={imageUrl}
        alt="Full preview"
        className="max-h-[80vh] max-w-[90vw] rounded-lg border-2 border-white shadow-2xl object-contain"
        style={{ boxShadow: "0 0 0 8px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
};

export default ImageModal;
