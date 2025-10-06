import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/PROVIDERS/AuthProvider";

export default function Navbar() {
  const navigate = useNavigate();
  const {currentUser} = useAuth();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b bg-white">
      {/* Left: Sidebar Trigger + App Name */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="font-semibold text-lg">PlaySmart</span>
      </div>

      {/* Right: Avatar with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer">
            <AvatarImage
              src={currentUser?.clubIcon}
              alt="C"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate("/club")}>
            My Club
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
