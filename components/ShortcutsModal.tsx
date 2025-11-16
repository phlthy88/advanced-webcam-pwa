
import React from 'react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const Shortcut: React.FC<{ keys: string, description: string }> = ({ keys, description }) => (
    <tr>
        <td className="p-3">
            <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">{keys}</kbd>
        </td>
        <td className="p-3 text-gray-700 dark:text-gray-300">{description}</td>
    </tr>
);

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">&times;</button>
        </div>
        <div className="p-4">
            <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <Shortcut keys="Arrow Keys" description="Pan/Tilt control" />
                    <Shortcut keys="+ / -" description="Zoom in/out" />
                    <Shortcut keys="R" description="Reset PTZ position" />
                    <Shortcut keys="M" description="Toggle mirror" />
                    <Shortcut keys="F" description="Fullscreen preview" />
                    <Shortcut keys="?" description="Show this shortcuts panel" />
                    <Shortcut keys="Esc" description="Close this panel or exit fullscreen" />
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
