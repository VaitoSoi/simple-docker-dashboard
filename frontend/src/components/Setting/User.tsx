import { useState, type ComponentProps } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import api from "@/lib/api";
import { error, success } from "@/hooks/toasts";
import { AxiosError } from "axios";
import { UsernameRegex } from "@/lib/enums";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

export default function () {
    const token = localStorage.getItem("token");

    const [newUsername, setNewUsername] = useState<string>(localStorage.getItem("username"));
    const [noUsername, setNoUsername] = useState<boolean>(false);
    const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>(null);
    const [noPassword, setNoPassword] = useState<boolean>(false);
    const [passwordTooShort, setPasswordTooShort] = useState<boolean>(false);
    const [confirmPassword, setConfirmPassword] = useState<string>(null);
    const [noConfirmPassword, setNoConfirmPassword] = useState<boolean>(false);
    const [confirmPasswordNotMatch, setConfirmPasswordNotMatch] = useState<boolean>(false);

    async function updateUser() {
        try {
            await api.put("/user", {
                username: newUsername,
                password: newPassword
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            success("Updated your credential");
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 409) {
                    const data = err.response.data;
                    const message: string = data.detail.message;
                    if (message == "username already existed")
                        error("Username already existed");
                    else if (message == "invalid username")
                        error("Invalid username");
                    else if (message == "invalid password")
                        error("Invalid password");
                }
            }
        }
    }

    return <div className="w-8/15 ml-10 mt-10 flex flex-col gap-5">
        <p className="text-3xl font-semibold">Change your credential</p>
        <Table className="w-full">
            <TableBody>
                <TableRow>
                    <TableCell className="w-80">
                        <p className="text-xl">Username</p>
                    </TableCell>
                    <TableCell className="w-100">
                        <div className="w-full flex flex-col">
                            <Input
                                value={newUsername}
                                onChange={(event) => {
                                    setNoUsername(false);
                                    setNewUsername(event.target.value);
                                    setInvalidUsername(false);
                                }}
                            />
                            {noUsername && <p className="text-red-500">* Please provide username</p>}
                            {invalidUsername && <p className="text-red-500">* Your username is invalid (allow 0-9, a-z and underscore)</p>}
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="w-80">
                        <p className="text-xl">Password</p>
                    </TableCell>
                    <TableCell className="w-100">
                        <div className="w-full flex flex-col">
                            <Input
                                value={newPassword}
                                type="password"
                                onChange={(event) => {
                                    setNoPassword(false);
                                    setNewPassword(event.target.value);
                                    setPasswordTooShort(false);
                                }}
                            />
                            {noPassword && <p className="text-red-500">* Please provide password</p>}
                            {passwordTooShort && <p className="text-red-500">* Password to short (at least 8 characters)</p>}
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="w-80">
                        <p className="text-xl">Confirm password</p>
                    </TableCell>
                    <TableCell className="w-100">
                        <div className="w-full flex flex-col">
                            <Input
                                value={confirmPassword}
                                type="password"
                                onChange={(event) => {
                                    setNoConfirmPassword(false);
                                    setConfirmPasswordNotMatch(false);
                                    setConfirmPassword(event.target.value);
                                }}
                            />
                            {noConfirmPassword && <p className="text-red-500">* Please confirm your password</p>}
                            {confirmPasswordNotMatch && <p className="text-red-500">* Your password is not match</p>}
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell />
                    <TableCell>
                        <Button
                            variant="secondary"
                            className="ml-auto text-xl"
                            onClick={() => {
                                if (
                                    !newUsername ||
                                    !newPassword ||
                                    !confirmPassword
                                ) {
                                    setNoUsername(!newUsername);
                                    setNoPassword(!newPassword);
                                    setNoConfirmPassword(!confirmPassword);
                                }
                                else if (newPassword.length < 8)
                                    setPasswordTooShort(true);
                                else if (newPassword !== confirmPassword)
                                    setConfirmPasswordNotMatch(true);
                                else if (!UsernameRegex.test(newUsername))
                                    setInvalidUsername(true);
                                else updateUser();
                            }}
                        >Confirm</Button>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>;
}