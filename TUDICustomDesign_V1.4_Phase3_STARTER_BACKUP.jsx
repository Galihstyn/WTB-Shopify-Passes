import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Type, Square, Circle, Plus, Undo2, Redo2, ZoomOut, ZoomIn, MousePointer2,
  Trash2, Image as ImageIcon, Layers, Settings2, Download, Lock,
  ArrowUp, ArrowDown, MousePointerClick, Star, Triangle as TriangleIcon, Pipette, Sun,
  PenTool, PlusCircle, MinusCircle, CornerUpRight, Maximize, Box, Palette, Check, AlertCircle, Waves,
  Monitor, AlertTriangle, ShoppingCart
} from "lucide-react";

// --- CONSTANTS & CONFIGURATION ---

const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins",
  "Oswald", "Playfair Display", "Lato", "Bebas Neue", "Dancing Script"
];

const ILLUSTRATOR_SWATCHES = [
  // Grayscale
  "#000000", "#1A1A1A", "#333333", "#4D4D4D", "#666666", "#808080", "#999999", "#B3B3B3", "#CCCCCC", "#E6E6E6", "#F2F2F2", "#FFFFFF",
  // Vibrant Colors
  "#FF0000", "#FF4500", "#FF8C00", "#FFA500", "#FFD700", "#FFFF00", "#ADFF2F", "#00FF00", "#00FA9A", "#00FFFF", "#00BFFF", "#0000FF", "#4B0082", "#8B00FF", "#FF00FF", "#FF1493",
  // Modern / Brand Colors
  "#E11D48", "#F43F5E", "#F59E0B", "#D97706", "#10B981", "#059669", "#3B82F6", "#2563EB", "#6366F1", "#4F46E5", "#8B5CF6", "#7C3AED",
  // Pastel Tones
  "#FECACA", "#FED7AA", "#FEF08A", "#BBF7D0", "#BAE6FD", "#C7D2FE", "#E9D5FF", "#FBCFE8",
  // Earth Tones
  "#451A03", "#78350F", "#92400E", "#B45309", "#713F12", "#A16207", "#3F2E3E", "#503C3C"
];

const transformHandles = [
  { dir: 'nw', top: '0%', left: '0%', cursor: 'nwse-resize' },
  { dir: 'n', top: '0%', left: '50%', cursor: 'ns-resize' },
  { dir: 'ne', top: '0%', left: '100%', cursor: 'nesw-resize' },
  { dir: 'w', top: '50%', left: '0%', cursor: 'ew-resize' },
  { dir: 'e', top: '50%', left: '100%', cursor: 'ew-resize' },
  { dir: 'sw', top: '100%', left: '0%', cursor: 'nesw-resize' },
  { dir: 's', top: '100%', left: '50%', cursor: 'ns-resize' },
  { dir: 'se', top: '100%', left: '100%', cursor: 'nwse-resize' },
];

// --- GLOBAL HELPER FUNCTIONS ---

const slugify = (text) => text ? text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-') : 'untitled';

const safeNum = (val, fallback = 0) => {
  const num = Number(val);
  return (isNaN(num) || !isFinite(num)) ? fallback : num;
};

const hexToHsv = (hex) => {
  // Bug 9 fix: normalize input to handle missing # and short forms
  hex = (hex || '#000000').trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) { h = 0; }
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h, s, v) => {
  h /= 360; s /= 100; v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

let measureCanvasCtx = null;
const measureTextCache = new Map();
const MAX_CACHE_SIZE = 1000;

const measureTextWidth = (text, fontSize, fontFamily) => {
  const safeText = text || "";
  const safeFontSize = safeNum(fontSize, 32);
  const cacheKey = `${safeText}|${safeFontSize}|${fontFamily || 'Inter'}`;

  if (measureTextCache.has(cacheKey)) {
    return measureTextCache.get(cacheKey);
  }

  let result;
  if (!measureCanvasCtx && typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    measureCanvasCtx = canvas.getContext("2d");
  }
  if (measureCanvasCtx) {
    measureCanvasCtx.font = `bold ${safeFontSize}px "${fontFamily || 'Inter'}", sans-serif`;
    const lines = safeText.split("\n");
    let maxWidth = 0;
    lines.forEach(line => {
      try { maxWidth = Math.max(maxWidth, measureCanvasCtx.measureText(line).width); } catch (e) { maxWidth = safeText.length * safeFontSize * 0.6; }
    });
    result = maxWidth;
  } else {
    result = safeText.length * safeFontSize * 0.6;
  }

  if (measureTextCache.size >= MAX_CACHE_SIZE) {
    const firstKey = measureTextCache.keys().next().value;
    measureTextCache.delete(firstKey);
  }
  measureTextCache.set(cacheKey, result);
  return result;
};

const getWarpMetrics = (el) => {
  const chars = (el.content || "").replace(/\n/g, " ").split("");
  const B = safeNum(el.warpBend, 0) / 100;
  const DH = safeNum(el.warpDistortH, 0) / 100;
  const DV = safeNum(el.warpDistortV, 0) / 100;
  const H = safeNum(el.fontSize, 32);
  const LS = safeNum(el.letterSpacing, 0);
  const W = (H * 0.6 + LS) * Math.max(1, chars.length);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  const positions = chars.map((char, charIdx) => {
    let t = chars.length > 1 ? (charIdx + 0.5) / chars.length - 0.5 : 0; // -0.5 to 0.5

    // Apply Horizontal Distortion by shifting t
    if (Math.abs(DH) > 0.01) {
      // Skew t: t_new = t * (1 - DH*t*2) or similar to compress one side
      t = t * (1 - DH * t);
    }

    let dx = 0, dy = 0, angle = 0, sX = 1, sY = 1;

    const style = el.warpStyle || "none";
    if (style === "arc") {
      if (Math.abs(B) > 0.01) {
        const maxAngle = B * Math.PI; const R = W / maxAngle; const theta = t * maxAngle;
        dx = R * Math.sin(theta); dy = R * (1 - Math.cos(theta)); angle = theta;
      } else dx = t * W;
    }
    else if (style === "arcLower") { dx = t * W; sY = 1 + B * (1 - 4 * t * t); dy = (sY - 1) * H / 2; }
    else if (style === "arcUpper") { dx = t * W; sY = 1 + B * (1 - 4 * t * t); dy = -(sY - 1) * H / 2; }
    else if (style === "arch") { dx = t * W; dy = -B * (W / 2) * (1 - 4 * t * t); }
    else if (style === "bulge") { dx = t * W; sY = 1 + B * (1 - 4 * t * t); sX = 1 + Math.abs(B) * 0.2 * (1 - 4 * t * t); }
    else if (style === "shellLower") { angle = t * B * Math.PI / 2; dx = t * W; sY = 1 + B * (t + 0.5); }
    else if (style === "shellUpper") { angle = -t * B * Math.PI / 2; dx = t * W; sY = 1 - B * (t + 0.5); }
    else if (style === "flag") { dx = t * W; dy = B * (H * 0.8) * Math.sin(t * Math.PI); }
    else if (style === "wave") { dx = t * W; dy = B * (H * 0.8) * Math.sin(t * 2 * Math.PI); }
    else if (style === "fish") { dx = t * W; sY = 1 + B * (t + 0.5); sX = 1 + Math.abs(B) * 0.1; }
    else if (style === "rise") { dx = t * W; dy = -B * (W / 4) * t; }
    else if (style === "fishEye") { dx = t * W * (1 + Math.abs(B) * (1 - 4 * t * t)); sY = 1 + Math.abs(B) * (1 - 4 * t * t); }
    else if (style === "inflate") { dx = t * W; sY = 1 + B * (1 - 4 * t * t); sX = 1 + B * (1 - 4 * t * t); }
    else if (style === "squeeze") { dx = t * W; sY = 1 - B * (1 - 4 * t * t); sX = 1 - B * 0.2 * (1 - 4 * t * t); }
    else if (style === "twist") { dx = t * W; angle = t * B * Math.PI; }
    else if (style === "perspective") { sY = 1 + B * t * 2; dx = t * (W * (1 + Math.abs(B) * 0.2)); dy = 0; angle = 0; }

    // Apply Vertical Distortion by tapering sY
    if (Math.abs(DV) > 0.01) {
      const taper = 1 + DV * t * 2;
      sY *= taper;
      dy += (taper - 1) * H / 2;
    }

    const curWidth = H * 0.6 * sX; const curHeight = H * sY;
    const halfW = curWidth / 2; const halfH = curHeight / 2;
    const rad = angle;
    const corners = [{ x: -halfW, y: -halfH }, { x: halfW, y: -halfH }, { x: halfW, y: halfH }, { x: -halfW, y: halfH }].map(p => ({
      x: dx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: dy + p.x * Math.sin(rad) + p.y * Math.cos(rad)
    }));

    corners.forEach(c => {
      if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
    });

    return { char, dx, dy, angle, sX, sY };
  });

  if (minX === Infinity) return { positions: [], width: 10, height: 10, cx: 0, cy: 0 };
  const padding = H * 0.2;
  return { positions, width: (maxX - minX) + padding, height: (maxY - minY) + padding, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};


const getIntrinsicBounds = (el) => {
  if (el.type === "text" && el.warpStyle && el.warpStyle !== "none") {
    const metrics = getWarpMetrics(el);
    return { w: Math.max(10, metrics.width), h: Math.max(10, metrics.height), metrics };
  } else if (el.type === "text") {
    const w = measureTextWidth(el.content, el.fontSize, el.fontFamily);
    const ls = (safeNum(el.letterSpacing, 0));
    const lines = (el.content || "").split("\n");
    const h = lines.length * (safeNum(el.fontSize, 32) * safeNum(el.lineHeight, 1.2));
    return { w: Math.max(10, w + (el.content?.length || 0) * ls), h: Math.max(10, h), metrics: null };
  }
  return { w: Math.max(10, el.width || 100), h: Math.max(10, el.height || 100) };
};

const getVisualBounds = (el) => {
  const intrinsic = getIntrinsicBounds(el);
  if (el.type === "text") {
    return { w: Math.max(10, intrinsic.w * safeNum(el.scaleX, 1)), h: Math.max(10, intrinsic.h * safeNum(el.scaleY, 1)) };
  }
  return { w: Math.max(10, el.width || 100), h: Math.max(10, el.height || 100) };
};

const getElementBounds = (el) => {
  const bounds = getVisualBounds(el);
  let w = bounds.w, h = bounds.h;
  let basePoints = [];
  if (el.customPoints && el.customPoints.length > 0) {
    basePoints = el.customPoints.map(p => ({ x: p.x - w / 2, y: p.y - h / 2 }));
  } else {
    basePoints = [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
  }
  const cx = safeNum(el.x, 0) + w / 2;
  const cy = safeNum(el.y, 0) + h / 2;
  const rad = safeNum(el.rotation, 0) * Math.PI / 180;
  const corners = basePoints.map(p => ({
    x: cx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: cy + p.x * Math.sin(rad) + p.y * Math.cos(rad)
  }));
  return { minX: Math.min(...corners.map(c => c.x)), maxX: Math.max(...corners.map(c => c.x)), minY: Math.min(...corners.map(c => c.y)), maxY: Math.max(...corners.map(c => c.y)) };
}

const getStarPath = (w, h, points = 5, innerScale = 0.5) => {
  let path = "";
  const cx = w / 2, cy = h / 2, outerR = w / 2, innerR = (w / 2) * innerScale;
  for (let i = 0; i < 2 * points; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle); const y = cy + (r * (h / w)) * Math.sin(angle);
    path += (i === 0 ? "M" : "L") + `${x},${y}`;
  }
  return path + "Z";
};

const getTrianglePath = (w, h) => `M${w / 2},0 L${w},${h} L0,${h} Z`;

const getDefaultPoints = (el, bounds) => {
  const w = bounds.w, h = bounds.h;
  if (el.type === 'rect') return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  if (el.type === 'triangle') return [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  if (el.type === 'star') {
    const pts = el.points || 5; const cx = w / 2, cy = h / 2, outerR = w / 2, innerR = (w / 2) * 0.5;
    const result = [];
    for (let i = 0; i < 2 * pts; i++) {
      const angle = (i * Math.PI) / pts - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      result.push({ x: cx + r * Math.cos(angle), y: cy + (r * (h / w)) * Math.sin(angle) });
    }
    return result;
  }
  return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
};

const createGradient = (ctx, el, w, h) => {
  const angleRad = (el.gradientAngle || 0) * Math.PI / 180;
  const centerX = w / 2, centerY = h / 2;
  const length = Math.sqrt(w * w + h * h);
  const x1 = centerX - (Math.cos(angleRad) * length / 2);
  const y1 = centerY - (Math.sin(angleRad) * length / 2);
  const x2 = centerX + (Math.cos(angleRad) * length / 2);
  const y2 = centerY + (Math.sin(angleRad) * length / 2);
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, el.color || '#000000');
  grad.addColorStop(1, el.gradientColor2 || '#ffffff');
  return grad;
};

const getSvgFill = (el, idPrefix = "") => (el.fillType === 'gradient' ? `url(#grad_${idPrefix}${el.id})` : el.color);

const getShapePathData = (el, w, h) => {
  if (el.customPoints && el.customPoints.length > 1) {
    return `M${el.customPoints[0].x},${el.customPoints[0].y} ` + el.customPoints.slice(1).map((p) => `L${p.x},${p.y}`).join(' ') + ' Z';
  }

  if (el.type === 'star') return getStarPath(w, h, el.points || 5);
  if (el.type === 'triangle') return getTrianglePath(w, h);
  if (el.type === 'hexagon') return `M${w / 2},${h * 0.05} L${w * 0.95},${h * 0.25} L${w * 0.95},${h * 0.75} L${w / 2},${h * 0.95} L${w * 0.05},${h * 0.75} L${w * 0.05},${h * 0.25} Z`;
  if (el.type === 'heart') return `M${w / 2},${h * 0.9} C${w * 0.05},${h * 0.6} 0,${h * 0.25} ${w * 0.25},${h * 0.25} C${w * 0.4},${h * 0.25} ${w / 2},${h * 0.35} ${w / 2},${h * 0.35} C${w / 2},${h * 0.35} ${w * 0.6},${h * 0.25} ${w * 0.75},${h * 0.25} C${w},${h * 0.25} ${w * 0.95},${h * 0.6} ${w / 2},${h * 0.9} Z`;
  if (el.type === 'arrow') return `M0,${h * 0.3} L${w * 0.6},${h * 0.3} L${w * 0.6},0 L${w},${h / 2} L${w * 0.6},${h} L${w * 0.6},${h * 0.7} L0,${h * 0.7} Z`;
  if (el.type === 'line') return `M0,${h / 2} L${w},${h / 2}`;

  return null;
};

const renderSvgShapeInner = (child, fill, strokeColor = "none", strokeWidth = 0, strokeJoin = "round") => {
  const w = safeNum(child.width, 100);
  const h = safeNum(child.height, 100);
  const cx = (child.localX || 0) + w / 2;
  const cy = (child.localY || 0) + h / 2;
  const pathData = getShapePathData(child, w, h);

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${child.rotation || 0}) translate(${-w / 2}, ${-h / 2})`}>
      {child.type === 'rect' && !child.customPoints && (
        <rect width={w} height={h} rx={child.borderRadius || 0} ry={child.borderRadius || 0} fill={fill} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin={strokeJoin} />
      )}
      {child.type === 'circle' && (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin={strokeJoin} />
      )}
      {pathData && (
        <path d={pathData} fill={fill} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin={strokeJoin} strokeLinecap={child.type === 'line' ? 'round' : 'butt'} />
      )}
    </g>
  );
};

const STORAGE_KEY = 'tudi_wrap_project_v1';

// --- UI HELPER COMPONENTS (Top-level to prevent unmounting crashes) ---

const CustomIntegratedPicker = ({ activeColor, onColorChange }) => {
  const [hsv, setHsv] = useState(() => hexToHsv(activeColor || "#4B00FF"));
  const satRef = useRef(null);
  const hueRef = useRef(null);

  useEffect(() => {
    const newHsv = hexToHsv(activeColor);
    if (Math.round(newHsv.h) !== Math.round(hsv.h) || Math.round(newHsv.s) !== Math.round(hsv.s) || Math.round(newHsv.v) !== Math.round(hsv.v)) {
      setHsv(newHsv);
    }
  }, [activeColor]);

  const handleSatMove = useCallback((e) => {
    if (!satRef.current) return;
    const rect = satRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newHsv = { ...hsv, s: x * 100, v: (1 - y) * 100 };
    setHsv(newHsv);
    onColorChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv, onColorChange]);

  const handleHueMove = useCallback((e) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newHsv = { ...hsv, h: x * 360 };
    setHsv(newHsv);
    onColorChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv, onColorChange]);

  const startSatDrag = (e) => {
    handleSatMove(e);
    const move = (me) => handleSatMove(me);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startHueDrag = (e) => {
    handleHueMove(e);
    const move = (me) => handleHueMove(me);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="space-y-4">
      <div ref={satRef} onPointerDown={startSatDrag} className="relative w-full h-32 rounded-lg cursor-crosshair overflow-hidden border border-white/10 shadow-inner" style={{ backgroundColor: hsvToHex(hsv.h, 100, 100) }}>
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute w-3 h-3 border-2 border-white rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border border-white/10 shadow-lg" style={{ backgroundColor: activeColor }} />
        <div ref={hueRef} onPointerDown={startHueDrag} className="relative flex-1 h-3 rounded-full cursor-pointer border border-white/5" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}>
          <div className="absolute w-4 h-4 bg-white border border-slate-400 rounded-full shadow-md -top-0.5 -translate-x-1/2 pointer-events-none" style={{ left: `${(hsv.h / 360) * 100}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['r', 'g', 'b'].map((key) => {
          const rgb = (() => {
            const hex = activeColor || "#000000";
            let r, g, b;
            if (hex.length === 7) { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); }
            else { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
            return { r, g, b };
          })();
          return (
            <div key={key} className="flex flex-col gap-1 items-center">
              <input type="number" min="0" max="255" value={rgb[key]} onChange={(e) => {
                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                const newRgb = { ...rgb, [key]: val };
                const toHex = x => { const h = x.toString(16); return h.length === 1 ? '0' + h : h; };
                onColorChange(`#${toHex(newRgb.r)}${toHex(newRgb.g)}${toHex(newRgb.b)}`);
              }} className="w-full bg-slate-800 text-white text-[10px] text-center p-1.5 rounded border border-slate-700 outline-none focus:border-indigo-500" />
              <span className="text-[8px] font-bold text-slate-500 uppercase">{key}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ColorEditorArea = ({ activeColor, onColorChange, editId, activeColorEditId, pickerTab, setPickerTab, activateEyedropper }) => {
  const isVisible = activeColorEditId === editId;

  useEffect(() => {
    if (isVisible) {
      const pickerElement = document.getElementById(`picker-${editId}`);
      if (pickerElement) pickerElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isVisible, editId]);

  if (!isVisible) return null;

  return (
    <div id={`picker-${editId}`} className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl mt-3 animate-in fade-in slide-in-from-top-1">
      <div className="flex bg-slate-800/80 backdrop-blur-md rounded-xl p-1 mb-4 border border-slate-700/50">
        <button onClick={() => setPickerTab("swatches")} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all duration-300 ${pickerTab === 'swatches' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Swatches</button>
        <button onClick={() => setPickerTab("color")} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all duration-300 ${pickerTab === 'color' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Picker</button>
      </div>

      {pickerTab === "swatches" ? (
        <div className="grid grid-cols-10 gap-0.5 p-1 bg-slate-800 rounded-lg max-h-[140px] overflow-y-auto custom-scrollbar">
          {ILLUSTRATOR_SWATCHES.map((color, idx) => (
            <button key={`${color}-${idx}`} onClick={() => onColorChange(color)} className={`aspect-square w-full rounded-[1px] transition-transform active:scale-90 relative ${(activeColor || "").toLowerCase() === color.toLowerCase() ? 'ring-2 ring-white z-10' : 'hover:scale-110 hover:z-20'}`} style={{ backgroundColor: color }} title={color}>
              {(activeColor || "").toLowerCase() === color.toLowerCase() && <div className="absolute inset-0 flex items-center justify-center text-white/40"><Check size={8} /></div>}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <CustomIntegratedPicker activeColor={activeColor} onColorChange={onColorChange} />
          <div className="flex gap-2 items-center pt-2 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">HEX</span>
            <input type="text" value={(activeColor || "").toUpperCase()} onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-F]{6}$/i.test(val)) onColorChange(val);
            }} className="bg-slate-800 text-white font-mono text-[10px] p-2 rounded border border-slate-700 flex-1 outline-none focus:border-indigo-500" />
            <button onClick={activateEyedropper} className="p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-indigo-400"><Pipette size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const ARTBOARD_W = 815, ARTBOARD_H = 261, GUIDE1_W = 686.5, GUIDE1_H = 228.5, GUIDE2_W = 216.5, GUIDE2_H = 180;

  const [elements, setElements] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.elements || [];
        } catch (e) { return []; }
      }
    }
    return [];
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("props");
  const [activeTool, setActiveTool] = useState("select");
  const [zoom, setZoom] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Canvas pan offset
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [background, setBackground] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.background) return parsed.background;
          return { id: 'bg_base', label: 'Background', src: null, color: parsed.canvasBg || "#ffffff", width: ARTBOARD_W, height: ARTBOARD_H, locked: true };
        } catch (e) {
          return { id: 'bg_base', label: 'Background', src: null, color: "#ffffff", width: ARTBOARD_W, height: ARTBOARD_H, locked: true };
        }
      }
    }
    return { id: 'bg_base', label: 'Background', src: null, color: "#ffffff", width: ARTBOARD_W, height: ARTBOARD_H, locked: true };
  });
  const mobileShift = false;
  const [marquee, setMarquee] = useState(null);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [currentShape, setCurrentShape] = useState("rect");
  const [statusMsg, setStatusMsg] = useState(""); // Toast status message  
  const [submitStatus, setSubmitStatus] = useState("idle");

  // States for Auto-Shrink Panels
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);

  // State for Tabbed Color Picker (Default to Swatches)
  const [activeColorEditId, setActiveColorEditId] = useState(null);
  const [pickerTab, setPickerTab] = useState("swatches"); // Default to swatches for quick access
  const canvasRef = useRef(null);
  const viewportRef = useRef(null); // Ref for the scrollable viewport
  const fileInputRef = useRef(null);
  const propsPanelRef = useRef(null);
  const dragInfo = useRef({ ids: [], type: null, startX: 0, startY: 0, initialVals: {} });
  const elementsRef = useRef(elements);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const backgroundRef = useRef(background);

  useEffect(() => { backgroundRef.current = background; }, [background]);

  const spaceDown = useRef(false); // Tracks if Space is held for panning
  const panStart = useRef(null); // Starting point for pan gesture
  const gestureRef = useRef({ pointers: new Map(), lastDist: null, lastMid: null });

  const selectedIdsCount = selectedIds.length;
  const selectedElement = selectedIdsCount === 1 ? elements.find((el) => el.id === selectedIds[0]) : null;
  // Bug 6 fix: use lookup map so new shape types don't fall back to TriangleIcon

  // --- EDITOR LOGIC ---

  // Bug 12 fix: split font injection (empty deps) from statusMsg timer
  useEffect(() => {
    const FONT_LINK_ID = "google-fonts-studio";
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.href = `https://fonts.googleapis.com/css2?` + GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, "+")}:wght@400;700`).join("&") + `&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  // Status message auto-clear timer
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    const initialHistory = [{
      elements: JSON.parse(JSON.stringify(elements)),
      background: JSON.parse(JSON.stringify(background))
    }];
    historyRef.current = initialHistory;
    historyIndexRef.current = 0;
    setHistory(initialHistory);
    setHistoryIndex(0);
  }, []);

  // Auto-scroll color picker into view
  useEffect(() => {
    if (activeColorEditId && propsPanelRef.current) {
      setTimeout(() => {
        const picker = document.getElementById(`picker-${activeColorEditId}`);
        if (picker) {
          picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [activeColorEditId]);

  // Persist to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const projectData = { elements, background };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
      } catch (e) {
        console.warn("localStorage quota exceeded, skipping autosave.", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [elements, background]);

  const saveToHistory = useCallback((newElements, newBackground) => {
    const elementsSource = typeof newElements !== "undefined" ? newElements : elementsRef.current;
    const backgroundSource = typeof newBackground !== "undefined" ? newBackground : backgroundRef.current;

    const cleanElements = JSON.parse(JSON.stringify(elementsSource));
    const cleanBackground = JSON.parse(JSON.stringify(backgroundSource));
    const nextEntry = { elements: cleanElements, background: cleanBackground };

    const currentHead = historyRef.current[historyIndexRef.current];
    if (currentHead) {
      const currentSerialized = JSON.stringify(currentHead);
      const nextSerialized = JSON.stringify(nextEntry);
      if (currentSerialized === nextSerialized) return;
    }

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(nextEntry);

    const trimmedHistory = nextHistory.slice(-20);
    const nextIndex = trimmedHistory.length - 1;

    historyRef.current = trimmedHistory;
    historyIndexRef.current = nextIndex;
    setHistory(trimmedHistory);
    setHistoryIndex(nextIndex);
  }, []);

  const applyElementsUpdate = useCallback((updater, options = {}) => {
    const { saveHistory = true } = options;
    const currentElements = elementsRef.current;
    const nextElements = typeof updater === 'function' ? updater(currentElements) : updater;

    elementsRef.current = nextElements;
    setElements(nextElements);

    if (saveHistory) {
      saveToHistory(nextElements, backgroundRef.current);
    }

    return nextElements;
  }, [saveToHistory]);

  const updateSelectedElement = useCallback((patchOrUpdater, options = {}) => {
    if (!selectedElement) return;

    applyElementsUpdate((prev) => prev.map((el) => {
      if (el.id !== selectedElement.id) return el;
      return typeof patchOrUpdater === 'function' ? patchOrUpdater(el) : { ...el, ...patchOrUpdater };
    }), options);
  }, [applyElementsUpdate, selectedElement]);

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    const pastState = historyRef.current[nextIndex];
    if (!pastState) return;

    const nextElements = JSON.parse(JSON.stringify(pastState.elements || []));
    const nextBg = JSON.parse(JSON.stringify(pastState.background || backgroundRef.current));

    historyIndexRef.current = nextIndex;
    elementsRef.current = nextElements;
    backgroundRef.current = nextBg;

    setHistoryIndex(nextIndex);
    setElements(nextElements);
    setBackground(nextBg);
    setSelectedIds([]);
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    const futureState = historyRef.current[nextIndex];
    if (!futureState) return;

    const nextElements = JSON.parse(JSON.stringify(futureState.elements || []));
    const nextBg = JSON.parse(JSON.stringify(futureState.background || backgroundRef.current));

    historyIndexRef.current = nextIndex;
    elementsRef.current = nextElements;
    backgroundRef.current = nextBg;

    setHistoryIndex(nextIndex);
    setElements(nextElements);
    setBackground(nextBg);
    setSelectedIds([]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const id = `image_${Date.now()}`;
        const startWidth = Math.min(200, img.width); const startHeight = startWidth * (img.height / img.width);
        const newEl = { id, type: "image", src: event.target.result, x: ARTBOARD_W / 2 - startWidth / 2, y: ARTBOARD_H / 2 - startHeight / 2, width: startWidth, height: startHeight, rotation: 0, visible: true, locked: false, opacity: 1, strokes: [] };
        applyElementsUpdate(prev => [...prev, newEl]);
        setSelectedIds([id]); setActiveTool("select");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const addElement = (type) => {
    const id = `${type}_${Date.now()}`;
    // Bug 10 fix: line elements get a 12px-tall hitbox instead of 100px height
    const defaultH = type === 'line' ? 12 : 100;
    const newEl = type === "text"
      ? { id, type: "text", content: "New Text", x: 100, y: 100, fontSize: 32, fontFamily: "Inter", textAlign: "left", warpStyle: "none", warpBend: 50, warpDistortH: 0, warpDistortV: 0, rotation: 0, scaleX: 1, scaleY: 1, color: "#1a1a1a", visible: true, locked: false, fillType: 'solid', opacity: 1, strokes: [], letterSpacing: 0, lineHeight: 1.2, fontWeight: 'bold', fontStyle: 'normal', textTransform: 'none', textDecoration: 'none' }
      : { id, type, x: 150, y: 150, width: 100, height: defaultH, rotation: 0, color: "#3b82f6", visible: true, locked: false, points: type === 'star' ? 5 : undefined, fillType: 'solid', gradientColor2: '#ffffff', gradientAngle: 90, opacity: 1, strokes: [], borderRadius: 0 };
    applyElementsUpdate(prev => [...prev, newEl]);
    setSelectedIds([id]); setActiveTool("select"); setShowShapeMenu(false);
  };

  const activateEyedropper = async () => {
    if (!window.EyeDropper) {
      setStatusMsg("Browser does not support EyeDropper.");
      return;
    }
    const eyeDropper = new window.EyeDropper();
    try {
      const result = await eyeDropper.open();

      if (activeColorEditId === 'canvas') {
        const nextBg = { ...backgroundRef.current, color: result.sRGBHex };
        backgroundRef.current = nextBg;
        setBackground(nextBg);
        saveToHistory(elementsRef.current, nextBg);
        return;
      }

      if (selectedElement) {
        if (activeColorEditId === 'fill') {
          updateSelectedElement({ color: result.sRGBHex });
        } else if (activeColorEditId === 'fill2') {
          updateSelectedElement({ gradientColor2: result.sRGBHex });
        } else if (activeColorEditId?.startsWith('stroke-')) {
          const idx = parseInt(activeColorEditId.split('-')[1]);
          updateStroke(idx, 'color', result.sRGBHex);
        } else {
          updateSelectedElement({ color: result.sRGBHex });
        }
      } else {
        const nextBg = { ...backgroundRef.current, color: result.sRGBHex };
        backgroundRef.current = nextBg;
        setBackground(nextBg);
        saveToHistory(elementsRef.current, nextBg);
      }
    } catch (e) { }
  };

  const applyPathfinder = (operation) => {
    if (selectedIdsCount !== 2) return;
    const el1 = elements.find(el => el.id === selectedIds[0]);
    const el2 = elements.find(el => el.id === selectedIds[1]);
    const sorted = [el1, el2].sort((a, b) => elements.indexOf(a) - elements.indexOf(b));
    const backEl = sorted[0]; const frontEl = sorted[1];
    // Bug 11 fix: include new shape types in pathfinder allowed list
    const allowedTypes = ['rect', 'circle', 'star', 'triangle', 'hexagon', 'heart', 'arrow'];
    if (!allowedTypes.includes(backEl.type) || !allowedTypes.includes(frontEl.type)) {
      setStatusMsg('Pathfinder requires two shape elements.'); return;
    }
    const b1 = getElementBounds(backEl); const b2 = getElementBounds(frontEl);
    let minX, maxX, minY, maxY;
    if (operation === 'subtract') { minX = b1.minX; maxX = b1.maxX; minY = b1.minY; maxY = b1.maxY; }
    else if (operation === 'intersect') {
      minX = Math.max(b1.minX, b2.minX); maxX = Math.min(b1.maxX, b2.maxX);
      minY = Math.max(b1.minY, b2.minY); maxY = Math.min(b1.maxY, b2.maxY);
      if (minX >= maxX || minY >= maxY) { minX = b1.minX; maxX = b1.maxX; minY = b1.minY; maxY = b1.maxY; }
    } else {
      minX = Math.min(b1.minX, b2.minX); maxX = Math.max(b1.maxX, b2.maxX);
      minY = Math.min(b1.minY, b2.minY); maxY = Math.max(b1.maxY, b2.maxY);
    }
    const width = Math.max(10, maxX - minX); const height = Math.max(10, maxY - minY);
    const newCompound = { id: `compound_${Date.now()}`, type: 'compound', operation, color: backEl.color, x: minX, y: minY, width, height, originalWidth: width, originalHeight: height, rotation: 0, visible: true, locked: false, opacity: backEl.opacity || 1, strokes: [...(backEl.strokes || [])], children: [{ ...backEl, localX: backEl.x - minX, localY: backEl.y - minY }, { ...frontEl, localX: frontEl.x - minX, localY: frontEl.y - minY }] };
    applyElementsUpdate(prev => {
      const updated = prev.filter(el => !selectedIds.includes(el.id));
      updated.push(newCompound);
      return updated;
    });
    setSelectedIds([newCompound.id]);
  };

  const getDesignSnapshot = useCallback(() => {
    try {
      const sanitizedElements = elements.map(el => {
        const { id, type, x, y, rotation, color, visible, opacity, strokes } = el;
        const base = { id, type, x: safeNum(x), y: safeNum(y), rotation: safeNum(rotation), color, visible: !!visible, opacity: safeNum(opacity, 1), strokes: (strokes || []).slice(0, 3) };
        if (type === 'text') {
          return { ...base, content: el.content, fontSize: el.fontSize, fontFamily: el.fontFamily, textAlign: el.textAlign, warpStyle: el.warpStyle, warpBend: el.warpBend, warpDistortH: el.warpDistortH, warpDistortV: el.warpDistortV, scaleX: el.scaleX, scaleY: el.scaleY, letterSpacing: el.letterSpacing, lineHeight: el.lineHeight, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textTransform: el.textTransform, textDecoration: el.textDecoration, fillType: el.fillType, gradientColor2: el.gradientColor2, gradientAngle: el.gradientAngle };
        }
        if (type === 'image') {
          const isDataUrl = el.src && el.src.startsWith('data:');
          return { ...base, src: isDataUrl ? '[data-url-hidden]' : el.src, width: el.width, height: el.height };
        }
        if (type === 'compound') {
          const compactChildren = (el.children || []).map(c => ({ id: c.id, type: c.type, localX: safeNum(c.localX), localY: safeNum(c.localY), rotation: safeNum(c.rotation), width: c.width, height: c.height, points: c.points, customPoints: c.customPoints, borderRadius: c.borderRadius }));
          return { ...base, width: el.width, height: el.height, operation: el.operation, children: compactChildren };
        }
        return { ...base, width: el.width, height: el.height, borderRadius: el.borderRadius, points: el.points, customPoints: el.customPoints, fillType: el.fillType, gradientColor2: el.gradientColor2, gradientAngle: el.gradientAngle, operation: el.operation };
      });

      return {
        canvas: { w: ARTBOARD_W, h: ARTBOARD_H },
        background: { id: background.id, label: background.label, color: background.color, src: (background.src && background.src.startsWith('data:')) ? '[data-url-hidden]' : background.src },
        elements: sanitizedElements,
        zOrder: elements.map(el => el.id),
        schema: '1.2.0',
        timestamp: Date.now()
      };
    } catch (e) {
      console.error("Snapshot error:", e);
      return null;
    }
  }, [elements, background]);

  const handleAddToCart = useCallback(async () => {
    if (submitStatus === 'submitting') return;

    // --- SAFE PRE-SUBMIT VALIDATION MVP RP0 ---
    const rawVId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('variant') : null;
    const vId = Number(rawVId);

    if (!vId || isNaN(vId) || vId <= 0) {
      setStatusMsg("Error: Invalid or missing Shopify Variant ID");
      return;
    }

    if (!background || !background.id || background.id === 'none') {
      setStatusMsg("Error: Please select a valid product background first");
      return;
    }

    const hasTooManyStrokes = elements.some(el => el.strokes && el.strokes.length > 3);
    if (hasTooManyStrokes) {
      setStatusMsg("Error: Maximum of 3 strokes allowed per object");
      return;
    }
    // ------------------------------------------

    // Rely exclusively on frontend payload injection. No custom backend assumptions.
    const snapshot = getDesignSnapshot();
    if (!snapshot) {
      setStatusMsg("Error: Failed to generate design snapshot.");
      setSubmitStatus("error");
      return;
    }

    setSubmitStatus("submitting");
    setStatusMsg("Adding to cart...");

    const hasTextDistortion = elements.some(el => el.type === 'text' && el.warpStyle && el.warpStyle !== 'none');
    const summaryStr = `${elements.length} design objects, Background: ${background.label || background.color || 'Custom'}`;

    const shopifyProperties = {
      "_tudi_schema_version": "1.2.0",
      "_tudi_editor_version": "1.2.0",
      "_tudi_background_id": String(background.id || ""),
      "_tudi_background_label": String(background.label || "Untitled"),
      "_tudi_object_count": String(elements.length),
      "_tudi_has_text_distortion": hasTextDistortion ? "true" : "false",
      "_tudi_summary": summaryStr,
      "_tudi_design_snapshot": JSON.stringify(snapshot)
    };

    // Emit event so the hosting Shopify theme can inject this into its native add-to-cart flow
    const event = new CustomEvent("tudiwrap:cart-payload-ready", {
      detail: { properties: shopifyProperties },
      cancelable: true
    });
    const notCanceled = document.dispatchEvent(event);

    if (!notCanceled) {
      setStatusMsg("Cart handling delegated to theme.");
      setSubmitStatus("idle");
      return;
    }

    // Fallback: If no event listener intercepted it, attempt typical /cart/add.js but safely handle missing variants
    try {
      const payload = { items: [{ id: vId, quantity: 1, properties: shopifyProperties }] };
      const resp = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (resp.ok) {
        setStatusMsg("Added to cart successfully!");
        setSubmitStatus("success");
        setTimeout(() => {
          clearDraft();
          setSubmitStatus("idle");
        }, 1000);
      } else {
        setStatusMsg("Error: Failed to add to cart via API.");
        setSubmitStatus("error");
      }
    } catch (e) {
      setStatusMsg(`Error: ${e.message}`);
      setSubmitStatus("error");
    }
  }, [elements, background, getDesignSnapshot, submitStatus]);

  const exportCanvasToImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = ARTBOARD_W;
    canvas.height = ARTBOARD_H;
    const ctx = canvas.getContext("2d");

    const strokeShape = (targetCtx, targetEl, w, h, typeFilter) => {
      if (!targetEl.strokes || targetEl.strokes.length === 0) return;
      const strokesArray = [...targetEl.strokes].reverse();

      strokesArray.forEach((stroke) => {
        const isOutside = stroke.alignment === 'outside';
        if (typeFilter === 'outside' && !isOutside) return;
        if (typeFilter === 'inside-center' && isOutside) return;

        const strokeWidth = safeNum(stroke.width, 0);
        if (strokeWidth <= 0) return;

        targetCtx.save();
        targetCtx.strokeStyle = stroke.color;
        targetCtx.lineJoin = stroke.join || "round";
        targetCtx.lineCap = targetEl.type === 'line' ? 'round' : 'butt';

        if (targetEl.type === 'line') {
          targetCtx.lineWidth = stroke.alignment === 'center' || !stroke.alignment ? strokeWidth : strokeWidth * 2;
          targetCtx.beginPath();
          targetCtx.moveTo(0, h / 2);
          targetCtx.lineTo(w, h / 2);
          targetCtx.stroke();
          targetCtx.restore();
          return;
        }

        let p2d = null;
        targetCtx.beginPath();
        if (targetEl.type === 'rect' && !targetEl.customPoints) {
          if (typeof targetCtx.roundRect === 'function' && targetEl.borderRadius) {
            targetCtx.roundRect(0, 0, w, h, targetEl.borderRadius);
          } else {
            targetCtx.rect(0, 0, w, h);
          }
        } else if (targetEl.type === 'circle') {
          targetCtx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else {
          const pathData = getShapePathData(targetEl, w, h);
          if (pathData) p2d = new Path2D(pathData);
        }

        if (stroke.alignment === 'inside') {
          if (p2d) { targetCtx.clip(p2d); targetCtx.lineWidth = strokeWidth * 2; targetCtx.stroke(p2d); }
          else { targetCtx.clip(); targetCtx.lineWidth = strokeWidth * 2; targetCtx.stroke(); }
        } else if (stroke.alignment === 'outside') {
          targetCtx.lineWidth = strokeWidth * 2;
          if (p2d) targetCtx.stroke(p2d); else targetCtx.stroke();
        } else {
          targetCtx.lineWidth = strokeWidth;
          if (p2d) targetCtx.stroke(p2d); else targetCtx.stroke();
        }

        targetCtx.restore();
      });
    };

    const fillShape = (targetCtx, targetEl, w, h, fillStyle) => {
      targetCtx.fillStyle = fillStyle;
      targetCtx.beginPath();

      if (targetEl.customPoints && targetEl.customPoints.length > 1) {
        targetCtx.moveTo(targetEl.customPoints[0].x, targetEl.customPoints[0].y);
        targetEl.customPoints.slice(1).forEach((p) => targetCtx.lineTo(p.x, p.y));
        targetCtx.closePath();
        targetCtx.fill();
        return;
      }

      if (targetEl.type === 'rect') {
        if (typeof targetCtx.roundRect === 'function' && targetEl.borderRadius) {
          targetCtx.roundRect(0, 0, w, h, targetEl.borderRadius);
        } else {
          targetCtx.rect(0, 0, w, h);
        }
        targetCtx.fill();
        return;
      }

      if (targetEl.type === 'circle') {
        targetCtx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        targetCtx.fill();
        return;
      }

      const pathData = getShapePathData(targetEl, w, h);
      if (pathData) {
        targetCtx.fill(new Path2D(pathData));
      }
    };

    const renderCompoundToCanvas = (compoundEl, bounds) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.round(compoundEl.originalWidth || compoundEl.width || bounds.w));
      offscreen.height = Math.max(1, Math.round(compoundEl.originalHeight || compoundEl.height || bounds.h));
      const offCtx = offscreen.getContext('2d');
      const children = compoundEl.children || [];
      const [firstChild, secondChild] = children;

      const drawChild = (child) => {
        if (!child) return;
        const childW = safeNum(child.width, 100);
        const childH = safeNum(child.height, 100);
        offCtx.save();
        offCtx.translate((child.localX || 0) + childW / 2, (child.localY || 0) + childH / 2);
        offCtx.rotate((safeNum(child.rotation, 0)) * (Math.PI / 180));
        offCtx.translate(-childW / 2, -childH / 2);
        fillShape(offCtx, child, childW, childH, compoundEl.color);
        offCtx.restore();
      };

      if (compoundEl.operation === 'union') {
        drawChild(firstChild);
        drawChild(secondChild);
      } else if (compoundEl.operation === 'subtract') {
        drawChild(firstChild);
        offCtx.globalCompositeOperation = 'destination-out';
        drawChild(secondChild);
        offCtx.globalCompositeOperation = 'source-over';
      } else if (compoundEl.operation === 'intersect') {
        drawChild(firstChild);
        offCtx.globalCompositeOperation = 'destination-in';
        drawChild(secondChild);
        offCtx.globalCompositeOperation = 'source-over';
      } else if (compoundEl.operation === 'exclude') {
        drawChild(firstChild);
        offCtx.globalCompositeOperation = 'xor';
        drawChild(secondChild);
        offCtx.globalCompositeOperation = 'source-over';
      }

      ctx.drawImage(offscreen, 0, 0, bounds.w, bounds.h);
    };

    if (background.color) {
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (background.src) {
      const img = new Image();
      img.src = background.src;
      await new Promise((resolve) => { img.onload = resolve; });
      const bgW = background.width || canvas.width;
      const bgH = background.height || canvas.height;
      const imgRatio = img.width / img.height;
      const containerRatio = bgW / bgH;
      let drawW, drawH, drawX, drawY;
      if (imgRatio > containerRatio) {
        drawH = bgH;
        drawW = drawH * imgRatio;
        drawX = (bgW - drawW) / 2;
        drawY = 0;
      } else {
        drawW = bgW;
        drawH = drawW / imgRatio;
        drawX = 0;
        drawY = (bgH - drawH) / 2;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, bgW, bgH);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    const visibleElements = elementsRef.current.filter((el) => el.visible);

    for (const el of visibleElements) {
      const bounds = getVisualBounds(el);
      ctx.save();
      ctx.globalAlpha = el.opacity || 1;
      ctx.translate(safeNum(el.x, 0) + bounds.w / 2, safeNum(el.y, 0) + bounds.h / 2);
      ctx.rotate((safeNum(el.rotation, 0)) * (Math.PI / 180));
      ctx.translate(-bounds.w / 2, -bounds.h / 2);

      const fillStyle = el.fillType === 'gradient' ? createGradient(ctx, el, bounds.w, bounds.h) : el.color;

      if (el.type === 'compound') {
        renderCompoundToCanvas(el, bounds);
      } else if (['rect', 'circle', 'star', 'triangle', 'hexagon', 'heart', 'arrow'].includes(el.type)) {
        strokeShape(ctx, el, bounds.w, bounds.h, 'outside');
        fillShape(ctx, el, bounds.w, bounds.h, fillStyle);
        strokeShape(ctx, el, bounds.w, bounds.h, 'inside-center');
      } else if (el.type === 'line') {
        strokeShape(ctx, el, bounds.w, bounds.h, 'outside');
        if (!el.strokes || el.strokes.length === 0) {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = Math.max(2, bounds.h);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, Math.max(2, bounds.h / 2));
          ctx.lineTo(bounds.w, Math.max(2, bounds.h / 2));
          ctx.stroke();
        }
        strokeShape(ctx, el, bounds.w, bounds.h, 'inside-center');
      } else if (el.type === "text") {
        const intrinsic = getIntrinsicBounds(el);
        ctx.scale(safeNum(el.scaleX, 1), safeNum(el.scaleY, 1));
        const fontName = el.fontFamily || "Inter";
        const fontSize = safeNum(el.fontSize, 32);
        ctx.font = `${el.fontStyle || 'normal'} ${el.fontWeight || 'bold'} ${fontSize}px "${fontName}", sans-serif`;

        const drawText = (isStroke, stroke) => {
          const rawContent = el.content || "";
          const displayContent = el.textTransform === 'uppercase' ? rawContent.toUpperCase() : el.textTransform === 'lowercase' ? rawContent.toLowerCase() : rawContent;
          const lines = displayContent.split("\n");
          const letterSpacing = el.letterSpacing || 0;

          if (!el.warpStyle || el.warpStyle === "none") {
            ctx.textBaseline = "top";
            lines.forEach((line, index) => {
              const yPos = index * (fontSize * (el.lineHeight || 1.2));
              const chars = line.split('');
              const totalLineWidth = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + letterSpacing, 0) - letterSpacing;
              let startX = 0;
              if ((el.textAlign || 'left') === 'center') startX = (intrinsic.w - totalLineWidth) / 2;
              else if (el.textAlign === 'right') startX = intrinsic.w - totalLineWidth;

              let curX = startX;
              chars.forEach((ch) => {
                if (isStroke) {
                  ctx.strokeStyle = stroke.color;
                  ctx.lineJoin = stroke.join || 'round';
                  ctx.lineWidth = stroke.width * (stroke.alignment === 'center' ? 1 : 2);
                  ctx.strokeText(ch, curX, yPos);
                } else {
                  ctx.fillStyle = fillStyle;
                  ctx.fillText(ch, curX, yPos);
                }
                curX += ctx.measureText(ch).width + letterSpacing;
              });
            });
          } else if (intrinsic.metrics) {
            const metrics = intrinsic.metrics;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            metrics.positions.forEach((p) => {
              ctx.save();
              ctx.translate(intrinsic.w / 2 + (p.dx - metrics.cx), intrinsic.h / 2 + (p.dy - metrics.cy));
              ctx.rotate(p.angle);
              ctx.scale(p.sX, p.sY);
              const charDraw = el.textTransform === 'uppercase' ? p.char.toUpperCase() : el.textTransform === 'lowercase' ? p.char.toLowerCase() : p.char;
              if (isStroke) {
                ctx.strokeStyle = stroke.color;
                ctx.lineJoin = stroke.join || 'round';
                ctx.lineWidth = stroke.width * (stroke.alignment === 'center' ? 1 : 2);
                ctx.strokeText(charDraw, 0, 0);
              } else {
                ctx.fillStyle = fillStyle;
                ctx.fillText(charDraw, 0, 0);
              }
              ctx.restore();
            });
          }
        };

        if (el.strokes) [...el.strokes].reverse().forEach((stroke) => drawText(true, stroke));
        drawText(false, null);
      } else if (el.type === 'image' && el.src) {
        const img = new Image();
        img.src = el.src;
        await new Promise((resolve) => { img.onload = resolve; });
        const imgRatio = img.width / img.height;
        const containerRatio = bounds.w / bounds.h;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > containerRatio) {
          drawW = bounds.w;
          drawH = drawW / imgRatio;
          drawX = 0;
          drawY = (bounds.h - drawH) / 2;
        } else {
          drawH = bounds.h;
          drawW = drawH * imgRatio;
          drawX = (bounds.w - drawW) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }

      ctx.restore();
    }

    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const label = slugify(background.label || "Untitled");
    link.download = `tudiwrap-${label}.png`;
    link.href = dataURL;
    link.click();
    setStatusMsg("PNG exported successfully!");
  };

  const addStroke = () => {
    updateSelectedElement(prev => {
      if (prev.strokes && prev.strokes.length >= 3) return prev;
      const newStroke = { color: '#000000', width: 5, alignment: 'outside', join: 'round' };
      return { strokes: [newStroke, ...(prev.strokes || [])] };
    });
  };

  const removeStroke = (index) => {
    updateSelectedElement(prev => ({ strokes: (prev.strokes || []).filter((_, i) => i !== index) }));
  };

  const updateStroke = (index, key, val) => {
    updateSelectedElement(prev => {
      const newStrokes = [...(prev.strokes || [])];
      newStrokes[index] = { ...newStrokes[index], [key]: val };
      return { strokes: newStrokes };
    });
  };


  const moveLayerLocal = (id, direction) => {
    applyElementsUpdate(prev => {
      const index = prev.findIndex((el) => el.id === id); if (index < 0) return prev;
      const newElements = [...prev];
      if (direction === "up" && index < prev.length - 1) { [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]; }
      else if (direction === "down" && index > 0) { [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]; }
      else return prev;
      return newElements;
    });
  };

  const didMove = useRef(false); // Bug 8 fix: track real movement to avoid saving on click-only

  const handleUp = () => {
    if (panStart.current) {
      panStart.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      setMarquee(null);
      // Bug 8 fix: only save to history if the user actually moved/resized something
      if (didMove.current) {
        saveToHistory(elementsRef.current, backgroundRef.current);
      }
      didMove.current = false;
      dragInfo.current.type = null;
    }
  };

  const clearDraft = () => {
    const defaultBg = {
      id: 'bg_base',
      label: 'Background',
      src: null,
      color: "#ffffff",
      width: ARTBOARD_W,
      height: ARTBOARD_H,
      locked: true
    };

    elementsRef.current = [];
    backgroundRef.current = defaultBg;

    setElements([]);
    setBackground(defaultBg);
    setSelectedIds([]);
    setActiveColorEditId(null);
    setMarquee(null);
    setIsDragging(false);

    saveToHistory([], defaultBg);
  };

  // Bug 1 fix: use refs so the registered listener always calls latest handleMove/handleUp
  const handleMoveRef = useRef(null);
  const handleUpRef = useRef(null);

  const handleMove = (e) => {
    // Pan the viewport when Space is held
    if (panStart.current || dragInfo.current?.type === "pan") {
      const startP = panStart.current || { x: e.clientX, y: e.clientY };
      const dx = e.clientX - startP.x;
      const dy = e.clientY - startP.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!isDragging || dragInfo.current.type === null) return;
    const { ids, type, startX, startY, initialVals } = dragInfo.current;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    if (type === "marquee") {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const curX = (e.clientX - canvasRect.left) / zoom; const curY = (e.clientY - canvasRect.top) / zoom;
      const sX = (startX - canvasRect.left) / zoom; const sY = (startY - canvasRect.top) / zoom;
      const mX = Math.min(sX, curX); const mY = Math.min(sY, curY); const mW = Math.abs(curX - sX); const mH = Math.abs(curY - sY);
      setMarquee({ x: mX, y: mY, w: mW, h: mH });
      const newlySelected = elements.filter(el => { const b = getElementBounds(el); return !(b.minX > mX + mW || b.maxX < mX || b.minY > mY + mH || b.maxY < mY); }).map(el => el.id);
      setSelectedIds(newlySelected); return;
    }
    didMove.current = true; // Bug 8: mark that a real move occurred
    setElements((prev) => {
      const nextElements = prev.map((el) => {
        if (!ids.includes(el.id) || el.locked) return el;
        const initialVal = initialVals[el.id];
        if (type === "drag") return { ...el, x: safeNum(initialVal.x + dx, el.x), y: safeNum(initialVal.y + dy, el.y) };
        if (type.startsWith("resize-")) {
          const dir = type.split("-")[1]; const bounds = getVisualBounds(initialVal); const initW = Math.max(1, bounds.w); const initH = Math.max(1, bounds.h); const initX = safeNum(initialVal.x, 0); const initY = safeNum(initialVal.y, 0); const rad = safeNum(initialVal.rotation, 0) * (Math.PI / 180);
          const rDx = dx * Math.cos(-rad) - dy * Math.sin(-rad); const rDy = dx * Math.sin(-rad) + dy * Math.cos(-rad);
          let dw = 0, dh = 0; if (dir.includes('e')) dw = rDx; if (dir.includes('w')) dw = -rDx; if (dir.includes('s')) dh = rDy; if (dir.includes('n')) dh = -rDy;
          if ((e.shiftKey || mobileShift) && dir.length === 2) { const ratio = initH / initW; if (Math.abs(dw) > Math.abs(dh)) dh = Math.abs(dw * ratio) * Math.sign(dh || 1); else dw = Math.abs(dh / ratio) * Math.sign(dw || 1); }
          let newW = Math.max(10, initW + dw); let newH = Math.max(10, initH + dh); const actualDw = newW - initW; const actualDh = newH - initH;
          let fX = 0, fY = 0; if (dir.includes('e')) fX = 1; if (dir.includes('w')) fX = -1; if (dir.includes('s')) fY = 1; if (dir.includes('n')) fY = -1;
          const localCx = (actualDw / 2) * fX; const localCy = (actualDh / 2) * fY; const dCx = localCx * Math.cos(rad) - localCy * Math.sin(rad); const dCy = localCx * Math.sin(rad) + localCy * Math.cos(rad);
          const newX = safeNum(initX + dCx - actualDw / 2, el.x); const newY = safeNum(initY + dCy - actualDh / 2, el.y);
          if (el.type === 'text') { const intrinsic = getIntrinsicBounds(initialVal); return { ...el, x: newX, y: newY, scaleX: safeNum(newW / Math.max(1, intrinsic.w), 1), scaleY: safeNum(newH / Math.max(1, intrinsic.h), 1) }; }
          return { ...el, x: newX, y: newY, width: safeNum(newW, el.width), height: safeNum(newH, el.height) };
        }
        if (type === "rotate") {
          const rotateDx = e.clientX - safeNum(initialVal.centerX, e.clientX); const rotateDy = e.clientY - safeNum(initialVal.centerY, e.clientY);
          let angle = Math.atan2(rotateDy, rotateDx) * (180 / Math.PI);
          let newRotation = safeNum(angle, 0); if (Math.abs(newRotation % 45) < 5 || Math.abs(newRotation % 45) > 40) newRotation = Math.round(newRotation / 45) * 45;
          return { ...el, rotation: Math.round((newRotation + 360) % 360) };
        }
        if (type === "radius") {
          const cornerIdx = dragInfo.current.index;
          const bounds = getVisualBounds(initialVal);
          const maxRadius = Math.min(bounds.w, bounds.h) / 2;
          let newR = safeNum(initialVal.borderRadius || 0, 0);
          if (cornerIdx === 0) newR += (dx + dy) / 2;
          else if (cornerIdx === 1) newR += (-dx + dy) / 2;
          else if (cornerIdx === 2) newR += (-dx - dy) / 2;
          else if (cornerIdx === 3) newR += (dx - dy) / 2;
          return { ...el, borderRadius: Math.max(0, Math.min(maxRadius, newR)) };
        }
        if (type === "anchor") {
          const idx = dragInfo.current.index;
          const bounds = getVisualBounds(initialVal);
          const pts = el.customPoints ? [...el.customPoints] : getDefaultPoints(el, bounds);
          const rad = -safeNum(initialVal.rotation, 0) * (Math.PI / 180);
          const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
          const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
          pts[idx] = { x: pts[idx].x + localDx, y: pts[idx].y + localDy };
          return { ...el, customPoints: pts };
        }
        return el;
      });

      elementsRef.current = nextElements;
      return nextElements;
    });
  };

  // Keep refs updated to latest function instances
  handleMoveRef.current = handleMove;
  handleUpRef.current = handleUp;

  // Mouse wheel zoom on viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(4, Math.max(0.1, z - e.deltaY * 0.001)));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Shortcut keys
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); spaceDown.current = true; }
      if (e.key.toLowerCase() === 'v') { setActiveTool('select'); }
      if (e.key.toLowerCase() === 'a') { setActiveTool('direct-select'); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          applyElementsUpdate(prev => prev.filter(el => !selectedIds.includes(el.id)));
          setSelectedIds([]);
        }
      }
    };
    const onKeyUp = (e) => { if (e.code === 'Space') { spaceDown.current = false; panStart.current = null; } };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [selectedIds, applyElementsUpdate]);

  // Bug 1 fix: use stable ref-dispatching wrappers so closures never go stale
  useEffect(() => {
    const moveWrapper = (e) => handleMoveRef.current && handleMoveRef.current(e);
    const upWrapper = (e) => handleUpRef.current && handleUpRef.current(e);
    if (isDragging) {
      window.addEventListener("pointermove", moveWrapper, { passive: false });
      window.addEventListener("pointerup", upWrapper);
      window.addEventListener("pointercancel", upWrapper);
      return () => {
        window.removeEventListener("pointermove", moveWrapper);
        window.removeEventListener("pointerup", upWrapper);
        window.removeEventListener("pointercancel", upWrapper);
      };
    }
  }, [isDragging]);

  // --- COMPONENT RENDER ---

  return (
    <div className="relative h-screen w-full bg-[#0a0f1d] text-slate-200 overflow-hidden font-sans select-none touch-none">
      {/* Status Notification Toast */}
      {statusMsg && (
        <div className="fixed top-24 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={18} />
          <span className="text-xs font-bold tracking-wide">{statusMsg}</span>
        </div>
      )}

      <div
        className="fixed top-[72px] md:top-1/2 left-1/2 -translate-x-1/2 md:left-4 md:-translate-x-0 md:-translate-y-1/2 bg-[#1e293b]/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex flex-row md:flex-col items-center z-50 transition-all duration-500 h-max py-3 md:py-6 w-[95%] md:w-[68px] rounded-2xl md:rounded-3xl px-4 md:px-0 gap-3 md:gap-4"
      >
        {/* Top Prominent Selection Arrows */}
        <div className="flex flex-row md:flex-col gap-3">
          <button
            onClick={() => { setActiveTool("select"); setShowShapeMenu(false); }}
            title="Selection Tool (V)"
            className={`w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${activeTool === "select" ? "bg-indigo-600 text-white shadow-indigo-500/40" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`}
          >
            <MousePointer2 size={activeTool === "select" ? 22 : 20} />
          </button>
          <button
            onClick={() => { setActiveTool("direct-select"); setShowShapeMenu(false); }}
            title="Direct Selection (A)"
            className={`w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${activeTool === "direct-select" ? "bg-indigo-600 text-white shadow-indigo-500/40" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`}
          >
            <MousePointerClick size={activeTool === "direct-select" ? 22 : 20} />
          </button>
        </div>

        <div className="w-[1.5px] md:w-10 h-8 md:h-[1.5px] bg-slate-700/50 my-1 shrink-0" />

        {/* Other Tools Group */}
        <div className="flex flex-row md:flex-col gap-2 md:gap-4 items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              title="Shapes"
              className={`p-2.5 rounded-xl w-11 h-11 flex items-center justify-center transition-all duration-300 ${showShapeMenu ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <Plus size={20} />
            </button>
            {showShapeMenu && (
              <div className="absolute top-[110%] md:top-0 left-0 md:left-[110%] bg-[#1e293b]/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-2 shadow-2xl z-[100] flex flex-row md:flex-col gap-2 animate-in slide-in-from-top-2 md:slide-in-from-left-2">
                <button onClick={() => { setCurrentShape('rect'); addElement('rect'); setShowShapeMenu(false); }} className={`p-2 rounded-lg ${currentShape === 'rect' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}`}><Square size={20} /></button>
                <button onClick={() => { setCurrentShape('circle'); addElement('circle'); setShowShapeMenu(false); }} className={`p-2 rounded-lg ${currentShape === 'circle' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}`}><Circle size={20} /></button>
                <button onClick={() => { setCurrentShape('star'); addElement('star'); setShowShapeMenu(false); }} className={`p-2 rounded-lg ${currentShape === 'star' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}`}><Star size={20} /></button>
                <button onClick={() => { setCurrentShape('triangle'); addElement('triangle'); setShowShapeMenu(false); }} className={`p-2 rounded-lg ${currentShape === 'triangle' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}`}><TriangleIcon size={20} /></button>
              </div>
            )}
          </div>
          <button onClick={() => { addElement("text"); setShowShapeMenu(false); }} title="Text (T)" className="p-2.5 w-11 h-11 flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all duration-300 active:scale-90"><Type size={20} /></button>
          <button onClick={activateEyedropper} title="Eyedropper (I)" className={`p-2.5 w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${activeTool === 'eyedropper' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><Pipette size={20} /></button>
          <button onClick={() => fileInputRef.current?.click()} title="Image" className="p-2.5 w-11 h-11 flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all duration-300 active:scale-90 shrink-0"><ImageIcon size={20} /></button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      </div>

      <div className="absolute inset-0 z-0">
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1e293b]/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex items-center z-40 transition-all duration-500 overflow-hidden h-14 w-[90%] md:w-[600px] rounded-2xl px-6 justify-between gap-8"
        >
          <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-2 md:gap-6 shrink-0">
              <div className="flex items-center gap-1 md:gap-2"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div><h1 className="text-[11px] md:text-[15px] font-black text-white uppercase tracking-[0.25em] leading-none drop-shadow-sm">TUDI WRAP CUSTOM DESIGN</h1></div>
              <div className="flex gap-1 bg-slate-900/40 p-1 rounded-xl">
                <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-20 text-indigo-400 transition-all"><Undo2 size={16} /></button>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-20 text-indigo-400 transition-all"><Redo2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-6 shrink-0">
              <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full">
                <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))} className="text-slate-400 hover:text-white transition-all"><ZoomOut size={14} /></button>
                <span className="text-[10px] font-mono text-slate-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(4, z + 0.1))} className="text-slate-400 hover:text-white transition-all"><ZoomIn size={14} /></button>
              </div>
              <button onClick={exportCanvasToImage} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"><Download size={14} /> <span className="hidden sm:block">Export</span></button>
              <button onClick={handleAddToCart} disabled={submitStatus === 'submitting'} className={`${submitStatus === 'success' ? 'bg-green-600 hover:bg-green-500' : submitStatus === 'error' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/10 disabled:opacity-75`}><ShoppingCart size={14} className={submitStatus === 'submitting' ? "animate-pulse opacity-50" : ""} /> <span className="hidden sm:block">{submitStatus === 'submitting' ? 'Processing...' : submitStatus === 'success' ? 'Added!' : submitStatus === 'error' ? 'Failed' : 'Add to Cart'}</span></button>
              <button
                onClick={() => {
                  if (clearArmed) {
                    clearDraft();
                    setClearArmed(false);
                    setStatusMsg("Canvas Cleared!");
                  } else {
                    setClearArmed(true); setTimeout(() => setClearArmed((cur) => cur ? false : false), 5000);
                  }
                }}
                className={`p-2 rounded-xl transition-all border ${clearArmed ? "bg-red-600 border-red-400 text-white animate-pulse" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}
                title={clearArmed ? "Click again to confirm" : "Clear Project"}
              >
                {clearArmed ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-hidden bg-[#0a0f1d] flex items-start justify-center pt-36 pb-20 md:pt-24 md:pb-32 px-4 md:px-20 z-0 scrollbar-hide"
          style={{ cursor: spaceDown.current ? 'grab' : 'default', touchAction: 'none' }}
          onPointerDownCapture={(e) => {
            gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (gestureRef.current.pointers.size >= 2) {
              setIsDragging(false);
              dragInfo.current.type = null;
              const pts = [...gestureRef.current.pointers.values()];
              const [p1, p2] = pts;
              gestureRef.current.lastDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              gestureRef.current.lastMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            }
          }}
          onPointerDown={(e) => {
            if (spaceDown.current) {
              panStart.current = { x: e.clientX, y: e.clientY };
              setIsDragging(true);
              dragInfo.current = { ids: [], type: "pan", startX: e.clientX, startY: e.clientY, initialVals: {} };
            }
          }}
          onPointerMoveCapture={(e) => {
            if (!gestureRef.current.pointers.has(e.pointerId)) return;
            gestureRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (gestureRef.current.pointers.size >= 2 && gestureRef.current.lastDist !== null) {
              e.preventDefault();
              e.stopPropagation();
              const pts = [...gestureRef.current.pointers.values()];
              const [p1, p2] = pts;
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

              if (gestureRef.current.lastDist > 0) {
                const scale = dist / gestureRef.current.lastDist;
                setZoom(z => Math.min(4, Math.max(0.1, z * scale)));
              }
              const dx = (mid.x - gestureRef.current.lastMid.x) * 1.5;
              const dy = (mid.y - gestureRef.current.lastMid.y) * 1.5;
              setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));

              gestureRef.current.lastDist = dist;
              gestureRef.current.lastMid = mid;
            }
          }}
          onPointerUpCapture={(e) => {
            gestureRef.current.pointers.delete(e.pointerId);
            if (gestureRef.current.pointers.size < 2) {
              gestureRef.current.lastDist = null;
              gestureRef.current.lastMid = null;
            }
          }}
          onPointerCancelCapture={(e) => {
            gestureRef.current.pointers.delete(e.pointerId);
            if (gestureRef.current.pointers.size < 2) {
              gestureRef.current.lastDist = null;
              gestureRef.current.lastMid = null;
            }
          }}
        >
          <div id="main-canvas" ref={canvasRef} onPointerDown={(e) => { if (e.target.id === "main-canvas" && !spaceDown.current) { setSelectedIds([]); setIsDragging(true); dragInfo.current = { ids: [], type: "marquee", startX: e.clientX, startY: e.clientY, initialVals: {} }; setShowShapeMenu(false); setActiveColorEditId(null); } }}
            style={{ width: ARTBOARD_W, height: ARTBOARD_H, backgroundColor: "transparent", position: "relative", overflow: "hidden", boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7)", transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`, transformOrigin: "top center", flexShrink: 0, touchAction: "none", marginBottom: "40px" }}
          >
            {/* BACKGROUND LAYER */}
            <div
              id={background.id}
              style={{
                position: 'absolute', left: 0, top: 0, width: background.width || ARTBOARD_W, height: background.height || ARTBOARD_H,
                backgroundColor: background.color || 'transparent',
                zIndex: -1, pointerEvents: 'none'
              }}
            >
              {background.src && <img src={background.src} alt={background.label} className="w-full h-full object-cover pointer-events-none" />}
            </div>

            {elements.map((el, i) => {
              const bounds = getVisualBounds(el); const isText = el.type === "text"; const intrinsic = isText ? getIntrinsicBounds(el) : null; const isSelected = selectedIds.includes(el.id);
              const fillStyle = el.fillType === 'gradient' ? `linear-gradient(${el.gradientAngle || 90}deg, ${el.color}, ${el.gradientColor2})` : el.color;

              return (
                <div key={el.id} id={`el-${el.id}`} onPointerDown={(e) => { e.stopPropagation(); setActiveTool("select"); setShowShapeMenu(false); let nS = [...selectedIds]; if (e.shiftKey || mobileShift) { if (nS.includes(el.id)) nS = nS.filter(id => id !== el.id); else nS.push(el.id); } else if (!nS.includes(el.id)) { nS = [el.id]; } setSelectedIds(nS); if (el.locked) return; setIsDragging(true); const initials = {}; elements.forEach(element => { if (nS.includes(element.id)) { const b = getVisualBounds(element); initials[element.id] = { ...element, visualWidth: b.w, visualHeight: b.h }; } }); dragInfo.current = { ids: nS, type: "drag", startX: e.clientX, startY: e.clientY, initialVals: initials }; }}
                  style={{ position: "absolute", left: safeNum(el.x, 0), top: safeNum(el.y, 0), width: safeNum(bounds.w, 100), height: safeNum(bounds.h, 100), backgroundColor: (!isText && !['image', 'compound', 'star', 'triangle', 'rect', 'circle'].includes(el.type)) ? fillStyle : "transparent", borderRadius: el.type === "circle" ? "50%" : "0", color: isText ? fillStyle : el.color, fontSize: safeNum(el.fontSize, 32), fontFamily: isText ? `"${el.fontFamily || "Inter"}", sans-serif` : "inherit", textAlign: isText ? (el.textAlign || "left") : "left", whiteSpace: "pre", lineHeight: 1.2, zIndex: i, opacity: el.opacity || 1, transform: `rotate(${safeNum(el.rotation, 0)}deg)`, transformOrigin: "center center", cursor: el.locked ? "not-allowed" : "move", outline: (isSelected && (selectedIdsCount > 1 || marquee)) ? "2px solid #6366f1" : "none", touchAction: "none" }}
                >
                  {isText && intrinsic && (
                    <div style={{ width: intrinsic.w, height: intrinsic.h, transform: `scale(${safeNum(el.scaleX, 1)}, ${safeNum(el.scaleY, 1)})`, transformOrigin: 'top left', pointerEvents: 'none', position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox={`0 0 ${intrinsic.w} ${intrinsic.h}`} style={{ overflow: 'visible' }}>
                        <defs>
                          {el.fillType === 'gradient' && (
                            <linearGradient id={`grad_text_${el.id}`} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${el.gradientAngle || 90})`}>
                              <stop offset="0%" stopColor={el.color} />
                              <stop offset="100%" stopColor={el.gradientColor2} />
                            </linearGradient>
                          )}
                        </defs>

                        {(!el.warpStyle || el.warpStyle === 'none') ? (
                          <g transform={`translate(${el.textAlign === 'center' ? intrinsic.w / 2 : el.textAlign === 'right' ? intrinsic.w : 0}, 0)`}>
                            {([...(el.strokes || [])].reverse().concat([{ isFill: true }])).map((s, sIdx) => {
                              const isStroke = !s.isFill;
                              const strokeVal = s;
                              return (
                                <text key={sIdx} textAnchor={el.textAlign || "left"} dominantBaseline="hanging"
                                  style={{
                                    font: `${el.fontStyle || 'normal'} ${el.fontWeight || 'bold'} ${safeNum(el.fontSize, 32)}px "${el.fontFamily || 'Inter'}", sans-serif`,
                                    fill: isStroke ? 'none' : getSvgFill(el, "text_"),
                                    stroke: isStroke ? strokeVal.color : 'none',
                                    strokeWidth: isStroke ? strokeVal.width * (strokeVal.alignment === 'center' ? 1 : 2) : 0,
                                    strokeLinejoin: "round",
                                    letterSpacing: el.letterSpacing || 0,
                                    textTransform: el.textTransform || 'none',
                                    textDecoration: el.textDecoration || 'none'
                                  }}
                                >
                                  {(el.content || "").split("\n").map((line, lIdx) => (
                                    <tspan key={lIdx} x="0" dy={lIdx === 0 ? 0 : (safeNum(el.fontSize, 32) * (el.lineHeight || 1.2))}>{line}</tspan>
                                  ))}
                                </text>
                              );
                            })}
                          </g>
                        ) : (
                          intrinsic.metrics && (
                            <g transform={`translate(${intrinsic.w / 2 - intrinsic.metrics.cx}, ${intrinsic.h / 2 - intrinsic.metrics.cy})`}>
                              {([...(el.strokes || [])].reverse().concat([{ isFill: true }])).map((s, sIdx) => {
                                const isStroke = !s.isFill;
                                const strokeVal = s;
                                return (
                                  <g key={sIdx}>
                                    {intrinsic.metrics.positions.map((p, pIdx) => (
                                      <text key={pIdx} textAnchor="middle" dominantBaseline="middle"
                                        transform={`translate(${p.dx}, ${p.dy}) rotate(${(p.angle || 0) * 180 / Math.PI}) scale(${p.sX}, ${p.sY})`}
                                        style={{
                                          font: `${el.fontStyle || 'normal'} ${el.fontWeight || 'bold'} ${safeNum(el.fontSize, 32)}px "${el.fontFamily || 'Inter'}", sans-serif`,
                                          fill: isStroke ? 'none' : getSvgFill(el, "text_"),
                                          stroke: isStroke ? strokeVal.color : 'none',
                                          strokeWidth: isStroke ? strokeVal.width * (strokeVal.alignment === 'center' ? 1 : 2) : 0,
                                          strokeLinejoin: "round",
                                          textTransform: el.textTransform || 'none',
                                          textDecoration: el.textDecoration || 'none'
                                        }}
                                      >{p.char}</text>
                                    ))}
                                  </g>
                                );
                              })}
                            </g>
                          )
                        )}
                      </svg>
                    </div>
                  )}

                  {el.type === "image" && el.src && <img src={el.src} alt="Element" draggable={false} className="w-full h-full object-contain pointer-events-none" />}

                  {['star', 'triangle', 'compound', 'rect', 'circle', 'hexagon', 'heart', 'arrow', 'line'].includes(el.type) && (() => {
                    const w = bounds.w, h = bounds.h;
                    const shapePath = getShapePathData(el, w, h);

                    const renderSvgStroke = (s, effectiveWidth) => {
                      return (
                        <g>
                          {el.type === 'rect' && !el.customPoints && <rect width={w} height={h} rx={el.borderRadius || 0} ry={el.borderRadius || 0} fill="none" stroke={s.color} strokeWidth={effectiveWidth} strokeLinejoin={s.join || "round"} />}
                          {el.type === 'circle' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={s.color} strokeWidth={effectiveWidth} strokeLinejoin={s.join || "round"} />}
                          {el.type === 'line' && <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={s.color} strokeWidth={effectiveWidth} strokeLinecap="round" />}
                          {shapePath && el.type !== 'line' && <path d={shapePath} fill="none" stroke={s.color} strokeWidth={effectiveWidth} strokeLinejoin={s.join || "round"} />}
                        </g>
                      );
                    };

                    const renderSvgFill = () => {
                      return (
                        <g>
                          {el.type === 'rect' && !el.customPoints && <rect width={w} height={h} rx={el.borderRadius || 0} ry={el.borderRadius || 0} fill={getSvgFill(el)} />}
                          {el.type === 'circle' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={getSvgFill(el)} />}
                          {el.type === 'line' && <line x1={0} y1={Math.max(2, h / 2)} x2={w} y2={Math.max(2, h / 2)} stroke={el.color} strokeWidth={Math.max(2, h)} strokeLinecap="round" />}
                          {shapePath && el.type !== 'line' && <path d={shapePath} fill={getSvgFill(el)} />}
                          {el.type === 'compound' && (
                            <g>
                              {el.operation === 'union' && <>{renderSvgShapeInner(el.children[0], el.color, "none", 0)}{renderSvgShapeInner(el.children[1], el.color, "none", 0)}</>}
                              {el.operation === 'subtract' && <g mask={`url(#mask_sub_${el.id})`}>{renderSvgShapeInner(el.children[0], el.color, "none", 0)}</g>}
                              {el.operation === 'intersect' && <g mask={`url(#mask_int_${el.id})`}>{renderSvgShapeInner(el.children[0], el.color, "none", 0)}</g>}
                              {el.operation === 'exclude' && <><g mask={`url(#mask_ex1_${el.id})`}>{renderSvgShapeInner(el.children[0], el.color, "none", 0)}</g><g mask={`url(#mask_ex2_${el.id})`}>{renderSvgShapeInner(el.children[1], el.color, "none", 0)}</g></>}
                            </g>
                          )}
                        </g>
                      );
                    };

                    const strokesArray = [...(el.strokes || [])].reverse();
                    return (
                      <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${el.type === 'compound' ? el.originalWidth : w} ${el.type === 'compound' ? el.originalHeight : h}`} style={{ pointerEvents: 'none', overflow: 'visible' }}>
                        <defs>
                          {el.fillType === 'gradient' && (<linearGradient id={`grad_${el.id}`} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${el.gradientAngle || 90})`}> <stop offset="0%" stopColor={el.color} /> <stop offset="100%" stopColor={el.gradientColor2} /> </linearGradient>)}
                          {el.type === "compound" && el.operation === 'subtract' && <mask id={`mask_sub_${el.id}`}><rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />{renderSvgShapeInner(el.children[1], "black", "none", 0)}</mask>}
                          {el.type === "compound" && el.operation === 'intersect' && <mask id={`mask_int_${el.id}`}><rect x="-10000" y="-10000" width="20000" height="20000" fill="black" />{renderSvgShapeInner(el.children[1], "white", "none", 0)}</mask>}
                          {el.type === "compound" && el.operation === 'exclude' && <>
                            <mask id={`mask_ex1_${el.id}`}><rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />{renderSvgShapeInner(el.children[1], "black", "none", 0)}</mask>
                            <mask id={`mask_ex2_${el.id}`}><rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />{renderSvgShapeInner(el.children[0], "black", "none", 0)}</mask>
                          </>}
                          <clipPath id={`clip_inside_${el.id}`}>
                            {el.type === 'rect' && !el.customPoints ? <rect width={w} height={h} rx={el.borderRadius || 0} ry={el.borderRadius || 0} /> :
                              el.type === 'circle' ? <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} /> :
                                shapePath ? <path d={shapePath} /> : null}
                          </clipPath>
                        </defs>
                        <g>
                          {/* 1. Outside Strokes (before fill) */}
                          {strokesArray.map((s, idx) => s.alignment === 'outside' && (
                            <g key={`out-${idx}`}>{renderSvgStroke(s, s.width * 2)}</g>
                          ))}

                          {/* 2. Background Fill */}
                          {renderSvgFill()}

                          {/* 3. Center Strokes (after fill) */}
                          {strokesArray.map((s, idx) => (!s.alignment || s.alignment === 'center') && (
                            <g key={`cen-${idx}`}>{renderSvgStroke(s, s.width)}</g>
                          ))}

                          {/* 4. Inside Strokes (after fill, clipped) */}
                          {strokesArray.map((s, idx) => s.alignment === 'inside' && (
                            <g key={`ins-${idx}`} clipPath={`url(#clip_inside_${el.id})`}>{renderSvgStroke(s, s.width * 2)}</g>
                          ))}
                        </g>
                      </svg>
                    );
                  })()}
                  {isSelected && activeTool === 'select' && selectedIdsCount === 1 && !el.locked && (
                    <div className="absolute inset-0 border border-[#22c55e] pointer-events-none z-[200]">
                      {transformHandles.map((h) => (<div key={h.dir} onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); dragInfo.current = { ids: [el.id], type: `resize-${h.dir}`, startX: e.clientX, startY: e.clientY, initialVals: { [el.id]: { ...el, visualWidth: bounds.w, visualHeight: bounds.h } } }; }} className="absolute w-3 h-3 bg-white border border-[#22c55e] pointer-events-auto shadow-md" style={{ top: h.top, left: h.left, transform: 'translate(-50%, -50%)', cursor: h.cursor }} />))}
                      <div className="absolute top-1/2 left-[100%] w-6 h-[1px] bg-[#22c55e]" style={{ transform: 'translateY(-50%)' }} />
                      <div onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); const rect = document.getElementById(`el-${el.id}`).getBoundingClientRect(); dragInfo.current = { ids: [el.id], type: "rotate", initialVals: { [el.id]: { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, rotation: el.rotation || 0 } } }; }} className="absolute w-4 h-4 bg-white border border-[#22c55e] rounded-full pointer-events-auto cursor-crosshair shadow-md" style={{ top: '50%', left: 'calc(100% + 24px)', transform: 'translate(-50%, -50%)' }} />
                    </div>
                  )}
                  {/* Direct Selection Handles (Anchor points and Live Corners) */}
                  {isSelected && activeTool === 'direct-select' && selectedIdsCount === 1 && !el.locked && ['rect', 'star', 'triangle'].includes(el.type) && (() => {
                    const w = bounds.w, h = bounds.h;
                    const pts = el.customPoints || getDefaultPoints(el, bounds);
                    return (
                      <div className="absolute inset-0 pointer-events-none z-[200]">
                        {/* Anchor Points (Red Squares) */}
                        {pts.map((p, idx) => (
                          <div key={idx} onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); dragInfo.current = { ids: [el.id], type: 'anchor', index: idx, startX: e.clientX, startY: e.clientY, initialVals: { ...el } }; }} className="absolute pointer-events-auto group" style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}>
                            <div className="w-8 h-8 flex items-center justify-center cursor-move">
                              <div className="w-2 h-2 bg-red-500 border border-white shadow-sm" />
                            </div>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-[8px] text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">anchor</span>
                          </div>
                        ))}
                        {/* Live Corners (Circle Handles) - Only for rect and if not distorted/using customPoints */}
                        {el.type === 'rect' && !el.customPoints && [{ t: 15, l: 15 }, { t: 15, l: 85 }, { t: 85, l: 85 }, { t: 85, l: 15 }].map((pos, idx) => (
                          <div key={`rad-${idx}`} onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); dragInfo.current = { ids: [el.id], type: 'radius', index: idx, startX: e.clientX, startY: e.clientY, initialVals: { ...el } }; }} className="absolute pointer-events-auto" style={{ top: `${pos.t}%`, left: `${pos.l}%`, transform: 'translate(-50%, -50%)' }}>
                            <div className="w-10 h-10 flex items-center justify-center cursor-nwse-resize">
                              <div className="w-3 h-3 bg-white border-2 border-red-500 rounded-full shadow-md hover:scale-125 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {el.locked && <div className="absolute -top-6 left-0 bg-slate-800 text-[8px] text-white px-1.5 py-0.5 rounded flex items-center gap-1 uppercase font-bold tracking-widest"><Lock size={8} /> LOCKED</div>}
                </div>
              );
            })}
            {marquee && (<div style={{ position: 'absolute', left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, border: '1.5px solid #6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', pointerEvents: 'none', zIndex: 1000 }} />)}

            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 z-[999]">
              <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-indigo-500" /> <div className="absolute left-1/2 top-0 h-full w-[0.5px] bg-indigo-500" />
              <div style={{ width: GUIDE1_W, height: GUIDE1_H, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1.5px dashed #6366f1" }} />
              <div style={{ width: GUIDE2_W, height: GUIDE2_H, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "1.5px dashed #ef4444" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Shrink Bottom Floating Panel */}
      <div
        onMouseEnter={() => setIsBottomPanelOpen(true)}
        onMouseLeave={() => setIsBottomPanelOpen(false)}
        onClick={() => { if (!isBottomPanelOpen && selectedIds.length === 0) setIsBottomPanelOpen(true); }}
        className={`fixed z-50 transition-all duration-500 overflow-hidden flex flex-col items-center
          ${(isBottomPanelOpen || selectedIds.length > 0)
            ? 'bottom-0 left-0 w-full h-[60vh] md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-[900px] md:h-[340px]'
            : 'bottom-4 right-4 md:left-1/2 md:-translate-x-1/2 w-14 h-14'}`}
      >
        <div className={`bg-[#1e293b]/95 backdrop-blur-3xl border border-slate-700/50 shadow-2xl flex flex-col w-full h-full transition-all duration-500
          ${(isBottomPanelOpen || selectedIds.length > 0) ? 'rounded-t-3xl md:rounded-2xl shadow-[0_0_15px_rgba(30,41,59,0.8)]' : 'rounded-full cursor-pointer hover:bg-slate-800 delay-500 hover:delay-0'}`}>
          {!(isBottomPanelOpen || selectedIds.length > 0) ? (
            <div className="flex items-center justify-center w-full h-full text-slate-400">
              <Settings2 size={24} className="hover:text-white transition-colors" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-300">
              <div className="flex border-b border-slate-700/50 shrink-0">
                <button onClick={() => setActiveTab("props")} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center ${activeTab === "props" ? "text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300 transition-colors"}`}><Settings2 size={14} /> Properties</button>
                <button onClick={() => setActiveTab("layers")} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center ${activeTab === "layers" ? "text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50" : "text-slate-500 hover:text-slate-300 transition-colors"}`}><Layers size={14} /> Layers</button>
                <button onClick={(e) => { e.stopPropagation(); setIsBottomPanelOpen(false); setSelectedIds([]); }} className="px-4 text-slate-500 hover:text-white md:hidden"><Plus size={20} className="rotate-45" /></button>
              </div>
              <div ref={propsPanelRef} className="flex-1 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden p-4 md:px-6 custom-scrollbar scrollbar-hide">
                {activeTab === "props" ? (
                  <div className="flex flex-col md:flex-row gap-6 h-max md:h-full items-stretch md:items-start w-full md:w-max pb-4 md:pb-2">
                    {selectedIdsCount > 1 ? (
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 text-center">
                        <Layers size={32} className="mx-auto text-indigo-400 mb-3" />
                        <h3 className="text-white font-bold text-sm mb-1">{selectedIdsCount} Objects Selected</h3>
                        {selectedIdsCount === 2 && (<div className="border-t border-indigo-500/20 pt-6 mt-2"> <label className="text-[10px] font-black text-indigo-300 uppercase block mb-4 tracking-widest">Pathfinder</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => applyPathfinder('union')} className="bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold py-3 rounded-xl transition-all">Union</button>
                            <button onClick={() => applyPathfinder('subtract')} className="bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold py-3 rounded-xl transition-all">Subtract</button>
                            <button onClick={() => applyPathfinder('intersect')} className="bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold py-3 rounded-xl transition-all">Intersect</button>
                            <button onClick={() => applyPathfinder('exclude')} className="bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-bold py-3 rounded-xl transition-all">Exclude</button>
                          </div> </div>)}
                      </div>
                    ) : selectedElement ? (
                      <>
                        {selectedElement.type === "text" && (
                          <>
                            <section className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800/60 shadow-lg shrink-0 md:min-w-[240px] transition-all hover:border-indigo-500/30">
                              <label className="text-[10px] font-black text-indigo-400 uppercase block mb-5 tracking-[0.2em] flex items-center gap-2 px-1"><Waves size={14} className="animate-pulse" /> Distort & Warp</label>
                              <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                  <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>Warp Style</span></div>
                                  <select
                                    value={selectedElement.warpStyle || "none"}
                                    onChange={(e) => updateSelectedElement({ warpStyle: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                  >
                                    <optgroup label="Standard">
                                      <option value="none">None</option>
                                      <option value="arc">Arc</option>
                                      <option value="arcLower">Arc Lower</option>
                                      <option value="arcUpper">Arc Upper</option>
                                      <option value="arch">Arch</option>
                                    </optgroup>
                                    <optgroup label="Distortions">
                                      <option value="bulge">Bulge</option>
                                      <option value="shellLower">Shell Lower</option>
                                      <option value="shellUpper">Shell Upper</option>
                                      <option value="flag">Flag</option>
                                      <option value="wave">Wave</option>
                                      <option value="fish">Fish</option>
                                      <option value="rise">Rise</option>
                                    </optgroup>
                                    <optgroup label="Advanced">
                                      <option value="fishEye">FishEye</option>
                                      <option value="inflate">Inflate</option>
                                      <option value="squeeze">Squeeze</option>
                                      <option value="twist">Twist</option>
                                      <option value="perspective">Perspective</option>
                                    </optgroup>
                                  </select>
                                </div>

                                {selectedElement.warpStyle !== 'none' && (
                                  <div className="flex flex-col gap-3 pt-2 animate-in fade-in slide-in-from-top-2 border-t border-slate-800/50 mt-2">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase italic"><span>Bend Intensity</span> <span className="text-indigo-400 font-mono">{selectedElement.warpBend}%</span></div>
                                      <input type="range" min="-100" max="100" value={selectedElement.warpBend || 50} onChange={(e) => updateSelectedElement({ warpBend: parseInt(e.target.value, 10) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase italic"><span>Horizontal Distort</span> <span className="text-indigo-400 font-mono">{selectedElement.warpDistortH || 0}%</span></div>
                                      <input type="range" min="-100" max="100" value={selectedElement.warpDistortH || 0} onChange={(e) => updateSelectedElement({ warpDistortH: parseInt(e.target.value, 10) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase italic"><span>Vertical Distort</span> <span className="text-indigo-400 font-mono">{selectedElement.warpDistortV || 0}%</span></div>
                                      <input type="range" min="-100" max="100" value={selectedElement.warpDistortV || 0} onChange={(e) => updateSelectedElement({ warpDistortV: parseInt(e.target.value, 10) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </section>

                            <section className="p-5 bg-slate-900/40 rounded-3xl border border-slate-800/60 shadow-lg shrink-0 md:min-w-[300px] transition-all hover:border-indigo-500/30">
                              <label className="text-[10px] font-black text-indigo-400 uppercase block mb-5 tracking-[0.2em] flex items-center gap-2 px-1"><Type size={14} /> Typography</label>

                              <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                  <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>Font Family</span></div>
                                  <select value={selectedElement.fontFamily || "Inter"}
                                    onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                                  >
                                    {GOOGLE_FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>Spacing</span> <span className="text-indigo-400 font-mono">{selectedElement.letterSpacing}px</span></div>
                                    <input type="range" min="-10" max="50" value={selectedElement.letterSpacing || 0} onChange={(e) => updateSelectedElement({ letterSpacing: parseInt(e.target.value, 10) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>Leading</span> <span className="text-indigo-400 font-mono">{selectedElement.lineHeight}x</span></div>
                                    <input type="range" min="0.5" max="3" step="0.1" value={selectedElement.lineHeight || 1.2} onChange={(e) => updateSelectedElement({ lineHeight: parseFloat(e.target.value) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                  </div>
                                </div>

                                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                                  <button onClick={() => updateSelectedElement((el) => ({ ...el, fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' }))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${selectedElement.fontWeight === 'bold' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>B</button>
                                  <button onClick={() => updateSelectedElement((el) => ({ ...el, fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' }))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold italic transition-all ${selectedElement.fontStyle === 'italic' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>I</button>
                                  <button onClick={() => updateSelectedElement((el) => ({ ...el, textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' }))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold underline transition-all ${selectedElement.textDecoration === 'underline' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>U</button>
                                  <button onClick={() => updateSelectedElement((el) => ({ ...el, textTransform: el.textTransform === 'uppercase' ? 'none' : 'uppercase' }))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${selectedElement.textTransform === 'uppercase' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>TT</button>
                                </div>

                                <div className="pt-2">
                                  <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase mb-2"><span>Text Content</span></div>
                                  <textarea value={selectedElement.content} onChange={(e) => updateSelectedElement({ content: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-bold min-h-[60px] text-white outline-none focus:border-indigo-500 transition-all resize-none" />
                                </div>
                              </div>
                            </section>
                          </>
                        )}

                        <section className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/60 shadow-lg shrink-0 md:min-w-[300px] w-full md:max-w-[340px] md:max-h-full md:overflow-y-auto custom-scrollbar transition-all hover:border-indigo-500/30">
                          <label className="text-[10px] font-black text-indigo-400 uppercase block mb-5 flex items-center gap-2 tracking-[0.2em] px-1"><Palette size={14} /> Appearance</label>
                          <div className="flex bg-slate-900/50 border border-slate-800 rounded-xl p-1 mb-4">
                            <button onClick={() => updateSelectedElement({ fillType: 'solid' })} className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg uppercase transition-all ${selectedElement.fillType === 'solid' || !selectedElement.fillType ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500'}`}>Solid</button>
                            <button onClick={() => updateSelectedElement({ fillType: 'gradient' })} className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg uppercase transition-all ${selectedElement.fillType === 'gradient' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500'}`}>Gradient</button>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{selectedElement.fillType === 'gradient' ? 'Color 1' : 'Fill Color'}</span>
                              <button
                                onClick={() => { setPickerTab("swatches"); setActiveColorEditId(activeColorEditId === 'fill' ? null : 'fill'); }}
                                className="w-full h-10 rounded-xl border border-slate-700 shadow-inner flex items-center px-3 gap-3 hover:border-indigo-500 transition-all"
                                style={{ backgroundColor: selectedElement.color }}
                              >
                                <span className={`text-[10px] font-mono font-bold ${parseInt(selectedElement.color.replace('#', ''), 16) > 0x888888 ? 'text-black' : 'text-white'}`}>{selectedElement.color.toUpperCase()}</span>
                              </button>
                              <ColorEditorArea
                                editId="fill"
                                activeColor={selectedElement.color}
                                onColorChange={(c) => updateSelectedElement({ color: c })}
                                activeColorEditId={activeColorEditId}
                                pickerTab={pickerTab}
                                setPickerTab={setPickerTab}
                                activateEyedropper={activateEyedropper}
                              />
                            </div>

                            {selectedElement.fillType === 'gradient' && (
                              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Color 2</span>
                                <button
                                  onClick={() => { setPickerTab("swatches"); setActiveColorEditId(activeColorEditId === 'fill2' ? null : 'fill2'); }}
                                  className="w-full h-10 rounded-xl border border-slate-700 shadow-inner flex items-center px-3 gap-3 hover:border-indigo-500 transition-all"
                                  style={{ backgroundColor: selectedElement.gradientColor2 || '#ffffff' }}
                                >
                                  <span className={`text-[10px] font-mono font-bold ${parseInt((selectedElement.gradientColor2 || '#ffffff').replace('#', ''), 16) > 0x888888 ? 'text-black' : 'text-white'}`}>{(selectedElement.gradientColor2 || '#ffffff').toUpperCase()}</span>
                                </button>
                                <ColorEditorArea
                                  editId="fill2"
                                  activeColor={selectedElement.gradientColor2 || '#ffffff'}
                                  onColorChange={(c) => updateSelectedElement({ gradientColor2: c })}
                                  activeColorEditId={activeColorEditId}
                                  pickerTab={pickerTab}
                                  setPickerTab={setPickerTab}
                                  activateEyedropper={activateEyedropper}
                                />
                              </div>
                            )}
                          </div>
                          <div className="space-y-4 mt-6">
                            <div className="flex justify-between"> <span className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1"><Sun size={10} /> Opacity</span> <span className="text-[10px] font-mono text-indigo-400">{Math.round((selectedElement.opacity || 1) * 100)}%</span> </div>
                            <input type="range" min="0" max="1" step="0.01" value={selectedElement.opacity || 1} onChange={(e) => updateSelectedElement({ opacity: parseFloat(e.target.value) })} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                          </div>
                        </section>

                        <section className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800 shrink-0 md:min-w-[280px] w-full md:max-w-[320px] md:max-h-full md:overflow-y-auto custom-scrollbar">
                          <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest"><PenTool size={12} /> Stroke</label>
                            <button onClick={addStroke} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 p-1 hover:bg-slate-800 rounded-full transition-all" disabled={selectedElement.strokes?.length >= 3}>
                              <PlusCircle size={18} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {(selectedElement.strokes || []).map((s, idx) => (
                              <div key={idx} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-3 relative group transition-all hover:bg-slate-800/60">
                                <button onClick={() => removeStroke(idx)} className="absolute -top-2 -right-2 text-red-500 bg-slate-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-red-500/20 shadow-lg"> <MinusCircle size={14} /> </button>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => { setPickerTab("swatches"); setActiveColorEditId(activeColorEditId === `stroke-${idx}` ? null : `stroke-${idx}`); }}
                                    className="w-10 h-10 rounded-lg border border-slate-600 shadow-md transition-transform active:scale-95 shrink-0"
                                    style={{ backgroundColor: s.color }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase mb-1"> <span>Width</span> <span className="text-indigo-400 font-mono">{s.width}px</span> </div>
                                    <input type="range" min="1" max="50" value={s.width} onChange={(e) => updateStroke(idx, 'width', parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 cursor-pointer" />
                                  </div>
                                </div>
                                <ColorEditorArea
                                  editId={`stroke-${idx}`}
                                  activeColor={s.color}
                                  onColorChange={(c) => updateStroke(idx, 'color', c)}
                                  activeColorEditId={activeColorEditId}
                                  pickerTab={pickerTab}
                                  setPickerTab={setPickerTab}
                                  activateEyedropper={activateEyedropper}
                                />
                                <div className="flex bg-slate-900/50 rounded-lg p-0.5">
                                  {['inside', 'center', 'outside'].map(align => (
                                    <button key={align} onClick={() => updateStroke(idx, 'alignment', align)} className={`flex-1 py-1 text-[8px] font-bold uppercase rounded transition-all ${s.alignment === align ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}> {align} </button>
                                  ))}
                                </div>
                                <div className="flex bg-slate-900/50 rounded-lg p-0.5 mt-1">
                                  <button onClick={() => updateStroke(idx, 'join', 'miter')} title="Miter" className={`flex-1 py-1 text-[8px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all ${s.join === 'miter' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}> <Maximize size={10} /> Miter </button>
                                  <button onClick={() => updateStroke(idx, 'join', 'round')} title="Round" className={`flex-1 py-1 text-[8px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all ${s.join === 'round' || !s.join ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500'}`}> <CornerUpRight size={10} /> Round </button>
                                  <button onClick={() => updateStroke(idx, 'join', 'bevel')} title="Bevel" className={`flex-1 py-1 text-[8px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all ${s.join === 'bevel' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500'}`}> <div className="w-1.5 h-1.5 bg-current rotate-45 mr-0.5" /> Bevel </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="bg-slate-900/20 p-4 rounded-2xl border border-slate-800 shrink-0 md:min-w-[220px]">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">Transformation</label>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-center">
                              <span className="text-[7px] text-slate-500 uppercase font-black block mb-1">X</span>
                              <div className="text-[10px] font-mono font-bold text-white">{Math.round(selectedElement.x)}</div>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-center">
                              <span className="text-[7px] text-slate-500 uppercase font-black block mb-1">Y</span>
                              <div className="text-[10px] font-mono font-bold text-white">{Math.round(selectedElement.y)}</div>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-center">
                              <span className="text-[7px] text-slate-500 uppercase font-black block mb-1">Rotation</span>
                              <div className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(selectedElement.rotation || 0)}°</div>
                            </div>
                          </div>
                        </section>

                        {selectedElement.type === "star" && (<section className="p-4 bg-slate-900/20 rounded-2xl border border-slate-800 shrink-0 md:min-w-[220px]"> <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">Star Points</label> <input type="range" min="3" max="20" value={selectedElement.points || 5} onChange={(e) => updateSelectedElement({ points: parseInt(e.target.value, 10) })} className="w-full accent-indigo-500 h-1 cursor-pointer" /> </section>)}

                        <div className="pt-4 shrink-0 md:min-w-[150px] flex items-center mb-8 md:mb-0">
                          <button onClick={() => { applyElementsUpdate(prev => prev.filter(el => !selectedIds.includes(el.id))); setSelectedIds([]); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 group"> <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> Delete Object </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-6 h-max md:h-full items-stretch md:items-start w-full md:w-max pb-4 md:pb-2">
                        <section className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/60 shadow-lg shrink-0 md:min-w-[300px] w-full md:max-w-[340px] transition-all hover:border-indigo-500/30">
                          <label className="text-[10px] font-black text-indigo-400 uppercase block mb-5 flex items-center gap-2 tracking-[0.2em] px-1"><Monitor size={14} /> Canvas Settings</label>
                          <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Background Color</span>
                              <button
                                onClick={() => { setPickerTab("swatches"); setActiveColorEditId(activeColorEditId === 'canvas' ? null : 'canvas'); }}
                                className="w-full h-10 rounded-xl border border-slate-700 shadow-inner flex items-center px-3 gap-3 hover:border-indigo-500 transition-all"
                                style={{ backgroundColor: background.color }}
                              >
                                <span className={`text-[10px] font-mono font-bold ${parseInt((background.color || '#ffffff').replace('#', ''), 16) > 0x888888 ? 'text-black' : 'text-white'}`}>{(background.color || '#ffffff').toUpperCase()}</span>
                              </button>
                              <ColorEditorArea
                                editId="canvas"
                                activeColor={background.color}
                                onColorChange={(c) => {
                                  const nextBg = { ...backgroundRef.current, color: c };
                                  backgroundRef.current = nextBg;
                                  setBackground(nextBg);
                                  saveToHistory(elementsRef.current, nextBg);
                                }}
                                activeColorEditId={activeColorEditId}
                                pickerTab={pickerTab}
                                setPickerTab={setPickerTab}
                                activateEyedropper={activateEyedropper}
                              />
                            </div>
                            <div className="pt-4 text-center">
                              <MousePointer2 size={24} className="mx-auto mb-2 text-slate-700" />
                              <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Select an object to edit properties</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4 pb-12 md:pb-2 px-2 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden h-max md:h-full items-stretch md:items-start w-full md:w-max">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest md:self-center shrink-0 md:mr-4 ml-2 md:ml-0 mt-2 md:mt-0">Layers List ({elements.length})</label>
                    {[...elements].reverse().map((el) => (
                      <div key={el.id} onClick={(e) => { if (e.shiftKey || mobileShift) { setSelectedIds(prev => prev.includes(el.id) ? prev.filter(x => x !== el.id) : [...prev, el.id]); } else setSelectedIds([el.id]); }} className={`flex flex-row md:flex-col items-center justify-between md:justify-start gap-4 p-4 rounded-2xl cursor-pointer border transition-all shrink-0 md:min-w-[120px] ${selectedIds.includes(el.id) ? "bg-indigo-500/10 border-indigo-500/50" : "bg-slate-900/50 border-slate-800 hover:border-slate-700 md:hover:-translate-y-1 hover:translate-x-1 md:hover:translate-x-0"}`}>
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          {el.type === "text" ? <Type size={14} /> : el.type === "rect" ? <Square size={14} /> : el.type === "circle" ? <Circle size={14} /> : el.type === 'star' ? <Star size={14} /> : el.type === 'triangle' ? <TriangleIcon size={14} /> : el.type === 'image' ? <ImageIcon size={14} /> : <Box size={14} />}
                        </div>
                        <div className="text-[11px] font-bold text-slate-300 md:text-center shrink truncate flex-1 md:w-full">{el.type === "text" ? el.content : el.type.toUpperCase()}</div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); moveLayerLocal(el.id, 'up'); }} className="p-1.5 bg-slate-800 rounded-lg hover:text-indigo-400 hover:bg-slate-700 transition-colors"><ArrowUp size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveLayerLocal(el.id, 'down'); }} className="p-1.5 bg-slate-800 rounded-lg hover:text-indigo-400 hover:bg-slate-700 transition-colors"><ArrowDown size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
