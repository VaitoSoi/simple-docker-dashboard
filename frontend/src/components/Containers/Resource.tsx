import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { Cpu, MemoryStick } from "lucide-react";
import { AngyWhale, HuhWhale, Whale } from "../ui/icon";
import { AxiosError } from "axios";

interface ResourceUsage {
    docker: number,
    system: number,
    total: number,
}

export default function () {
    const [memory, setMemory] = useState<ResourceUsage>();
    const [cpu, setCpu] = useState<ResourceUsage>();
    const [errored, setErrored] = useState<boolean>(false);
    const [allowToSee, setAllowToSee] = useState<boolean>(true);

    const token = localStorage.getItem("token");

    const refreshInterval = useRef(null);
    const clearRefreshInterval = () => {
        if (refreshInterval.current != null)
            clearInterval(refreshInterval.current);
        refreshInterval.current = null;
    };

    async function getResourceUsage() {
        try {
            const data = await api.get("/docker/container/resource", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMemory(data.data.memory);
            setCpu(data.data.cpu);
        } catch (e) {
            if (e instanceof AxiosError && e.status == 403)
                setAllowToSee(false);
            else
                setErrored(true);
            clearRefreshInterval();
        }
    }
    useEffect(() => {
        getResourceUsage();
        refreshInterval.current = setInterval(() => void getResourceUsage(), 5000);
        return () => clearRefreshInterval();
    }, []);

    return <>{
        errored || !allowToSee
            ? <div className="rounded-md border p-5 pr-40 pl-40 flex flex-col items-center">
                {!allowToSee
                    ? <>
                        <AngyWhale className="size-30" />
                        <p className="text-center text-2xl">You are not allow to see metrics</p>
                    </>
                    : <>
                        <HuhWhale className="size-30" />
                        <p className="text-center text-2xl">Error occured when connect to API</p>
                    </>
                }</div>
            : <div>
                <p> <span className="text-3xl font-bold">📊 Resource Usage</span><span className="text-2xl ml-2 font">(Docker / System / Total)</span></p>
                <div className="text-2xl mt-5 flex flex-row items-center gap-10">
                    <div className="flex flex-row items-center">
                        <Cpu strokeWidth={1.5} className="h-12 w-12" />
                        <p className="ml-2">{
                            cpu
                                ? `${cpu.docker.toFixed(2)} / ${cpu.system.toFixed(2)} / 100 %`
                                : <SpinningWhale />
                        }</p>
                    </div>
                    <div className="flex flex-row items-center">
                        <MemoryStick strokeWidth={1.5} className="h-12 w-12" />
                        <p className="ml-2">{
                            memory
                                ? `${memory.docker.toFixed(2)} / ${memory.system.toFixed(2)} / ${memory.total} (GB)`
                                : <SpinningWhale />
                        }</p>
                    </div>
                </div>
            </div>
    }</>;
}

function SpinningWhale() {
    return <div className="flex flex-row items-center">
        <Whale className="size-10 animate-spin" />
        <p className="ml-3">Loading...</p>
    </div>;
}