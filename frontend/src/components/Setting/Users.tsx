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
import { Permission, UsernameRegex } from "@/lib/enums";
import { cn } from "@/lib/utils";

interface Role extends APIRole {
    id: string
}

interface User {
    id: string;
    username: string;
    roles: (Role | string)[];
}

export default function () {
    const token = localStorage.getItem("token");

    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [allowToEdit, setAllowToEdit] = useState<boolean>(false);
    const [allowToEditRoles, setAllowToEditRoles] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<string>();
    const createNewUserRef = useRef<HTMLDivElement>(null);

    useEffect(() => void checkPermission(), []);
    async function checkPermission() {
        try {
            await api.get(`/user/has_permissions?permissions=${Permission.SeeUsers},${Permission.UpdateUsers}`, {
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

        try {
            await api.get(`/user/has_permissions?permissions=${Permission.SeeRoles},${Permission.GrantRoles}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setAllowToEdit(true);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                return setAllowToEditRoles(false);

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    useEffect(() => void getRoles(), [allowToEdit, allowToEditRoles]);
    async function getRoles() {
        if (!allowToEdit || !allowToEditRoles) return;
        try {
            const roles = await api.get<Role[]>("/role/?all=True", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setRoles(roles.data);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                return setAllowToEditRoles(false);

            console.error(err);
            if (err instanceof Error)
                error(err.message);
        }
    }

    useEffect(() => void getUsers(), [allowToEdit, allowToEditRoles, roles]);
    async function getUsers() {
        if (!allowToEdit) return;
        if (allowToEditRoles && !roles.length) return;
        try {
            const response = await api.get<APIUser[]>("/user/?all=True", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const users: User[] = [];
            for (const user of response.data)
                users.push({
                    ...user,
                    roles: roles.length ? roles.filter((role) => user.roles.includes(role.id)) : user.roles
                });

            setUsers(users);
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
        if (activeTab == "new" && createNewUserRef.current)
            createNewUserRef.current.scrollIntoView({ behavior: "smooth" });
    }, [activeTab]);

    return <div className="w-full h-full flex">{
        !allowToEdit
            ? <div className="m-auto flex flex-col items-center">
                <AngyWhale />
                <p className="text-4xl">You are not allow to config this</p>
            </div>
            : <div className="ml-10 w-full">
                <div
                    className="absolute right-10 bottom-10 z-10 w-fit h-fit gap-1 p-2 flex flex-row items-center rounded-lg bg-gray-200 text-2xl cursor-pointer"
                    onClick={() => setActiveTab("new")}
                >
                    <Plus />
                    New user
                </div>
                <Table className="w-full">
                    <TableHeader className="text-2xl font-bold">
                        <TableRow>
                            <TableHead className="w-100">User</TableHead>
                            <TableHead>Roles</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) =>
                            <Collapsible key={user.id} open={activeTab == user.id} asChild>
                                <>
                                    <CollapsibleTrigger
                                        asChild
                                        onClick={() => {
                                            if (activeTab == user.id)
                                                setActiveTab("");
                                            else
                                                setActiveTab(user.id);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <TableRow className="text-xl h-15">
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell className="flex flex-row gap-2">{
                                                user.roles.slice(0, 5).
                                                    map((role) =>
                                                        typeof role == "string"
                                                            ? <p>{role}</p>
                                                            : <RoleComponent role={role} />
                                                    )}</TableCell>
                                        </TableRow>
                                    </CollapsibleTrigger>
                                    <TableCell colSpan={2}>
                                        <CollapsibleContent>{
                                            user.id == "admin"
                                                ? <div className="flex flex-row items-center">
                                                    <AngyWhale className="size-10" />
                                                    <p className="text-xl ml-10">Sorry but you can't edit Admin user!</p>
                                                </div>
                                                : <EditUserComponent
                                                    token={token}
                                                    allowToEditRoles={allowToEditRoles}
                                                    user={{ ...user }}
                                                    createNew={false}
                                                    roles={roles}
                                                    updateUsers={getUsers}
                                                />
                                        }</CollapsibleContent>
                                    </TableCell>
                                </>
                            </Collapsible>
                        )}
                        {activeTab == "new" &&
                            <Collapsible key="new" open={activeTab == "new"} ref={createNewUserRef} asChild>
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
                                            <TableCell colSpan={2}>Create a new user</TableCell>
                                        </TableRow>
                                    </CollapsibleTrigger>
                                    <TableCell colSpan={2}>
                                        <CollapsibleContent>
                                            <EditUserComponent
                                                token={token}
                                                user={{ id: "", username: "", roles: [] }}
                                                createNew
                                                roles={roles}
                                                allowToEditRoles={allowToEditRoles}
                                                updateUsers={getUsers}
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

function RoleComponent({ className, role, ...props }: Omit<ComponentProps<"p">, "role"> & { role: APIRole }) {
    return <p
        className={cn("w-fit flex flex-row items-center gap-1 border p-1 rounded-2xl bg-gray-300", className)}
        {...props}
    >
        <span className="size-5 rounded-full" style={{ backgroundColor: role.hex }} />
        {role.name}
    </p>;
}

function EditUserComponent(
    { token, allowToEditRoles, user: oldUser, createNew, roles, updateUsers }:
        { token: string, allowToEditRoles: boolean, user: User, createNew: boolean, roles: Role[], updateUsers: () => any }
) {
    const [user, setUser] = useState<User>(oldUser);
    const currentUser = localStorage.getItem("username");

    const [newUsername, setNewUsername] = useState<string>(user.username);
    const [noUsername, setNoUsername] = useState<boolean>(false);
    const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>(null);
    const [noPassword, setNoPassword] = useState<boolean>(false);
    const [passwordTooShort, setPasswordTooShort] = useState<boolean>(false);

    async function updateUser() {
        try {
            if (createNew)
                await api.post(`/user/`, {
                    username: newUsername,
                    password: newPassword,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            else
                await api.put(`/user/?target=${user.id}`, {
                    username: newUsername,
                    password: newPassword,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

            if (allowToEditRoles && user.roles.length)
                await api.put(`/role/grant?target=${user.id}&roles=${user.roles.map((role: Role) => role.id).join(",")}`, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

            if (createNew)
                success(`Created user ${user.username}`);
            else
                success(`Updated user ${user.username}`);

            updateUsers();
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const message = err.response.data.detail.message;
                    if (message == "username already existed")
                        error("Username used");
                    else if (message == "invalid username")
                        error("Invalid username");
                    else if (message == "invalid password")
                        error("Invalid password");
                } else if (err.status == 403)
                    error("You dont have permission to do this!");
                else error(err.message);
            }

            else if (err instanceof Error)
                error(err.message);
        }
    }

    async function deleteUser() {
        try {
            await api.delete(`/user/?target=${user.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success(`Deleted username ${user.username}`);
            updateUsers();
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const message = err.response.data.detail.message;
                    if (message == "username already existed")
                        error("Username already existed");
                    else if (message == "invalid username")
                        error("Invalid username");
                    else if (message == "invalid password")
                        error("Invalid password");
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
            <TableRow>
                <TableCell className="w-90">Username</TableCell>
                <TableCell>
                    <Input
                        className="w-100"
                        value={newUsername}
                        onChange={(event) => {
                            setNewUsername(event.target.value);
                            setNoUsername(false);
                            setInvalidUsername(false);
                        }}
                    />
                    {noUsername && <p className="text-red-500">* Please provide username</p>}
                    {invalidUsername && <p className="text-red-500">* Username is invalid (allow 0-9, a-z and underscore)</p>}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell>Password</TableCell>
                <TableCell>
                    <Input
                        className="w-100"
                        // type="password"
                        value={newPassword}
                        onChange={(event) => {
                            setNewPassword(event.target.value);
                            setPasswordTooShort(false);
                            setNoPassword(false);
                        }}
                        placeholder={!createNew && "[Not change]"}
                    />
                    {noPassword && <p className="text-red-500">* Please provide password</p>}
                    {passwordTooShort && <p className="text-red-500">* Password to short (at least 8 characters)</p>}
                </TableCell>
            </TableRow>
            {allowToEditRoles && <TableRow>
                <TableCell>Roles</TableCell>
                <TableCell className="flex flex-wrap gap-2">
                    {user.roles
                        .map((role: Role) =>
                            <p
                                className="w-fit flex flex-row items-center gap-1 border p-1 rounded-2xl bg-gray-300 text-black cursor-pointer group"
                                onClick={() => {
                                    const newUser = { ...user };
                                    const index = newUser.roles.findIndex((filterRole: Role) => filterRole.id != role.id);
                                    newUser.roles.splice(index, 1);
                                    setUser(newUser);
                                }}
                            >
                                <div className="relative size-5">
                                    <div className="absolute size-5 rounded-full" style={{ backgroundColor: role.hex }} />
                                    <Minus className="absolute size-5 rounded-full border-1 border-black opacity-0 group-hover:opacity-100" style={{ backgroundColor: role.hex }} />
                                </div>
                                <span className="text-black">{role.name}</span>
                            </p>
                        )}
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <PlusCircle className="size-7 hover:bg-gray-300 rounded-full p-1 cursor-pointer" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="flex flex-col gap-2 h-100 w-50 overflow-scroll">{
                            roles.filter((role) => role.id != "@everyone")
                                .filter(role => !user.roles.includes(role))
                                .map(role =>
                                    <RoleComponent
                                        className="cursor-pointer"
                                        onClick={() => {
                                            const newUser = { ...user };
                                            newUser.roles.push(role);
                                            setUser(newUser);
                                        }}
                                        role={role}
                                    />
                                )
                        }</DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>}
            <TableRow>
                <TableCell />
                <TableCell>
                    <div className="flex flex-row items-center gap-2">
                        <Button
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                                if (!newUsername)
                                    setNoUsername(!newUsername);
                                else if (!UsernameRegex.test(newUsername))
                                    setInvalidUsername(true);
                                else if (createNew && !newPassword)
                                    setNoPassword(true);
                                else if (newPassword && newPassword.length < 8)
                                    setPasswordTooShort(true);
                                else updateUser();
                            }}
                        >Save changes</Button>
                        {(user.username != currentUser && user.id != "admin") &&
                            <Button
                                variant="destructive"
                                className="cursor-pointer"
                                onClick={() => deleteUser()}
                            >Delete user</Button>
                        }
                    </div>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>;
}
