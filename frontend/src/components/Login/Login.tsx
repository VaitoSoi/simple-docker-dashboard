import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useNavigate } from "react-router";
import { error, success } from "@/hooks/toasts";
import type { LoginResponse } from "@/lib/typing";
import { AxiosError } from "axios";
import { Label } from "../ui/label";
import { UsernameRegex } from "@/lib/enums";

export default function () {
    const navigator = useNavigate();

    const [isOnLoginPage, setIsOnLoginPage] = useState<boolean>(true);
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [invalidUsername, setInvalidUsername] = useState<boolean>(false);
    const [invalidPassword, setInvalidPassword] = useState<boolean>(false);
    const [notFillUsername, setNotFillUserName] = useState<boolean>(false);
    const [notFillPassword, setNotFillPassword] = useState<boolean>(false);
    const [notFillConfirmPassword, setNotFillConfirmPassword] = useState<boolean>(false);
    const [notMatchPassword, setNotMatchPassword] = useState<boolean>(false);

    const [userNotFound, setUserNotFound] = useState<boolean>(false);
    const [wrongPassword, setWrongPassword] = useState<boolean>(false);

    function switchSide() {
        setNotFillUserName(false);
        setNotFillPassword(false);
        setNotFillConfirmPassword(false);
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setIsOnLoginPage(!isOnLoginPage);
    };

    async function login() {
        const loginForm = new FormData();
        loginForm.set("username", username);
        loginForm.set("password", password);
        try {
            const response = await api.post<LoginResponse>("/user/login", loginForm);
            localStorage.setItem("token", response.data.access_token);
            localStorage.setItem("username", response.data.user.username);
            success("Logined");
            navigator("/");
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 404)
                    setUserNotFound(true);
                else if (err.status == 401)
                    setWrongPassword(true);
            }
            if (err instanceof Error)
                error(err.message);
            console.error(err);
        }
    }

    async function signup() {
        try {
            await api.post('/user/', {
                username,
                password
            });
            success("Sign up successfully");
            switchSide();
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
            } else {
                console.error(err);
                if (err instanceof Error) 
                    error(err.message);
            }
        }
    }

    return <div className="h-150 w-250 m-auto rounded-2xl border-2 border-gray-400 flex flex-row relative overflow-hidden">
        {/* Left Card - Info/Placeholder Card */}
        <div className={`w-1/2 h-full flex flex-col absolute transition-all duration-700 ease-in-out border z-20 bg-white ${isOnLoginPage
            ? 'translate-x-0 rounded-tr-none rounded-br-none rounded-tl-2xl rounded-bl-2xl'
            : 'translate-x-full rounded-tl-none rounded-bl-none rounded-tr-2xl rounded-br-2xl'}`}>
            <div className="flex flex-col m-auto items-center gap-2">
                <p className="text-8xl">🐋</p>
                <p className="text-3xl font-semibold">Simple Docker Dashboard</p>
                <p className="text-lg text-center w-10/12">This is a very simple Docker Dashboard. Allow you to monitor your Docker container, also view your container logs</p>
            </div>
        </div>
        {/* Login */}
        <Card className={`w-1/2 h-full absolute transition-all duration-700 ease-in-out z-0 ${isOnLoginPage
            ? 'translate-x-full opacity-100 z-10 rounded-tl-none rounded-bl-none rounded-tr-2xl rounded-br-2xl'
            : 'translate-x-0 opacity-0 z-0'}`}>
            <div className="flex flex-col mt-auto mb-auto gap-5">
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your account credential below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <Label>Username</Label>
                        <Input
                            id="username"
                            type="username"
                            placeholder="vaitosoi"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setNotFillUserName(false);
                                setUserNotFound(false);
                            }}
                        />
                        {
                            notFillUsername
                            && <p className="text-red-500">* Please fill this field</p>
                        }
                        {
                            userNotFound
                            && <p className="text-red-500">* User not found D:</p>
                        }
                    </div>
                    <div className="grid gap-2">
                        <Label>Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setNotFillPassword(false);
                                setWrongPassword(false);
                            }}
                        />
                        {
                            notFillPassword
                            && <p className="text-red-500">* Please fill this field</p>
                        }
                        {
                            wrongPassword
                            && <p className="text-red-500">* Wrong password D:</p>
                        }
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button
                        className="w-full"
                        onClick={async () => {
                            if (!username || !password) {
                                setNotFillUserName(!username);
                                setNotFillPassword(!password);
                            } else login();
                        }}
                    >
                        Login
                    </Button>
                    <Button variant="outline" className="w-full" onClick={switchSide}>
                        Sign up
                    </Button>
                </CardFooter>
            </div>
        </Card>

        {/* Sign up */}
        <Card className={`w-1/2 h-full absolute transition-all duration-700 ease-in-out z-0 ${isOnLoginPage
            ? 'translate-x-full opacity-0 z-0'
            : 'translate-x-0 opacity-100 z-10 rounded-tr-none rounded-br-none rounded-tl-2xl rounded-bl-2xl'}`}>
            <div className="flex flex-col mt-auto mb-auto gap-5">
                <CardHeader>
                    <CardTitle>Sign up</CardTitle>
                    <CardDescription>
                        Enter your account credential below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <div className="grid gap-2">
                        <Label>Username</Label>
                        <Input
                            id="username"
                            type="username"
                            placeholder="vaitosoi"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setNotFillUserName(false);
                                setInvalidUsername(false);
                            }}
                        />
                        {
                            notFillUsername
                            && <p className="text-red-500">* Please fill this field</p>
                        }
                        {
                            invalidUsername
                            && <p className="text-red-500">* Your username is invalid (allow 0-9, a-z, and underscore)</p>
                        }
                    </div>
                    <div className="grid gap-2">
                        <Label>Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setNotFillPassword(false);
                                setInvalidPassword(false);
                            }}
                        />
                        {
                            notFillPassword
                            && <p className="text-red-500">* Please fill this field</p>
                        }
                        {
                            invalidPassword
                            && <p className="text-red-500">* Your password is too short (at least 8 characters)</p>
                        }
                    </div>
                    <div className="grid gap-2">
                        <Label>Confirm your password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setNotMatchPassword(false);
                                setNotFillConfirmPassword(false);
                            }}
                        />
                        {
                            notMatchPassword
                            && <p className="text-red-500">* Your password is not match</p>
                        }
                        {
                            notFillConfirmPassword
                            && <p className="text-red-500">* Please fill this field</p>
                        }
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button
                        className="w-full"
                        onClick={() => {
                            if (!username || !password || !confirmPassword) {
                                setNotFillUserName(!username);
                                setNotFillPassword(!password);
                                setNotFillConfirmPassword(!confirmPassword);
                            }
                            else if (password != confirmPassword) {
                                setNotMatchPassword(true);
                            }
                            else if (!UsernameRegex.test(username))
                                setInvalidUsername(true);
                            else if (password.length < 8)
                                setInvalidPassword(true);
                            else signup();
                        }}
                    >
                        Sign up
                    </Button>
                    <Button variant="outline" className="w-full" onClick={switchSide}>
                        Login
                    </Button>
                </CardFooter>
            </div>
        </Card>
    </div>;
}