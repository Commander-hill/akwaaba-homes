import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
interface SocketUser {
    id: string;
    role: string;
}
declare module 'socket.io' {
    interface Socket {
        user?: SocketUser;
    }
}
export declare const initializeSocket: (server: HttpServer) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export {};
//# sourceMappingURL=socket.d.ts.map