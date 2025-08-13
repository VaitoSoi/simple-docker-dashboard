import { AngyWhale, AngyWhaleWand, HuhWhale } from "@/components/ui/icon";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

export default function () {
    const navigator = useNavigate();
    const [warnLevel, setWarnLevel] = useState<number>(0);
    const interval = useRef(null);

    useEffect(() => {
        interval.current = setInterval(() => {
            setWarnLevel((lastLevel) => lastLevel + 1);
        }, 5_000);
        return () => clearInterval(interval.current);
    }, []);
    useEffect(() => {
        if (warnLevel >= 4) {
            clearInterval(interval.current);
            setTimeout(() => navigator("/"), 500);
        }
    }, [warnLevel]);

    return <div className="w-screen h-screen flex ">
        <div className="text-4xl m-auto flex flex-col items-center">
            {warnLevel == 0
                ? <>
                    <HuhWhale className="size-70" />
                    <p>Uhm, this page is not exist.</p>
                    <p>Please go back 🥺</p>
                </>
                : warnLevel == 1 ?
                    <>
                        <AngyWhale className="size-70" />
                        <p>Go back</p>
                    </>
                    : warnLevel == 2
                        ? <>
                            <AngyWhale className="size-70" />
                            <p>I said "Go back"</p>
                        </>
                        : warnLevel == 3
                            ? <>
                                <AngyWhale className="size-80" />
                                <p className="font-bold">GO BACK</p>
                            </>
                            : <>
                                <AngyWhaleWand className="size-80" />
                                <p className="font-bold">AVADA KEDAVRA</p>
                            </>
            }
        </div>
    </div>;
}