import { FadeIn, Eyebrow } from "@/components/bloom/primitives";

export function ModulePlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      <FadeIn>
        <Eyebrow tone="garnet">Em breve</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-2">{title}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/70 mt-2">{description}</p>
      </FadeIn>
    </div>
  );
}
