/**
 * 从 12 点钟方向顺时针扩展的圆扇形路径（progress 0→1 铺满整圆）。
 * 坐标系与 SVG 一致（y 向下）。
 */
export function pieSectorPath(cx: number, cy: number, r: number, progress: number): string | "full" | null {
  if (progress <= 0) return null;
  if (progress >= 1) return "full";
  const sweep = progress * 2 * Math.PI;
  const a0 = -Math.PI / 2;
  const a1 = a0 + sweep;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}
