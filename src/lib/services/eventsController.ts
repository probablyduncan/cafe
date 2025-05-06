
// Where should I store the event detail types? Should that be centralized somewhere else?
// Probably comes from another place and would be used here, not sourced from here

import type { RenderableChoice, RenderableLinearNode, SceneNode } from "../schemasAndTypes";

/**
 * Each key of this map is a different kind of custom event
 * supported by `IEventsController`.
 * 
 * The type of each key is the detail type,
 * or payload required for events of that type.
 */
type EventMap = {
    setupComplete: undefined,

    nodeRenderStart: RenderableLinearNode,
    nodeRenderComplete: RenderableLinearNode,

    choiceGroupRenderStart: RenderableChoice[],
    choiceGroupRenderComplete: RenderableChoice[],

    choiceRenderStart: RenderableChoice,
    choiceRenderComplete: RenderableChoice,

    choiceMadeRenderStart: RenderableChoice,
    choiceMadeRenderComplete: RenderableChoice,

    choose: { node: RenderableChoice, el: HTMLElement },
    reset: undefined,
    goto: { nodeId: string, sceneId?: string, },
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
    EventDetail<T> extends undefined ? [name: T] : [name: T, data: EventDetail<T>];



/**
 * Interface for defining a custom EventsController.
 * 
 * This is used to add listeners to and fire
 * custom events defined in the `EventMap` type.
 */
export interface IEventsController {
    fire: <T extends EventName>(...[name, data]: EventArgs<T>) => void,
    listen: <T extends EventName>(
        name: T,
        callback: (e: EventDetail<T>) => void,
        options?: AddEventListenerOptions,
    ) => void,
}

/**
 * Implementation of IEventsController using an `EventTarget` 
 * and a `CustomEvent` to fire/handle events.
 */
export class EventsController implements IEventsController {

    private readonly _target: EventTarget;
    constructor(target: EventTarget) {
        this._target = target;
    }

    fire<T extends EventName>(...[name, data = undefined]: EventArgs<T>) {

        // maybe try this too?
        // this._listener.dispatchEvent(data === undefined ? new Event(name) : new CustomEvent(name, { detail: data }));

        this._target.dispatchEvent(new CustomEvent(this._qualifyEventName(name), { detail: data }));
    }

    listen<T extends EventName>(
        name: T,
        callback: (e: EventDetail<T>) => void,
        options?: AddEventListenerOptions,
    ) {
        this._target.addEventListener(
            this._qualifyEventName(name),
            (e: CustomEventInit<EventDetail<T>>) => { callback(e.detail!) },
            options,
        );
    }

    private _qualifyEventName = (name: string): string => "cafe:" + name;
}