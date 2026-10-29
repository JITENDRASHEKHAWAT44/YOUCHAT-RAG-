import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  FileText,
  ChevronRight,
  Tv,
  ListVideo,
} from 'lucide-react';

export default function VideoPanel({
  activeVideo,
  isLoadingVideo,
  onLoadVideo,
  cachedVideos,
  onSelectCachedVideo,
  onSelectPrompt,
  onOpenTranscript,
}) {
  const [urlInput, setUrlInput] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onLoadVideo(urlInput.trim());
  };

  const samplePrompts = [
    'Summarize the key points of this video.',
    'What is the main argument being made?',
    'List all actionable advice mentioned.',
    'What was the final conclusion?',
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 lg:p-5 space-y-4">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <label className="text-[13px] font-bold text-slate-800 block">
          Load a YouTube video
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste URL or video ID"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isLoadingVideo}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoadingVideo || !urlInput.trim()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isLoadingVideo ? (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Load'
            )}
          </button>
        </div>
      </form>

      {/* Active Video */}
      {activeVideo && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Thumbnail / Embed */}
          <div className="relative aspect-video bg-slate-100 overflow-hidden">
            {showEmbed ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.video_id}?autoplay=1`}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div
                onClick={() => setShowEmbed(true)}
                className="group relative w-full h-full cursor-pointer"
              >
                <img
                  src={activeVideo.thumbnail_url}
                  alt={activeVideo.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <div className="w-12 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <polygon points="16,6 7,12 16,18" fill="white" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">
                  {activeVideo.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                  {activeVideo.author}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowEmbed(!showEmbed)}
                  className={`p-1.5 rounded-md border transition-colors ${
                    showEmbed
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                  }`}
                  title={showEmbed ? 'Hide player' : 'Play video'}
                >
                  <Tv className="w-3.5 h-3.5" />
                </button>
                <a
                  href={activeVideo.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-colors"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Indexed
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                {activeVideo.video_id}
              </span>
              <button
                onClick={onOpenTranscript}
                className="ml-auto text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold sm:hidden"
              >
                <FileText className="w-3 h-3" />
                Transcript
              </button>
            </div>

            {/* Prompts */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Quick questions
              </p>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt(prompt)}
                  className="w-full text-left text-[12px] px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 font-medium transition-colors flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-red-500 transition-colors shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Library */}
      {cachedVideos && cachedVideos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListVideo className="w-4 h-4 text-red-600" />
            <h2 className="text-[13px] font-bold text-slate-800">
              Indexed Videos
              <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                {cachedVideos.length}
              </span>
            </h2>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {cachedVideos.map((vid) => {
              const isSelected = activeVideo?.video_id === vid.video_id;
              return (
                <button
                  key={vid.video_id}
                  onClick={() => onSelectCachedVideo(vid)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <img
                    src={vid.thumbnail_url}
                    alt=""
                    className="w-14 h-9 object-cover rounded bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] truncate ${isSelected ? 'font-bold text-red-800' : 'font-medium text-slate-700'}`}>
                      {vid.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {vid.author}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
