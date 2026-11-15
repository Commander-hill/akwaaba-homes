import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
interface SocketUser {
    id: string;
    role: string;
    exp?: number;
}
declare module 'socket.io' {
    interface Socket {
        user?: SocketUser;
    }
}
export declare const initializeSocket: (server: HttpServer) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitToUser: (userId: string, event: string, payload: any) => void;
export declare const emitToAll: (event: string, payload: any) => void;
export declare const emitToAdmins: (event: string, payload: any) => void;
export declare const emitToLandlords: (event: string, payload: any) => void;
export declare const isUserOnline: (userId: string) => boolean;
export declare const getOnlineUserIds: () => string[];
export declare const getOnlineUsersCount: () => number;
export {};
//# sourceMappingURL=socket.d.ts.map