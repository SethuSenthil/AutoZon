"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionDebuggerTransport = void 0;
class ExtensionDebuggerTransport {
    constructor(target) {
        /**
         * If required, adjust this value to increase or decrese delay in ms between subsequent commands.
         * Note decreasing it too much can give issues.
         */
        this.delay = 0.04 * 1000;
        /**
         * Set to `true` to log protocol messages.
         */
        this.debug = false;
        this.target = target;
        this.debugee = {
            tabId: target.tabId,
        };
        chrome.debugger.onEvent.addListener((source, method, params) => {
            if (source.tabId === this.target.tabId) {
                this._emit({
                    method: method,
                    params: params,
                    sessionId: this.sessionId,
                });
            }
        });
        chrome.debugger.onDetach.addListener(source => {
            if (source.tabId === this.target.tabId) {
                this.closeTarget();
            }
        });
    }
    static create(tabId, functionSerializer) {
        if (!chrome.debugger) {
            throw new Error('missing debugger permission!');
        }
        const debugee = {
            tabId: tabId,
        };
        return new Promise((resolve, reject) => {
            chrome.debugger.attach(debugee, ExtensionDebuggerTransport.REQUIRED_DEBUGGING_PROTOCOL_VERSION, () => __awaiter(this, void 0, void 0, function* () {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(error);
                }
                const target = yield this.getTargetInfo(debugee);
                const transport = new ExtensionDebuggerTransport(target);
                transport._initialize(functionSerializer);
                resolve(transport);
            }));
        });
    }
    _initialize(functionSerializer) {
        if (functionSerializer) {
            Function = functionSerializer;
        }
        else {
            try {
                new Function();
            }
            catch (e) {
                Function = function () {
                    return () => { };
                };
            }
        }
    }
    send(message) {
        if (this.debug) {
            console.debug('SEND', message);
        }
        const parsedMessage = JSON.parse(message);
        const method = parsedMessage.method;
        if (method === 'Browser.getVersion') {
            const command = parsedMessage;
            this.respondToCommand(command, {
                product: 'chrome',
                protocolVersion: ExtensionDebuggerTransport.REQUIRED_DEBUGGING_PROTOCOL_VERSION,
                // Where should these come from? Don't seem to matter tho...
                jsVersion: '',
                revision: '',
                userAgent: '',
            });
            return;
        }
        if (method === 'Target.getBrowserContexts') {
            const command = parsedMessage;
            this.respondToCommand(command, { browserContextIds: [] });
            return;
        }
        if (method === 'Target.setDiscoverTargets') {
            this.sendEvent('Target.targetCreated', {
                targetInfo: Object.assign(Object.assign({}, this.target), { targetId: this.target.id, canAccessOpener: false }),
            });
            const command = parsedMessage;
            this.respondToCommand(command, undefined);
            return;
        }
        if (method === 'Target.setAutoAttach') {
            if (!this.sessionId) {
                const sessionId = `session-${this.target.id}`; // UUID this?
                this.sessionId = sessionId;
                this.sendEvent('Target.attachedToTarget', {
                    sessionId,
                    targetInfo: Object.assign(Object.assign({}, this.target), { targetId: this.target.id, canAccessOpener: false }),
                    waitingForDebugger: false,
                });
            }
            const command = parsedMessage;
            this.respondToCommand(command, undefined);
            return;
        }
        if (method === 'Target.activateTarget') {
            const command = parsedMessage;
            this.respondToCommand(command, undefined);
            return;
        }
        if (method === 'Target.closeTarget') {
            setTimeout(() => this.close(), this.delay);
            const command = parsedMessage;
            this.respondToCommand(command, undefined);
            return;
        }
        if (method.startsWith('Target')) {
            throw new Error(`unhandled target command: ${message}`);
        }
        chrome.debugger.sendCommand(this.debugee, method, parsedMessage.params, result => {
            this.respondToCommand(parsedMessage, result);
        });
    }
    close() {
        chrome.debugger.detach(this.debugee, () => {
            this.closeTarget();
        });
    }
    static getTargetInfo(debugee) {
        return new Promise((resolve, reject) => {
            chrome.debugger.getTargets(targets => {
                for (const target of targets) {
                    if (target.attached && target.tabId === debugee.tabId) {
                        resolve(target);
                        return;
                    }
                }
                reject(new Error('target not found'));
            });
        });
    }
    closeTarget() {
        var _a;
        if (this.sessionId) {
            this.sendEvent('Target.detachedFromTarget', {
                sessionId: this.sessionId,
            });
        }
        (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    respondToCommand(command, result = {}) {
        const error = chrome.runtime.lastError;
        const response = Object.assign(Object.assign({}, command), { error: error, result });
        this.emitDelayed(response);
    }
    sendEvent(method, ...params) {
        this._emit({ method, params: params[0] });
    }
    emitDelayed(response) {
        setTimeout(() => {
            this._emit(response);
        }, this.delay);
    }
    _emit(event) {
        var _a;
        const json = JSON.stringify(event);
        if (this.debug) {
            console.debug('RECV', json);
        }
        (_a = this === null || this === void 0 ? void 0 : this.onmessage) === null || _a === void 0 ? void 0 : _a.call(this, json);
    }
}
exports.ExtensionDebuggerTransport = ExtensionDebuggerTransport;
ExtensionDebuggerTransport.REQUIRED_DEBUGGING_PROTOCOL_VERSION = '1.3';
