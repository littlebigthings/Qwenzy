import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  step?: number;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  maxWidth?: string;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  step,
  children,
  closeOnBackdrop = true,
  maxWidth = "md",
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "xs": return "max-w-xs";
      case "sm": return "max-w-sm";
      case "md": return "max-w-md";
      case "lg": return "max-w-lg";
      case "xl": return "max-w-xl";
      case "2xl": return "max-w-2xl";
      case "3xl": return "max-w-3xl";
      case "4xl": return "max-w-4xl";
      case "5xl": return "max-w-5xl";
      case "6xl": return "max-w-6xl";
      case "7xl": return "max-w-7xl";
      default: return "max-w-md";
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-lg w-full ${getMaxWidthClass()} mx-auto overflow-hidden`}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        )}
        
        {(step !== undefined || title) && (
          <div className="p-6 pb-0">
            {step !== undefined && (
              <div className="text-sm text-gray-500 font-medium mb-1">
                Step {step}
              </div>
            )}
            
            {title && (
              <h2 className="text-2xl font-medium text-gray-800 mb-1">{title}</h2>
            )}
            
            {subtitle && (
              <p className="text-gray-500 text-sm mb-4">{subtitle}</p>
            )}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
};

export default Modal;
