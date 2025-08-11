import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { APIContainer, APIImage } from "@/lib/typing";
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
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Trash2
} from "lucide-react";
import { HuhError } from "@/components/ui/icon";
import { error, success } from "@/hooks/toasts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export interface Image extends APIImage {
    using: APIContainer[]
}

export default function () {
    const token = localStorage.getItem("token");

    const [containers, setContainers] = useState<APIContainer[]>([]);
    const [images, setImages] = useState<Image[]>([]);

    const [errored, setErrored] = useState<boolean>(false);
    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

    useEffect(() => void getContainers(), []);
    async function getContainers() {
        try {
            const response = await api.get<APIContainer[]>(
                `/docker/containers?show_all=True`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setContainers(response.data);
        } catch (e) {
            setErrored(true);
            console.error(e);
        }
    }

    useEffect(() => void getImages(), [containers]);
    async function getImages() {
        if (!containers) return;
        try {
            const response = await api.get<APIImage[]>(
                `/docker/images`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const images: Image[] = [];
            for (const image of response.data)
                images.push({
                    using: containers.filter((container) => image.tags.includes(container.image)),
                    ...image,
                });

            setImages(images);
            setIsRunningCommand(false);
        } catch (e) {
            setErrored(true);
            console.error(e);
        }
    }

    async function remove(id: string) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/image?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Removed image");
            getImages();
        } catch {
            setIsRunningCommand(false);
            error("Can't remove image D:");
        }
    }

    async function prune(all: boolean = false) {
        try {
            setIsRunningCommand(true);
            await api.delete(`/docker/image/prune?dangling=${!all}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Pruned ${all ? "all" : "unused"} images`);
            getImages();
        } catch (err) {
            setIsRunningCommand(false);
            error("Can't prune images D:");
        }
    }

    const table = useReactTable<Image>({
        columns: [
            {
                id: "id",
                header: "ID",
                accessorKey: "short_id"
            },
            {
                id: "tags",
                header: "Tags",
                accessorKey: "tags",
                cell: ({ getValue }) => {
                    const tags = getValue().join(", ");
                    return tags.length > 50
                        ? <Tooltip>
                            <TooltipTrigger>{tags.slice(0, 50) + "..."}</TooltipTrigger>
                            <TooltipContent>{tags}</TooltipContent>
                        </Tooltip>
                        : tags;
                }
            },
            {
                id: "using",
                header: "Using this image",
                cell: ({ row }) =>
                    <div className="flex flex-row items-center gap-1">
                        {row.original.using
                            .slice(0, 3)
                            .map((container) =>
                                <a className="text-blue-500 hover:underline flex flex-row items-center" href={`/container/${container.name}`}>
                                    {container.name}
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
        data: images,
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
                            onClick={() => prune(false)}
                        >
                            <Trash2 />
                            Prune unused
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button
                                    variant="secondary"
                                    className="rounded-tl-none rounded-bl-none"
                                >
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => prune(false)}
                                >Prune unused</DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => prune(true)}
                                >Prune all</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                                <p className="text-center text-2xl">No image found</p>
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