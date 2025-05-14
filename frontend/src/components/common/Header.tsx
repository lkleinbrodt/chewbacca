import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-2">
      <div className="container flex h-20 items-center">
        <div className="mr-6 flex items-center gap-3">
          <Link to="/" className="flex items-center">
            <img src="/icons/chewy.png" alt="logo" className="w-12 h-12" />
            <span className="ml-3 text-2xl text-primary">Chewy</span>
          </Link>
        </div>

        <NavigationMenu className="ml-auto">
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={
                  navigationMenuTriggerStyle() +
                  " text-base px-6 py-3 font-medium"
                }
              >
                <Link to="/tasks">Tasks</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={
                  navigationMenuTriggerStyle() +
                  " text-base px-6 py-3 font-medium"
                }
              >
                <Link to="/calendar">Calendar</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
};

export default Header;
