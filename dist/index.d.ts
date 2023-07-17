import { ConnectionTransport } from 'puppeteer-core';
export declare class ExtensionDebuggerTransport implements ConnectionTransport {
    static readonly REQUIRED_DEBUGGING_PROTOCOL_VERSION = "1.3";
    /**
     * If required, adjust this value to increase or decrese delay in ms between subsequent commands.
     * Note decreasing it too much can give issues.
     */
    delay: number;
    /**
     * Set to `true` to log protocol messages.
     */
    debug: boolean;
    private target;
    private debugee;
    private sessionId?;
    static create(tabId: number, functionSerializer?: FunctionConstructor): Promise<ExtensionDebuggerTransport>;
    private _initialize;
    private constructor();
    send(message: string): void;
    close(): void;
    onmessage?: (message: string) => void;
    onclose?: () => void;
    private static getTargetInfo;
    private closeTarget;
    private respondToCommand;
    private sendEvent;
    private emitDelayed;
    private _emit;
}
