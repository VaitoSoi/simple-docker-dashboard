import { Network, Scroll } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "@/lib/api";
import type { APIUser } from "@/lib/typing";
import { error } from "@/hooks/toasts";
import { Permission } from "@/lib/enums";
import { Forbidden, Huh, HuhError, Loading } from "@/components/ui/icon";
import { AxiosError } from "axios";
import ListImage from "@/components/Images/ListImage";
import ListNetwork from "@/components/Networks/ListNetwork";

export function List() {
    const navigator = useNavigate();

    const token = localStorage.getItem("token");
    const [allowToSee, setAllowToSee] = useState<boolean>(null);
    const [errored, setErrored] = useState<boolean>(false);

    async function getPermission() {
        if (!token)
            return navigator("/login");

        try {
            await api.get<APIUser>(
                `/user/has_permissions?permissions=${Permission.SeeNetwork}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            return setAllowToSee(true);
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.status == 403)
                    return setAllowToSee(false);

                else if (err.status == 401)
                    return navigator("/login");
            }

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
                ? <div className="flex w-full h-full">
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
                : <div className="w-full h-full pt-20 pl-10 pr-10 flex flex-col">
                    <div className="flex ml-3 items-center">
                        <Network className="w-40 h-40" color="#006eff" strokeWidth={1} />
                        <div className="mt-7 ml-5">
                            <p className="text-5xl font-semibold">Networks</p>
                            <p className="text-2xl mt-1 ml-1">View all your networks</p>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <ListNetwork />
                    </div>
                </div>
        }</>
    );
}

export default List;
