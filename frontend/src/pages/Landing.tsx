import { Container } from "lucide-react";
import { useNavigate } from "react-router";
import api from "@/lib/api";
import { useEffect } from "react";


export default function () {
    const navigator = useNavigate();
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) navigator("/login");
    }, []);

    return <>{
        !token
            ? <></>
            : <div className="flex flex-col items-center">
                <p className="mt-30 text-9xl">🐋</p>
                <p className="text-6xl mt-5 font-bold">Welcome back :D</p>
                <p className="text-2xl mt-2 ">This is a simple Docker Dashboard, choose where you want to go.</p>
                <div className="flex flex-row gap-5 mt-10">
                    <div
                        className="w-60 h-60 flex flex-col items-center rounded-md border-2 hover:bg-gray-100"
                        onClick={() => navigator("/containers", { viewTransition: true })}
                    >
                        <Container strokeWidth={1} className="h-40 w-40 mt-4" />
                        <p className="text-2xl">Container</p>
                    </div>
                    <div
                        className="w-60 h-60 flex flex-col items-center rounded-md border-2 hover:bg-gray-100"
                        onClick={() => navigator("/containers", { viewTransition: true })}
                    >
                        <Container strokeWidth={1} className="h-40 w-40 mt-4" />
                        <p className="text-2xl">Container</p>
                    </div><div
                        className="w-60 h-60 flex flex-col items-center rounded-md border-2 hover:bg-gray-100"
                        onClick={() => navigator("/containers", { viewTransition: true })}
                    >
                        <Container strokeWidth={1} className="h-40 w-40 mt-4" />
                        <p className="text-2xl">Container</p>
                    </div><div
                        className="w-60 h-60 flex flex-col items-center rounded-md border-2 hover:bg-gray-100"
                        onClick={() => navigator("/containers", { viewTransition: true })}
                    >
                        <Container strokeWidth={1} className="h-40 w-40 mt-4" />
                        <p className="text-2xl">Container</p>
                    </div>
                </div>
            </div>
    }</>;
}