import { useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { useWebSocket } from "react-use-websocket/src/lib/use-websocket";
import { ReadyState } from "react-use-websocket";
import api from "@/lib/api";
import type { APIUser } from "@/lib/typing";
import { Permission } from "@/lib/enums";
import { error } from "@/hooks/toasts";
import { Forbidden, Loading } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";

export default function ({ id, reload }: { id: string, reload: boolean }) {
    const token = localStorage.getItem("token");

    const dumpItem = useRef(null);
    const chunks = useRef<string[]>([]);
    const [url, setUrl] = useState<string>("");
    const [logs, setLogs] = useState<string[]>([]);
    const { lastMessage, getWebSocket, readyState } = useWebSocket(url);
    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.data == "SimpleDockerDashboard_Ping") return;
        chunks.current.push(lastMessage.data);
    }, [lastMessage]);
    const [errored, setErrored] = useState<boolean>(false);

    const logViewer = useRef(null);
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const scrollToBottom = () =>
        logViewer.current &&
        "scrollIntoView" in logViewer.current &&
        logViewer.current.scrollIntoView?.({ behavior: "smooth" });

    const [allowToSee, setAllowToSee] = useState<boolean | null>(null);

    useEffect(() => void getPermission(), []);
    async function getPermission() {
        try {
            await api.get<APIUser>(
                `/user/has_permissions?permissions=${Permission.SeeLogs}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setAllowToSee(true);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                setAllowToSee(false);

            else {
                console.error(err);
                setErrored(true);
                if (err instanceof Error)
                    error(err.message);
            }
        }
    }
    useEffect(() => {
        dumpItem.current = setInterval(() => {
            if (chunks.current.length)
                setLogs((oldLogs) => [...oldLogs, ...chunks.current]);
            chunks.current = [];
        }, 100);

        return () =>
            clearInterval(dumpItem.current);
    }, []);
    useEffect(() => {
        if (autoScroll && !!logViewer.current)
            scrollToBottom();
    }, [logs]);
    useEffect(() => {
        if (autoScroll)
            scrollToBottom();
    }, [autoScroll]);
    useEffect(() => {
        if (!allowToSee) return;
        setUrl(
            "http://localhost:8000/docker/logs" +
            `?id=${id}` +
            `&token=${token}`
        );
        return () => getWebSocket()?.close();
    }, [allowToSee]);
    useEffect(() => {
        if (readyState == ReadyState.CLOSED)
            chunks.current.push("# Disconnected");
    }, [readyState]);
    useEffect(() => {
        setUrl("");
        setLogs([]);
        setTimeout(() =>
            setUrl(
                "http://localhost:8000/docker/logs" +
                `?id=${id}` +
                `&token=${token}`
            )
        , 0);
    }, [reload]);

    return <>{
        !allowToSee
            ? <div className="flex w-full h-11/12 rounded-md border">{
                allowToSee == null
                    ? <Loading className="m-auto" />
                    : <Forbidden className="m-auto" />
            }</div>
            : <div className="h-full w-full">
                <div className="flex flex-row items-center">
                    <Switch
                        checked={autoScroll}
                        onCheckedChange={(checked) => setAutoScroll(checked)}
                    />
                    <p className="text-lg ml-2">Stick to the bottom</p>
                </div><div className="bg-gray-800 w-full h-11/12 border rounded-md p-4 overflow-scroll">
                    {logs.map(log =>
                        <p className="text-white whitespace-nowrap font-mono">
                            {log}
                        </p>
                    )}
                    <div ref={logViewer} />
                </div>
            </div>
    }</>;
}