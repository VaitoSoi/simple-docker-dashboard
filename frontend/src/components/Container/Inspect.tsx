import { error } from "@/hooks/toasts";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { HuhError } from "../ui/icon";

export default function ({ id }: { id: string }) {
    const token = localStorage.getItem("token");
    const [inspectInfo, setInspectInfo] = useState<string[]>(null);
    const [errored, setErrored] = useState<boolean>(false);

    useEffect(() => void getInfo(), []);
    async function getInfo() {
        try {
            const response = await api.get<Record<string, any>>(`/docker/container/inspect?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setInspectInfo(JSON.stringify(response.data, null, 4).split("\n"));
        } catch (err) {
            setErrored(true);
            if (err instanceof AxiosError && err.status == 403)
                return error("You can't see this content D:");
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    return <>{
        errored
            ? <div className="rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div className="w-full h-full p-4 bg-gray-800 border rounded-md overflow-scroll">
                {inspectInfo?.map((line) =>
                    <p className="text-white font-mono whitespace-pre">{line}</p>
                )}
            </div>
    }</>;
}