import type { Permission } from "./enums";

export interface APIUser {
    id: string,
    username: string,
    permissions: Permission[],
    roles: string[]
}

export interface LoginResponse {
    access_token: string,
    token_type: "bearer",
    user: APIUser
}

export interface APIRole {
    name: string
    permissions: Permission[]
    hex: `#${string}`
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

export interface APIImage {
    id: string,
    short_id: string,
    tags: string[],
    hub_url: string
}