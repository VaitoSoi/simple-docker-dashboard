import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Container, PanelLeftOpen } from "lucide-react";
import type { PropsWithChildren } from "react";

export default function () {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <PanelLeftOpen className="fixed opacity-70 hover:opacity-100 mt-5 ml-5 size-8 " />
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader className="pb-0">
                    <SheetTitle className="font-bold text-xl">
                        Welcome back :D
                    </SheetTitle>
                    <SheetDescription className="text-lg">
                        Choose where you want to go
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4">
                    <SheetItem>
                        <Container className="size-8" />
                        <p>Container</p>
                    </SheetItem>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function SheetItem({ children, ...prop }: PropsWithChildren) {
    return <div 
        className="flex gap-3 items-center opacity-80 hover:opacity-100 hover:bg-gray-300 p-4 pl-3 rounded-md text-xl"
        {...prop}    
    >
        {children}
    </div>;
}
