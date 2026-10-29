import React from 'react';
import { Trash2, BookOpen } from 'lucide-react';

function Logo({ size = 'md' }) {
  const dims = size === 'sm' ? 'w-8 h-[22px]' : 'w-10 h-7';
  const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  return (
    <div className={`${dims} rounded-lg bg-red-600 flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 24 24" className={icon}>
        <polygon points="16,6 7,12 16,18" fill="white" />
      </svg>
    </div>
  );
}

export { Logo };

export default function Navbar({
  serverStatus,
  onClearChat,
  chatLength,
  onOpenTranscript,
  hasActiveVideo,
  showSidebar,
  onToggleSidebar,
}) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Logo + brand */}
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="text-[17px] font-extrabold tracking-tight text-slate-900">
          YOU<span className="text-red-600">CHAT</span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-px rounded bg-red-50 text-red-600 border border-red-100 hidden sm:inline">
          RAG
        </span>
      </div>

      {/* Center: one-liner */}
      <p className="hidden lg:block text-[12px] text-slate-500 font-medium max-w-md truncate">
        Chat with any YouTube video — grounded in transcripts, zero hallucinations
      </p>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Mobile sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg"
        >
          {showSidebar ? 'Chat' : 'Videos'}
        </button>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
          <span className="relative flex h-1.5 w-1.5">
            {serverStatus === 'online' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            )}
          </span>
          <span className="hidden sm:inline">
            {serverStatus === 'online' ? 'Online' : 'Connecting'}
          </span>
        </div>

        {hasActiveVideo && (
          <button
            onClick={onOpenTranscript}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Transcript
          </button>
        )}

        {chatLength > 0 && (
          <button
            onClick={onClearChat}
            title="Clear conversation"
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
