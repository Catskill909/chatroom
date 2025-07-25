import React, { useEffect, useRef, useState } from "react";
import '@fortawesome/fontawesome-free/css/all.min.css';

// Stream URLs from original player
const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// Utility to detect Safari (not Chrome or Android)
function isSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
}

const STREAMS = {
  main: isSafari() ? "https://supersoul.site:8000/OSS-320?_ic2=1" : "https://supersoul.site:8000/OSS-320",
  live: isSafari() ? "https://supersoul.site:8010/OSSlive?_ic2=1" : "https://supersoul.site:8010/OSSlive",
};
const API_URL = "https://supersoul.site/api/nowplaying";

function getNextShowTimeInEST() {
  const now = new Date();
  const nowEST = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const nextShow = new Date(nowEST);
  nextShow.setDate(nextShow.getDate() + ((6 - nowEST.getDay() + 7) % 7));
  nextShow.setHours(20, 0, 0, 0);
  if (nowEST > nextShow) {
    nextShow.setDate(nextShow.getDate() + 7);
  }
  return nextShow;
}

function isShowTime() {
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayOfWeek = estTime.getDay();
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  return (
    (dayOfWeek === 6 && hours >= 20) ||
    (dayOfWeek === 0 && hours === 0 && minutes === 0)
  );
}

const defaultArt = "https://via.placeholder.com/300x300?text=Album+Art";

export default function OSSPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [metadata, setMetadata] = useState<any>(null);
  const [art, setArt] = useState<string>(defaultArt);
  const [title, setTitle] = useState<string>("Loading...");
  const [artist, setArtist] = useState<string>("Please wait");
  const [streamInfo, setStreamInfo] = useState<string>("");
  const [countdown, setCountdown] = useState<string>("");
  const [currentStation, setCurrentStation] = useState<"main" | "live">("main");
  const [status, setStatus] = useState<string>("");

  // Fetch metadata
  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);
        const data = await response.json();
        const stationData = data.find((station: any) => station.station.id === (currentStation === "main" ? 1 : 15));
        if (!stationData) return;
        const nowPlaying = stationData.now_playing;
        setTitle(nowPlaying.song.title || "Unknown Title");
        setArtist(nowPlaying.song.artist || "Unknown Artist");
        setArt(nowPlaying.song.art || defaultArt);
        setStreamInfo(`Current Stream: ${currentStation === "main" ? "OSS Radio" : "OSS Live"}`);
        setMetadata(nowPlaying);
      } catch (error) {
        setStatus("Unable to fetch now playing info. Retrying...");
      }
    }
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, [currentStation]);

  // Countdown logic
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const nextShowTimeEST = getNextShowTimeInEST();
      if (isShowTime()) {
        setCurrentStation("live");
        setCountdown("Live Now!");
      } else {
        setCurrentStation("main");
        const timeUntilShow = nextShowTimeEST.getTime() - now.getTime();
        const totalSeconds = Math.floor(timeUntilShow / 1000);
        const days = Math.floor(totalSeconds / (60 * 60 * 24));
        const hours = Math.floor((totalSeconds / (60 * 60)) % 24);
        const minutes = Math.floor((totalSeconds / 60) % 60);
        const seconds = totalSeconds % 60;
        setCountdown(`Live show in: ${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Audio and visualizer logic
  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let animationId: number;

    function draw() {
      if (!analyser || !canvas) return;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const hue = (i / bufferLength) * 360;
        canvasCtx.fillStyle = `hsla(${hue}, 100%, 60%, 0.9)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationId = requestAnimationFrame(draw);
    }

    function setupAudio() {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      source = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      draw();
    }

    audio.addEventListener("play", () => {
      if (!ctx) setupAudio();
      if (ctx && ctx.state === "suspended") ctx.resume();
    });
    audio.addEventListener("pause", () => {
      if (ctx && ctx.state === "running") ctx.suspend();
    });

    // Setup on mount if already playing
    if (!audio.paused) setupAudio();

    return () => {
      if (ctx) ctx.close();
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  // Initialize volume and handle changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Set initial volume immediately
    audio.volume = volume;
    
    // Handle volume changes from other sources (e.g., system volume)
    const handleVolumeChange = () => {
      if (audio.volume !== volume) {
        setVolume(audio.volume);
      }
    };
    
    audio.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      audio.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [volume]);

  // Play/pause handler
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  // Responsive canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div style={{ background: "#1e1e1e", color: "#fff", borderRadius: 12, padding: 12, width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1, background: "rgba(0,0,0,0.3)" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
        <img src={art} alt="Album Art" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, zIndex: 2, position: "relative" }} />
        <p style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", padding: "2px 10px", borderRadius: 12, fontSize: 12, zIndex: 3, margin: 0, maxWidth: "90%", whiteSpace: "nowrap", textAlign: "center" }}>{countdown}</p>
        <p style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", padding: "2px 10px", borderRadius: 8, fontSize: 12, zIndex: 3, margin: 0, maxWidth: "80%", textAlign: "center" }}>{streamInfo}</p>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 10, zIndex: 3, padding: "4px 10px", background: "rgba(0,0,0,0.7)", borderRadius: 8, width: "calc(100% - 32px)", overflow: "hidden", textAlign: "center" }}>
          <div style={{ fontSize: 13, margin: "0 0 2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: 'block', width: '100%' }}>
            <span style={{
              display: 'inline-block',
              minWidth: '100%',
              animation: 'scroll-text 18s linear infinite',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{artist}</span>
          </div>
        </div>
        <button
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          onClick={togglePlay}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 4,
            background: "rgba(0,0,0,0.85)",
            border: "none",
            color: "white",
            width: 48,
            height: 48,
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            transition: "transform 0.2s ease"
          }}
        >
          <i className={`fas ${isPlaying ? "fa-pause" : "fa-play"}`}></i>
        </button>

        {/* Keyframes for scrolling text */}
        <style>{`
          @keyframes scroll-text {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
      {/* Main OSS audio element - controls and UI handled by custom player above */}
      {/* Main OSS audio element - controls and UI handled by custom player above */}
      {/* Main OSS audio element - Safari gets ?_ic2=1 parameter to prevent redirect */}
      <audio
        ref={audioRef}
        id="audio-element"
        src={STREAMS[currentStation]}
        crossOrigin={isSafari() ? undefined : "anonymous"}
        preload="metadata"
        style={{ display: 'none' }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={e => setVolume((e.target as HTMLAudioElement).volume)}
      />

      <div style={{ marginTop: 12, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 13, marginRight: 12, minWidth: 50 }}>Volume</span>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{
              width: '100%',
              WebkitAppearance: 'none',
              height: 4,
              background: '#444',
              borderRadius: 2,
              outline: 'none',
              position: 'relative',
              zIndex: 1,
              margin: 0,
              padding: 0,
            } as React.CSSProperties}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            height: 4,
            width: `${volume * 100}%`,
            backgroundColor: '#fff',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 2,
          }} />
        </div>
        <span style={{ 
          fontSize: 13, 
          marginLeft: 12, 
          minWidth: 32, 
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
      <style>{`
        /* Webkit (Chrome, Safari) */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: -4px;
          position: relative;
          z-index: 3;
        }
        
        /* Firefox */
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          position: relative;
          z-index: 3;
        }
        
        /* IE/Edge */
        input[type="range"]::-ms-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          position: relative;
          z-index: 3;
        }
      `}</style>
      {status && <p style={{ color: "#ff0000", fontSize: 12, margin: 0, marginTop: 6 }}>{status}</p>}
    </div>
  );
}
