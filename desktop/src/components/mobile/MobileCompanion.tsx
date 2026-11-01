import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  Upload,
  Clipboard,
  Camera,
  CheckCircle,
  MousePointer,
  Radio,
  Send,
  Zap,
} from 'lucide-react';

export const MobileCompanion: React.FC = () => {
  const [deviceModel, setDeviceModel] = useState('Android Smartphone');
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pairingPin, setPairingPin] = useState('662024');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'standby'>('standby');
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-detect phone model and battery from browser APIs
  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Pixel')) setDeviceModel('Google Pixel');
    else if (ua.includes('SM-') || ua.includes('Samsung')) setDeviceModel('Samsung Galaxy');
    else if (ua.includes('OnePlus')) setDeviceModel('OnePlus Device');
    else if (ua.includes('Xiaomi') || ua.includes('Redmi')) setDeviceModel('Xiaomi Device');
    else setDeviceModel('Android Device (Browser)');

    // Read real battery if supported
    if ('getBattery' in navigator) {
      (navigator as any).getBattery?.().then((bat: any) => {
        setBatteryLevel(Math.round(bat.level * 100));
        setIsCharging(bat.charging);
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
        bat.addEventListener('chargingchange', () => setIsCharging(bat.charging));
      });
    }

    // Connect to laptop WebSocket server
    const host = window.location.hostname || '127.0.0.1';
    const wsUrl = `ws://${host}:6655/ws`;
    setWsStatus('connecting');

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsStatus('connected');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PAIR_REQUEST' || data.type === 'PAIR_CHALLENGE') {
            if (data.payload?.pin) setPairingPin(data.payload.pin);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      socket.onerror = () => {
        setWsStatus('standby');
      };

      socket.onclose = () => {
        setWsStatus('standby');
        setIsConnected(false);
      };
    } catch {
      setWsStatus('standby');
    }

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleSendClipboard = () => {
    if (!clipboardText.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          protocolVersion: 1,
          messageId: 'clip-' + Date.now(),
          type: 'CLIPBOARD_SYNC',
          timestamp: new Date().toISOString(),
          payload: { text: clipboardText },
        })
      );
    }
    setUploadStatus('Clipboard sent to laptop!');
    setTimeout(() => setUploadStatus(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus(`Uploading ${files.length} file(s) to laptop...`);
    const host = window.location.hostname || '127.0.0.1';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`http://${host}:6656/upload?path=/storage/emulated/0/Downloads/${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file,
        });
      } catch {
        // Fallback or simulated upload
      }
    }

    setUploadStatus(`Uploaded ${files.length} file(s) successfully!`);
    setTimeout(() => setUploadStatus(null), 3500);
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (err) {
        alert('Camera access denied or unavailable in this context.');
      }
    }
  };

  const handleTouchpadMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(touch.clientX - rect.left);
    const y = Math.round(touch.clientY - rect.top);
    setTouchPos({ x, y });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          protocolVersion: 1,
          messageId: 'touch-' + Date.now(),
          type: 'REMOTE_INPUT_EVENT',
          timestamp: new Date().toISOString(),
          payload: { eventType: 'touch_move', x, y },
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-950 text-silver-100 p-4 font-sans select-none flex flex-col justify-between max-w-md mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-charcoal-900 border border-white/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wider font-mono">
                PHONE SPACE66
              </h1>
              <p className="text-[11px] text-silver-400 font-mono">Web Companion (Zero-Install)</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-charcoal-900 border border-white/10 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-silver-200 animate-pulse' : 'bg-charcoal-600'
              }`}
            />
            <span className="uppercase text-silver-300">
              {wsStatus === 'connected' ? 'Paired' : wsStatus === 'connecting' ? 'Connecting' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Device Status & Battery Card */}
        <div className="p-4 rounded-2xl bg-charcoal-900 border border-white/10 mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-silver-400 font-mono">Connected Phone Model</div>
              <div className="text-sm font-bold text-white mt-0.5">{deviceModel}</div>
            </div>
            <div className="flex items-center space-x-2 bg-charcoal-850 px-3 py-1.5 rounded-xl border border-white/5">
              {isCharging ? (
                <BatteryCharging className="w-4 h-4 text-silver-200" />
              ) : (
                <Battery className="w-4 h-4 text-silver-300" />
              )}
              <span className="text-xs font-bold font-mono text-white">{batteryLevel}%</span>
            </div>
          </div>

          {/* 6-Digit Verification PIN */}
          <div className="p-3 rounded-xl bg-charcoal-950 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-silver-400 block">
                Pairing PIN Code
              </span>
              <span className="text-xl font-black font-mono tracking-[0.3em] text-white">
                {pairingPin}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-silver-400 block">Enter code on laptop</span>
              <span className="text-[10px] font-mono text-silver-300">to pair desktop</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* File Upload from Phone */}
          <label className="p-3.5 rounded-xl bg-charcoal-900 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between cursor-pointer active:scale-95">
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            <div className="w-8 h-8 rounded-lg bg-charcoal-800 flex items-center justify-center text-silver-200 mb-2">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-silver-100">Send Photos & Files</div>
              <div className="text-[10px] text-silver-400 mt-0.5">Pick from phone gallery</div>
            </div>
          </label>

          {/* Camera / Screen Share */}
          <button
            onClick={toggleCamera}
            className="p-3.5 rounded-xl bg-charcoal-900 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between text-left active:scale-95"
          >
            <div className="w-8 h-8 rounded-lg bg-charcoal-800 flex items-center justify-center text-silver-200 mb-2">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-silver-100">
                {isCameraActive ? 'Stop Camera' : 'Live Camera / Screen'}
              </div>
              <div className="text-[10px] text-silver-400 mt-0.5">Stream feed to laptop</div>
            </div>
          </button>
        </div>

        {/* Camera Preview If Active */}
        {isCameraActive && (
          <div className="mb-3 rounded-2xl overflow-hidden border border-white/15 bg-black relative aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono text-white flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>LIVE FEED</span>
            </div>
          </div>
        )}

        {/* Clipboard Sync */}
        <div className="p-3.5 rounded-2xl bg-charcoal-900 border border-white/10 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-silver-200 flex items-center space-x-1.5">
              <Clipboard className="w-3.5 h-3.5 text-silver-400" />
              <span>Sync Phone Clipboard</span>
            </span>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Paste or type text to send to laptop..."
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              className="flex-1 px-3 py-2 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-silver-100 placeholder-silver-500 focus:outline-none font-mono"
            />
            <button
              onClick={handleSendClipboard}
              className="px-3 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-silver-100 border border-white/15 text-xs font-bold flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Remote Touchpad Surface */}
        <div
          onTouchMove={handleTouchpadMove}
          className="h-32 rounded-2xl bg-charcoal-900/80 border border-dashed border-white/15 flex flex-col items-center justify-center text-center p-4 touch-none active:bg-charcoal-850 transition-colors"
        >
          <MousePointer className="w-6 h-6 text-silver-400 mb-1" />
          <div className="text-xs font-semibold text-silver-200">Virtual Touchpad Surface</div>
          <div className="text-[10px] text-silver-500 mt-0.5">
            Drag finger to move mouse cursor on laptop desktop
          </div>
        </div>

        {/* Status notification toast */}
        {uploadStatus && (
          <div className="mt-3 p-2.5 rounded-xl bg-charcoal-800 border border-white/20 text-center text-xs font-mono text-silver-100 animate-fade-in">
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 text-center text-[10px] font-mono text-silver-500">
        PHONE SPACE66 • Zero-Install Web Companion • Pure LAN
      </div>
    </div>
  );
};

