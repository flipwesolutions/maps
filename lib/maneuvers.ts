import type { RouteStep } from "./routing";

export type ManeuverIcon =
  | "depart"
  | "arrive"
  | "straight"
  | "left"
  | "right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "u-turn"
  | "roundabout"
  | "merge"
  | "fork";

export function maneuverIcon(step: RouteStep): ManeuverIcon {
  const { type, modifier } = step;
  if (type === "depart") return "depart";
  if (type === "arrive") return "arrive";
  if (type === "roundabout") return "roundabout";
  if (type === "merge") return "merge";
  if (type === "fork") {
    if (modifier === "left") return "slight-left";
    if (modifier === "right") return "slight-right";
    return "straight";
  }
  if (modifier === "uturn") return "u-turn";
  if (modifier === "sharp left") return "sharp-left";
  if (modifier === "sharp right") return "sharp-right";
  if (modifier === "slight left") return "slight-left";
  if (modifier === "slight right") return "slight-right";
  if (modifier === "left") return "left";
  if (modifier === "right") return "right";
  return "straight";
}

const ICON_GLYPHS: Record<ManeuverIcon, string> = {
  depart: "↑",
  arrive: "🏁",
  straight: "↑",
  left: "↰",
  right: "↱",
  "slight-left": "↖",
  "slight-right": "↗",
  "sharp-left": "⤺",
  "sharp-right": "⤻",
  "u-turn": "↩",
  roundabout: "⟳",
  merge: "⤴",
  fork: "⑂",
};

export function maneuverGlyph(step: RouteStep): string {
  return ICON_GLYPHS[maneuverIcon(step)];
}

/** Distance label for next maneuver — Google Maps style. */
export function formatManeuverDistance(meters: number): string {
  if (meters < 15) return "Now";
  if (meters < 1000) {
    const rounded = meters < 200 ? Math.round(meters / 10) * 10 : Math.round(meters / 50) * 50;
    return `${rounded} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function shortInstruction(step: RouteStep): string {
  if (step.type === "arrive") return "You have arrived at your destination";
  const street = step.streetName ? ` onto ${step.streetName}` : "";
  const icon = maneuverIcon(step);

  switch (icon) {
    case "left":
      return `Turn left${street}`;
    case "right":
      return `Turn right${street}`;
    case "slight-left":
      return `Keep left${street}`;
    case "slight-right":
      return `Keep right${street}`;
    case "sharp-left":
      return `Turn sharp left${street}`;
    case "sharp-right":
      return `Turn sharp right${street}`;
    case "u-turn":
      return `Make a U-turn${street}`;
    case "roundabout":
      return `Enter the roundabout${street}`;
    case "merge":
      return `Merge${street}`;
    case "depart":
      return `Head${street || " straight"}`;
    default:
      return step.instruction;
  }
}

export function voiceInstruction(
  step: RouteStep,
  distanceMeters: number
): string {
  const dist = formatManeuverDistance(distanceMeters);
  const action = shortInstruction(step);
  if (distanceMeters < 15) return action;
  if (step.type === "arrive") return action;
  return `In ${dist}, ${action.toLowerCase()}`;
}

/** Street name for the top navigation card. */
export function streetLabel(step: RouteStep): string {
  if (step.streetName) return step.streetName;
  const onto = step.instruction.match(/\bonto (.+)$/i);
  if (onto?.[1]) return onto[1];
  const action = shortInstruction(step);
  if (action.startsWith("Head")) return "your route";
  return action;
}
