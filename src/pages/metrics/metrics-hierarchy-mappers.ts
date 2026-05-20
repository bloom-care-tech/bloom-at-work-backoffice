import type { MetricsHierarchyNode } from "./MetricsHierarchyDrilldown";

const WAVE_CONTENT_KIND_LABEL: Record<string, string> = {
  video: "Vídeo",
  vídeo: "Vídeo",
  audio: "Áudio",
  áudio: "Áudio",
  pdf: "PDF",
  article: "Artigo",
  artigo: "Artigo",
  exercise: "Exercício",
  exercício: "Exercício",
  toolkit: "Toolkit",
  scientificReferences: "Referências científicas",
  referências_científicas: "Referências científicas",
};

export type WaveEngagementHierarchyResponse = {
  from: string;
  to: string;
  waves: {
    waveId: string;
    title: string;
    count: number;
    modules: {
      moduleId: string;
      title: string;
      count: number;
      contents: { contentId: string; title: string; kind: string; count: number }[];
    }[];
  }[];
};

export type SkillEngagementHierarchyResponse = {
  from: string;
  to: string;
  skills: {
    skillId: string;
    title: string;
    slug: string;
    count: number;
    pageCount: number;
    items: { itemId: string; title: string; count: number }[];
  }[];
};

export function waveHierarchyToNodes(data: WaveEngagementHierarchyResponse): MetricsHierarchyNode[] {
  return data.waves.map((wave) => ({
    id: wave.waveId,
    label: wave.title,
    count: wave.count,
    children: wave.modules.map((mod) => {
      const contentNodes: MetricsHierarchyNode[] = mod.contents.map((c) => ({
        id: c.contentId,
        label: c.title,
        count: c.count,
        subtitle: WAVE_CONTENT_KIND_LABEL[c.kind] ?? c.kind,
      }));
      const contentSum = contentNodes.reduce((sum, n) => sum + n.count, 0);
      const modulePageCount = mod.count - contentSum;
      const children =
        modulePageCount > 0 ?
          [{ id: `${mod.moduleId}:page`, label: "Página do módulo", count: modulePageCount }, ...contentNodes]
        : contentNodes;
      return {
        id: mod.moduleId,
        label: mod.title,
        count: mod.count,
        children: children.length > 0 ? children : undefined,
      };
    }),
  }));
}

export function skillHierarchyToNodes(data: SkillEngagementHierarchyResponse): MetricsHierarchyNode[] {
  return data.skills.map((skill) => {
    const children: MetricsHierarchyNode[] = [];
    if (skill.pageCount > 0) {
      children.push({
        id: `${skill.skillId}:page`,
        label: "Página da habilidade",
        count: skill.pageCount,
      });
    }
    for (const item of skill.items) {
      children.push({
        id: item.itemId,
        label: item.title,
        count: item.count,
      });
    }
    return {
      id: skill.skillId,
      label: skill.title,
      count: skill.count,
      children,
    };
  });
}
