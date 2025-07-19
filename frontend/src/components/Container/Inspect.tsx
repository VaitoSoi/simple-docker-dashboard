import api from "@/lib/api";
import { useEffect, useState } from "react";

export default function ({ id }: { id: string }) {
    const token = localStorage.getItem("token");
    const [inspectInfo, setInspectInfo] = useState<string[]>(null);
    const [errored, setErrored] = useState<boolean>(false);

    useEffect(() => void getInfo(), []);
    async function getInfo() {
        try {
            const response = await api.get<Record<string, any>>(`/docker/inspect?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setInspectInfo(JSON.stringify(response.data, null, 4).split("\n"));
        } catch (error) {
            setErrored(true);
        }
    }

    return <div className="w-full h-[95%] p-4 bg-gray-800 border rounded-md overflow-scroll">
        {inspectInfo?.map((line) =>
            <p className="text-white font-mono whitespace-pre">{line}</p>
        )}
    </div>;
}