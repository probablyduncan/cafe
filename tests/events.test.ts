import { test, expect } from "vitest";
import { EventsController, type IEventsController } from "../src/lib/services/eventsController";

class MockEventTarget extends EventTarget {

    listenerMap: Map<string, EventListener[]> = new Map();

    addEventListener(type: string, callback: EventListener, options?: AddEventListenerOptions | boolean): void {
        const events = this.listenerMap.get(type) ?? [];
        events.push(callback);
        this.listenerMap.set(type, events);
    }

    dispatchEvent(event: Event): boolean {
        const events = this.listenerMap.get(event.type)
        if (events) {
            for (let handler of events) {
                handler(event);
            }
        }
        return true;
    }
}

test("events", () => {
    const handler: IEventsController = new EventsController(new MockEventTarget());

    let fired = false;
    handler.listen("reset", () => {
        fired = true;
    });

    let currentNode = "i";
    handler.listen("goto", (e) => {
        currentNode = e.nodeId;
    });

    handler.fire("reset");
    expect(fired).toBeTruthy();

    handler.fire("goto", { nodeId: "ii"});
    expect(currentNode).toBe("ii");
    handler.fire("goto", { nodeId: "iii"});
    expect(currentNode).toBe("iii");
});