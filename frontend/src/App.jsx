import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoPanel from './components/VideoPanel';
import ChatPanel from './components/ChatPanel';
import TranscriptDrawer from './components/TranscriptDrawer';
import { checkHealth, getLibrary, loadVideo, sendChatMessage } from './services/api';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [serverStatus, setServerStatus] = useState('checking');
  const [cachedVideos, setCachedVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    checkHealth().then((res) => {
      setServerStatus(res.status === 'online' ? 'online' : 'offline');
    });

    getLibrary().then((data) => {
      if (data?.videos) {
        setCachedVideos(data.videos);
        if (data.videos.length > 0) {
          setActiveVideo({
            video_id: data.videos[0].video_id,
            title: data.videos[0].title,
            author: data.videos[0].author,
            thumbnail_url: data.videos[0].thumbnail_url,
            video_url: `https://www.youtube.com/watch?v=${data.videos[0].video_id}`,
          });
        }
      }
    });
  }, []);

  const handleLoadVideo = async (url) => {
    setIsLoadingVideo(true);
    setErrorMessage(null);
    try {
      const data = await loadVideo(url);
      setActiveVideo(data);
      setMessages([]);
      setShowSidebar(false); // Switch to chat on mobile after loading
      const lib = await getLibrary();
      if (lib?.videos) setCachedVideos(lib.videos);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to index video');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleSelectCachedVideo = (vid) => {
    setActiveVideo({
      video_id: vid.video_id,
      title: vid.title,
      author: vid.author,
      thumbnail_url: vid.thumbnail_url,
      video_url: `https://www.youtube.com/watch?v=${vid.video_id}`,
    });
    setMessages([]);
    setShowSidebar(false);
  };

  const handleSendMessage = async (question) => {
    if (!activeVideo || isGenerating) return;
    setShowSidebar(false); // Switch to chat on mobile

    const userMessage = { role: 'user', content: question };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await sendChatMessage({
        videoId: activeVideo.video_id,
        question,
        history: messages.slice(-4),
      });
      setMessages([
        ...newMessages,
        { role: 'assistant', content: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Something went wrong: ${err.message || 'Unable to reach backend.'}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Navbar
        serverStatus={serverStatus}
        onClearChat={() => setMessages([])}
        chatLength={messages.length}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        hasActiveVideo={!!activeVideo}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((v) => !v)}
      />

      {/* Error bar */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-[12px] text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two-panel layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar — always visible on lg+, toggleable on mobile */}
        <section
          className={`w-full lg:w-[360px] xl:w-[380px] shrink-0 border-r border-slate-200 bg-white h-full overflow-hidden ${
            showSidebar ? 'block' : 'hidden lg:block'
          }`}
        >
          <VideoPanel
            activeVideo={activeVideo}
            isLoadingVideo={isLoadingVideo}
            onLoadVideo={handleLoadVideo}
            cachedVideos={cachedVideos}
            onSelectCachedVideo={handleSelectCachedVideo}
            onSelectPrompt={handleSendMessage}
            onOpenTranscript={() => setIsTranscriptOpen(true)}
          />
        </section>

        {/* Chat — main area */}
        <section
          className={`flex-1 h-full overflow-hidden flex flex-col ${
            showSidebar ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            activeVideo={activeVideo}
            onPromptClick={handleSendMessage}
          />
        </section>
      </main>

      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        videoId={activeVideo?.video_id}
        videoTitle={activeVideo?.title}
      />
    </div>
  );
}
