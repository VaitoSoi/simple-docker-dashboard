import { error, success } from "@/hooks/toasts";
import api from "@/lib/api";
import type { APIRole, APIUser } from "@/lib/typing";
import { AxiosError } from "axios";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { AngyWhale } from "../ui/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Minus, Plus, PlusCircle } from "lucide-react";
import { Input } from "../ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Permission } from "@/lib/enums";
import { cn } from "@/lib/utils";

interface Role extends APIRole {
    id: string
}

export default function () {
    const token = localStorage.getItem("token");

    const [roles, setRoles] = useState<Role[]>([]);
    const [allowToEdit, setAllowToEdit] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<string>();
    const createNewRoleRef = useRef<HTMLDivElement>(null);

    const permissions = Object.fromEntries(
        Object.entries(Permission)
            .filter(([, id]) => typeof id == "number")
            .map(([name, id]) => [name, Number(id)])
    );

    useEffect(() => void checkPermission(), []);
    async function checkPermission() {
        try {
            await api.get(`/user/has_permissions?permissions=${Permission.SeeRoles},${Permission.UpdateRole}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setAllowToEdit(true);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                return setAllowToEdit(false);

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    useEffect(() => void getRoles(), [allowToEdit]);
    async function getRoles() {
        if (!allowToEdit) return;
        try {
            const roles = await api.get<Role[]>("/role/?all=True", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setRoles(roles.data);
            setActiveTab("");
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                return setAllowToEdit(false);

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    useEffect(() => {
        if (activeTab == "new" && createNewRoleRef.current)
            createNewRoleRef.current.scrollIntoView({ behavior: "smooth" });
    }, [activeTab]);

    return <div className="w-full h-full flex">{
        !allowToEdit
            ? <div className="m-auto flex flex-col items-center">
                <AngyWhale />
                <p className="text-4xl">You are not allow to config this</p>
            </div>
            : <div className="ml-10 w-full h-full">
                <div
                    className="absolute right-10 bottom-10 z-10 w-fit h-fit gap-1 p-2 flex flex-row items-center rounded-lg bg-gray-200 text-2xl cursor-pointer"
                    onClick={() => setActiveTab("new")}
                >
                    <Plus />
                    New role
                </div>
                <Table className="w-full">
                    <TableHeader className="text-2xl font-bold">
                        <TableRow>
                            <TableHead className="w-100">Role</TableHead>
                            <TableHead>Permissions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) =>
                            <Collapsible key={role.id} open={activeTab == role.id} asChild>
                                <>
                                    <CollapsibleTrigger
                                        asChild
                                        onClick={() => {
                                            if (activeTab == role.id)
                                                setActiveTab("");
                                            else
                                                setActiveTab(role.id);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <TableRow className="text-xl h-15">
                                            <TableCell>
                                                <div className="flex flex-row items-center gap-2 rounded-2xl bg-gray-400 w-fit p-2">
                                                    <span className="size-6 rounded-full border-2" style={{ backgroundColor: role.hex }} />
                                                    {role.name}
                                                </div></TableCell>
                                            <TableCell className="flex flex-row gap-2">{
                                                role.permissions.slice(0, 5).
                                                    map((permission) =>
                                                        <PermissionComponent permission={Permission[permission].toString()} />
                                                    )}</TableCell>
                                        </TableRow>
                                    </CollapsibleTrigger>
                                    <TableCell colSpan={2}>
                                        <CollapsibleContent>
                                            <EditRoleComponent token={token} role={{ ...role }} createNew={false} permissions={permissions} updateRoles={getRoles} />
                                        </CollapsibleContent>
                                    </TableCell>
                                </>
                            </Collapsible>
                        )}
                        {activeTab == "new" &&
                            <Collapsible key="new" open={activeTab == "new"} ref={createNewRoleRef} asChild>
                                <>
                                    <CollapsibleTrigger
                                        asChild
                                        onClick={() => {
                                            if (activeTab == "new")
                                                setActiveTab("");
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <TableRow className="text-xl h-15">
                                            <TableCell colSpan={2}>Create a new role</TableCell>
                                        </TableRow>
                                    </CollapsibleTrigger>
                                    <TableCell colSpan={2}>
                                        <CollapsibleContent>
                                            <EditRoleComponent
                                                token={token}
                                                role={{ id: "", name: "", hex: "#FFFFFF", permissions: [] }}
                                                createNew
                                                permissions={permissions}
                                                updateRoles={getRoles}
                                            />
                                        </CollapsibleContent>
                                    </TableCell>
                                </>
                            </Collapsible>}
                    </TableBody>
                </Table>
            </div>
    }</div>;
}

function PermissionComponent({ className, permission, ...props }: Omit<ComponentProps<"p">, "role"> & { permission: string }) {
    return <p
        className={cn("w-fit flex flex-row items-center gap-1 border p-2 rounded-2xl bg-gray-300", className)}
        {...props}
    >
        {permission}
    </p>;
}

function EditRoleComponent(
    { token, role, createNew, permissions, updateRoles }:
        { token: string, role: Role, createNew: boolean, permissions: Record<string, number>, updateRoles: () => any }
) {
    const [newName, setNewName] = useState<string>(role.name);
    const [noName, setNoName] = useState<boolean>(false);
    const [invalidName, setInvalidName] = useState<boolean>(false);
    const [newPermissions, setNewPermissions] = useState<number[]>([...role.permissions]);
    const [noPermissions, setNoPermissions] = useState<boolean>(false);
    const [hex, setHex] = useState<string>(role.hex);
    const [invalidHex, setInvalidHex] = useState<boolean>(false);

    async function updateRole() {
        try {
            await (createNew ? api.post : api.put)(`/role/?id=${role.id}`, {
                name: newName,
                permissions: newPermissions,
                hex
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (createNew)
                success(`Created role ${role.name}`);
            else
                success(`Updated role ${role.name}`);
            
            updateRoles();
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const message = err.response.data.detail.message;
                } else if (err.status == 403)
                    error("You dont have permission to do this!");
                else error(err.message);
            }

            else if (err instanceof Error)
                error(err.message);
        }
    }

    async function deleteRole() {
        try {
            await api.delete(`/role/?id=${role.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Deleted role ${role.name}`);
            updateRoles();
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const message = err.response.data.detail.message;
                } else if (err.status == 403)
                    error("You dont have permission to do this!");
                else error(err.message);
            }

            else if (err instanceof Error)
                error(err.message);
        }
    }

    return <Table className="text-lg ml-10 w-19/20">
        <TableBody>
            {role.id != "@admin" && <>
                <TableRow>
                    <TableCell className="w-90">Name</TableCell>
                    <TableCell>
                        <Input
                            className="w-100"
                            value={newName}
                            onChange={(event) => {
                                setNewName(event.target.value);
                                setNoName(false);
                                setInvalidName(false);
                            }}
                        />
                        {noName && <p className="text-red-500">* Please provide name</p>}
                        {invalidName && <p className="text-red-500">* Name is invalid (allow 0-9, a-z and underscore)</p>}
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        Permission
                    </TableCell>
                    <TableCell className="w-full flex flex-col">
                        <div className="flex flex-wrap gap-2">
                            {newPermissions
                                .map((permission: number) =>
                                    <p
                                        className="w-fit flex flex-row items-center gap-1 border p-1 rounded-2xl bg-gray-300 text-white hover:text-black cursor-pointer"
                                        onClick={() => { 
                                            setNewPermissions((oldPermissions) =>
                                                oldPermissions.filter((filterPermission) => filterPermission != permission));
                                        }}
                                    >
                                        <Minus className="size-5 rounded-full border-1 border-black bg-gray-100" />
                                        <span className="text-black">{Object.entries(permissions).find(([, id]) => id == permission)[0]}</span>
                                    </p>
                                )}
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <PlusCircle className="size-7 hover:bg-gray-300 rounded-full p-1 cursor-pointer" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="flex flex-col gap-2 h-100 w-50 overflow-scroll">{
                                    // Array.from({ length: 10 }).map<Role>(() => ({ id: "", name: "Test", permissions: [], hex: "#000000" }))
                                    Object.entries(permissions)
                                        .filter(([, id]) => id != Permission.Administrator)
                                        .filter(([, id]) => !newPermissions.includes(id))
                                        .map(([name, id]) =>
                                            <PermissionComponent
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    const permissions = [...newPermissions];
                                                    permissions.push(id);
                                                    setNewPermissions(permissions);
                                                }}
                                                permission={name}
                                            />
                                        )
                                }</DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {noPermissions && <p className="text-red-500">* Please provide permissions</p>}
                    </TableCell>
                </TableRow>
            </>}
            <TableRow>
                <TableCell className="w-90">
                    Hex
                </TableCell>
                <TableCell className="flex flex-row items-center gap-2">
                    <div
                        className="size-10 rounded-lg border"
                        style={{ backgroundColor: hex }}
                    />
                    <Input
                        className="w-88"
                        value={hex}
                        onChange={(event) => {
                            let value = event.target.value
                                .slice(0, 7)
                                .toUpperCase();
                            value = (value.startsWith("#") ? "" : "#") + value;
                            setHex(value);
                            setInvalidHex(false);
                        }}
                    />
                    {invalidHex && <p className="text-red-500">* Invalid hex</p>}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell />
                <TableCell>
                    <div className="flex flex-row gap-2">
                        <Button
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                                if (!newName || !newPermissions.length) {
                                    setNoName(!newName);
                                    setNoPermissions(!newPermissions.length);
                                } else if (!/^[0-9A-Za-z@_]+$/.test(newName))
                                    setInvalidName(true);
                                else if (!/^#[0-9A-F]{6}$/.test(hex))
                                    setInvalidHex(true);
                                else updateRole();
                            }}
                        >Save changes</Button>
                        {(role.id != "@admin" && role.id != "@everyone" && !createNew) &&
                            <Button
                                variant="destructive"
                                className="cursor-pointer"
                                onClick={() => deleteRole()}
                            >Delete role</Button>
                        }
                    </div>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>;
}
