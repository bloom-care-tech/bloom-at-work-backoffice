import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";

export function ExternalLinksHelpPage() {
  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Hub</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Links externos</h1>
        <p className="font-ui text-sm text-bloom-aubergine/70 mt-2">
          Typeforms, check-in semanal e banners de próximo evento são configurados <strong>por empresa</strong>. Abra a empresa desejada e role até a seção de links do hub.
        </p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <PillButton asLink="/empresas">Ir para empresas</PillButton>
        <p className="font-ui text-xs text-bloom-aubergine/55 mt-4">
          O app do colaborador lê esses valores em <code className="text-[11px]">GET /api/me/hub-links</code> (autenticado).
        </p>
      </FadeIn>
    </div>
  );
}
