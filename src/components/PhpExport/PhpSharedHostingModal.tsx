import React, { useState } from 'react';
import { 
  PHP_PROJECT_FILES, 
  downloadPhpProjectZip, 
  downloadSinglePhpFile 
} from '../../services/phpProjectService';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  Server, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  FolderArchive,
  ExternalLink,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

interface PhpSharedHostingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhpSharedHostingModal: React.FC<PhpSharedHostingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const currentFile = PHP_PROJECT_FILES[selectedFileIndex] || PHP_PROJECT_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadPhpProjectZip();
    } catch (err) {
      console.error('Failed to generate PHP zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  PHP Standalone Edition
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-medium">
                  PHP 7.4 - 8.3
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Standalone PHP package for cPanel, XAMPP, Plesk, Hostinger, Bluehost, or any standard LAMP server.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isZipping ? 'Generating...' : 'Download ZIP'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border-b border-white/10 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-zinc-300 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> No Node.js / npm build
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Built-in cURL Proxy (Zero CORS)
            </span>
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> OAuth 2.0 Engine & Token Flows
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> No MySQL setup required
            </span>
          </div>
          <span className="text-zinc-500 text-[11px]">
            Single FTP upload to <code className="text-zinc-300 bg-black/40 px-1 py-0.5 rounded">public_html/</code>
          </span>
        </div>

        {/* Content Body: Sidebar Files + Code Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer */}
          <div className="w-64 border-r border-white/10 bg-zinc-950/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-white/10 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Project Package Files
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {PHP_PROJECT_FILES.map((file, idx) => (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                    selectedFileIndex === idx
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${
                    selectedFileIndex === idx ? 'text-indigo-400' : 'text-zinc-500'
                  }`} />
                  <div className="truncate">
                    <div className="truncate font-mono">{file.filename}</div>
                    <div className="text-[10px] text-zinc-500 truncate font-normal">
                      {file.description.split('(')[0]}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Deploy Checklist */}
            <div className="p-3 border-t border-white/10 bg-zinc-950/80 text-[11px] space-y-1.5 text-zinc-400">
              <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>3-Step Shared Host Setup</span>
              </div>
              <p>1. Upload files to <code className="text-indigo-300">public_html/</code></p>
              <p>2. Set <code className="text-indigo-300">data/</code> permission to 755</p>
              <p>3. Open your domain in browser!</p>
            </div>
          </div>

          {/* Main Code View */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
            {/* Action Bar */}
            <div className="p-3 border-b border-white/10 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">
                  {currentFile.filename}
                </span>
                <span className="text-xs text-zinc-500 hidden sm:inline">
                  — {currentFile.description}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadSinglePhpFile(currentFile.filename, currentFile.code)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-indigo-200/90 leading-relaxed bg-zinc-950">
              <pre className="whitespace-pre">{currentFile.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
