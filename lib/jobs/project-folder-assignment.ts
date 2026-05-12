import { prisma } from "@/lib/db";

export type ProjectFolderResolution =
  | { ok: true; projectId: string | null; folderId: string | null }
  | { ok: false; status: number; error: string };

export async function resolveJobProjectFolderAssignment(input: { projectId?: string | null; folderId?: string | null }): Promise<ProjectFolderResolution> {
  const folderId = input.folderId ?? null;
  let resolvedProjectId: string | null = input.projectId ?? null;

  if (folderId) {
    const folder = await prisma.projectFolder.findUnique({ where: { id: folderId } });
    if (!folder) return { ok: false, status: 400, error: "Folder not found." };
    if (folder.isArchived) return { ok: false, status: 400, error: "Archived folder cannot be used for new jobs." };
    resolvedProjectId = folder.projectId;
    if (input.projectId && folder.projectId !== input.projectId) {
      return { ok: false, status: 400, error: "Folder must belong to selected project." };
    }
  }

  if (resolvedProjectId) {
    const project = await prisma.project.findUnique({ where: { id: resolvedProjectId } });
    if (!project) return { ok: false, status: 400, error: "Project not found." };
    if (project.isArchived) return { ok: false, status: 400, error: "Archived project cannot be used for new jobs." };
  }

  return { ok: true, projectId: resolvedProjectId, folderId };
}
