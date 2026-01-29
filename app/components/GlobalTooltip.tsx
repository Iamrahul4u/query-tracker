import { useTooltipStore } from "../hooks/useTooltip";
import { AuditTooltip } from "./AuditTooltip";

export function GlobalTooltip() {
  const { activeInstanceId, query, users, position, placement } = useTooltipStore();

  if (!activeInstanceId || !query) {
    return null;
  }

  // Dynamic style for positioning
  const style: React.CSSProperties = {
    position: "fixed",
    left: `${position.left}px`,
    zIndex: 9999,
    pointerEvents: "none",
  };

  if (placement === "top") {
    // If placing ABOVE, anchor to bottom (so it grows upwards)
    // position.top is the anchor point (visual top of the card - margin)
    // distance from bottom of screen = windowHeight - position.top
    style.bottom = `${window.innerHeight - position.top}px`;
    style.top = "auto";
  } else {
    // If placing BELOW, anchor to top
    style.top = `${position.top}px`;
    style.bottom = "auto";
  }

  return (
    <div style={style}>
      <AuditTooltip query={query} users={users} />
    </div>
  );
}
