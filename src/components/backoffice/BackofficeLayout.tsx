import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Buildings, House, SignOut, Users, LinkSimple, Sparkle } from "@phosphor-icons/react";
import grupoBoticarioLogo from "@/assets/grupo-boticario.png";
import { TrustLine } from "@/components/bloom/primitives";
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
      <div className="bg-bloom-cream-deep border-b border-bloom-aubergine/10 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bloom-aubergine/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-bloom-aubergine/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-bloom-aubergine/15" />
          </div>
          <div className="flex-1 bg-bloom-cream rounded-full px-4 py-1.5 font-ui text-[11px] text-bloom-aubergine/60 truncate">
            bloom@work · painel administrativo
          </div>
        </div>
      </div>

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
            <img src={grupoBoticarioLogo} alt="" className="h-10 w-auto mt-4 opacity-90" />
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
            <NavLink to="/convites" className={navClass}>
              <LinkSimple size={20} weight="duotone" />
              Convites
            </NavLink>
            <NavLink to="/frases" className={navClass}>
              <Sparkle size={20} weight="duotone" />
              Bloom do dia
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
                { to: "/convites", label: "Convites" },
                { to: "/frases", label: "Frases" },
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
