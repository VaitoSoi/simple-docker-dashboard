import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { HuhError } from "@/components/ui/icon";
import { ChevronLeft, Download, FileWarning, RefreshCw } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { error, info } from "@/hooks/toasts";
import { Checkbox } from "../ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { DirEntryAPI } from "@/lib/typing";

interface DirEntry extends DirEntryAPI {
    isGoBack?: true
}

export default function ({ id }: { id: string }) {
    const token = localStorage.getItem("token");

    const [currentPath, setCurrentPath] = useState<string>("");
    const [entries, setEntries] = useState<DirEntry[]>([]);

    const [viewingFile, setViewingFile] = useState<boolean>(false);
    const [fileTooBig, setFileTooBig] = useState<boolean>(false);

    const [fileContent, setFileContent] = useState<string | null>(null);
    const [enableJSONFormat, setEnableJSONFormat] = useState<boolean>(false);
    const [jsonFormattedContent, setJSONFormattedContent] = useState<string | null>(null);

    const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

    const [errored, setErrored] = useState<boolean>(false);

    useEffect(() => void gotoEntry(), [currentPath]);
    async function gotoEntry() {
        try {
            if (viewingFile) {
                const response = await api.get<string>(
                    `/docker/volume/cat?id=${id}&path=${currentPath}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                let content: string = response.data;
                if (content.length >= 1_000_000) {
                    setFileTooBig(true);
                    content = content.slice(0, 1_000_000);
                }
                setFileContent(content);
            } else {
                const response = await api.get<DirEntryAPI[]>(
                    `/docker/volume/ls?id=${id}&path=${currentPath}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                const entries: DirEntry[] = ([
                    (currentPath != "" ? { name: "..", type: "", isGoBack: true } : undefined),
                    ...response.data.map(entry => ({ ...entry, name: entry.name + (entry.type == "directory" ? "/" : "") }))
                ].filter(val => !!val)) as DirEntry[];
                setEntries(entries);
            }
        } catch (e) {
            setErrored(true);
            console.error(e);
            if (e instanceof Error)
                error(e.message);
        }
    }

    async function download(path: string = currentPath) {
        const pathFragment = path.split("/");
        let filename = "";
        if (pathFragment[pathFragment.length - 1] == "")
            filename = `${pathFragment[pathFragment.length - 2]}.zip`;
        else
            filename = pathFragment[pathFragment.length - 1];

        try {
            const response = await api.get(
                `/docker/volume/download?id=${id}&path=${path}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    responseType: "blob"
                }
            );
            const url = window.URL.createObjectURL(response.data);
            const a = document.createElement("a");
            a.style = "display: none";
            document.body.appendChild(a);
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            setIsRunningCommand(false);
        } catch (e) {
            setErrored(true);
            console.error(e);
            if (e instanceof Error)
                error(e.message);
        }
    }

    const table = useReactTable<DirEntry>({
        columns: [
            {
                id: "name",
                header: "Name",
                accessorKey: "name",
                cell: ({ row }) => {
                    const entry = row.original;
                    const clickable =
                        ["directory", "file", "symlink"].includes(entry.type) ||
                        (entry.type == "executable" && entry.name.endsWith(".sh")) ||
                        entry.isGoBack;
                    return <p
                        className={clickable && "hover:underline cursor-pointer"}
                        onClick={() => {
                            if (!clickable) return;
                            if (
                                ["file", "symlink"].includes(entry.type) ||
                                (entry.type == "executable" && entry.name.endsWith(".sh"))
                            )
                                setViewingFile(true);
                            setCurrentPath(oldPath =>
                                entry.isGoBack
                                    ? oldPath.split("/").slice(0, -2).join("/")
                                    : oldPath + entry.name
                            );
                        }}
                    >
                        {row.original.name}
                    </p>;
                }
            },
            {
                id: "type",
                header: "Type",
                accessorKey: "type"
            },
            {
                id: "action",
                header: "Action",
                cell: ({ row }) =>
                    row.original.isGoBack
                        ? <></>
                        : isRunningCommand
                            ? <RefreshCw className="animate-spin" />
                            : <Button
                                variant="outline"
                                onClick={() => {
                                    if (isRunningCommand) return;
                                    setIsRunningCommand(true);
                                    download(currentPath + row.original.name);
                                }}
                            ><Download /></Button>
            }
        ],
        data: entries,
        getCoreRowModel: getCoreRowModel(),
    });

    return <>{
        errored
            ? <div className="rounded-md border p-20 flex flex-col items-center">
                <HuhError />
            </div>
            : <div className="h-full rounded-md border p-4 pr-6 pl-6 flex flex-col">{
                viewingFile
                    ? <>
                        <div className="flex flex-row items-center gap-2 border-b-2 pb-1">
                            <ChevronLeft
                                className="cursor-pointer"
                                onClick={() => {
                                    setCurrentPath(oldPath => oldPath.split("/").slice(0, -1).join("/"));
                                    setViewingFile(false);
                                    setFileContent(null);
                                    setFileTooBig(false);

                                    setEnableJSONFormat(false);
                                    setJSONFormattedContent(null);
                                }}
                            />
                            <p className="text-xl">{currentPath}</p>
                            {currentPath.endsWith(".json") && fileContent != "" && !fileTooBig && <>
                                <Checkbox
                                    className="cursor-pointer"
                                    checked={enableJSONFormat}
                                    onCheckedChange={(checked) => {
                                        setEnableJSONFormat(!!checked);
                                        if (checked && jsonFormattedContent == null)
                                            try {
                                                const obj = JSON.parse(fileContent);
                                                setJSONFormattedContent(JSON.stringify(obj, null, 4));
                                            } catch (err) {
                                                console.error(err);
                                                if (err instanceof Error)
                                                    error(err.message);
                                            }
                                    }}
                                />
                                <p>Pretty print</p>
                            </>
                            }
                            {fileTooBig && <Tooltip>
                                <TooltipTrigger><FileWarning /></TooltipTrigger>
                                <TooltipContent><p>This file is too big to be displayed ;-;. To see full content, please download it</p></TooltipContent>
                            </Tooltip>}
                        </div>
                        {fileContent != null || jsonFormattedContent != null
                            ? <>{
                                <div className="p-2 h-full w-full overflow-scroll">{
                                    ((enableJSONFormat ? jsonFormattedContent : fileContent) || "<This is actually an empty file - This message is sent from this web, not from your app :D>")?.split("\n").map((line) =>
                                        <p className="font-mono whitespace-pre">{line}</p>
                                    )
                                }</div>
                            }</>
                            : <>
                                <Skeleton className="h-5 w-8/10 mt-2" />
                                <Skeleton className="h-5 w-8/10 mt-2" />
                                <Skeleton className="h-5 w-5/10 mt-2" />
                            </>
                        }</>
                    : <Table>
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
                                                <p className="text-center text-2xl">No entry found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }
                        </TableBody>
                    </Table>
            }</div>
    }</>;
}
