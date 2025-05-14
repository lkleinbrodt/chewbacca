import { Link, useLocation } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import { Button } from "@/components/ui/button";
// import { ModeToggle } from "@/components/DarkModeToggle";
import { useAuth } from "@/contexts/AuthContext";

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    default:
      return "Chewffy";
  }
};

export default function NavBar() {
  const { login } = useAuth();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex fixed flex-row justify-between items-center bg-secondary-foreground h-[var(--navbar-height)] px-4 w-full z-[1000]">
      <NavigationMenu className="mx-0 my-0">
        <NavigationMenuList className="m-0 p-0">
          <NavigationMenuItem>
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-4">
                <img src="/icons/chewy.png" alt="logo" className="w-10 h-10" />
              </Link>
              {pageTitle && (
                <span className="text-xl font-semibold text-background cursor-default">
                  {pageTitle}
                </span>
              )}
            </div>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <NavigationMenu className="mx-0 my-0">
        <NavigationMenuList className="m-0 p-0">
          <Button
            variant="outline"
            className="bg-transparent text-background hover:text-background"
            onClick={() => login(location.pathname)}
          >
            Login
          </Button>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
