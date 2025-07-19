import { Container, Cpu, MemoryStick } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import Logs from "@/components/Container/Logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Inspect from "@/components/Container/Inspect";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { error } from "@/hooks/toasts";
import { HuhError, HuhWhale, Loading, Whale } from "@/components/ui/whale";
import Top from "@/components/Container/Top";

interface ResourceUsage {
    using: number,
    total: number
}

export default function () {
    const token = localStorage.getItem('token');
    const navigator = useNavigate();
    const [containerExist, setContainerExist] = useState<boolean>(null);
    const [errored, setErrored] = useState<boolean>(false);
    const { id } = useParams();

    useEffect(() => void checkContainerExist(), []);
    async function checkContainerExist() {
        if (!token)
            navigator('/login');
        try {
            await api.get(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setContainerExist(true);
        } catch (e) {
            if (e instanceof AxiosError && e.status == 404)
                return setContainerExist(false);

            console.error(e);
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    const [cpu, setCpu] = useState<ResourceUsage>();
    const [memory, setMemory] = useState<ResourceUsage>();

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
                <div className="h-1/4 w-full flex">
                    <div className="flex ml-20 mt-auto mb-auto">
                        <Container className="w-40 h-40" color="#006eff" strokeWidth={1} />
                        <div className="mt-7 ml-5">
                            <p className="text-5xl font-semibold">Containers</p>
                            <p className="text-2xl mt-1 ml-1">View all your running containers</p>
                        </div>
                    </div>
                    <div className="mt-auto mb-auto ml-100">
                        <p className="font-bold text-3xl">📊 Resource usages</p>
                        <div className="flex flex-row items-center text-2xl mt-2">
                            <Cpu className="size-8" strokeWidth={1.5} />
                            {cpu
                                ? <p className="ml-2">{cpu.using} / ${cpu.total * 100} %</p>
                                : <>
                                    <Whale className="ml-2 size-10 animate-spin" />
                                    <p className="ml-1">Loading...</p>
                                </>
                            }
                            <MemoryStick className="ml-5 size-8" strokeWidth={1.5} />
                            {cpu
                                ? <p className="ml-2">{cpu.using} / ${cpu.total * 100} %</p>
                                : <>
                                    <Whale className="ml-2 size-10 animate-spin" />
                                    <p className="ml-1">Loading...</p>
                                </>
                            }
                        </div>
                        <p className="mt-5 font-bold text-3xl">⚙️ Actions</p>
                        
                    </div>
                </div>
                <Tabs className="h-3/4 flex flex-col w-full pl-10 pr-10" defaultValue="logs">
                    <TabsList className="h-[5%]">
                        <TabsTrigger value="logs"><p className="text-lg">Logs</p></TabsTrigger>
                        <TabsTrigger value="inspect"><p className="text-lg">Inspect</p></TabsTrigger>
                        <TabsTrigger value="top"><p className="text-lg">Proccess</p></TabsTrigger>
                    </TabsList>
                    <TabsContent className="h-[90%]" value="logs"><Logs id={id} /></TabsContent>
                    <TabsContent className="h-[90%]" value="inspect"><Inspect id={id} /></TabsContent>
                    <TabsContent className="h-[90%]" value="top"><Top id={id} /></TabsContent>
                </Tabs>
            </div>
    }</>;
}