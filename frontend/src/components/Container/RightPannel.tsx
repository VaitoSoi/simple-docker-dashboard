import { error, info, success } from "@/hooks/toasts";
import api from "@/lib/api";
import type { APIContainer } from "@/lib/typing";
import { Cpu, MemoryStick, Play, RefreshCw, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AngyWhale, Whale } from "../ui/icon";
import { useNavigate } from "react-router";
import { AxiosError } from "axios";

export default function ({ id, reloadLogsState }: { id: string, reloadLogsState: ReturnType<typeof useState<boolean>> }) {
    const navigator = useNavigate();

    const token = localStorage.getItem('token');
    const [isRunning, setIsRunning] = useState<boolean>();
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);
    const [allowToSee, setAllowToSee] = useState<boolean>(true);

    useEffect(() => void checkContainerExist(), []);
    async function checkContainerExist() {
        try {
            const container = await api.get<APIContainer>(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setIsRunning(container.data.status == "running");
        } catch (e) {
            console.error(e);
            if (e instanceof Error)
                error(e.message);
        }
    }

    const refreshInterval = useRef(null);
    const [cpu, setCpu] = useState<number>();
    const [memory, setMemory] = useState<number>();
    async function getMetrics() {
        if (!isRunning) return;
        try {
            const response = await api.get<{ cpu: number, memory: number }>(`/docker/container/resource?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setCpu(response.data.cpu);
            setMemory(response.data.memory);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403) {
                setAllowToSee(false);
                clearInterval(refreshInterval.current);
                return;
            }
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }
    useEffect(() => {
        getMetrics();
        refreshInterval.current = setInterval(() => void getMetrics(), 5000);
        return () => clearInterval(refreshInterval.current);
    }, []);

    const [reloadLogs, setReloadLogs] = reloadLogsState;

    async function runCommand(
        command: () => PromiseLike<any>
    ) {
        try {
            setIsRunningCommand(true);
            await command();
            setIsRunningCommand(false);
        } catch (err) {
            setIsRunningCommand(false);
            if (err instanceof AxiosError && err.status == 403)
                error("You can't execute this command");
            else {
                console.error(err);
                if (err instanceof Error)
                    error(err.message);
            }
        }
    }

    const start = (id: string) => runCommand(async () => {
        info("Starting container...");
        await api.post(`/docker/container/start?id=${id}`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        success("Started container");
        setIsRunning(true);
        setReloadLogs(!reloadLogs);
    });

    const stop = (id: string) => runCommand(async () => {
        info("Stopping container...");
        await api.post(`/docker/container/stop?id=${id}`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        success("Stopped container");
        setIsRunning(false);
    });

    const kill = (id: string) => runCommand(async () => {
        info("Killing container...");
        await api.post(`/docker/container/kill?id=${id}`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        success("Killed container");
        setIsRunning(false);
    });

    const restart = (id: string) => runCommand(async () => {
        info("Restarting container...");
        await api.post(`/docker/container/restart?id=${id}`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        success("Restarted container");
        setIsRunning(true);
        setReloadLogs(!reloadLogs);
    });


    const remove = (id: string) => runCommand(async () => {
        await api.delete(`/docker/container?id=${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        success("Removed container");
        navigator("/containers");
    });

    return <div className="w-150 mt-auto mb-auto ml-auto mr-10">
        <p className="font-bold text-3xl">📊 Resource usages</p>
        {!allowToSee
            ? <div className="flex flex-row items-center">
                <AngyWhale className="size-10" />
                <p className="text-2xl ml-1">You are not allow to see metrics</p>
            </div>
            : isRunning
                ? <div className="flex flex-row items-center text-2xl mt-2">
                    <div className="w-50 flex flex-row items-center text-2xl">
                        <Cpu className="size-8" strokeWidth={1.5} />
                        {cpu
                            ? <p className="ml-2">{cpu.toFixed(2)} %</p>
                            : <>
                                <Whale className="ml-2 size-10 animate-spin" />
                                <p className="ml-1">Loading...</p>
                            </>
                        }
                    </div>
                    <div className="w-50 flex flex-row items-center text-2xl">
                        <MemoryStick className="size-8" strokeWidth={1.5} />
                        {memory
                            ? <p className="ml-2">{(memory * 1024).toFixed(2)} MB</p>
                            : <>
                                <Whale className="ml-2 size-10 animate-spin" />
                                <p className="ml-1">Loading...</p>
                            </>
                        }
                    </div>
                </div>
                : <div className="flex flex-row items-center mt-2">
                    <AngyWhale className="size-10" />
                    <p className="text-2xl ml-2">Container is not running</p>
                </div>
        }
        <p className="mt-5 font-bold text-3xl">⚙️ Actions</p>
        <div className="flex flex-row items-center gap-5 mt-2 text-2xl">
            {isRunningCommand
                ? <div className="flex flex-row items-center">
                    <Whale className="size-10 animate-spin" />
                    <p className="ml-2">Running operation...</p>
                </div>
                : (
                    <>
                        {isRunning
                            ? <div
                                className="flex items-center gap-2 rounded cursor-pointer text-black hover:text-red-500 transition-colors"
                                onClick={() => stop(id)}
                            >
                                <Square className="size-7" />
                                Stop
                            </div>
                            : <div
                                className="flex items-center gap-2 rounded cursor-pointer text-black hover:text-green-500 transition-colors"
                                onClick={() => start(id)}
                            >
                                <Play className="size-7" />
                                Start
                            </div>
                        }
                        <div
                            className={
                                "flex items-center gap-2 rounded " +
                                (isRunning
                                    ? "cursor-pointer text-black hover:text-blue-500 transition-colors"
                                    : "text-gray-400 cursor-not-allowed"
                                )
                            }
                            onClick={() => isRunning && restart(id)}
                        >
                            <RefreshCw className="size-7" />
                            Restart
                        </div>
                        <div
                            className={"flex items-center gap-2 rounded " + (isRunning
                                ? "cursor-pointer text-black hover:text-red-500 transition-colors"
                                : "text-gray-400 cursor-not-allowed"
                            )}
                            onClick={() => isRunning && kill(id)}
                        >
                            <Square className="size-7" />
                            Kill
                        </div>
                        <div
                            className={"flex items-center gap-2 rounded " + (!isRunning
                                ? "cursor-pointer text-black hover:text-red-500 transition-colors"
                                : "text-gray-400 cursor-not-allowed"
                            )}
                            onClick={() => !isRunning && remove(id)}
                        >
                            <Trash2 className="size-7" />
                            Remove
                        </div>
                    </>
                )}
        </div>
    </div>;
}