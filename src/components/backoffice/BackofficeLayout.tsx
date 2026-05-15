import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Buildings,
  House,
  SignOut,
  Users,
  ShieldCheck,
  LinkSimple,
  Sparkle,
  WaveSine,
  Brain,
  MapTrifold,
  ChartBar,
  UserCircle,
} from "@phosphor-icons/react";
import { TrustLine } from "@/components/bloom/primitives";
import { AdminFirstAccessPasswordOverlay } from "@/components/backoffice/AdminFirstAccessPasswordOverlay";
import { useBackofficeSession } from "@/lib/backoffice-session";
import { cn } from "@/lib/utils";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-xl px-4 py-3 font-ui text-sm transition-colors duration-260 ease-bloom",
    isActive
      ? "bg-bloom-cream text-bloom-garnet font-medium shadow-sm"
      : "text-bloom-cream/85 hover:bg-bloom-cream/10 hover:text-bloom-cream",
  );

export function BackofficeLayout() {
  const navigate = useNavigate();
  const { signOut } = useBackofficeSession();

  return (
    <div className="min-h-screen bg-bloom-cream flex flex-col">
      <AdminFirstAccessPasswordOverlay />
      <div className="flex flex-1 min-h-0 mx-auto w-full">
        <aside className="hidden md:flex w-64 shrink-0 flex-col bg-bloom-aubergine text-bloom-cream border-r border-bloom-aubergine/30">
          <div className="p-6 border-b border-bloom-cream/10">
            <Link to="/" className="block">
              <span className="font-serif-display text-lg text-bloom-cream leading-none">
                bloom<span className="italic">@</span>work
              </span>
              <span className="font-ui text-[10px] uppercase tracking-[0.18em] text-bloom-cream/60 block mt-2">
                Painel
              </span>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <NavLink to="/" end className={navClass}>
              <House size={20} weight="duotone" />
              Início
            </NavLink>
            <NavLink to="/empresas" className={navClass}>
              <Buildings size={20} weight="duotone" />
              Empresas
            </NavLink>
            <NavLink to="/usuarios" className={navClass}>
              <Users size={20} weight="duotone" />
              Usuários
            </NavLink>
            <NavLink to="/administradores" className={navClass}>
              <ShieldCheck size={20} weight="duotone" />
              Administradores
            </NavLink>
            <NavLink to="/links-acesso" className={navClass}>
              <LinkSimple size={20} weight="duotone" />
              Links de acesso
            </NavLink>
            <NavLink to="/frases" className={navClass}>
              <Sparkle size={20} weight="duotone" />
              Bloom do dia
            </NavLink>
            <NavLink to="/ondas" className={navClass}>
              <WaveSine size={20} weight="duotone" />
              Ondas
            </NavLink>
            <NavLink to="/especialistas" className={navClass}>
              <UserCircle size={20} weight="duotone" />
              Especialistas
            </NavLink>
            <NavLink to="/habilidades" className={navClass}>
              <Brain size={20} weight="duotone" />
              Habilidades
            </NavLink>
            <NavLink to="/mapa-documentos" className={navClass}>
              <MapTrifold size={20} weight="duotone" />
              Mapa de documentos
            </NavLink>
            <NavLink to="/metricas" className={navClass}>
              <ChartBar size={20} weight="duotone" />
              Métricas
            </NavLink>
          </nav>
          <div className="p-3 border-t border-bloom-cream/10">
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-ui text-sm text-bloom-cream/85 hover:bg-bloom-cream/10 hover:text-bloom-cream transition-colors"
            >
              <SignOut size={20} />
              Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden bg-bloom-aubergine text-bloom-cream">
            <div className="px-4 py-3 flex items-center justify-between">
              <Link to="/" className="font-serif-display text-base">
                bloom<span className="italic">@</span>work
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
                className="p-2 rounded-lg hover:bg-bloom-cream/10"
                aria-label="Sair"
              >
                <SignOut size={20} />
              </button>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2 border-t border-bloom-cream/10">
              {[
                { to: "/", label: "Início", end: true },
                { to: "/empresas", label: "Empresas" },
                { to: "/usuarios", label: "Usuários" },
                { to: "/administradores", label: "Admins" },
                { to: "/links-acesso", label: "Links" },
                { to: "/frases", label: "Frases" },
                { to: "/ondas", label: "Ondas" },
                { to: "/especialistas", label: "Espec." },
                { to: "/habilidades", label: "Habil." },
                { to: "/mapa-documentos", label: "Mapa" },
                { to: "/metricas", label: "Métricas" },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      "shrink-0 rounded-full px-3 py-1.5 font-ui text-[11px] uppercase tracking-wide",
                      isActive ? "bg-bloom-cream text-bloom-garnet" : "text-bloom-cream/80 hover:bg-bloom-cream/10",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10">
            <Outlet />
          </main>
          <footer className="border-t border-bloom-aubergine/8 py-6 shrink-0">
            <TrustLine className="!justify-center">acesso restrito ao painel administrativo</TrustLine>
          </footer>
        </div>
      </div>
    </div>
  );
}
