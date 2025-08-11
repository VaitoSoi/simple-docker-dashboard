import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Container, Database, Home, LogOut, PanelLeftOpen, Scroll, Settings } from "lucide-react";
import type { ComponentProps } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { GitHub } from "../ui/icon";
import { cn } from "@/lib/utils";

export default function () {
    const navigator = useNavigate();
    const navigatorWithTransition = (path: string) => navigator(path, { viewTransition: true });
    const username = localStorage.getItem("username");

    return (
        <Sheet>
            <SheetTrigger asChild>
                <PanelLeftOpen className="fixed opacity-70 hover:opacity-100 mt-5 ml-5 size-8 " />
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader className="pb-0">
                    <SheetTitle className="text-xl">
                        {username
                            ? <p>Welcome back, <span className="font-bold">{username}</span></p>
                            : "Welcome back :D"
                        }
                    </SheetTitle>
                    <SheetDescription className="text-lg">
                        Choose where you want to go
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col px-4">
                    <SheetItem onClick={() => navigatorWithTransition("/")}>
                        <Home className="size-8" />
                        <p>Home</p>
                    </SheetItem>
                    <SheetItem onClick={() => navigatorWithTransition("/containers")}>
                        <Container className="size-8" />
                        <p>Container</p>
                    </SheetItem>
                    <SheetItem onClick={() => navigatorWithTransition("/images")}>
                        <Scroll className="size-8" />
                        <p>Images</p>
                    </SheetItem>
                    <SheetItem onClick={() => navigatorWithTransition("/volumes")}>
                        <Database className="size-8" />
                        <p>Volumes</p>
                    </SheetItem>
                    <SheetItem onClick={() => navigatorWithTransition("/settings?tab=user")}>
                        <Settings className="size-8" />
                        <p>Settings</p>
                    </SheetItem>
                </div>
                <SheetFooter className="flex flex-row items-center">
                    <a
                        className="w-1/2 h-20"
                        href="https://github.com/vaitosoi/simple-docker-dashboard/">
                        <SheetItem
                            className="p-1 justify-center gap-2 flex flex-col items-center"
                        >
                            <GitHub className="size-10" />
                            <p>GitHub</p>
                        </SheetItem>
                    </a>
                    <SheetItem
                        className="w-1/2 h-20 gap-1 p-1 justify-center flex flex-col items-center"
                        onClick={() => {
                            localStorage.setItem("token", "");
                            localStorage.setItem("username", "");
                            navigatorWithTransition("/login");
                        }}
                    >
                        <LogOut className="size-8" />
                        <p>Logout</p>
                    </SheetItem>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function SheetItem({ className, children, ...prop }: ComponentProps<"div">) {
    return <div
        className={cn("flex gap-3 items-center opacity-80 hover:opacity-100 hover:bg-gray-300 p-4 pl-3 rounded-md text-xl cursor-pointer", className)}
        {...prop}
    >
        {children}
    </div>;
}
