import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlgorithm, ALGORITHMS } from "@/components/algorithm-visualizer/algorithms/registry";
import { AlgorithmVisualizerPage } from "@/components/algorithm-visualizer/AlgorithmVisualizerPage";
import { ReverseLinkedListViz } from "@/components/algorithm-visualizer/algorithms/ReverseLinkedListViz";
import { LISViz } from "@/components/algorithm-visualizer/algorithms/LISViz";

export function generateStaticParams() {
  return ALGORITHMS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const algo = getAlgorithm(slug);
  if (!algo) return { title: "未找到 · Toolbox" };
  return {
    title: `${algo.title} · 算法可视化 · Toolbox`,
    description: algo.description,
  };
}

const COMPONENT_MAP: Record<string, React.ComponentType> = {
  permutations: AlgorithmVisualizerPage,
  "reverse-linked-list": ReverseLinkedListViz,
  "longest-increasing-subsequence": LISViz,
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const algo = getAlgorithm(slug);
  if (!algo) notFound();

  const Component = COMPONENT_MAP[slug];
  if (!Component) notFound();

  return <Component />;
}
