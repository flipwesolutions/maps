import * as Speech from "expo-speech";
import type { RouteStep } from "./routing";
import {
  VOICE_THRESHOLDS,
  voiceCueKey,
  type NavigationProgress,
} from "./navigation";
import { voiceInstruction } from "./maneuvers";

const spokenCues = new Set<string>();
let lastStepAnnounced = -1;
let voiceEnabled = true;

export function setVoiceEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  if (!enabled) Speech.stop();
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

export function resetVoiceNavigation(): void {
  Speech.stop();
  spokenCues.clear();
  lastStepAnnounced = -1;
}

export function announceRerouting(): void {
  if (!voiceEnabled) return;
  Speech.stop();
  Speech.speak("Rerouting", { language: "en-IN", rate: 0.95 });
}

export function announceArrival(): void {
  if (!voiceEnabled) return;
  Speech.stop();
  Speech.speak("You have arrived at your destination", {
    language: "en-IN",
    rate: 0.95,
  });
}

/** Speak turn cues at distance thresholds and on step changes. */
export function updateVoiceGuidance(
  progress: NavigationProgress,
  steps: RouteStep[]
): void {
  if (!voiceEnabled || progress.hasArrived) return;

  const step = steps[progress.stepIndex];
  if (!step) return;

  if (progress.stepIndex !== lastStepAnnounced && step.type !== "depart") {
    lastStepAnnounced = progress.stepIndex;
    const phrase = voiceInstruction(step, progress.distanceToManeuverMeters);
    Speech.stop();
    Speech.speak(phrase, { language: "en-IN", rate: 0.95 });
    return;
  }

  for (const threshold of VOICE_THRESHOLDS) {
    const key = voiceCueKey(progress.stepIndex, threshold);
    if (spokenCues.has(key)) continue;
    if (progress.distanceToManeuverMeters > threshold) continue;
    if (progress.distanceToManeuverMeters < 10) continue;

    spokenCues.add(key);
    const phrase = voiceInstruction(step, threshold);
    Speech.stop();
    Speech.speak(phrase, { language: "en-IN", rate: 0.95 });
    break;
  }
}
