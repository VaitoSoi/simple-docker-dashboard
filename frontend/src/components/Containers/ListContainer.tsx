import { useEffect, useRef, useState } from "react";
import ms from "ms";
import api from "../../lib/api";
import { type APIContainer, type APIImage } from "@/lib/typing";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
import {
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Pencil,
    Play,
    RefreshCw,
    Scroll,
    Square,
    Trash2
} from "lucide-react";
import { useNavigate } from "react-router";
import { HuhError, Loading } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { error, info, success } from "@/hooks/toasts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface Container extends APIContainer {
    imageHubUrl: string,
}

export default function () {
    const token = localStorage.getItem("token");

    const navigator = useNavigate();

    const [fetched, setFetched] = useState<boolean>(false);
    const [containers, setContainers] = useState<APIContainer[]>([]);
    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

    const [selectedContainerForRename, setSelectedContainerForRename] = useState<string>("");
    const newName = useRef<string>("");

    useEffect(() => void getContainers(), []);
    async function getContainers() {
        try {
            setFetched(false);

            const response = await api.get<APIContainer[]>(
                `/docker/containers?show_all=True`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // const containers: Container[] = [];
            // for (const apiContainer of response.data) {
            //     const imageResponse = await api.get<APIImage>(
            //         `/docker/image?id=${apiContainer.image}`,
            //         {
            //             headers: {
            //                 Authorization: `Bearer ${token}`
            //             }
            //         }
            //     );
            //     containers.push(
            //         {
            //             ...apiContainer,
            //             imageHubUrl: imageResponse.data.hub_url
            //         }
            //     );
            // }

            setFetched(true);
            setContainers(response.data);
            setIsRunningCommand(false);

            // setContainers(Array.from({ length: 50 }).map<Container>(() => ({
            //     command: [],
            //     created: new Date().toString(),
            //     id: v4().split("-")[0],
            //     image: "hello-world",
            //     names: ["Test"],
            //     ports: ["0000:0000"],
            //     status: Math.round(Math.random()) == 0 ? "running" : "exited"
            // })));
        } catch (e) {
            setErrored(true);
            setFetched(true);
            if (e instanceof AxiosError && e.status == 403)
                return error("You can't list containers D:");
            console.error(e);
            if (e instanceof Error)
                error(e.message);
        }
    }

    async function newNameHandler() {
        if (!selectedContainerForRename)
            return;
        if (!newName.current)
            return error("Please provide new name.");
        await rename(selectedContainerForRename, newName.current);
        setSelectedContainerForRename("");
        newName.current = "";
    }

    async function start(id: string) {
        try {
            setIsRunningCommand(true);
            info("Starting container...");
            await api.post(`/docker/container/start?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Started container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't start container D:");
        }
    }
    async function stop(id: string) {
        try {
            info("Stopping container...");
            setIsRunningCommand(true);
            await api.post(`/docker/container/stop?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Stopped container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't stop container D:");
        }
    }
    async function kill(id: string) {
        try {
            info("Killing container...");
            setIsRunningCommand(true);
            await api.post(`/docker/container/kill?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Killed container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't kill container D:");
        }
    }
    async function restart(id: string) {
        try {
            info("Restarting container...");
            setIsRunningCommand(true);
            await api.post(`/docker/container/restart?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Restarted container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't restart container D:");
        }
    }
    async function rename(id: string, newName: string) {
        try {
            setIsRunningCommand(true);
            await api.post(`/docker/container/rename?id=${id}&new_name=${newName}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Renamed container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't rename container D:");
        }
    }
    async function remove(id: string) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Removed container");
            getContainers();
        } catch {
            setIsRunningCommand(false);
            error("Can't remove container D:");
        }
    }
    async function prune() {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/container/prune`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Pruned containers`);
            getContainers();
        } catch (err) {
            setIsRunningCommand(false);
            error("Can't prune images D:");
        }
    }

    const [filter, setFilter] = useState<ColumnFiltersState>([]);
    const table = useReactTable<APIContainer>({
        columns: [
            {
                id: "status",
                accessorKey: "status",
                enableHiding: true,
                filterFn: (row, columnId, filterStatuses: boolean) =>
                    !filterStatuses ? row.getValue(columnId) == "running" : true
            },
            {
                id: "name",
                header: "Name",
                accessorKey: "name",
                cell: ({ getValue, row }) => {
                    const name = getValue() as string;
                    const status = row.original.status;
                    return <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full ${status == "running" ? "bg-green-400" : "bg-gray-400"}`} />
                        <a className="text-blue-500 hover:underline" href={`/container/${name}`}>
                            {name.length > 30
                                ? <Tooltip>
                                    <TooltipTrigger>{name.slice(0, 30) + "..."}</TooltipTrigger>
                                    <TooltipContent>{name}</TooltipContent>
                                </Tooltip>
                                : name}
                        </a>
                    </div>;
                }
            },
            {
                id: "id",
                header: "ID",
                accessorKey: "short_id"
            },
            {
                id: "image",
                header: "Image",
                accessorKey: "image",
                cell: ({ getValue }) => {
                    const image = getValue();
                    return image.length >= 30
                        ? <Tooltip>
                            <TooltipTrigger>{image.slice(0, 30) + "..."}</TooltipTrigger>
                            <TooltipContent>{image}</TooltipContent>
                        </Tooltip>
                        : image;
                }
            },
            {
                id: "lastCreated",
                header: "Created",
                accessorKey: "created",
                cell: ({ getValue }) => {
                    const date = new Date(getValue());
                    return <Tooltip>
                        <TooltipTrigger>
                            {`${ms(Date.now() - date.getTime(), { long: true })} ago`}
                        </TooltipTrigger>
                        <TooltipContent>
                            {date.toUTCString()}
                        </TooltipContent>
                    </Tooltip>;
                }
            },
            {
                id: "ports",
                header: "Ports",
                accessorKey: "ports",
                cell: ({ getValue }) => getValue().join(", ")
            },
            {
                id: "action",
                header: "Action",
                cell: ({ row }) => {
                    const isRunning = row.original.status == "running";
                    const name = row.original.name;
                    const id = row.original.id;
                    const shortId = row.original.short_id;
                    return <div className="flex flex-row items-center">
                        {isRunningCommand
                            ? <RefreshCw className="animate-spin" />
                            : <>
                                {!isRunning
                                    ? <Button
                                        variant="ghost"
                                        className="cursor-pointer hover:text-green-500"
                                        onClick={() => !isRunning && start(id)}
                                    >
                                        <Play className="size-6" />
                                    </Button>
                                    : <Button
                                        variant="ghost"
                                        className="cursor-pointer hover:text-red-500"
                                        onClick={() => isRunning && stop(id)}
                                    >
                                        <Square className="size-6" />
                                    </Button>
                                }
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <MoreVertical className="hover:text-blue-500" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={() => setSelectedContainerForRename(row.original.name)}
                                        >
                                            <Pencil />
                                            <p>Rename</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            disabled={!isRunning}
                                            onClick={() => restart(id)}
                                        >
                                            <RefreshCw />
                                            <p>Restart</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            disabled={!isRunning}
                                            onClick={() => kill(id)}
                                        >
                                            <Square />
                                            <p>Kill</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={() => navigator(`/container/${name || shortId}`)}
                                        >
                                            <Scroll />
                                            <p>Details</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            disabled={isRunning}
                                            onClick={() => remove(id)}
                                        >
                                            <Trash2 />
                                            <p>Remove</p>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        }
                    </div>;
                }
            }
        ],
        data: containers,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setFilter,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters: filter,
        }
    });
    useEffect(() => {
        table.setColumnVisibility({ status: false });
        table.setColumnFilters([{ id: "status", value: false }]);
    }, []);



    return <>{
        errored
            ? <div className="mt-5 mr-5 rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div>
                <Dialog open={!!selectedContainerForRename} onOpenChange={(open) => {
                    if (open) return;
                    setSelectedContainerForRename("");
                    newName.current = "";
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Rename your container
                            </DialogTitle>
                            <DialogDescription>
                                Choose a nice name for your container &lt;3
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            placeholder="New name"
                            onChange={(event) => newName.current = event.target.value}
                            onKeyDown={(event) => {
                                if (event.key.toLowerCase() != "enter") return;
                                newNameHandler();
                            }}
                        />
                        <DialogFooter>
                            <Button
                                variant="secondary"
                                onClick={() => newNameHandler()}
                            >Rename</Button>
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedContainerForRename("")}
                            >Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <div className="flex flex-row items-center">
                    <Input placeholder="Search" className="h-10 w-1/4"
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                    />
                    <Checkbox className="h-6 w-6 mr-2 ml-5"
                        checked={table.getColumn("status").getFilterValue() as boolean}
                        onCheckedChange={(checked) => {
                            const portColumn = table.getColumn("status");
                            if (!portColumn) return;
                            if (checked) portColumn.setFilterValue(true);
                            else portColumn.setFilterValue(false);
                        }}
                    />
                    <p className="text-lg">Show all containers</p>
                    <div className="ml-auto mr-10 gap-2 flex flex-row items-center">
                        <Button
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => prune()}
                        >
                            <Trash2 />
                            Prune unused
                        </Button>
                        <Button variant="outline"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        ><ChevronLeft /> Previous</Button>
                        <p className="text-lg">{table.getState().pagination.pageIndex + 1}/{table.getPageCount()}</p>
                        <Button variant="outline"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        ><ChevronRight /> Next</Button>
                    </div>
                </div>
                <div className="mt-5 mr-10 rounded-md border p-4 pr-6 pl-6">
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
                                                ? <div className="m-20">
                                                    <Loading />
                                                </div>
                                                : <div className="m-20">
                                                    <p className="text-center text-8xl m-4">🔍</p>
                                                    <p className="text-center text-2xl">No container found</p>
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