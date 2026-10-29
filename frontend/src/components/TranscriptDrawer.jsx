import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, Copy, Check } from 'lucide-react';
import { getTranscript } from '../services/api';

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TranscriptDrawer({ isOpen, onClose, videoId, videoTitle }) {
  const [transcriptData, setTranscriptData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true);
      setError(null);
      getTranscript(videoId)
        .then((data) => {
          setTranscriptData(data);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [isOpen, videoId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const segments = transcriptData?.segments || [];
  const filteredSegments = searchQuery.trim()
    ? segments.filter((seg) =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments;

  const copyFullTranscript = () => {
    if (!segments.length) return;
    const fullText = segments
      .map((s) => `[${formatTimestamp(s.start)}] ${s.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Click-outside-to-close
  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Transcript viewer"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-[13px] font-bold text-slate-900">Transcript</h2>
            <p className="text-[11px] text-slate-500 truncate max-w-xs">{videoTitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyFullTranscript}
              disabled={!segments.length}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy All'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-slate-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-[12px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
          {transcriptData && (
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              {filteredSegments.length} of {transcriptData.total_segments} segments
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-[12px] gap-2">
              <svg className="animate-spin h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading captions...</span>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              {error}
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-[12px]">
              No results for "{searchQuery}"
            </div>
          ) : (
            filteredSegments.map((seg, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-50/40 transition-colors group"
              >
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seg.start)}s`}
                  target="_blank"
                  rel="noreferrer"
                  title="Jump to timestamp"
                  className="font-mono text-[11px] text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 shrink-0 mt-px transition-colors"
                >
                  <Clock className="w-2.5 h-2.5" />
                  {formatTimestamp(seg.start)}
                </a>
                <p className="text-[12px] text-slate-600 leading-relaxed flex-1">
                  {seg.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
