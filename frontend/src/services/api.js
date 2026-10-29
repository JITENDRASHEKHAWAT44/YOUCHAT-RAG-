const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BACKEND_URL.replace(/\/$/, '')}/api`;

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.error('Health check error:', err);
    return { status: 'offline' };
  }
}

export async function getLibrary() {
  try {
    const res = await fetch(`${API_BASE}/library`);
    if (!res.ok) throw new Error('Failed to fetch library');
    return await res.json();
  } catch (err) {
    console.error('Library error:', err);
    return { videos: [] };
  }
}

export async function loadVideo(url) {
  const res = await fetch(`${API_BASE}/video/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to index video');
  }
  return data;
}

export async function sendChatMessage({ videoId, question, model = 'openai/gpt-oss-120b', history = [] }) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      question,
      model,
      history,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to generate response');
  }
  return data;
}

export async function getTranscript(videoId) {
  const res = await fetch(`${API_BASE}/video/${videoId}/transcript`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to fetch transcript');
  }
  return data;
}
