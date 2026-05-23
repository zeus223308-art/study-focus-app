import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import Groq from 'groq-sdk';

const TESS_LANG = import.meta.env.VITE_TESSERACT_LANG || 'kor+eng';
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY?.trim() || '';
const GROQ_MODEL =
  import.meta.env.VITE_GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const HAS_GROQ = Boolean(GROQ_KEY);
const STROKE = '#111827';
const STROKE_WIDTH = 2.5;

function dataUrlFromCanvas(canvas) {
  return canvas.toDataURL('image/png');
}

function blobFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas blob failed'))), 'image/png');
  });
}

export default function FreeOcrHandwriting() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const workerRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const activePointerRef = useRef(null);

  const [engine, setEngine] = useState(HAS_GROQ ? 'groq' : 'tesseract');
  const [ocrText, setOcrText] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const fitCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = STROKE_WIDTH;
  }, []);

  useEffect(() => {
    fitCanvas();
    const ro = new ResizeObserver(() => fitCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    const onOrientation = () => requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fitCanvas);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [fitCanvas]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const blockTouch = (e) => {
      if (e.target.closest('[data-ink-surface="true"]')) e.preventDefault();
    };
    wrap.addEventListener('touchstart', blockTouch, { passive: false });
    wrap.addEventListener('touchmove', blockTouch, { passive: false });
    return () => {
      wrap.removeEventListener('touchstart', blockTouch);
      wrap.removeEventListener('touchmove', blockTouch);
    };
  }, []);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const localPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawLine = (from, to) => {
    const ctx = getCtx();
    if (!ctx || !from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    setHasInk(true);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    activePointerRef.current = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawingRef.current = true;
    const p = localPoint(e);
    lastPointRef.current = p;
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current || activePointerRef.current !== e.pointerId) return;
    e.preventDefault();
    const p = localPoint(e);
    const last = lastPointRef.current;
    if (last) drawLine(last, p);
    lastPointRef.current = p;
  };

  const endStroke = (e) => {
    if (activePointerRef.current !== e.pointerId) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    activePointerRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    fitCanvas();
    setHasInk(false);
    setOcrText('');
    setStatus('');
    setProgress(0);
  };

  const loadImageToCanvas = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!canvas || !ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('no canvas'));
          return;
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        fitCanvas();
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(rect.width / img.width, rect.height / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (rect.width - dw) / 2;
        const dy = (rect.height - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        setHasInk(true);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image load failed'));
      };
      img.src = url;
    });

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setStatus('이미지 불러오는 중…');
      await loadImageToCanvas(file);
      setStatus('');
    } catch {
      setStatus('이미지를 불러오지 못했습니다.');
    }
  };

  const getTesseractWorker = async () => {
    if (workerRef.current) return workerRef.current;
    const worker = await createWorker(TESS_LANG, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          setProgress(Math.round(m.progress * 100));
        }
      },
    });
    workerRef.current = worker;
    return worker;
  };

  const runTesseract = async (canvas) => {
    setProgress(0);
    setStatus('Tesseract OCR (무료·무제한)…');
    const worker = await getTesseractWorker();
    const { data } = await worker.recognize(canvas);
    return (data.text || '').trim();
  };

  const runGroq = async (canvas) => {
    if (!HAS_GROQ) throw new Error('VITE_GROQ_API_KEY 없음');
    setStatus('Groq Vision OCR (고품질)…');
    setProgress(0);
    const dataUrl = dataUrlFromCanvas(canvas);
    const groq = new Groq({
      apiKey: GROQ_KEY,
      dangerouslyAllowBrowser: true,
    });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 이미지의 모든 글자를 OCR하세요. 인쇄체·손글씨·필기체·악필·한글·영문을 포함합니다. 설명 없이 인식된 텍스트만 출력하세요. 줄바꿈은 원본 레이아웃을 최대한 유지하세요.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });
    setProgress(100);
    return (completion.choices[0]?.message?.content || '').trim();
  };

  const runOcr = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    if (!hasInk) {
      setStatus('필기하거나 이미지를 업로드하세요.');
      return;
    }
    setBusy(true);
    setOcrText('');
    setProgress(0);
    try {
      let text = '';
      if (engine === 'groq') {
        if (!HAS_GROQ) {
          setStatus('Groq API 키가 없습니다. .env에 VITE_GROQ_API_KEY를 넣거나 Tesseract 모드를 쓰세요.');
          return;
        }
        text = await runGroq(canvas);
      } else {
        text = await runTesseract(canvas);
      }
      setOcrText(text);
      setStatus(text ? '완료' : '인식된 글자가 없습니다.');
      setProgress(100);
    } catch (err) {
      setStatus(err?.message || 'OCR 실패');
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setStatus('클립보드에 복사됨');
    } catch {
      setStatus('복사 실패');
    }
  };

  const downloadPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await blobFromCanvas(canvas);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ocr-canvas-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          무료 OCR · 필기 인식
        </h1>
        <p className="text-sm text-stone-600">
          <span className="font-medium text-emerald-700">Tesseract</span>: 브라우저 안에서 무료·무제한
          {HAS_GROQ ? (
            <>
              {' '}
              · <span className="font-medium text-sky-700">Groq Vision</span>: 고품질(BYOK, Groq
              무료 한도)
            </>
          ) : (
            <>
              {' '}
              · 고품질: <code className="rounded bg-stone-200 px-1 text-xs">.env</code>에{' '}
              <code className="rounded bg-stone-200 px-1 text-xs">VITE_GROQ_API_KEY</code>
            </>
          )}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() => setEngine('tesseract')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              engine === 'tesseract'
                ? 'bg-stone-900 text-white'
                : 'text-stone-700 hover:bg-stone-100'
            }`}>
            Tesseract (무료)
          </button>
          <button
            type="button"
            disabled={busy || !HAS_GROQ}
            onClick={() => setEngine('groq')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              engine === 'groq' ? 'bg-sky-600 text-white' : 'text-stone-700 hover:bg-stone-100'
            } ${!HAS_GROQ ? 'opacity-40' : ''}`}>
            Groq (고품질)
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-stone-50 disabled:opacity-50">
          사진 업로드
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPickFile}
        />
        <button
          type="button"
          disabled={busy}
          onClick={clearCanvas}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-stone-50 disabled:opacity-50">
          지우기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={downloadPng}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-stone-50 disabled:opacity-50">
          PNG 저장
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative min-h-[min(52dvh,420px)] flex-1 overflow-hidden rounded-xl border border-stone-300 bg-white shadow-inner"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}>
        <canvas
          ref={canvasRef}
          data-ink-surface="true"
          className="block h-full w-full cursor-crosshair bg-white"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          onContextMenu={(e) => e.preventDefault()}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-stone-400">
            여기에 필기하거나 사진을 업로드하세요
            <br />
            (Safari · iOS · Android · PC 호환)
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={runOcr}
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-stone-800 disabled:opacity-50">
          {busy ? '인식 중…' : 'OCR 실행'}
        </button>
        {busy && (
          <div className="flex min-w-[120px] flex-1 items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-stone-600">{progress}%</span>
          </div>
        )}
        {status && <span className="text-sm text-stone-600">{status}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-stone-700">인식 결과</label>
          <button
            type="button"
            disabled={!ocrText}
            onClick={copyText}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-stone-50 disabled:opacity-40">
            복사
          </button>
        </div>
        <textarea
          readOnly
          value={ocrText}
          placeholder="OCR 결과가 여기 표시됩니다."
          className="min-h-[140px] w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-sm leading-relaxed text-stone-900 shadow-sm outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <footer className="text-xs leading-relaxed text-stone-500">
        Tesseract는 완전 무료·무제한(기기에서 실행)이나 악필·필기체 품질은 제한적입니다. Groq는
        console.groq.com 무료 한도 내 고품질 OCR(BYOK)입니다. API 키는 브라우저에 노출되므로
        개인·테스트용으로만 사용하세요.
      </footer>
    </div>
  );
}
