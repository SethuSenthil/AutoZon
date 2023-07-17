import {ConnectionTransport} from 'puppeteer-core';
// eslint-disable-next-line node/no-unpublished-import
import type {ProtocolMapping} from 'devtools-protocol/types/protocol-mapping';

type EventMethod = keyof ProtocolMapping.Events;
type CommandMethod = keyof ProtocolMapping.Commands;

type Command<M extends CommandMethod> = {
  id?: number;
  method: M;
  params?: Object;
  sessionId?: string;
};

interface CommandResponse<M extends CommandMethod> extends Command<M> {
  error?: chrome.runtime.LastError;
  result?: any;
}

export class ExtensionDebuggerTransport implements ConnectionTransport {
  static readonly REQUIRED_DEBUGGING_PROTOCOL_VERSION = '1.3';

  /**
   * If required, adjust this value to increase or decrese delay in ms between subsequent commands.
   * Note decreasing it too much can give issues.
   */
  delay = 0.04 * 1000;

  /**
   * Set to `true` to log protocol messages.
   */
  debug = false;

  private target: chrome.debugger.TargetInfo;
  private debugee: chrome.debugger.Debuggee;
  private sessionId?: string;

  static create(
    tabId: number,
    functionSerializer?: FunctionConstructor
  ): Promise<ExtensionDebuggerTransport> {
    if (!chrome.debugger) {
      throw new Error('missing debugger permission!');
    }
    const debugee: chrome.debugger.Debuggee = {
      tabId: tabId,
    };
    return new Promise((resolve, reject) => {
      chrome.debugger.attach(
        debugee,
        ExtensionDebuggerTransport.REQUIRED_DEBUGGING_PROTOCOL_VERSION,
        async () => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(error);
          }
          const target = await this.getTargetInfo(debugee);
          const transport = new ExtensionDebuggerTransport(target);
          transport._initialize(functionSerializer);
          resolve(transport);
        }
      );
    });
  }

  private _initialize(functionSerializer?: FunctionConstructor) {
    if (functionSerializer) {
      Function = functionSerializer;
    } else {
      try {
        new Function();
      } catch (e) {
        Function = function () {
          return () => {};
        } as any as FunctionConstructor;
      }
    }
  }

  private constructor(target: chrome.debugger.TargetInfo) {
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

  send(message: string): void {
    if (this.debug) {
      console.debug('SEND', message);
    }
    const parsedMessage = JSON.parse(message);
    const method: CommandMethod = parsedMessage.method;
    if (method === 'Browser.getVersion') {
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, {
        product: 'chrome',
        protocolVersion:
          ExtensionDebuggerTransport.REQUIRED_DEBUGGING_PROTOCOL_VERSION,
        // Where should these come from? Don't seem to matter tho...
        jsVersion: '',
        revision: '',
        userAgent: '',
      });
      return;
    }

    if (method === 'Target.getBrowserContexts') {
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, {browserContextIds: []});
      return;
    }

    if (method === 'Target.setDiscoverTargets') {
      this.sendEvent('Target.targetCreated', {
        targetInfo: {
          ...this.target,
          targetId: this.target.id,
          canAccessOpener: false,
        },
      });
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, undefined);
      return;
    }

    if (method === 'Target.setAutoAttach') {
      if (!this.sessionId) {
        const sessionId = `session-${this.target.id}`; // UUID this?
        this.sessionId = sessionId;
        this.sendEvent('Target.attachedToTarget', {
          sessionId,
          targetInfo: {
            ...this.target,
            targetId: this.target.id,
            canAccessOpener: false,
          },
          waitingForDebugger: false,
        });
      }
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, undefined);
      return;
    }

    if (method === 'Target.activateTarget') {
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, undefined);
      return;
    }

    if (method === 'Target.closeTarget') {
      setTimeout(() => this.close(), this.delay);
      const command: Command<typeof method> = parsedMessage;
      this.respondToCommand(command, undefined);
      return;
    }

    if (method.startsWith('Target')) {
      throw new Error(`unhandled target command: ${message}`);
    }

    chrome.debugger.sendCommand(
      this.debugee,
      method,
      parsedMessage.params,
      result => {
        this.respondToCommand(parsedMessage, result);
      }
    );
  }

  close(): void {
    chrome.debugger.detach(this.debugee, () => {
      this.closeTarget();
    });
  }

  onmessage?: (message: string) => void;
  onclose?: () => void;

  private static getTargetInfo(
    debugee: chrome.debugger.Debuggee
  ): Promise<chrome.debugger.TargetInfo> {
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

  private closeTarget() {
    if (this.sessionId) {
      this.sendEvent('Target.detachedFromTarget', {
        sessionId: this.sessionId,
      });
    }
    this.onclose?.();
  }

  private respondToCommand<M extends CommandMethod>(
    command: Command<M>,
    result: ProtocolMapping.Commands[M]['returnType'] = {}
  ) {
    const error = chrome.runtime.lastError;
    const response: CommandResponse<M> = {
      ...command,
      error: error,
      result,
    };
    this.emitDelayed(response);
  }

  private sendEvent<M extends EventMethod>(
    method: M,
    ...params: ProtocolMapping.Events[M]
  ) {
    this._emit({method, params: params[0]});
  }

  private emitDelayed<Event = unknown>(response: Event) {
    setTimeout(() => {
      this._emit(response);
    }, this.delay);
  }

  private _emit<Event = unknown>(event: Event) {
    const json = JSON.stringify(event);
    if (this.debug) {
      console.debug('RECV', json);
    }
    this?.onmessage?.(json);
  }
}
