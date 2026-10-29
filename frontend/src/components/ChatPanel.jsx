import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Loader2,
  User,
  Copy,
  Check,
  ShieldCheck,
  FileSearch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function ChatPanel({
  messages,
  isGenerating,
  onSendMessage,
  activeVideo,
  onPromptClick,
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSource = (idx) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // -- Empty state --
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto text-center">
          {/* Brand mark */}
          <div className="w-14 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/20 mb-6">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <polygon points="16,6 7,12 16,18" fill="white" />
            </svg>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {activeVideo
              ? 'Ask anything about this video'
              : 'Paste a YouTube link to get started'}
          </h2>

          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-sm">
            {activeVideo
              ? `Answers are grounded strictly in the transcript of "${activeVideo.title}". If it wasn't said in the video, YouChat tells you so.`
              : 'YouChat extracts captions, indexes them into a FAISS vector store, and answers your questions using only what was spoken in the video.'}
          </p>

          {activeVideo && (
            <div className="mt-8 w-full space-y-2 text-left">
              {[
                'Give me a detailed summary of this video.',
                'What are the key takeaways and action items?',
                'What was the main problem or argument discussed?',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => onPromptClick(q)}
                  className="w-full text-left text-[13px] px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50/50 text-slate-700 hover:text-red-700 font-medium transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input bar pinned to bottom even in empty state */}
        <InputBar
          activeVideo={activeVideo}
          isGenerating={isGenerating}
          inputText={inputText}
          setInputText={setInputText}
          handleSend={handleSend}
          handleKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  // -- Conversation state --
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const hasSources = msg.sources && msg.sources.length > 0;
          const isSourcesOpen = !!expandedSources[idx];

          return (
            <div
              key={idx}
              className={`flex gap-2.5 max-w-2xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant avatar */}
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3">
                    <polygon points="16,6 7,12 16,18" fill="white" />
                  </svg>
                </div>
              )}

              <div className={`space-y-1.5 ${isUser ? 'max-w-[80%]' : 'flex-1 min-w-0'}`}>
                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    isUser
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-strong:text-slate-900 prose-code:text-red-600 prose-code:bg-red-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                {!isUser && (
                  <div className="flex flex-wrap items-center gap-2.5 px-1 text-[11px] text-slate-400">
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      className="flex items-center gap-1 hover:text-red-600 transition-colors font-medium"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Grounded
                    </span>

                    {hasSources && (
                      <button
                        onClick={() => toggleSource(idx)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold transition-colors ml-auto"
                      >
                        <FileSearch className="w-3 h-3" />
                        <span>
                          {isSourcesOpen
                            ? 'Hide'
                            : `${msg.sources.length} sources`}
                        </span>
                        {isSourcesOpen ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Sources */}
                {!isUser && hasSources && isSourcesOpen && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1.5 mt-1">
                    {msg.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="px-3 py-2 rounded-md bg-white border border-slate-100 text-[12px] leading-relaxed text-slate-600 font-mono"
                      >
                        <span className="text-red-600 font-bold mr-1.5">
                          [{src.index}]
                        </span>
                        {src.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User avatar */}
              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex gap-2.5 max-w-2xl mx-auto items-start">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 flex items-center gap-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
              </span>
              <span className="text-[13px] text-slate-500">
                Searching transcript...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <InputBar
        activeVideo={activeVideo}
        isGenerating={isGenerating}
        inputText={inputText}
        setInputText={setInputText}
        handleSend={handleSend}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
}

function InputBar({ activeVideo, isGenerating, inputText, setInputText, handleSend, handleKeyDown }) {
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-white">
      <form onSubmit={handleSend} className="max-w-2xl mx-auto relative flex items-center">
        <input
          type="text"
          placeholder={
            activeVideo
              ? 'Ask about this video...'
              : 'Load a video first'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeVideo || isGenerating}
          className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 text-slate-900 placeholder:text-slate-400 text-[14px] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!activeVideo || isGenerating || !inputText.trim()}
          className="absolute right-1.5 p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-30 disabled:hover:bg-red-600"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
