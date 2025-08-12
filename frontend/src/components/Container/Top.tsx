import { error } from "@/hooks/toasts";
import api from "@/lib/api";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { HuhError } from "../ui/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface Top {
    UID: string,
    PID: string,
    PPID: string,
    C: string,
    STIME: string,
    TTY: string,
    TIME: string,
    CMD: string,
}

export default function ({ id }: { id: string }) {
    const token = localStorage.getItem('token');
    const [data, setData] = useState<Top[]>([]);
    const [errored, setErrored] = useState<boolean>(false);

    useEffect(() => void getData(), []);
    async function getData() {
        try {
            const response = await api.get<Top[]>(`/docker/container/top?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setData(response.data);
        } catch (e) {
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    return <>{
        errored
            ? <div className="rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div className="h-11/12 w-full rounded-md border p-4 pr-6 pl-6 bg-gray-800 text-white">
                <Table className="overflow-scroll">
                    <TableHeader className="text-xl font-mono">
                        <TableHead className="text-white">UID</TableHead>
                        <TableHead className="text-white">PID</TableHead>
                        <TableHead className="text-white">PPID</TableHead>
                        <TableHead className="text-white">C</TableHead>
                        <TableHead className="text-white">STIME</TableHead>
                        <TableHead className="text-white">TTY</TableHead>
                        <TableHead className="text-white">TIME</TableHead>
                        <TableHead className="text-white">CMD</TableHead>
                    </TableHeader>
                    <TableBody className="text-xl font-mono">
                        {data.map((process) => <TableRow>
                            <TableCell>{process.UID}</TableCell>
                            <TableCell>{process.PID}</TableCell>
                            <TableCell>{process.PPID}</TableCell>
                            <TableCell>{process.C}</TableCell>
                            <TableCell>{process.STIME}</TableCell>
                            <TableCell>{process.TTY}</TableCell>
                            <TableCell>{process.TIME}</TableCell>
                            <TableCell>{process.CMD}</TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
    }</>;
}