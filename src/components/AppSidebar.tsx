import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarClock,
  FileText,
  Receipt,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logo from "@/assets/cradlewell-logo.png";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Follow-ups", url: "/followups", icon: CalendarClock },
  { title: "Quotations", url: "/quotations", icon: FileText },
  { title: "Invoice Generator", url: "/invoice-generator", icon: Receipt },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <img src={logo} alt="Cradlewell" className="h-9 w-9 object-contain" />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Cradlewell</span>
            <span className="text-[11px] text-muted-foreground">Sales CRM</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}