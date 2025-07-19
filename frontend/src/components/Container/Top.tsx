import { error } from "@/hooks/toasts";
import api from "@/lib/api";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { HuhError } from "../ui/whale";
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
            const response = await api.get<Top[]>(`/docker/top?id=${id}`, {
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

    const table = useReactTable<Top>({
        columns: [
            {
                id: "UID",
                header: "UID",
                accessorKey: "UID"
            },
            {
                id: "PID",
                header: "PID",
                accessorKey: "PID"
            },
            {
                id: "PPID",
                header: "PPID",
                accessorKey: "PPID"
            },
            {
                id: "C",
                header: "C",
                accessorKey: "C"
            },
            {
                id: "STIME",
                header: "STIME",
                accessorKey: "STIME"
            },
            {
                id: "TTY",
                header: "TTY",
                accessorKey: "TTY"
            },
            {
                id: "TIME",
                header: "TIME",
                accessorKey: "TIME"
            },
            {
                id: "CMD",
                header: "CMD",
                accessorKey: "CMD"
            },
        ],
        data: data,
        getCoreRowModel: getCoreRowModel()
    });
    return <>{

        errored
            ? <div className="rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div className="h-11/12 w-full rounded-md border p-4 pr-6 pl-6 overflow-scroll bg-gray-800 text-white">
                <Table>
                    <TableHeader className="text-xl font-mono">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className={`w-1/${headerGroup.headers.length}`}>
                                {headerGroup.headers.map((header) =>
                                    <TableHead key={header.id} className="text-white">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                    </TableHead>
                                )}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="text-xl font-mono">
                        {table.getRowModel().rows?.length
                            ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )
                            : (
                                <TableRow>
                                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                                        <div className="m-20">
                                            <p className="text-center text-8xl m-4">🔍</p>
                                            <p className="text-center text-2xl">No container found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        }
                    </TableBody>
                </Table>
            </div>
    }</>;
}