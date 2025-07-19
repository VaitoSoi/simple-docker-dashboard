import type { Permission } from "./enums";

export interface User {
    id: string,
    username: string,
    permissions: Permission[]
}