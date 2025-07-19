import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { Cpu, MemoryStick } from "lucide-react";
import { AngyWhale, HuhWhale, Whale } from "../ui/whale";

interface ResourceUsage {
    docker: number,
    system: number,
    total: number,
}

export default function () {
    const [memory, setMemory] = useState<ResourceUsage>();
    const [cpu, setCpu] = useState<ResourceUsage>();
    const [errored, setErrored] = useState<boolean>(false);

    const token = localStorage.getItem("token");

    const refreshInterval = useRef(null);
    const clearRefreshInterval = () => {
        if (refreshInterval.current != null)
            clearInterval(refreshInterval.current);
        refreshInterval.current = null;
    };

    async function getResourceUsage() {
        try {
            const data = await api.get("/docker/resource", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMemory(data.data.memory);
            setCpu(data.data.cpu);
        } catch (e) {
            setErrored(true);
            clearRefreshInterval();
        }
    }
    useEffect(() => {
        refreshInterval.current = setInterval(() => { getResourceUsage(); }, 5000);
        return () => clearRefreshInterval();
    }, []);

    return <>{
        errored
            ?
            <div className="ml-50 rounded-md border p-5 pr-40 pl-40 flex flex-col items-center">
                <HuhWhale className="size-30" />
                <p className="text-center text-2xl">Error occured when connect to API</p>
            </div>
            : <div className="mt-6 ml-50">
                <p> <span className="text-3xl font-bold">📊 Resource Usage</span><span className="m-1" /><span className="text-2xl font">(Docker / System / Total)</span></p>
                <div className="text-2xl mt-5 flex flex-row items-center">
                    <div className="w-100 flex flex-row items-center">
                        <Cpu strokeWidth={1.5} className="h-12 w-12" />
                        <p className="ml-2">{
                            cpu
                                ? `${cpu.docker.toFixed(2)} / ${cpu.system.toFixed(2)} / ${cpu.total * 100} %`
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