import { Container, Cpu, MemoryStick, Play, Square, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import Logs from "@/components/Container/Logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Inspect from "@/components/Container/Inspect";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { error, info, success } from "@/hooks/toasts";
import { HuhError, HuhWhale, Loading, Whale } from "@/components/ui/whale";
import Top from "@/components/Container/Top";
import { type APIContainer } from "@/lib/typing";

export default function () {
    const token = localStorage.getItem('token');
    const navigator = useNavigate();
    const [containerExist, setContainerExist] = useState<boolean>(null);
    const [status, setStatus] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);
    const { id } = useParams();

    useEffect(() => void checkContainerExist(), []);
    async function checkContainerExist() {
        if (!token)
            navigator('/login');
        try {
            const container = await api.get<APIContainer>(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setContainerExist(true);
            setStatus(container.data.status);
            setName(container.data.name);
        } catch (e) {
            if (e instanceof AxiosError && e.status == 404)
                return setContainerExist(false);

            console.error(e);
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    const refreshInterval = useRef(null);
    const [cpu, setCpu] = useState<number>();
    const [memory, setMemory] = useState<number>();
    async function getMetrics() {
        if (!containerExist) return;
        try {
            const response = await api.get<{ cpu: number, memory: number }>(`/docker/resource?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setCpu(response.data.cpu);
            setMemory(response.data.memory);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 404)
                return setContainerExist(false);

            setErrored(true);
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }
    useEffect(() => { 
        if (containerExist) {
            refreshInterval.current = setInterval(() => void getMetrics(), 5000);
            return () => clearInterval(refreshInterval.current);
        }
    }, [containerExist]);

    const [reloadLogs, setReloadLogs] = useState<boolean>(false);

    async function start(id: string) {
        try {
            setIsRunningCommand(true);
            info("Starting container...");
            await api.post(`/docker/start?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Started container");
            setStatus("running");
            setIsRunningCommand(false);
            setReloadLogs(!reloadLogs);
        } catch {
            setIsRunningCommand(false);
            error("Can't start container D:");
        }
    }

    async function stop(id: string) {
        try {
            info("Stopping container...");
            setIsRunningCommand(true);
            await api.post(`/docker/stop?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Stopped container");
            setStatus("exited");
            setIsRunningCommand(false);
        } catch {
            setIsRunningCommand(false);
            error("Can't stop container D:");
        }
    }

    async function kill(id: string) {
        try {
            info("Killing container...");
            setIsRunningCommand(true);
            await api.post(`/docker/kill?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Killed container");
            setStatus("exited");
            setIsRunningCommand(false);
        } catch {
            setIsRunningCommand(false);
            error("Can't kill container D:");
        }
    }

    async function restart(id: string) {
        try {
            info("Restarting container...");
            setIsRunningCommand(true);
            await api.post(`/docker/restart?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Restarted container");
            setStatus("running");
            setIsRunningCommand(false);
            setReloadLogs(!reloadLogs);
        } catch {
            setIsRunningCommand(false);
            error("Can't restart container D:");
        }
    }

    return <>{
        !containerExist || errored
            ? <div className="w-screen h-screen flex">
                <div className="m-auto flex flex-col items-center">{
                    errored
                        ? <HuhError />
                        : containerExist === null
                            ? <Loading />
                            : <>
                                <HuhWhale className="size-50" />
                                <p className="text-3xl">Container <span className="font-bold">{id}</span> not exists</p>
                            </>
                }</div>
            </div>
            : <div className="h-screen w-screen">
                <div className="h-1/3 w-full flex">
                    <div className="flex ml-20 mt-auto mb-auto">
                        <Container className="w-40 h-40" color="#006eff" strokeWidth={1} />
                        <div className="mt-7 ml-5">
                            <p className="text-5xl font-semibold">{name}</p>
                            <p className="text-2xl mt-1 ml-1">View your container's detail</p>
                        </div>
                    </div>
                    <div className="mt-auto mb-auto ml-auto mr-10">
                        <p className="font-bold text-3xl">📊 Resource usages</p>
                        {status == "running"
                            ? <div className="flex flex-row items-center text-2xl mt-2">
                            <Cpu className="size-8" strokeWidth={1.5} />
                            {cpu
                                ? <p className="ml-2">{cpu.toFixed(2)} %</p>
                                : <>
                                    <Whale className="ml-2 size-10 animate-spin" />
                                    <p className="ml-1">Loading...</p>
                                </>
                            }
                            <MemoryStick className="ml-5 size-8" strokeWidth={1.5} />
                            {memory
                                ? <p className="ml-2">{(memory * 1024).toFixed(2)} MB</p>
                                : <>
                                    <Whale className="ml-2 size-10 animate-spin" />
                                    <p className="ml-1">Loading...</p>
                                </>
                            }
                        </div>
                        : <div></div>
                        }
                        <p className="mt-5 font-bold text-3xl">⚙️ Actions</p>
                        <div className="flex flex-row gap-5 mt-2">
                            {isRunningCommand ? (
                                <Whale className="size-8 animate-spin" />
                            ) : (
                                <>
                                    {status === "running" ? (
                                        <div
                                            className="flex items-center gap-2 rounded cursor-pointer text-black hover:text-red-500 transition-colors"
                                            onClick={() => stop(id)}
                                        >
                                            <Square className="size-7" />
                                            Stop
                                        </div>
                                    ) : (
                                        <div
                                            className="flex items-center gap-2 rounded cursor-pointer text-black hover:text-green-500 transition-colors"
                                            onClick={() => start(id)}
                                        >
                                            <Play className="size-7" />
                                            Start
                                        </div>
                                    )}
                                    <div
                                        className={status === "running" 
                                            ? "flex items-center gap-2 rounded cursor-pointer text-black hover:text-blue-500 transition-colors" 
                                            : "flex items-center gap-2 rounded text-gray-400 cursor-not-allowed"
                                        }
                                        onClick={() => status === "running" && restart(id)}
                                    >
                                        <RefreshCw className="size-7" />
                                        Restart
                                    </div>
                                    <div
                                        className={status === "running" 
                                            ? "flex items-center gap-2 rounded cursor-pointer text-black hover:text-red-500 transition-colors" 
                                            : "flex items-center gap-2 rounded text-gray-400 cursor-not-allowed"
                                        }
                                        onClick={() => status === "running" && kill(id)}
                                    >
                                        <Square className="size-7" />
                                        Kill
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <Tabs className="h-2/3 flex flex-col w-full pl-10 pr-10" defaultValue="logs">
                    <TabsList className="h-[5%]">
                        <TabsTrigger value="logs"><p className="text-lg">Logs</p></TabsTrigger>
                        <TabsTrigger value="inspect"><p className="text-lg">Inspect</p></TabsTrigger>
                        <TabsTrigger value="top"><p className="text-lg">Proccess</p></TabsTrigger>
                    </TabsList>
                    <TabsContent className="h-[90%]" value="logs"><Logs id={id} reload={reloadLogs} /></TabsContent>
                    <TabsContent className="h-[90%]" value="inspect"><Inspect id={id} /></TabsContent>
                    <TabsContent className="h-[90%]" value="top"><Top id={id} /></TabsContent>
                </Tabs>
            </div>
    }</>;
}