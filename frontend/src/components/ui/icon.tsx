import whale from "@/assets/logo.svg";
import angy from "@/assets/angy.svg";
import angy_wand from "@/assets/angy_wand.svg";
import huh from "@/assets/huh.svg";
import github from "@/assets/github.svg";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";


export function Whale({ ...props }: ComponentProps<"img">) {
    return <img src={whale} {...props} />;
}

export function Loading({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("flex flex-col items-center", className)} {...props}>
        <Whale className="size-50 animate-spin" />
        <p className="text-4xl mt-15">Loading...</p>
    </div>;
}

export function AngyWhale({ ...props }: ComponentProps<"img">) {
    return <img src={angy} {...props} />;
}

export function AngyWhaleWand({ ...props }: ComponentProps<"img">) {
    return <img src={angy_wand} {...props} />;
}


export function Forbidden({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("flex flex-col items-center", className)} {...props}>
        <AngyWhale className="size-50" />
        <p className="text-4xl font-semibold">You are not allow to see this </p>
    </div>;
}

export function HuhWhale({ ...props }: ComponentProps<"img">) {
    return <img src={huh} {...props} />;
}

export function Huh({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("flex flex-col items-center", className)} {...props}>
        <Huh className="size-50" />
        <p className="text-4xl font-semibold">Huh ?</p>
    </div>;
}

export function HuhError({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("flex flex-col items-center", className)} {...props}>
        <HuhWhale className="size-50" />
        <p className="text-4xl">Error occured when connect to API</p>
    </div>;
}

export function GitHub({ ...props }: ComponentProps<"img">) {
    return <img src={github} {...props} />;
}
