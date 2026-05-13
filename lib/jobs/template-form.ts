export type JobTemplate = {
  promptLines: string[];
  provider: string;
  model: string;
  aspectRatio?: string | null;
  variationCount?: number | null;
  quality?: string | null;
  constraints?: string | null;
};

export type AppliedTemplateState = {
  provider: string;
  model: string;
  aspectRatio: string;
  aspectRatioTouched: boolean;
  variationCount?: number;
  quality?: string;
  constraints: string;
};

const DEFAULT_ASPECT_RATIO = "1:1";

export function applyJobTemplateToFormState(template: JobTemplate): AppliedTemplateState {
  const ratio = typeof template.aspectRatio === "string" ? template.aspectRatio.trim() : "";
  const hasAspectRatio = ratio.length > 0;
  const constraints = typeof template.constraints === "string" ? template.constraints : "";
  return {
    provider: template.provider,
    model: template.model,
    aspectRatio: hasAspectRatio ? ratio : DEFAULT_ASPECT_RATIO,
    aspectRatioTouched: hasAspectRatio,
    variationCount: typeof template.variationCount === "number" ? template.variationCount : undefined,
    quality: typeof template.quality === "string" && template.quality.trim().length > 0 ? template.quality.trim() : undefined,
    constraints
  };
}
