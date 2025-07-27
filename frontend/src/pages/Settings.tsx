import Roles from "@/components/Setting/Roles";
import User from "@/components/Setting/User";
import Users from "@/components/Setting/Users";
import { HuhWhale } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useEffect, useState, type ComponentProps } from "react";
import { useNavigate, useSearchParams } from "react-router";

type Tabs = "user" | "users" | "roles" | "none"

export default function () {
    const navigator = useNavigate();
    const navigateToTab = (tab: Tabs) => navigator(`/settings?tab=${tab}`, { viewTransition: true });
    const [activeTab, setActiveTab] = useState<Tabs>("user");

    const [getParams] = useSearchParams();
    const selectedTab = getParams.get("tab");

    useEffect(() => {
        if (selectedTab && ["user", "users", "roles"].includes(selectedTab))
            setActiveTab(selectedTab as Tabs);
        else setActiveTab("none");
    }, [selectedTab]);

    return <div className="w-full h-full flex">
        <div className="w-11/12 h-11/12 flex flex-row m-auto">
            <div className="mt-auto mb-auto w-2/12 h-full border-r-2 flex flex-col gap-2 border-gray-700">
                <TabItem
                    className={"mt-10 " + (activeTab == "user" && "border-l-8 pl-8 bg-gray-300")}
                    onClick={() => navigateToTab("user")}
                >User</TabItem>
                <TabItem
                    className={activeTab == "users" && "border-l-8 pl-8 bg-gray-300"}
                    onClick={() => navigateToTab("users")}
                >Users</TabItem>
                <TabItem
                    className={activeTab == "roles" && "border-l-8 pl-8 bg-gray-300"}
                    onClick={() => navigateToTab("roles")}
                >Roles</TabItem>
                {/* <TabItem
                    className={activeTab == "system" && "border-l-8 pl-8 bg-gray-300"}
                    onClick={() => setActiveTab("system")}
                >System</TabItem> */}
            </div>
            <div className="w-10/12 h-full flex">
                {activeTab == "user" && <User />}
                {activeTab == "users" && <Users />}
                {activeTab == "roles" && <Roles />}
                {activeTab == "none" && <div className="m-auto flex flex-col items-center">
                    <HuhWhale className="size-60" />
                    <p className="text-2xl">Huh. What are you doing here ?</p>
                </div>}
            </div>
        </div>
    </div>;
}

function TabItem({ className, children, ...prop }: ComponentProps<"div">) {
    return <div
        className={cn("ml-auto mr-5 w-50 h-15 hover:bg-gray-300 rounded-md text-2xl font-semibold flex pl-10 items-center cursor-pointer", className)}
        {...prop}
    >
        {children}
    </div>;
}
