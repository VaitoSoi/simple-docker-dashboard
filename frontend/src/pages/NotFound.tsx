import { HuhWhale } from "@/components/ui/whale";
import { useRef, useState } from "react";

export default function () {
    const [warningLevel, setWarnLevel] = useState<number>(0);
    const interval = useRef(null);

    return <div className="w-screen h-screen flex ">
        <div className="text-4xl m-auto flex flex-col items-center">
            <HuhWhale className="size-70" />
            <p>Uhm, this page is not exist.</p>
            <p>Please go back 🥺</p>
        </div>
    </div>;
}