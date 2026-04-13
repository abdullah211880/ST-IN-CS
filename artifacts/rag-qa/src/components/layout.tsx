import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Database, FileText, Home, LayoutDashboard, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Overview", href: "/overview", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Sessions", href: "/sessions", icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col">
        <Link href="/" className="h-16 flex items-center px-6 border-b border-sidebar-border hover:opacity-80 transition-opacity">
          <Database className="w-5 h-5 mr-3 text-sidebar-primary" />
          <span className="font-semibold text-lg tracking-tight">RAG Engine</span>
          <Home className="w-3.5 h-3.5 ml-auto text-sidebar-foreground/30" />
        </Link>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-medium text-sidebar-foreground/50 mb-4 px-2 tracking-wider uppercase">Menu</div>
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-[0_0_12px_hsl(192_100%_48%_/_0.4),0_0_24px_hsl(192_100%_48%_/_0.15)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_8px_hsl(192_100%_48%_/_0.1)]"
                )}
              >
                <item.icon className={cn("w-4 h-4 mr-3", isActive ? "opacity-100" : "opacity-70")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground border border-sidebar-border">
              AK
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Analyst Mode</span>
              <span className="text-xs text-sidebar-foreground/50 mt-1">Ready</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}
