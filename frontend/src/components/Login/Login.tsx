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
import { Label } from "@radix-ui/react-menubar";
import api from "@/lib/api";
import { useNavigate } from "react-router";
import { error, success } from "@/hooks/toasts";

export default function () {
    const navigator = useNavigate();

    const [isOnLoginPage, setIsOnLoginPage] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [notFillUsername, setNotFillUserName] = useState(false);
    const [notFillPassword, setNotFillPassword] = useState(false);
    const [notFillConfirmPassword, setNotFillConfirmPassword] = useState(false);
    const [notMatchPassword, setNotMatchPassword] = useState(false);

    const [userNotFound, setUserNotFound] = useState(false);
    const [wrongPassword, setWrongPassword] = useState(false);

    function switchSide() {
        setNotFillUserName(false);
        setNotFillPassword(false);
        setNotFillConfirmPassword(false);
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setIsOnLoginPage(!isOnLoginPage);
    };

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
        {/* Right Card - Login/Signup Form */}
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
                            } else {
                                const loginForm = new FormData();
                                loginForm.set("username", username);
                                loginForm.set("password", password);
                                try {
                                    const response = await api.post<{
                                        access_token: string, [keys: string]: string
                                    }>("/user/login", loginForm, {
                                        validateStatus: () => true
                                    });
                                    if (response.status != 200) {
                                        if (response.status == 404)
                                            setUserNotFound(true);
                                        else if (response.status == 401)
                                            setWrongPassword(true);
                                    } else {
                                        localStorage.setItem("token", response.data.access_token);
                                        success("Logined");
                                        navigator("/");
                                    }
                                } catch (err) {
                                    if (err instanceof Error)
                                        error(err.message);
                                    console.error(err);
                                }
                            }
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
                            }}
                        />
                        {
                            notFillUsername
                            && <p className="text-red-500">* Please fill this field</p>
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
                            }}
                        />
                        {
                            notFillPassword
                            && <p className="text-red-500">* Please fill this field</p>
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