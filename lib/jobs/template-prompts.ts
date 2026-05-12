export function splitTemplatePrompts(promptLines: string[] | null | undefined): { singlePrompt: string; bulkPrompts: string } {
  const lines = (promptLines ?? []).map((line) => String(line).trim()).filter(Boolean);
  if (lines.length <= 1) return { singlePrompt: lines[0] ?? "", bulkPrompts: "" };
  return { singlePrompt: "", bulkPrompts: lines.join("\n") };
}
