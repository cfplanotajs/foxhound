export function composePrompt(stylePrompt: string, artistPrompt: string, constraints?: string): string {
  const cleanConstraints = constraints?.trim();
  return [
    "[MASTER STYLE PROMPT]",
    stylePrompt,
    "",
    "Subject:",
    artistPrompt.trim(),
    "",
    "Production constraints:",
    cleanConstraints && cleanConstraints.length > 0 ? cleanConstraints : "None"
  ].join("\n");
}
