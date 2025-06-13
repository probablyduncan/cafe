// BA (hons) Events Management

import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene } from "../contentSchemaTypes";

/**
 * Each key of this map is a different kind of custom event
 * supported by `IEventsController`.
 * 
 * The type of each key is the detail type,
 * or payload required for events of that type.
 */
type EventMap = {
    setupComplete: undefined,

    linearNodeRenderStart: { node: RenderableLinearNode, isBackRendering: boolean },
    linearNodeRenderComplete: { node: RenderableLinearNode, isBackRendering: boolean, el: HTMLElement },

    choiceGroupRenderStart: { choiceGroup: RenderableChoice[] },
    choiceGroupRenderComplete: { choiceGroup: RenderableChoice[], choiceGroupEl: HTMLElement },

    choiceMadeRenderStart: { choiceNode: RenderableChoice, isBackRendering: boolean },
    choiceMadeRenderComplete: { choiceNode: RenderableChoice, isBackRendering: boolean, choiceMadeEl: HTMLElement },

    fastForwardStart: { lastClearChoicePos: NodePosition },
    fastForwardComplete: { lastChoiceMadePos: NodePosition },

    updateSpeed: { isFast: boolean },

    enterScene: { scene: Scene },
    exitScene: { scene: Scene },

    choose: { choiceNode: RenderableChoice},
    goto: { pos: NodePosition },
    reset: undefined,
}

/**
 * Union type of all custom event keys.
 */
export type EventName = keyof EventMap;

/**
 * Detail type of given event name, sent in payload when given event is fired.
 */
type EventDetail<T extends EventName> = EventMap[T];

/**
 * When firing an event, we want to enforce
 * two args for events *with* a detail type, like `goto`, 
 * but only one for events *without*, like `reset`.
 * 
 * For example, `fire("goto", { nodeId: "I"});`vs `fire("reset");`
 */
type EventArgs<T extends EventName> =
    EventDetail<T> extends undefined ? [name: T] : [name: T, detail: EventDetail<T>];

const VERBOSE_LOGGING = false;
export const events = {
    
    /**
     * Fires the given custom event with specified detail.
     */
    fire<T extends EventName>(...[name, detail = undefined]: EventArgs<T>) {
        if (VERBOSE_LOGGING) {
            console.log("Firing event", name, detail);
        }
        document.dispatchEvent(new CustomEvent(qualifyEventName(name), { detail }));
    },

    /**
     * Adds a listener for the given custom event type.
     */
    on<T extends EventName>(
        name: T,
        callback: (e: EventDetail<T>) => void,
        options?: AddEventListenerOptions,
    ) {
        document.addEventListener(
            qualifyEventName(name),
            (e: CustomEventInit<EventDetail<T>>) => { callback(e.detail!) },
            options,
        );
    },
}

function qualifyEventName(name: string) : string {
    return "cafe:" + name;
}