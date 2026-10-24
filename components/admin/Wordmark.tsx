/** Brand rule: H green + gold ampersand + S green. */
export default function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="wm-h">H</span>
      <span className="wm-amp">&amp;</span>
      <span className="wm-s">S</span>
    </span>
  );
}
