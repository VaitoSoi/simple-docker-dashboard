import { Container } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Resource from "@/components/Containers/Resource";
import ListContainer from "@/components/Containers/ListContainer";
import api from "@/lib/api";
import type { User } from "@/lib/typing";
import { error } from "@/hooks/toasts";
import { Permission } from "@/lib/enums";
import { Forbidden, Huh, HuhError, HuhWhale, Loading } from "@/components/ui/whale";
import { AxiosError } from "axios";

export function List() {
    const navigator = useNavigate();

    const token = localStorage.getItem("token");
    const [allowToSee, setAllowToSee] = useState<boolean | null>(null);
    const [errored, setErrored] = useState<boolean>(false);

    async function getPermission() {
        if (!token)
            return navigator("/login");

        try {
            await api.get<User>(
                `/user/has_permissions?permissions=${Permission.SeeContainers}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            return setAllowToSee(true);
        } catch (err) {
            if (err instanceof AxiosError && err.status == 403)
                return setAllowToSee(false);

            console.error(err);
            setErrored(true);
            if (err instanceof Error)
                error(err.message);
        }
    }
    useEffect(() => void getPermission(), []);

    return (
        <>{
            !allowToSee || errored
                ? <div className="flex w-screen h-screen">
                    <div className="m-auto">
                        {
                            errored
                                ? <HuhError />
                                : allowToSee === null
                                    ? <Loading />
                                    : allowToSee === false
                                        ? <Forbidden />
                                        : <Huh />
                        }
                    </div>
                </div>
                : <div className="w-full h-9/10 mt-20 ml-10 flex flex-col">
                    <div className="flex ml-3">
                        <Container className="w-40 h-40" color="#006eff" strokeWidth={1} />
                        <div className="mt-7 ml-5">
                            <p className="text-5xl font-semibold">Containers</p>
                            <p className="text-2xl mt-1 ml-1">View all your running containers</p>
                        </div>
                        <div className="ml-auto">
                            <Resource />
                        </div>
                    </div>
                    <div className="mt-5">
                        <ListContainer />
                    </div>
                </div>
        }</>
    );
}

export default List;
