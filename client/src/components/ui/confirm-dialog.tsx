import React from 'react';

type ConfirmDialogProps = {
  logo: React.ReactNode | string;
  title: string;
  subtitle: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  onClose: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  logo,
  title,
  subtitle,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryClick,
  onSecondaryClick,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="mt-1">
          {typeof logo === "string" ? (
            <img src={logo} alt="logo" className="w-6 h-6 rounded-full" />
            ) : (
            logo
            )}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-base font-medium text-gray-800">{title}</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
            </div>
            <p className="text-sm text-gray-600 mb-6">{subtitle}</p>
            <div className="flex gap-2">
              <button
                onClick={onPrimaryClick}
                className="px-4 py-2 bg-[#2c6e49] text-white text-sm rounded"
              >
                {primaryButtonText}
              </button>
              <button
                onClick={onSecondaryClick}
                className="px-4 py-2 bg-gray-100 text-gray-400 text-sm rounded"
              >
                {secondaryButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
