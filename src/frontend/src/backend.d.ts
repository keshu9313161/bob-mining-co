import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface Score {
    bob: bigint;
    name: string;
    depth: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLeaderboard(): Promise<Array<Score>>;
    getPlayerScore(): Promise<Score | null>;
    getTotalGamesPlayed(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    loadProgress(): Promise<string | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveProgress(progress: string): Promise<void>;
    submitScore(name: string, bob: bigint, depth: bigint): Promise<void>;
}
