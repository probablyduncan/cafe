import { onMount } from "solid-js";
import { useCafeContext } from "./CafeContext";

export function SpeedToggle() {
    const { config, setConfig } = useCafeContext();

    let ref: HTMLInputElement | undefined;
    onMount(() => {

        window.addEventListener("keydown", e => {
            if (e.key === "Shift") {
                setConfig("speed", "fast");
                if (ref) ref.checked = true;
            }
        });

        window.addEventListener("keyup", e => {
            if (e.key === "Shift") {
                setConfig("speed", "default");
                if (ref) ref.checked = false;
            }
        });
    });

    return (
        <label>
            <input
                ref={ref}
                type="checkbox"
                checked={config.speed === "fast"}
                onchange={e => setConfig("speed", e.target.checked ? "fast" : "default")}
            />
            Fast Forward <em><code>[Shift]</code></em>
        </label>
    )
}