import { Container } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import Logs from "@/components/Container/Logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Inspect from "@/components/Container/Inspect";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { error } from "@/hooks/toasts";
import { HuhError, HuhWhale, Loading } from "@/components/ui/icon";
import Top from "@/components/Container/Top";
import { type APIContainer } from "@/lib/typing";
import RightPannel from "@/components/Container/RightPannel";

export default function () {
    const token = localStorage.getItem('token');
    const navigator = useNavigate();
    const [containerExist, setContainerExist] = useState<boolean>(null);
    const [name, setName] = useState<string>("");
    const [errored, setErrored] = useState<boolean>(false);
    const { id } = useParams();

    useEffect(() => void checkContainerExist(), []);
    async function checkContainerExist() {
        if (!token)
            navigator('/login');
        try {
            const response = await api.get<APIContainer>(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setContainerExist(true);
            setName(response.data.name);
        } catch (e) {
            if (e instanceof AxiosError) {
                if (e.status == 404)
                    return setContainerExist(false);

                else if (e.status == 401) 
                    return navigator("/login");
            }

            console.error(e);
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    const [reloadLogs, setReloadLogs] = useState<boolean>(false);

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
                    <RightPannel id={id} reloadLogsState={[reloadLogs, setReloadLogs]} />
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