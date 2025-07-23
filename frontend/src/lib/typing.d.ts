import type { Permission } from "./enums";

export interface User {
    id: string,
    username: string,
    permissions: Permission[]
}

export interface APIContainer {
    id: string,
    short_id: string,
    name: string,
    image: string,
    created: string,
    status: string,
    ports: string[],
}