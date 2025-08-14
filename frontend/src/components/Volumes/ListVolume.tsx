import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { APIVolume } from "@/lib/typing";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Trash2
} from "lucide-react";
import { HuhError, Loading } from "@/components/ui/icon";
import { error, success } from "@/hooks/toasts";
import { useNavigate } from "react-router";

interface Volume extends APIVolume {
    using: string[] | undefined
}

export default function () {
    const token = localStorage.getItem("token");

    const [fetched, setFetched] = useState<boolean>(false);

    const [containers, setContainers] = useState<Record<string, any>[] | false>(null);
    const [volumes, setVolumes] = useState<Volume[]>([]);

    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

    useEffect(() => void getContainers(), []);
    async function getContainers() {
        try {
            const response = await api.get<Record<string, any>[]>(
                `/docker/containers?show_all=True&raw=True`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setContainers(response.data);
        } catch (e) {
            if (e instanceof AxiosError && e.status == 403)
                return setContainers(false);
            setErrored(true);
            console.error(e);
            if (e instanceof Error)
                error(e.message);
        }
    }

    useEffect(() => void getVolumes(), [containers]);
    async function getVolumes() {
        if (containers == null) return;
        try {
            setFetched(false);

            const response = await api.get<APIVolume[]>(
                `/docker/volumes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            const volumes: Volume[] = [];
            if (containers)
                for (const volume of response.data)
                    volumes.push({
                        ...volume,
                        using: containers.filter((container) =>
                            container["Mounts"]
                                .filter((mount: Record<string, string>) =>
                                    mount["Type"] == "volume" && mount["Name"] == volume.id
                                )
                                .length
                        ).map(container => container["Name"]?.slice(1) || container["Id"])
                    });

            setFetched(true);
            setVolumes(volumes);
            setIsRunningCommand(false);
        } catch (err) {
            setErrored(true);
            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    async function remove(id: string) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/volume?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Removed volume");
            getVolumes();
        } catch {
            setIsRunningCommand(false);
            error("Can't remove volume D:");
        }
    }

    async function prune() {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/volume/prune`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Pruned volumes`);
            getVolumes();
        } catch (err) {
            setIsRunningCommand(false);
            error("Can't prune volumes D:");
        }
    }

    const table = useReactTable<Volume>({
        columns: [
            {
                id: "id",
                header: "ID",
                accessorKey: "id",
                cell: ({ getValue }) => <a
                    href={`/volume/${getValue()}`}
                    className="text-blue-500 hover:underline"
                >{getValue()}</a>
            },
            {
                id: "using",
                header: "Using this volume",
                cell: ({ row }) =>
                    <div className="flex flex-row items-center gap-1">
                        {row.original.using
                            .slice(0, 3)
                            .map((container) =>
                                <a className="text-blue-500 hover:underline" href={`/container/${container}`}>
                                    {container}
                                </a>
                            )}
                        {row.original.using.length > 3 && "..."}
                    </div>
            },
            {
                id: "action",
                header: "Action",
                cell: ({ row }) => isRunningCommand
                    ? <RefreshCw className="animate-spin" />
                    : <Button
                        variant="ghost"
                        className={
                            !row.original.using.length
                                ? "hover:text-red-500"
                                : "hover:text-gray-400"
                        }
                        onClick={() => !row.original.using.length && remove(row.original.id)}
                    >
                        <Trash2 className="size-6" />
                    </Button>
            }
        ],
        data: volumes,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });



    return <>{
        errored
            ? <div className="rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div className="flex flex-col gap-5">
                <div className="ml-auto flex flex-row items-center gap-5">
                    <div className="flex flex-row">
                        <Button
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => prune()}
                        >
                            <Trash2 />
                            Prune unused
                        </Button>
                    </div>
                    <div className="flex flex-row items-center">
                        <Button variant="outline"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        ><ChevronLeft /> Previous</Button>
                        <p className="ml-2 mr-3 text-lg">{table.getState().pagination.pageIndex + 1}/{table.getPageCount()}</p>
                        <Button variant="outline"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        ><ChevronRight /> Next</Button>
                    </div>
                </div>
                <div className="rounded-md border p-4 pr-6 pl-6">
                    <Table>
                        <TableHeader className="text-xl">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className={`w-1/${headerGroup.headers.length}`}>
                                    {headerGroup.headers.map((header) =>
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody className="text-xl">
                            {!fetched || !table.getRowModel().rows?.length
                                ? (
                                    <TableRow>
                                        <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">{
                                            !fetched
                                                ? <div className="m-20"><Loading /></div>
                                                : <div className="m-20">
                                                    <p className="text-center text-8xl m-4">🔍</p>
                                                    <p className="text-center text-2xl">No volume found</p>
                                                </div>
                                        }</TableCell>
                                    </TableRow>
                                )
                                : (
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
                            }
                        </TableBody>
                    </Table>
                </div>
            </div>
    }</>;
}