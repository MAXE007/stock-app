import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { LayoutDashboard, ShoppingCart, Package, BarChart3 } from "lucide-react";

function Logo({ open }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10" />
      {open && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white/90">Stock App</div>
          <div className="text-xs text-white/55">Dashboard</div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ tab, setTab, children }) {
  const [open, setOpen] = useState(false);

  const links = [
    { key: "sales", label: "Ventas", icon: <ShoppingCart size={18} className="text-white/80" /> },
    { key: "products", label: "Productos", icon: <Package size={18} className="text-white/80" /> },
    { key: "reports", label: "Reportes", icon: <BarChart3 size={18} className="text-white/80" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="px-6 py-6">
        <div className="rounded-[18px] border border-white/10 bg-white/[0.03] shadow-2xl overflow-hidden relative">
          {/* glow */}
          <div
            className="pointer-events-none absolute -inset-1 opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(circle at 30% 10%, rgba(255,255,255,0.16), transparent 45%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.10), transparent 40%)",
            }}
          />

          <div className="relative flex min-h-[calc(100vh-48px)]">
            <Sidebar open={open} setOpen={setOpen} animate={true}>
              <SidebarBody className="justify-between gap-10">
                <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                  <Logo open={open} />
                  <div className="mt-6 flex flex-col gap-2">
                    {links.map((l) => (
                      <SidebarLink
                        key={l.key}
                        link={{
                          label: l.label,
                          href: "#",
                          icon: l.icon,
                        }}
                        className={tab === l.key ? "bg-white/5 border border-white/10" : ""}
                        onClick={() => setTab(l.key)}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-white/50">
                  {open ? "Local demo · Admin" : " "}
                </div>
              </SidebarBody>
            </Sidebar>

            <main className="flex-1 p-5">
              {/* top bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-white/70" />
                  <div>
                    <div className="text-sm font-semibold">
                      {tab === "sales" ? "Ventas" : tab === "products" ? "Productos" : "Reportes"}
                    </div>
                    <div className="text-xs text-white/55">Vista principal</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
