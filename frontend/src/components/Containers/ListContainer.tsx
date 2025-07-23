import { useEffect, useState, type JSX } from "react";
import ms from "ms";
import api from "../../lib/api";
import { type APIContainer } from "@/lib/typing";
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
import { ChevronLeft, ChevronRight, MoreVertical, Play, RefreshCw, Scroll, Square, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { HuhError, HuhWhale } from "@/components/ui/whale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { error, info, success } from "@/hooks/toasts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import net from "net";
import url from "url";

interface Container extends APIContainer {
    imageHubUrl: string,
}

interface APIImage {
    id: string
    short_id: string,
    tags: string[],
    hub_url: string
}

export default function () {
    const token = localStorage.getItem("token");

    const navigator = useNavigate();

    const [containers, setContainers] = useState<Container[]>([]);
    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);


    useEffect(() => void getContainer(), []);
    async function getContainer() {
        try {
            const response = await api.get<APIContainer[]>(
                `/docker/containers?show_all=True`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const containers: Container[] = [];
            for (const apiContainer of response.data) {
                const imageResponse = await api.get<APIImage>(
                    `/docker/image?id=${apiContainer.image}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                containers.push(
                    {
                        ...apiContainer,
                        imageHubUrl: imageResponse.data.hub_url
                    }
                );
            }

            setContainers(containers);
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
            console.error(e);
            if (!(e instanceof AxiosError))
                console.error(e);
        }
    }

    async function start(id: string) {
        try {
            setIsRunningCommand(true);
            info("Starting container...");
            await api.post(`/docker/start?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Started container");
            getContainer();
        } catch {
            setIsRunningCommand(false);
            error("Can't start container D:");
        }
    }
    async function stop(id: string) {
        try {
            info("Stopping container...");
            setIsRunningCommand(true);
            await api.post(`/docker/stop?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Stopped container");
            getContainer();
        } catch {
            setIsRunningCommand(false);
            error("Can't stop container D:");
        }
    }
    async function kill(id: string) {
        try {
            info("Killing container...");
            setIsRunningCommand(true);
            await api.post(`/docker/kill?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Killed container");
            getContainer();
        } catch {
            setIsRunningCommand(false);
            error("Can't kill container D:");
        }
    }
    async function restart(id: string) {
        try {
            info("Restarting container...");
            setIsRunningCommand(true);
            await api.post(`/docker/restart?id=${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Restarted container");
            getContainer();
        } catch {
            setIsRunningCommand(false);
            error("Can't restart container D:");
        }
    }
    // async function rename(id: string, newName: string) {
    //     try {
    //         setIsRunningCommand(true);
    //         await api.post(`/docker/rename?id=${id}&new_name=${newName}`, {}, {
    //             headers: {
    //                 Authorization: `Bearer ${token}`
    //             }
    //         });
    //         success("renameped container");
    //         getContainer();
    //     } catch {
    //         setIsRunningCommand(false);
    //         error("Can't rename container D:");
    //     }
    // }
    async function remove(id: string) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/container?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Removed container");
            getContainer();
        } catch {
            setIsRunningCommand(false);
            error("Can't remove container D:");
        }
    }


    const [filter, setFilter] = useState<ColumnFiltersState>([]);
    const table = useReactTable<Container>({
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
                    const name = getValue();
                    const status = row.original.status;
                    return <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full ${status == "running" ? "bg-green-400" : "bg-gray-400"}`} />
                        {name}
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
                cell: ({ row, getValue }) => <a className="text-blue-500 hover:underline" href={row.original.imageHubUrl}>{getValue()}</a>
            },
            {
                id: "lastStarted",
                header: "Last started",
                accessorKey: "created",
                cell: ({ getValue }) => {
                    const date = new Date(getValue());
                    return <Tooltip>
                        <TooltipTrigger>
                            <p>{`${ms(Date.now() - date.getTime(), { long: true })} ago`}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{date.toUTCString()}</p>
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
                                        className="hover:text-green-500"
                                        onClick={() => !isRunning && start(id)}
                                    >
                                        <Play className="size-6 cursor-pointer" />
                                    </Button>
                                    : <Button
                                        variant="ghost"
                                        className="hover:text-red-500"
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
                                            disabled={!isRunning}
                                            onClick={() => restart(id)}
                                        >
                                            <RefreshCw />
                                            <p>Restart</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            disabled={!isRunning}
                                            onClick={() => kill(id)}
                                        >
                                            <Square />
                                            <p>Kill</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => navigator(`/container/${name || shortId}`)}
                                        >
                                            <Scroll />
                                            <p>Details</p>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
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
                    <div className="ml-auto mr-10 flex flex-row items-center">
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
            </div>
    }</>;
}