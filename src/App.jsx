import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Trophy, Music, Headphones, Pointer } from 'lucide-react';

// --- 32條經典節奏譜例資料庫 ---
const CIRCLE_NUMBERS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚','㉛','㉜'];

const PATTERNS_DATA = [
  { id: 1, sym: '♩', name: '四分音符', offsets: [0] },
  { id: 2, sym: '𝄾 ♪', name: '休八', offsets: [0.5] },
  { id: 3, sym: '♫', name: '二八', offsets: [0, 0.5] },
  { id: 4, sym: '♪ 𝄾', name: '八休', offsets: [0] },
  { id: 5, sym: '♬♬', name: '四十六', offsets: [0, 0.25, 0.5, 0.75] },
  { id: 6, sym: '♬♪', name: '前十六', offsets: [0, 0.25, 0.5] },
  { id: 7, sym: '♪♬', name: '後十六', offsets: [0, 0.5, 0.75] },
  { id: 8, sym: '♬♪♬', name: '小切分', offsets: [0, 0.25, 0.75] },
  { id: 9, sym: '♪.♬', name: '前附點', offsets: [0, 0.75] },
  { id: 10, sym: '♬♪.', name: '後附點', offsets: [0, 0.25] },
  { id: 11, sym: '𝄾 ♬', name: '休十六', offsets: [0.5, 0.75] },
  { id: 12, sym: '♬ 𝄾', name: '十六休', offsets: [0, 0.25] },
  { id: 13, sym: '𝄿 ♬♬', name: '休三六', offsets: [0.25, 0.5, 0.75] },
  { id: 14, sym: '♬ 𝄿 ♬', name: '中休六', offsets: [0, 0.5, 0.75] },
  { id: 15, sym: '♬♬ 𝄿', name: '後休六', offsets: [0, 0.25, 0.5] },
  { id: 16, sym: '𝄿 ♪♬', name: '切分休', offsets: [0.25, 0.75] },
  { id: 17, sym: '𝄿 ♬ 𝄿 ♬', name: '雙反拍', offsets: [0.25, 0.75] },
  { id: 18, sym: '♬ 𝄾 ♬', name: '首尾六', offsets: [0, 0.75] },
  { id: 19, sym: '𝄾 ♬♬', name: '後半拍', offsets: [0.5, 0.75] },
  { id: 20, sym: '♬♬ 𝄾', name: '前半拍', offsets: [0, 0.25] },
  { id: 21, sym: '𝄿 ♬ 𝄾', name: '第二音', offsets: [0.25] },
  { id: 22, sym: '𝄾 ♬ 𝄿', name: '第三音', offsets: [0.5] },
  { id: 23, sym: '𝄾 𝄿 ♬', name: '第四音', offsets: [0.75] },
  { id: 24, sym: '♪‿♪', name: '連結八', offsets: [0] },
  { id: 25, sym: '♬‿♪', name: '前連', offsets: [0, 0.25] },
  { id: 26, sym: '♪‿♬', name: '後連', offsets: [0, 0.75] },
  { id: 27, sym: '♬‿♬', name: '中連', offsets: [0, 0.25, 0.75] },
  { id: 28, sym: '♪♬‿', name: '連休一', offsets: [0, 0.5] },
  { id: 29, sym: '‿♬♪', name: '連休二', offsets: [0.25, 0.5] },
  { id: 30, sym: '♬‿♬♪', name: '切分連', offsets: [0, 0.25, 0.75] },
  { id: 31, sym: '♪♬‿♬', name: '後連反', offsets: [0, 0.5, 0.75] },
  { id: 32, sym: '𝄽', name: '休止', offsets: [] },
];

const RHYTHM_PATTERNS = PATTERNS_DATA.map(p => ({
  id: p.id,
  name: p.name,
  symbol: p.sym,
  beats: [p.offsets, p.offsets, p.offsets, p.offsets]
}));

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(68);
  const [mode, setMode] = useState('normal'); 
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [guideTrackEnabled, setGuideTrackEnabled] = useState(true);
  const [subdivisionEnabled, setSubdivisionEnabled] = useState(true);
  const [latencyOffset, setLatencyOffset] = useState(0); 
  const [stats, setStats] = useState({ hits: 0, streak: 0, maxStreak: 0 });
  const [showInitOverlay, setShowInitOverlay] = useState(true);

  const hitAreaRef = useRef(null);
  const lastHitTimeRef = useRef(0);

  // --- 皇冠系統 ---
  const [crowns, setCrowns] = useState(() => {
    try {
      const saved = window.localStorage.getItem('rhythm_master_crowns_v3');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('rhythm_master_crowns_v3', JSON.stringify(crowns));
    } catch (e) {}
  }, [crowns]);

  const audioCtxRef = useRef(null);
  const requestAnimationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const timerWorkerRef = useRef(null); 
  
  const stateRef = useRef({ bpm, currentPatternIndex, isRecording, mode, guideTrackEnabled, subdivisionEnabled, latencyOffset });
  
  useEffect(() => {
    stateRef.current = { bpm, currentPatternIndex, isRecording, mode, guideTrackEnabled, subdivisionEnabled, latencyOffset };
  }, [bpm, currentPatternIndex, isRecording, mode, guideTrackEnabled, subdivisionEnabled, latencyOffset]);

  const engineRef = useRef({
    nextNoteTime: 0,
    currentBeat: 0,
    expectedHits: [], 
    actualHits: [],   
    expectedBeats: [], 
    lookahead: 25.0, 
    scheduleAheadTime: 3.0, 
    cycleCounter: 0,
    activeCycles: {} 
  }); 

  const visualEffectsRef = useRef([]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
         alert("您的瀏覽器不支援 Web Audio API。");
         return;
      }
      audioCtxRef.current = new AudioContext({ latencyHint: 'interactive' });
      const ctx = audioCtxRef.current;
      
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.01; 
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      } catch (e) {}

      try {
        const workerCode = `
          let timerID = null;
          self.onmessage = function(e) {
            if (e.data === "start") {
              timerID = setInterval(function() { postMessage("tick"); }, 25);
            } else if (e.data === "stop") {
              clearInterval(timerID);
              timerID = null;
            }
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        timerWorkerRef.current = new Worker(URL.createObjectURL(blob));
        timerWorkerRef.current.onmessage = (e) => {
          if (e.data === "tick") scheduler();
        };
      } catch (workerError) {
        let fallbackTimer = null;
        timerWorkerRef.current = {
          postMessage: (msg) => {
            if (msg === "start") fallbackTimer = setInterval(scheduler, 25);
            else if (msg === "stop") clearInterval(fallbackTimer);
          },
          terminate: () => clearInterval(fallbackTimer)
        };
      }
    }
    
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setShowInitOverlay(false);
  };

  useEffect(() => {
    return () => {
      if (timerWorkerRef.current && timerWorkerRef.current.terminate) {
        timerWorkerRef.current.terminate();
      }
    };
  }, []);

  const playClick = (time, type = 'metronome') => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const safeTime = Math.max(time, ctx.currentTime + 0.005); 

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      let duration = 0.1;

      if (type === 'metronome') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, safeTime);
        gainNode.gain.setValueAtTime(1.8, safeTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);
      } else if (type === 'subdivision') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, safeTime);
        gainNode.gain.setValueAtTime(1.17, safeTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);
      } else if (type === 'demo') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, safeTime);
        osc.frequency.exponentialRampToValueAtTime(220, safeTime + 0.05);
        gainNode.gain.setValueAtTime(0.4, safeTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + 0.05);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, safeTime);
        osc.frequency.setValueAtTime(1600, safeTime + 0.05);
        gainNode.gain.setValueAtTime(0.4, safeTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, safeTime);
        osc.frequency.exponentialRampToValueAtTime(100, safeTime + duration);
        gainNode.gain.setValueAtTime(0.2, safeTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);
      } else if (type === 'crown') {
        duration = 0.8;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, safeTime); 
        osc.frequency.exponentialRampToValueAtTime(1046.50, safeTime + 0.1); 
        osc.frequency.setValueAtTime(1318.51, safeTime + 0.15); 
        osc.frequency.exponentialRampToValueAtTime(2093.00, safeTime + 0.4); 
        gainNode.gain.setValueAtTime(0, safeTime);
        gainNode.gain.linearRampToValueAtTime(0.3, safeTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, safeTime + duration);
      }
      
      osc.start(safeTime);
      osc.stop(safeTime + duration);
    } catch (e) {}
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / stateRef.current.bpm;
    engineRef.current.nextNoteTime += secondsPerBeat;
    engineRef.current.currentBeat = (engineRef.current.currentBeat + 1) % 8; 
  };

  const awardCrown = (patternIndex) => {
    const patternId = RHYTHM_PATTERNS[patternIndex].id;
    const currentBpm = stateRef.current.bpm;
    const key = `${patternId}_${currentBpm}`;
    
    setCrowns(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.width : 800;
    const ch = canvas ? canvas.height : 300;
    
    if (audioCtxRef.current) {
      playClick(audioCtxRef.current.currentTime, 'crown');
    }

    visualEffectsRef.current.push({ time: Date.now(), type: 'crown', x: cw / 2, y: ch / 2 });
  };

  const scheduleNote = (beatNumber, time) => {
    const secondsPerBeat = 60.0 / stateRef.current.bpm;

    if (beatNumber === 0) {
      engineRef.current.cycleCounter++;
      const currentCycleId = engineRef.current.cycleCounter;
      const pattern = RHYTHM_PATTERNS[stateRef.current.currentPatternIndex];
      
      // 計算該小節總共有幾個音符點點
      const totalNotes = pattern.beats[0].length + pattern.beats[1].length + pattern.beats[2].length + pattern.beats[3].length;

      engineRef.current.activeCycles[currentCycleId] = {
        patternIndex: stateRef.current.currentPatternIndex,
        awarded: false,
        endTime: time + (4 * secondsPerBeat),
        totalNotes: totalNotes,
        perfectCount: 0 // 記錄該小節打到 Perfect 的數量
      };

      Object.keys(engineRef.current.activeCycles).forEach(key => {
        if (parseInt(key) < currentCycleId - 3) {
          delete engineRef.current.activeCycles[key];
        }
      });
    }

    const currentCycleId = engineRef.current.cycleCounter;
    engineRef.current.expectedBeats.push({ time, isFirstBeat: beatNumber % 4 === 0, isSubdivision: false, audioScheduled: false });
    
    if (stateRef.current.subdivisionEnabled) {
      engineRef.current.expectedBeats.push({ time: time + secondsPerBeat / 2, isFirstBeat: false, isSubdivision: true, audioScheduled: false });
    }

    if (beatNumber < 4) {
      const pattern = RHYTHM_PATTERNS[stateRef.current.currentPatternIndex];
      const beatPattern = pattern.beats[beatNumber];

      beatPattern.forEach(offset => {
        const hitTime = time + (offset * secondsPerBeat);
        if (stateRef.current.isRecording) {
          engineRef.current.expectedHits.push({
            time: hitTime, hit: false, expired: false, status: null, audioScheduled: false, cycleId: currentCycleId 
          });
        }
      });
    }
  };

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    
    while (engineRef.current.nextNoteTime < now + engineRef.current.scheduleAheadTime) {
      scheduleNote(engineRef.current.currentBeat, engineRef.current.nextNoteTime);
      nextNote();
    }

    engineRef.current.expectedBeats = engineRef.current.expectedBeats.filter(b => {
      if (!b.audioScheduled && b.time < now + 0.15) {
        b.audioScheduled = true;
        playClick(b.time, b.isSubdivision ? 'subdivision' : 'metronome');
      }
      return b.time > now - 2; 
    });

    engineRef.current.expectedHits = engineRef.current.expectedHits.filter(h => {
      if (!h.audioScheduled && h.time < now + 0.15) {
        h.audioScheduled = true;
        if (stateRef.current.isRecording && stateRef.current.guideTrackEnabled) {
          playClick(h.time, 'demo');
        }
      }
      return h.time > now - 2; 
    });
    
    engineRef.current.actualHits = engineRef.current.actualHits.filter(h => h.time > now - 2);

    // 【重寫後的皇冠結算】
    Object.values(engineRef.current.activeCycles).forEach(cycle => {
      if (!cycle.awarded && cycle.endTime && now >= cycle.endTime + 0.15) {
        // 判定標準：只要 Perfect 數量等於總音符數 (代表所有圓點都變綠色)
        // 不管有沒有 Noise, Early, Late 點擊
        if (cycle.perfectCount === cycle.totalNotes) {
          cycle.awarded = true;
          awardCrown(cycle.patternIndex);
        }
      }
    });
  }, []);

  const startTraining = () => {
    initAudio(); 
    if (!stateRef.current.isRecording) {
      setIsRecording(true);
      stateRef.current.isRecording = true; 
      engineRef.current.currentBeat = 0; 
      engineRef.current.expectedHits = [];
      engineRef.current.actualHits = []; 
      engineRef.current.expectedBeats = [];
      engineRef.current.cycleCounter = 0;
      engineRef.current.activeCycles = {};
      
      if(audioCtxRef.current) {
        engineRef.current.nextNoteTime = audioCtxRef.current.currentTime + 0.5; 
      }
      
      setStats(s => ({ ...s, streak: 0 }));
      timerWorkerRef.current?.postMessage("start"); 
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      stateRef.current.isRecording = false; 
      timerWorkerRef.current?.postMessage("stop"); 
      engineRef.current.expectedHits = [];
      engineRef.current.actualHits = [];
      engineRef.current.expectedBeats = [];
    } else {
      startTraining();
    }
  };

  const processHit = (hitTime) => {
    if (!stateRef.current.isRecording) return; 

    const adjustedHitTime = hitTime - (stateRef.current.latencyOffset / 1000);
    const tolerance = stateRef.current.mode === 'pro' ? 0.015 : 0.030;
    const hitWindow = 0.15;
    
    let closestIndex = -1;
    let minDiffAbs = Infinity;

    engineRef.current.expectedHits.forEach((expected, index) => {
      if (!expected.status && !expected.expired) {
        const diff = adjustedHitTime - expected.time;
        const absDiff = Math.abs(diff);
        if (absDiff < minDiffAbs && absDiff < hitWindow) {
          minDiffAbs = absDiff;
          closestIndex = index;
        }
      }
    });

    if (closestIndex !== -1) {
      const expected = engineRef.current.expectedHits[closestIndex];
      const diff = adjustedHitTime - expected.time;
      const cycle = engineRef.current.activeCycles[expected.cycleId];
      
      expected.hit = true; 

      if (minDiffAbs <= tolerance) {
        expected.status = 'perfect';
        engineRef.current.actualHits.push({ time: adjustedHitTime, status: 'perfect' });
        playClick(audioCtxRef.current.currentTime, 'success');
        
        // 增加該小節的 Perfect 計數
        if (cycle) cycle.perfectCount++;
        
        setStats(s => {
          const newStreak = s.streak + 1;
          return { hits: s.hits + 1, streak: newStreak, maxStreak: Math.max(s.maxStreak, newStreak) };
        });
        visualEffectsRef.current.push({ time: Date.now(), type: 'success', x: 200 }); 

      } else if (diff < 0) {
        expected.status = 'early';
        engineRef.current.actualHits.push({ time: adjustedHitTime, status: 'early' });
        playClick(audioCtxRef.current.currentTime, 'fail');
        setStats(s => ({ ...s, streak: 0 }));
        visualEffectsRef.current.push({ time: Date.now(), type: 'early', x: 200 }); 
      } else {
        expected.status = 'late';
        engineRef.current.actualHits.push({ time: adjustedHitTime, status: 'late' });
        playClick(audioCtxRef.current.currentTime, 'fail');
        setStats(s => ({ ...s, streak: 0 }));
        visualEffectsRef.current.push({ time: Date.now(), type: 'late', x: 200 }); 
      }
    } else {
      engineRef.current.actualHits.push({ time: adjustedHitTime, status: 'noise' });
      playClick(audioCtxRef.current.currentTime, 'fail');
      setStats(s => ({ ...s, streak: 0 }));
      visualEffectsRef.current.push({ time: Date.now(), type: 'late', x: 200 }); 
    }
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    const now = Date.now();
    if (now - lastHitTimeRef.current < 50) return;
    lastHitTimeRef.current = now;

    if (hitAreaRef.current) {
      hitAreaRef.current.style.backgroundColor = '#e2e8f0'; 
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (!isRecording || !audioCtxRef.current) return;
    processHit(audioCtxRef.current.currentTime);
  };

  const handlePointerUp = () => {
    if (hitAreaRef.current) {
      hitAreaRef.current.style.backgroundColor = '#ffffff'; 
    }
  };

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioCtxRef.current) {
      requestAnimationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const now = audioCtxRef.current.currentTime;

    ctx.clearRect(0, 0, width, height);

    const hitLineX = 200; 
    const pixelsPerSecond = 300; 

    ctx.beginPath();
    engineRef.current.expectedBeats.forEach(beat => {
      if (beat.isSubdivision) return; 
      const x = hitLineX + (beat.time - now) * pixelsPerSecond;
      if (x > 0 && x < width) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    });
    ctx.strokeStyle = '#E2E8F0'; 
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hitLineX, 0);
    ctx.lineTo(hitLineX, height);
    ctx.strokeStyle = '#CBD5E1'; 
    ctx.lineWidth = 3;
    ctx.stroke();

    engineRef.current.expectedHits.forEach(expected => {
      const x = hitLineX + (expected.time - now) * pixelsPerSecond;
      
      if (expected.time < now - 0.1 && !expected.expired && !expected.status) {
         expected.expired = true;
         setStats(s => ({ ...s, streak: 0 })); 
      }

      if (x > -50 && x < width + 50) {
        ctx.beginPath();
        ctx.arc(x, height / 2, 14, 0, 2 * Math.PI); 
        
        if (expected.expired && !expected.status) {
          ctx.strokeStyle = '#EF4444';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        } else {
          ctx.strokeStyle = '#94A3B8';
          ctx.fillStyle = 'transparent';
        }
        
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    });

    engineRef.current.actualHits.forEach(hit => {
      const x = hitLineX + (hit.time - now) * pixelsPerSecond;
      if (x > -50 && x < width + 50) {
         ctx.beginPath();
         ctx.arc(x, height / 2, 10, 0, 2 * Math.PI); 
         
         if (hit.status === 'perfect') {
            ctx.fillStyle = '#4ADE80'; 
         } else if (hit.status === 'early') {
            ctx.fillStyle = '#F59E0B'; 
         } else if (hit.status === 'late') {
            ctx.fillStyle = '#EF4444'; 
         } else {
            ctx.fillStyle = '#94A3B8'; 
         }
         ctx.fill();
      }
    });

    const effects = visualEffectsRef.current;
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      const age = Date.now() - effect.time;
      const maxAge = effect.type === 'crown' ? 1200 : 300; 

      if (age > maxAge) {
        effects.splice(i, 1);
        continue;
      }
      
      if (effect.type === 'crown') {
        const progress = age / maxAge;
        const yOffset = progress * 80; 
        const currentY = effect.y - yOffset;
        const scale = 1 + Math.sin(progress * Math.PI) * 0.3; 
        const angle = Math.sin(age * 0.03) * 0.25; 

        ctx.save();
        ctx.globalAlpha = 1 - Math.pow(progress, 3); 
        
        ctx.save();
        ctx.translate(effect.x, currentY);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "140px sans-serif"; 
        ctx.fillText("👑", 0, 0);
        ctx.restore();

        ctx.font = "bold 40px sans-serif"; 
        ctx.fillStyle = "#F59E0B";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+1", effect.x + 90, currentY - 30);
        
        ctx.restore();
        continue;
      }

      const radius = 15 + (age / 300) * 30;
      const opacity = 1 - (age / 300);
      
      ctx.beginPath();
      ctx.arc(effect.x, height / 2, radius, 0, 2 * Math.PI);
      
      if (effect.type === 'success') {
        ctx.fillStyle = `rgba(74, 222, 128, ${opacity})`;
      } else if (effect.type === 'early') {
        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
      } else {
        ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`;
      }
      ctx.fill();
    }

    requestAnimationFrameRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    requestAnimationFrameRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(requestAnimationFrameRef.current);
  }, [renderLoop]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      
      {showInitOverlay && (
        <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl text-center max-w-sm w-11/12 border border-slate-100">
            <Music className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold mb-2">節奏大師</h1>
            <button 
              onClick={initAudio}
              className="w-full py-3 sm:py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-base sm:text-lg transition-colors mt-4"
            >
              進入 App
            </button>
          </div>
        </div>
      )}

      <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold tracking-wider">天下第一準之節奏大師</h1>
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-full p-1 cursor-pointer shrink-0" onClick={() => setMode(mode === 'normal' ? 'pro' : 'normal')}>
            <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${mode === 'normal' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              普通
            </div>
            <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${mode === 'pro' ? 'bg-white shadow text-red-500' : 'text-slate-500'}`}>
              PRO 模式
            </div>
          </div>
          {stats.streak >= 3 && (
            <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-500 bg-amber-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full animate-bounce shrink-0">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{stats.streak} 連擊</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">
              設備延遲補償: <span className={latencyOffset > 0 ? 'text-blue-500' : ''}>{latencyOffset > 0 ? `+${latencyOffset}` : latencyOffset}ms</span>
            </span>
            <input 
              type="range" min="-150" max="150" step="5" value={latencyOffset}
              onChange={(e) => setLatencyOffset(parseInt(e.target.value))}
              className="w-20 sm:w-28 accent-blue-400"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        <div className="bg-white py-3 sm:py-4 border-b border-slate-100 overflow-x-auto px-4 sm:px-6 hide-scrollbar shrink-0">
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold mb-2 sm:mb-3 uppercase tracking-widest">選擇譜例 (共32條經典訓練)</p>
          <div className="grid grid-rows-2 grid-flow-col gap-2 sm:gap-3 pb-1 sm:pb-2 w-max">
            {RHYTHM_PATTERNS.map((pattern, index) => {
              const currentKey = `${pattern.id}_${bpm}`;
              const crownCount = crowns[currentKey];

              return (
                <button
                  key={pattern.id}
                  onClick={() => {
                      setCurrentPatternIndex(index);
                      if (!stateRef.current.isRecording) startTraining();
                  }}
                  className={`relative flex flex-col items-center justify-center w-20 h-14 sm:w-24 sm:h-16 rounded-xl border-2 transition-all shrink-0 ${
                    currentPatternIndex === index 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <span className="absolute top-1 left-1.5 text-[10px] sm:text-xs text-slate-400 font-bold">
                    {CIRCLE_NUMBERS[index]}
                  </span>
                  
                  {crownCount > 0 && (
                    <span className="absolute top-1 right-1.5 flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-50 px-1 rounded-full border border-amber-200 shadow-sm">
                      👑 <span className="translate-y-[0.5px]">{crownCount}</span>
                    </span>
                  )}

                  <span className={`text-lg sm:text-xl mt-1.5 sm:mt-2 font-music ${currentPatternIndex === index ? 'text-red-500' : 'text-slate-700'}`}>
                    {pattern.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div 
          className="flex-1 bg-slate-50 flex flex-col relative p-4 sm:p-6 min-h-[250px] select-none touch-none cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className="flex justify-between items-end mb-3 relative z-20" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 shadow-sm shrink-0">
                
               {[68, 128, 142].map(speed => (
                 <button
                   key={speed}
                   onClick={() => setBpm(speed)}
                   className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                     bpm === speed 
                     ? 'bg-red-500 text-white shadow-md' 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                   }`}
                 >
                   BPM {speed}
                 </button>
               ))}
               
                <div className="w-px h-6 bg-slate-200 mx-1 sm:mx-2"></div>
                <button 
                  onClick={() => setSubdivisionEnabled(!subdivisionEnabled)}
                  className={`px-3 text-[10px] sm:text-xs font-bold transition-colors ${subdivisionEnabled ? 'text-amber-500' : 'text-slate-400'}`}
                >
                  ♪ 8分音符
                </button>
            </div>
          </div>

          <div 
            ref={hitAreaRef}
            className="flex-1 relative w-full rounded-2xl border overflow-hidden shadow-inner transition-colors duration-75 bg-white border-slate-200"
            style={{ willChange: 'background-color' }}
          >
            {!isRecording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 pointer-events-none px-4 text-center">
                <Pointer className="w-8 h-8 sm:w-10 sm:h-10 mb-3 opacity-50 animate-bounce" />
                <p className="text-sm sm:text-base font-bold text-slate-500">點選上方譜例，並按下開始訓練</p>
                <p className="text-[10px] sm:text-xs mt-2 bg-slate-100 px-3 py-1 rounded-full">💡 只要所有圓點都點成「綠色」就能拿到皇冠！</p>
              </div>
            )}
            
            <div className="absolute bottom-2 right-3 sm:bottom-4 sm:right-4 flex flex-col items-end text-[10px] sm:text-xs text-slate-400 z-10 bg-white/80 p-1.5 rounded-lg shadow-sm">
              <div className="flex gap-1.5 sm:gap-2 mb-1">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400"></span>完美</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400"></span>早打</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400"></span>晚打</span>
              </div>
              容錯率: {mode === 'pro' ? '±15ms' : '±30ms'}
            </div>

            <canvas 
              ref={canvasRef}
              width={800} 
              height={300}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 p-4 pb-6 sm:p-6 sm:pb-10 flex items-center justify-center gap-12 sm:gap-20 shrink-0">
        
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setGuideTrackEnabled(!guideTrackEnabled); }}
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
              guideTrackEnabled ? 'bg-amber-100 text-amber-600 shadow-md sm:shadow-lg shadow-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
            {guideTrackEnabled ? '輔助音開' : '輔助音關'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
              isRecording ? 'bg-slate-800 shadow-slate-300' : 'bg-red-500 hover:bg-red-600 shadow-red-200'
            }`}
          >
            {isRecording ? (
              <Square className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-current translate-x-1" />
            )}
          </button>
          <span className="text-xs sm:text-sm font-bold text-slate-600">
            {isRecording ? '停止' : '開始'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 sm:gap-2 pointer-events-none opacity-60">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
            <Pointer className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
            點擊畫面打擊
          </span>
        </div>

      </footer>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Music&display=swap');
        .font-music { font-family: 'Noto Music', system-ui, sans-serif; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
