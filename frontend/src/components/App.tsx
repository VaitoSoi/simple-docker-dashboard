import type { PropsWithChildren } from "react";
import Navigation from "./Navigation/Navigation";
import "../index.css";
import { Toaster } from "@/components/ui/sonner";

export function WithNavigationBar({ children }: PropsWithChildren) {
    return (
        <div className="flex h-screen">
            <Navigation />
            {children}
        </div>
    );
}

export function WithToast({ children }: PropsWithChildren) {
    return <>
        {children}
        <Toaster/>
    </>;
}

export function Combine({ children }: PropsWithChildren) {
    return <div className="flex h-screen">
        <Navigation />
        <Toaster />
        {children}
    </div>;
}

