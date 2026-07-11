import type {
  ActiveTarget,
  ActiveTargetEngineResult,
} from "./activeTargetContract";
import { getActiveTargetSourceLabel } from "./activeTargetSelection";

export function buildActiveTargetCopyText(
  target: ActiveTarget,
  engineResult?: ActiveTargetEngineResult | null,
): string {
  return [
    "My SkillMint Active Target:",
    `Target: ${formatTargetTitle(target)}`,
    `Source: ${getActiveTargetSourceLabel(target.source)}`,
    `JD Match: ${target.jdMatch ? `${Math.round(target.jdMatch.score)}/100` : "Not available yet"}`,
    `Main gap: ${engineResult?.mainGap ?? target.mainGap}`,
    `Next move: ${engineResult?.nextBestMove ?? target.nextBestMove}`,
    "Active Target focuses next actions. It does not change core scores.",
  ].join("\n");
}

export function buildTargetGapCopyText(target: ActiveTarget): string {
  return [
    `SkillMint target gap for ${formatTargetTitle(target)}:`,
    target.mainGap,
    target.nextBestMove,
    "Re-upload your resume so SkillMint can check whether evidence is now visible.",
  ].join("\n");
}

function formatTargetTitle(target: ActiveTarget): string {
  if (target.companyName && target.roleTitle) {
    return `${target.roleTitle} at ${target.companyName}`;
  }

  return target.title;
}
