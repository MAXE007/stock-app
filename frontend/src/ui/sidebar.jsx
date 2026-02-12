import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/cn";
import { Menu, X } from "lucide-react";

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

export const SidebarProvider = ({ children, open: openProp, setOpen: setOpenProp, animate = true }) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({ children, open, setOpen, animate }) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props) => (
  <>
    <DesktopSidebar {...props} />
    <MobileSidebar {...props} />
  </>
);

export const DesktopSidebar = ({ className, children, ...props }) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full hidden md:flex md:flex-col shrink-0 border-r border-white/10",
        "bg-white/[0.03] px-4 py-4",
        className
      )}
      animate={{ width: animate ? (open ? "280px" : "72px") : "280px" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({ className, children, ...props }) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-14 px-4 flex md:hidden items-center justify-between w-full",
        "border-b border-white/10 bg-white/[0.03]"
      )}
      {...props}
    >
      <div className="text-sm font-semibold text-white/90">Stock App</div>

      <button
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center"
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
      >
        <Menu size={18} className="text-white/80" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-[100] p-6 flex flex-col justify-between",
              "bg-[#0b0b0f]",
              className
            )}
          >
            <button
              className="absolute right-6 top-6 h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} className="text-white/80" />
            </button>

            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({ link, className, onClick, ...props }) => {
  const { open, animate } = useSidebar();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-start gap-3 py-2 rounded-xl px-2",
        "hover:bg-white/5 transition",
        className
      )}
      {...props}
    >
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm text-white/80 whitespace-pre"
      >
        {link.label}
      </motion.span>
    </button>
  );
};
