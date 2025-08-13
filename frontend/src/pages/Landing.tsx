import { Container, Database, Network, Scroll, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, type ComponentProps } from "react";
import { GitHub, Whale } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { AxiosError } from "axios";
import { error } from "@/hooks/toasts";
import api from "@/lib/api";

export default function () {
    const navigator = useNavigate();
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    useEffect(() => {
        if (!token) navigator("/login");
        checkMe();
    }, []);
    async function checkMe() {
        try {
            await api.get('/user/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (err) {
            if (err instanceof AxiosError && (err.status == 401 || err.status == 404))
                return navigator("/login");

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <>{
        !token
            ? <></>
            : <div className="w-screen h-screen flex">
                <div className="m-auto flex flex-col items-center">
                    <Whale className="size-50"/>
                    <p className="text-6xl mt-5">{
                        username
                            ? <>Welcome back, <span className="font-bold">{username}</span></>
                            : <span className="font-bold">Welcome back :D</span>
                    }</p>
                    <p className="text-2xl mt-2 ">This is a simple Docker Dashboard, choose where you want to go.</p>
                    <div className="flex flex-row gap-5 mt-10">
                        <NavigationItem navigator={navigator} path="/containers">
                            <Container strokeWidth={1} className="h-40 w-40 mt-4" />
                            <p className="text-2xl">Containers</p>
                        </NavigationItem>
                        <NavigationItem navigator={navigator} path="/images">
                            <Scroll strokeWidth={1} className="h-40 w-40 mt-4" />
                            <p className="text-2xl">Images</p>
                        </NavigationItem>
                        <NavigationItem navigator={navigator} path="/volumes"
                        >
                            <Database strokeWidth={1} className="h-40 w-40 mt-4" />
                            <p className="text-2xl">Volumes</p>
                        </NavigationItem>
                        <NavigationItem navigator={navigator} path="/networks">
                            <Network strokeWidth={1} className="h-40 w-40 mt-4" />
                            <p className="text-2xl">Networks</p>
                        </NavigationItem>
                    </div>
                </div>
            </div>
    }</>;
}

export function NavigationItem({ children, className, navigator, path, ...prop }: ComponentProps<"div"> & { navigator: ReturnType<typeof useNavigate>, path?: string }) {
    return <div
        className={cn("w-60 h-60 flex flex-col items-center rounded-md border-2 hover:bg-gray-100 dark:hover:bg-gray-300", className)}
        onClick={() => navigator(path || "/", { viewTransition: true })}
        {...prop}
    >
        {children}
    </div>;
}
