import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import type { APIContainer, APINetwork } from "@/lib/typing";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    Link,
    RefreshCw,
    Trash2,
    Unlink
} from "lucide-react";
import { HuhError, Loading } from "@/components/ui/icon";
import { error, success } from "@/hooks/toasts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { AxiosError } from "axios";

export default function () {
    const token = localStorage.getItem("token");

    const [fetched, setFetched] = useState<boolean>(false);

    const [openingDialog, setOpeningDialog] = useState<string>("");

    const [networks, setNetworks] = useState<APINetwork[]>([]);

    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

    const [containers, setContainers] = useState<string[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState<string>("");
    const selectedContainers = useRef<string[]>([]);

    useEffect(() => void getContainers(), []);
    async function getContainers() {
        try {
            const response = await api.get<APIContainer[]>(
                `/docker/containers`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setContainers(response.data.map((container) => container.name || container.short_id));
        } catch (e) {
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    useEffect(() => void getNetworks(), []);
    async function getNetworks() {
        try {
            setFetched(false);

            const response = await api.get<APINetwork[]>(
                `/docker/networks`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const networks: APINetwork[] = [];
            for (const { id } of response.data) {
                const response = await api.get<APINetwork>(`/docker/network?id=${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                networks.push(response.data);
            }

            setFetched(true);
            setNetworks(networks);
            setIsRunningCommand(false);
        } catch (e) {
            setErrored(true);
            if (e instanceof Error)
                error(e.message);
        }
    }

    useEffect(() => {
        if (openingDialog == "") {
            setSelectedNetwork("");
            selectedContainers.current = [];
        }
    }, [openingDialog]);

    async function remove(id: string) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/network?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Removed network");
            getNetworks();
        } catch (err) {
            console.error(err);
            setIsRunningCommand(false);
            error("Can't remove network D:");
        }
    }

    async function connect() {
        try {
            setIsRunningCommand(true);
            for (const id of selectedContainers.current)
                await api.post(
                    `/docker/network/connect` +
                    `?network_id=${selectedNetwork}` +
                    `&container_id=${id}`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            success(`Connected container(s)`);
            getNetworks();
        } catch (err) {
            getNetworks();
            console.error(err);
            setIsRunningCommand(false);
            error("Can't connect container(s) D:");
        }
    }

    async function prune() {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/network/prune`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Pruned unused networks`);
            getNetworks();
        } catch (err) {
            console.error(err);
            setIsRunningCommand(false);
            error("Can't prune networks D:");
        }
    }

    async function disconnect() {
        try {
            setIsRunningCommand(true);
            for (const id of selectedContainers.current)
                await api.delete(
                    `/docker/network/disconnect` +
                    `?network_id=${selectedNetwork}` +
                    `&container_id=${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            success(`Disconnected container(s)`);
            getNetworks();
        } catch (err) {
            getNetworks();
            console.error(err);
            if (err instanceof AxiosError && err.status == 403)
                return error("You can't execute this command D:");
            setIsRunningCommand(false);
            error("Can't disconnect container(s) D:");
        }
    }

    const table = useReactTable<APINetwork>({
        columns: [
            {
                id: "id",
                header: "ID",
                accessorKey: "short_id"
            },
            {
                id: "name",
                header: "name",
                accessorKey: "name"
            },
            {
                id: "using",
                header: "Using this network",
                cell: ({ row }) =>
                    <div className="flex flex-row items-center gap-1">
                        {row.original.containers
                            .slice(0, 3)
                            .map((container) =>
                                <a className="text-blue-500 hover:underline flex flex-row items-center" href={`/container/${container}`}>
                                    {container}
                                </a>
                            )}
                        {row.original.containers.length > 3 && "..."}
                    </div>
            },
            {
                id: "action",
                header: "Action",
                cell: ({ row }) => {
                    const currentNetworkId = row.original.id;
                    return isRunningCommand
                        ? <RefreshCw className="animate-spin" />
                        : <>
                            <Button
                                variant="ghost"
                                className="hover:text-red-500"
                                disabled={!!row.original.containers.length}
                                onClick={() => remove(currentNetworkId)}
                            >
                                <Trash2 className="size-6" />
                            </Button>
                            <Dialog
                                open={openingDialog == `connect_${currentNetworkId}`}
                                onOpenChange={(opened) => setOpeningDialog(opened ? `connect_${currentNetworkId}` : "")}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="hover:text-blue-500"
                                        disabled={!containers.length}
                                        onClick={() => {
                                            selectedContainers.current = [];
                                            setSelectedNetwork(currentNetworkId);
                                            setOpeningDialog(`connect_${currentNetworkId}`);
                                        }}
                                    >
                                        <Link className="size-6" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Connect container to network
                                        </DialogTitle>
                                        <DialogDescription>Check which one you want to connect</DialogDescription>
                                    </DialogHeader>
                                    <div>
                                        {containers
                                            .filter(container => !row.original.containers.includes(container))
                                            .map(container => <div className="flex flex-row items-center gap-2">
                                                <Checkbox
                                                    onClick={(e) => e.stopPropagation()}
                                                    onCheckedChange={(checked) =>
                                                        checked
                                                            ? selectedContainers.current = [...selectedContainers.current, container]
                                                            : selectedContainers.current = selectedContainers.current.filter(filterContainer => filterContainer == container)
                                                    }
                                                />
                                                <p>{container}</p>
                                            </div>)}
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                if (selectedContainers.current.length)
                                                    connect();
                                                else error("No container is selected D:");
                                                setOpeningDialog("");
                                            }}
                                        >Connect</Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setOpeningDialog("")}
                                        >
                                            Cancel
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog
                                open={openingDialog == `disconnect_${currentNetworkId}`}
                                onOpenChange={(opened) => setOpeningDialog(opened ? `disconnect_${currentNetworkId}` : "")}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="hover:text-red-500"
                                        disabled={!row.original.containers.length || ["bridge", "host", "none"].includes(row.original.name)}
                                        onClick={() => {
                                            selectedContainers.current = [];
                                            setSelectedNetwork(currentNetworkId);
                                            setOpeningDialog(`disconnect_${currentNetworkId}`);
                                        }}
                                    >
                                        <Unlink className="size-6" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Disconnect container from network
                                        </DialogTitle>
                                        <DialogDescription>Check which one you want to disconnect</DialogDescription>
                                    </DialogHeader>
                                    <div>
                                        {row.original.containers.map(container => <div className="flex flex-row items-center gap-2">
                                            <Checkbox
                                                onClick={(e) => e.stopPropagation()}
                                                onCheckedChange={(checked) =>
                                                    checked
                                                        ? selectedContainers.current = [...selectedContainers.current, container]
                                                        : selectedContainers.current = selectedContainers.current.filter(filterContainer => filterContainer == container)
                                                }
                                            />
                                            <p>{container}</p>
                                        </div>)}
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                if (selectedContainers.current.length)
                                                    disconnect();
                                                else error("No container is selected D:");
                                                setOpeningDialog("");
                                            }}
                                        >Disconnect</Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setOpeningDialog("")}
                                        >
                                            Cancel
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>;
                }
            }
        ],
        data: networks,
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
                            className="rounded-tr-none rounded-br-none cursor-pointer"
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
                                                    <p className="text-center text-2xl">No network found</p>
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