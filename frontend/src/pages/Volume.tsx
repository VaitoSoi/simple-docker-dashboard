import { Container } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { error } from "@/hooks/toasts";
import { HuhError, HuhWhale, Loading } from "@/components/ui/icon";
import type { APIVolume } from "@/lib/typing";
import EntryViewer from "@/components/Volume/EntryExplorer";

export default function () {
    const token = localStorage.getItem('token');
    const navigator = useNavigate();
    const [volumeExist, setVolumeExist] = useState<boolean>(null);
    const [name, setName] = useState<string>("");
    const [errored, setErrored] = useState<boolean>(false);
    const { id } = useParams();

    useEffect(() => void checkVolumeExist(), []);
    async function checkVolumeExist() {
        if (!token)
            navigator('/login');
        try {
            const response = await api.get<APIVolume>(`/docker/volume?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setVolumeExist(true);
            setName(response.data.id.length > 50 ? response.data.short_id : response.data.id);
        } catch (e) {
            if (e instanceof AxiosError) {
                if (e.status == 404)
                    return setVolumeExist(false);

                else if (e.status == 401)
                    return navigator("/login");
            }

            console.error(e);
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    return <>{
        !volumeExist || errored
            ? <div className="w-screen h-screen flex">
                <div className="m-auto flex flex-col items-center">{
                    errored
                        ? <HuhError />
                        : volumeExist === null
                            ? <Loading />
                            : <>
                                <HuhWhale className="size-50" />
                                <p className="text-3xl">Volume <span className="font-bold">{id}</span> not exists</p>
                            </>
                }</div>
            </div>
            : <div className="h-screen w-screen">
                <div className="h-1/4 mt-10 w-full flex">
                    <div className="flex ml-20 mt-auto mb-auto">
                        <Container className="w-40 h-40" color="#006eff" strokeWidth={1} />
                        <div className="mt-7 ml-5">
                            <p className="text-5xl font-semibold">{name}</p>
                            <p className="text-2xl mt-1 ml-1">View your volume's content</p>
                        </div>
                    </div>
                </div>
                <div className="h-2/3 flex flex-col w-full pl-10 pr-10">
                    <EntryViewer id={id} />
                </div>
            </div>
    }</>;
}