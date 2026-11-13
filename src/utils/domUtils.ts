export function containsPersianOrArabic(text: string): boolean {
  if (!text) return false;
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(text);
}

export function createProgressRing(
  container: HTMLElement,
  percent: number,
  size = 64,
  strokeWidth = 6,
  label?: string
): SVGSVGElement {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const wrapper = container.createDiv({ cls: 'eh-progress-ring-wrapper' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('eh-progress-ring');

  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', String(size / 2));
  bgCircle.setAttribute('cy', String(size / 2));
  bgCircle.setAttribute('r', String(radius));
  bgCircle.setAttribute('fill', 'transparent');
  bgCircle.setAttribute('stroke', 'var(--background-modifier-border)');
  bgCircle.setAttribute('stroke-width', String(strokeWidth));

  const fgCircle = document.createElementNS(svgNS, 'circle');
  fgCircle.setAttribute('cx', String(size / 2));
  fgCircle.setAttribute('cy', String(size / 2));
  fgCircle.setAttribute('r', String(radius));
  fgCircle.setAttribute('fill', 'transparent');
  fgCircle.setAttribute('stroke', 'var(--eh-accent)');
  fgCircle.setAttribute('stroke-width', String(strokeWidth));
  fgCircle.setAttribute('stroke-dasharray', `${circumference} ${circumference}`);
  fgCircle.setAttribute('stroke-dashoffset', String(offset));
  fgCircle.setAttribute('stroke-linecap', 'round');
  fgCircle.style.transform = 'rotate(-90deg)';
  fgCircle.style.transformOrigin = '50% 50%';
  fgCircle.style.transition = 'stroke-dashoffset 0.35s ease';

  svg.appendChild(bgCircle);
  svg.appendChild(fgCircle);
  wrapper.appendChild(svg);

  const textOverlay = wrapper.createDiv({ cls: 'eh-progress-ring-label' });
  textOverlay.setText(label ?? `${clamped}%`);

  return svg;
}
