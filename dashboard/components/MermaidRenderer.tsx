import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { AlertCircle, Maximize2, Minus, Plus } from "lucide-react";

// Initialize mermaid for client-side rendering
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "loose",
  flowchart: {
    htmlLabels: true,
    useMaxWidth: true,
    nodeSpacing: 42,
    rankSpacing: 62,
  },
  themeVariables: {
    background: "#FFFFFF",
    primaryColor: "#FFFFFF",
    primaryTextColor: "#1E293B",
    primaryBorderColor: "#CBD5E1",
    lineColor: "#64748B",
    secondaryColor: "#FFFFFF",
    tertiaryColor: "#FFFFFF",
    clusterBkg: "#FFFFFF",
    clusterBorder: "#CBD5E1",
    mainBkg: "#FFFFFF",
    nodeBorder: "#CBD5E1",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "14px",
    textColor: "#1E293B",
    edgeLabelBackground: "#FFFFFF",
  },
});

// Global client-side SVG cache to prevent expensive re-rendering of identical Mermaid charts.
// Store dimensions with the SVG so fit-to-view keeps working after reloads and repeated renders.
const diagramCache = new Map<string, { svg: string; size: { width: number; height: number } }>();

const UNSAFE_SVG_ELEMENTS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
  "form",
  "input",
  "button",
  "link",
  "meta",
]);

function isUnsafeUrl(value: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();
  return (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:")
  );
}

function sanitizeMermaidSvg(svgMarkup: string): string {
  // Mermaid's DOMPurify sometimes generates unclosed <br> tags when rendering HTML labels.
  // This causes the XML DOMParser to throw a fatal error. We must convert them to XML-compliant <br/> tags.
  const xmlSafeSvg = svgMarkup.replace(/<br\s*([^>]*?)>/gi, (match, p1) => {
    const attrs = p1.replace(/\/+$/, "").trim();
    return attrs ? `<br ${attrs}/>` : "<br/>";
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlSafeSvg, "image/svg+xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(parserError.textContent || "Generated SVG could not be parsed safely.");
  }

  const walk = (node: Element) => {
    const tagName = node.tagName.toLowerCase();
    if (UNSAFE_SVG_ELEMENTS.has(tagName)) {
      node.remove();
      return;
    }

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }

      if ((name === "href" || name === "xlink:href") && isUnsafeUrl(value)) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (
        name === "style" &&
        /url\s*\(|expression\s*\(|@import|javascript:/i.test(value)
      ) {
        node.removeAttribute(attr.name);
      }
    }

    // Only remove truly dangerous style content - preserve Mermaid's own theming styles
    if (tagName === "style" && /expression\s*\(|javascript:/i.test(node.textContent || "")) {
      node.remove();
      return;
    }

    Array.from(node.children).forEach(walk);
  };

  Array.from(doc.documentElement.children).forEach(walk);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function getSvgSize(svgMarkup: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;
  const viewBox = svg.getAttribute("viewBox");

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return {
        width: Math.max(1, parts[2]),
        height: Math.max(1, parts[3]),
      };
    }
  }

  const width = parseFloat(svg.getAttribute("width") || "1000");
  const height = parseFloat(svg.getAttribute("height") || "600");
  return {
    width: Number.isFinite(width) ? Math.max(1, width) : 1000,
    height: Number.isFinite(height) ? Math.max(1, height) : 600,
  };
}

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diagramSize, setDiagramSize] = useState({ width: 1000, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState(true);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      if (!chart) {
        setIsLoading(false);
        return;
      }

      const cleanedChart = cleanMermaidChart(chart);
      const candidates = buildMermaidCandidates(cleanedChart);

      // Check client-side SVG cache
      const cachedCandidate = candidates.find((candidate) => diagramCache.has(candidate.chart));
      if (cachedCandidate) {
        const cached = diagramCache.get(cachedCandidate.chart)!;
        if (isMounted) {
          setSvg(cached.svg);
          setDiagramSize(cached.size);
          setFitMode(true);
          setError(null);
          setNotice(cachedCandidate.notice || null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let renderedChart = "";
        let renderedNotice: string | null = null;
        let lastError: any = null;

        for (const candidate of candidates) {
          try {
            await mermaid.parse(candidate.chart);
            renderedChart = candidate.chart;
            renderedNotice = candidate.notice || null;
            break;
          } catch (candidateError) {
            lastError = candidateError;
          }
        }

        if (!renderedChart) {
          const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
          throw new Error(`Mermaid render failed: ${errMsg}`);
        }

        // Generate a random unique ID for the rendering target
        const uniqueId = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
        
        const { svg: renderedSvg } = await mermaid.render(uniqueId, renderedChart);
        const sanitizedSvg = sanitizeMermaidSvg(renderedSvg);
        const parsedSize = getSvgSize(sanitizedSvg);
        
        // Save to cache
        diagramCache.set(renderedChart, { svg: sanitizedSvg, size: parsedSize });

        if (isMounted) {
          setSvg(sanitizedSvg);
          setDiagramSize(parsedSize);
          setFitMode(true);
          setError(null);
          setNotice(renderedNotice);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to render Mermaid diagram:", err);
        if (isMounted) {
          const uiMsg = err instanceof Error ? err.message : String(err);
          setError(uiMsg);
          setNotice(null);
          setIsLoading(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  useEffect(() => {
    if (!fitMode || !viewportRef.current || !diagramSize.width || !diagramSize.height) return;

    const updateFitZoom = () => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      const availableWidth = Math.max(320, rect.width - 48);
      const availableHeight = Math.max(320, Math.min(window.innerHeight * 0.72, rect.height || 620) - 48);
      const nextZoom = Math.min(
        1,
        availableWidth / diagramSize.width,
        availableHeight / diagramSize.height
      );

      setZoom(Math.max(0.12, Number(nextZoom.toFixed(3))));
    };

    updateFitZoom();
    const observer = new ResizeObserver(updateFitZoom);
    observer.observe(viewportRef.current);
    window.addEventListener("resize", updateFitZoom);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFitZoom);
    };
  }, [diagramSize.height, diagramSize.width, fitMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono">Rendering diagram visual...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-950 bg-red-950/10 rounded-xl text-xs text-red-400">
        <div className="flex items-center gap-2 mb-1.5 font-bold text-red-300">
          <AlertCircle size={14} />
          <span>Visual Render Unavailable</span>
        </div>
        <p className="font-mono font-bold leading-relaxed text-red-500 whitespace-pre-wrap break-all bg-black/20 p-3 rounded-lg border border-red-900/40">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notice && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          {notice}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Diagram zoom: {Math.round(zoom * 100)}%
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFitMode(true);
            }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold transition ${
              fitMode ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
            title="Fit entire diagram"
          >
            <Maximize2 size={12} />
            Fit
          </button>
          <button
            type="button"
            onClick={() => {
              setFitMode(false);
              setZoom((value) => Math.max(0.12, Number((value - 0.1).toFixed(2))));
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:bg-slate-800"
            title="Zoom out"
          >
            <Minus size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFitMode(false);
              setZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))));
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:bg-slate-800"
            title="Zoom in"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="w-full h-[min(76vh,720px)] min-h-[520px] overflow-auto py-6 px-6 bg-white rounded-xl border border-slate-200"
      >
        <div
          className="mermaid-scale-stage"
          style={{
            width: `${Math.max(1, diagramSize.width * zoom)}px`,
            height: `${Math.max(1, diagramSize.height * zoom)}px`,
          }}
        >
          <div
            className="mermaid-rendered-svg"
            style={{
              colorScheme: "light",
              width: `${diagramSize.width}px`,
              height: `${diagramSize.height}px`,
              transform: `scale(${zoom})`,
            }}
            // Mermaid returns an SVG string. It is parsed and sanitized by sanitizeMermaidSvg before insertion.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
      <style>{`
        .mermaid-scale-stage {
          position: relative;
          margin: 0 auto;
        }
        .mermaid-rendered-svg {
          position: absolute;
          left: 0;
          top: 0;
          transform-origin: top left;
        }
        .mermaid-rendered-svg svg {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          height: 100% !important;
          overflow: visible !important;
        }
        .mermaid-rendered-svg .node .label,
        .mermaid-rendered-svg .nodeLabel,
        .mermaid-rendered-svg .node text {
          fill: #1E293B !important;
          color: #1E293B !important;
          font-size: 13px !important;
          font-weight: 650 !important;
          paint-order: normal !important;
          stroke: transparent !important;
          stroke-width: 0 !important;
          stroke-linejoin: round !important;
        }

        /* Force styling specifically for HTML labels (foreignObject) */
        .mermaid-rendered-svg foreignObject div {
          color: #1E293B !important;
          text-align: center;
          line-height: 1.3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .mermaid-rendered-svg foreignObject small {
          color: #64748B !important;
          font-size: 0.8em;
          font-weight: 500;
          display: block;
          margin-top: 4px;
        }

        .mermaid-rendered-svg .node rect,
        .mermaid-rendered-svg .node polygon,
        .mermaid-rendered-svg .node circle,
        .mermaid-rendered-svg .node ellipse {
          stroke-width: 1.5px !important;
          fill: #FFFFFF !important;
          filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.08));
        }
        .mermaid-rendered-svg .edgePath .path { stroke: #475569 !important; }
        .mermaid-rendered-svg .edgeLabel,
        .mermaid-rendered-svg .edgeLabel text {
          background-color: #FFFFFF !important;
          color: #1E293B !important;
          fill: #1E293B !important;
          font-size: 10px !important;
          font-weight: 700 !important;
        }
        .mermaid-rendered-svg .cluster rect {
          fill: #FFFFFF !important;
          rx: 8px !important;
        }
        .mermaid-rendered-svg .cluster .nodeLabel,
        .mermaid-rendered-svg .cluster text {
          fill: #1E293B !important;
          color: #1E293B !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }
        .mermaid-rendered-svg .arrowheadPath { fill: #475569 !important; stroke: #475569 !important; }
      `}</style>
    </div>
  );
}

function cleanMermaidChart(rawChart: string): string {
  let cleanedChart = rawChart.trim();
  
  // Safely match a preceding comma to prevent invalid JSON
  cleanedChart = cleanedChart.replace(/,\s*"flowchart"\s*:\s*\{\s*"htmlLabels"\s*:\s*true\s*\}/gi, "");
  cleanedChart = cleanedChart.replace(/"flowchart"\s*:\s*\{\s*"htmlLabels"\s*:\s*true\s*\}\s*,?/gi, "");
  
  if (!/[\r\n]/.test(cleanedChart)) {
    cleanedChart = cleanedChart.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  const mermaidFence = cleanedChart.match(/```mermaid\s*([\s\S]*?)```/i);
  if (mermaidFence) {
    return mermaidFence[1].trim();
  }

  if (cleanedChart.startsWith("```")) {
    cleanedChart = cleanedChart.slice(3);
  }
  if (cleanedChart.endsWith("```")) {
    cleanedChart = cleanedChart.slice(0, -3);
  }

  return cleanedChart.trim();
}

function buildMermaidCandidates(chart: string): Array<{ chart: string; notice?: string }> {
  const repaired = repairFlowchart(chart);
  const fallback = buildFallbackFlowchart(chart);

  return [
    { chart },
    ...(repaired !== chart ? [{
      chart: repaired,
      notice: "DevAssist repaired minor Mermaid syntax issues before rendering this diagram.",
    }] : []),
    {
      chart: fallback,
      notice: "The generated Mermaid syntax was not renderable, so DevAssist created a safe architecture map from the saved diagram text. Open Raw Code to inspect the original output.",
    },
  ];
}

function repairFlowchart(chart: string): string {
  const lines = chart
    .replace(/;/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("%%"));

  if (lines.length === 0) {
    return buildFallbackFlowchart(chart);
  }

  const firstLine = lines[0].toLowerCase();
  const hasFlowchartHeader =
    firstLine.startsWith("graph ") ||
    firstLine.startsWith("flowchart ") ||
    firstLine.startsWith("sequenceDiagram".toLowerCase()) ||
    firstLine.startsWith("classDiagram".toLowerCase()) ||
    firstLine.startsWith("stateDiagram".toLowerCase()) ||
    firstLine.startsWith("erDiagram".toLowerCase());

  const normalizedLines = hasFlowchartHeader ? [...lines] : ["flowchart TD", ...lines];
  if (normalizedLines[0].toLowerCase().startsWith("graph ")) {
    normalizedLines[0] = normalizedLines[0].replace(/^graph/i, "flowchart");
  }

  return normalizedLines.map(quoteSimpleFlowchartLabels).join("\n");
}

function quoteSimpleFlowchartLabels(line: string): string {
  return line
    .replace(/\[([^\]"']{1,120})\]/g, (_match, label: string) => `["${escapeMermaidLabel(label)}"]`)
    .replace(/\{([^\}"']{1,120})\}/g, (_match, label: string) => `{"${escapeMermaidLabel(label)}"}`);
}

function buildFallbackFlowchart(chart: string): string {
  const labels = extractDiagramLabels(chart);
  const nodes = labels.slice(0, 7);
  const safeNodes = nodes.length > 0 ? nodes : ["Repository", "Source Files", "Application Components", "Runtime Flow"];

  const lines = [
    "flowchart TD",
    '  A["Architecture Overview"]',
    ...safeNodes.map((label, index) => `  A --> N${index}["${escapeMermaidLabel(label)}"]`),
  ];

  return lines.join("\n");
}

function extractDiagramLabels(chart: string): string[] {
  const labels = new Set<string>();
  const bracketLabelPattern = /\[["']?([^"'\]]{2,80})["']?\]|\{["']?([^"'}]{2,80})["']?\}/g;
  let match: RegExpExecArray | null;

  while ((match = bracketLabelPattern.exec(chart)) !== null) {
    const label = (match[1] || match[2] || "").trim();
    if (label && !/^[A-Za-z]\w*$/.test(label)) {
      labels.add(label);
    }
  }

  if (labels.size === 0) {
    chart
      .split(/\r?\n/)
      .map((line) => line.replace(/[`\[\]{}()"']/g, "").trim())
      .filter((line) => line.length > 2 && !/^(flowchart|graph|classDiagram|sequenceDiagram)/i.test(line))
      .slice(0, 7)
      .forEach((line) => labels.add(line.slice(0, 70)));
  }

  return [...labels];
}

function escapeMermaidLabel(label: string): string {
  return label
    .replace(/<[^>]*>/g, "")
    .replace(/["\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}
