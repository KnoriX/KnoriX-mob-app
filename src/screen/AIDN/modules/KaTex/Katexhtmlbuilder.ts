import type { FormulaItem, KaTexDisplayMode } from './katexNode.types';

// ─── KaTeX Dark Theme CSS ─────────────────────────────────────────────────────

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: transparent;
    font-family: -apple-system, 'SF Pro Display', sans-serif;
    color: #E8E8F0;
    padding: 0;
    overflow: hidden;
  }

  .formula-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 60px;
    padding: 12px 16px;
    animation: fadeIn 0.28s ease-out forwards;
  }

  .formula-label {
    font-size: 11px;
    font-family: 'SF Mono', 'Courier New', monospace;
    color: #7C6FFF;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 8px;
    align-self: flex-start;
  }

  .formula-box {
    background: rgba(124, 111, 255, 0.06);
    border: 1px solid rgba(124, 111, 255, 0.2);
    border-radius: 10px;
    padding: 16px 20px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-x: auto;
  }

  .formula-box.inline {
    display: inline-flex;
    width: auto;
    padding: 6px 12px;
  }

  .formula-explanation {
    font-size: 12px;
    color: #8888AA;
    margin-top: 8px;
    line-height: 1.5;
    align-self: flex-start;
    padding: 0 4px;
  }

  .step-arrow {
    color: #7C6FFF;
    font-size: 20px;
    margin: 4px 0;
    opacity: 0.6;
  }

  .step-number {
    font-size: 10px;
    color: #7C6FFF;
    font-family: 'SF Mono', monospace;
    letter-spacing: 1px;
    background: rgba(124,111,255,0.12);
    border-radius: 4px;
    padding: 2px 6px;
    margin-bottom: 6px;
    align-self: flex-start;
  }

  /* KaTeX overrides for dark theme */
  .katex { color: #E8E8F0 !important; font-size: 1.4em !important; }
  .katex .mord, .katex .mrel, .katex .mop,
  .katex .mbin, .katex .mopen, .katex .mclose,
  .katex .mpunct { color: #E8E8F0 !important; }
  .katex .mfrac .frac-line { background: #E8E8F0 !important; }

  /* Highlight spans injected by backend */
  .hl-term { border-radius: 3px; padding: 0 2px; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .step-enter { animation: slideIn 0.3s ease-out forwards; }
`;

// ─── Single formula HTML ──────────────────────────────────────────────────────

function renderFormulaItem(f: FormulaItem, index: number, isDerivation: boolean): string {
  const scale = f.scale ?? 1;
  const scaleStyle = scale !== 1 ? `style="font-size:${scale}em"` : '';

  let inner = '';
  if (f.html) {
    // Backend pre-rendered HTML — use directly
    inner = f.html;
  } else if (f.latex) {
    // Raw LaTeX — KaTeX will render via mermaid.initialize equivalent
    inner = `<span class="katex-render" data-latex="${encodeURIComponent(f.latex)}" data-display="${f.displayMode ?? 'block'}"></span>`;
  }

  const labelHtml = f.label
    ? `<div class="formula-label">${f.label}</div>` : '';
  const stepNumHtml = isDerivation
    ? `<div class="step-number">STEP ${index + 1}</div>` : '';
  const explanationHtml = f.explanation
    ? `<div class="formula-explanation">${f.explanation}</div>` : '';
  const arrowHtml = isDerivation
    ? `<div class="step-arrow">↓</div>` : '';
  const boxClass = f.displayMode === 'inline' ? 'formula-box inline' : 'formula-box';

  return `
    <div class="formula-wrap ${index > 0 ? 'step-enter' : ''}" style="animation-delay:${index * 80}ms" ${scaleStyle}>
      ${stepNumHtml}
      ${labelHtml}
      <div class="${boxClass}">${inner}</div>
      ${explanationHtml}
    </div>
    ${arrowHtml}
  `;
}

// ─── Full HTML page builder ───────────────────────────────────────────────────

export function buildKaTexHtml(
  formulas: FormulaItem[],
  displayMode: KaTexDisplayMode,
  accentColor = '#7C6FFF',
  currentStep = 0,
): string {
  const isDerivation = displayMode === 'derivation';
  const isStepByStep = displayMode === 'step_by_step';

  // Which formulas to show
  const visible = isStepByStep
    ? [formulas[currentStep]].filter(Boolean)
    : formulas;

  const formulaBlocks = visible
    .map((f, i) => renderFormulaItem(f, isStepByStep ? currentStep : i, isDerivation))
    .join('');

  // Check if any formula needs KaTeX rendering (has latex but no html)
  const needsKatex = formulas.some((f) => f.latex && !f.html);

  const katexScript = needsKatex ? `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.katex-render').forEach(function(el) {
          try {
            const latex = decodeURIComponent(el.dataset.latex);
            const display = el.dataset.display === 'block';
            katex.render(latex, el, {
              throwOnError: false,
              displayMode: display,
              output: 'html',
            });
          } catch(e) {
            el.textContent = el.dataset.latex;
          }
        });
        // Notify height to RN
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'height', value: document.body.scrollHeight })
        );
      });
    </script>
  ` : `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'height', value: document.body.scrollHeight })
        );
      });
    </script>
  `;

  const accentCss = accentColor !== '#7C6FFF'
    ? `<style>
        .formula-label, .step-number, .step-arrow, .katex { color: ${accentColor} !important; }
        .formula-box { border-color: ${accentColor}44 !important; background: ${accentColor}0D !important; }
       </style>`
    : '';

  const scrollStyle = displayMode === 'multi' || isDerivation
    ? 'overflow-y: auto; height: 100vh;'
    : 'overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 100vh;';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>${BASE_CSS}</style>
  ${accentCss}
  ${katexScript}
</head>
<body>
  <div style="${scrollStyle}">
    <div style="width:100%; padding: 8px 0;">
      ${formulaBlocks}
    </div>
  </div>
</body>
</html>`;
}
