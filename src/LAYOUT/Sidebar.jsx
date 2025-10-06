import { useLocation, Link } from "react-router-dom"; // note this change!
import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  Users,
  RefreshCcw,
  Brain,
  TrendingUp,
  Grid3X3,
  Trophy,
  Target,
  Zap,
  BarChart3
} from "lucide-react";

import {
  Sidebar as SB,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuSections = [
  {
    label: "Dashboard",
    color: "from-blue-500 to-purple-600",
    items: [
      {
        title: "🏠 Overview",
        url: "/",
        icon: Home,
        color: "from-blue-400 to-blue-600"
      }
    ]
  },
  {
    label: "Team Management", 
    color: "from-green-500 to-emerald-600",
    items: [
      {
        title: "👥 All Players", 
        url: "/players",
        icon: Users,
        color: "from-green-400 to-green-600"
      },
      {
        title: "⚽ Manage Team",
        url: "/team", 
        icon: Users,
        color: "from-emerald-400 to-emerald-600"
      },
      {
        title: "🔄 Formations",
        url: "/formations",
        icon: Grid3X3,
        color: "from-teal-400 to-teal-600"
      }
    ]
  },
  {
    label: "AI Features",
    color: "from-purple-500 to-pink-600", 
    items: [
      {
        title: "🧠 AI Formation Optimizer",
        url: "/formations",
        icon: Brain,
        color: "from-purple-400 to-purple-600"
      },
      {
        title: "📈 Player Development", 
        url: "/players",
        icon: TrendingUp,
        color: "from-pink-400 to-pink-600"
      },
      {
        title: "🎯 Match Predictor",
        url: "/simulations", 
        icon: Target,
        color: "from-indigo-400 to-indigo-600"
      }
    ]
  },
  {
    label: "Training & Performance",
    color: "from-orange-500 to-red-600",
    items: [
      {
        title: "🏃 Training Sessions",
        url: "/training",
        icon: RefreshCcw, 
        color: "from-orange-400 to-orange-600"
      },
      {
        title: "⚡ Simulations",
        url: "/simulations",
        icon: Zap,
        color: "from-red-400 to-red-600"
      },
      {
        title: "📊 Analytics",
        url: "/analytics", 
        icon: BarChart3,
        color: "from-yellow-400 to-yellow-600"
      }
    ]
  }
];

export function Sidebar() {
  const location = useLocation(); // get current URL

  return (
    <SB className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r-2 border-slate-700">
      <SidebarContent className="p-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ⚽ PlaySmart
          </h2>
          <p className="text-slate-400 text-xs">AI-Powered Football Management</p>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <SidebarGroup key={section.label} className="mb-6">
            <SidebarGroupLabel className={`bg-gradient-to-r ${section.color} bg-clip-text text-transparent font-bold text-sm mb-3`}>
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.url}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                            isActive
                              ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                              : "text-slate-300 hover:bg-slate-700/50 hover:text-white hover:scale-102"
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-700">
          <div className="text-center">
            <p className="text-slate-500 text-xs">Powered by AI</p>
            <div className="flex justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </SB>
  );
}
