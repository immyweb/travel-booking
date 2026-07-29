type TileMarkProps = {
  className?: string;
};

// Four overlapping petals, the layout an azulejo quarter-circle motif
// resolves to when four tiles meet — used as the wordmark's icon and echoed
// again, larger and faint, in the hero and footer.
export function TileMark({ className }: TileMarkProps) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="20" cy="11" r="9" opacity="0.95" />
      <circle cx="29" cy="20" r="9" opacity="0.8" />
      <circle cx="20" cy="29" r="9" opacity="0.65" />
      <circle cx="11" cy="20" r="9" opacity="0.8" />
    </svg>
  );
}
