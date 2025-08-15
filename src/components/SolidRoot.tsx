import { DialoguePanel } from "./DialoguePanel";
import { CafeContextProvider } from "./CafeContext";
import style from "./layout.module.css";
import { SpeedToggle } from "./SpeedToggle";
import { DebugPanel } from "./DebugPanel";

export function Root() {
    return (
        <CafeContextProvider>
            <MainColumn />
        </CafeContextProvider>
    )
}

export function DebugRoot() {
    return (
        <CafeContextProvider debug>
            <div style={{
                overflow: "hidden",
                display: "grid",
                "grid-template-columns": "auto 1fr",
            }}>
                <MainColumn />
                <DebugColumn />
            </div>
        </CafeContextProvider>
    );
}

function MainColumn() {
    return (
        <div style={{
            position: "relative",
            width: "100%",
            height: "100svh",
        }}>

            {/* header */}
            <header class={style.topnav}>
                <nav>
                    <a href="/info" title="about this cafe">info</a>
                    <a href="/config" slot="nav">config</a>
                </nav>
            </header>

            {/* dialogue */}
            <main class={style["scroll-container"]} style={{
                "overflow-y": "scroll",
                width: "100%",
                display: "flex",
                "flex-direction": "column-reverse",
                "max-height": "100svh",
                padding: "0 1rem",
            }}>
                <div style={{
                    width: "65ch",
                    "max-width": "100%",
                    margin: "0 auto",
                }}>
                    <DialoguePanel />
                </div>
            </main>

            {/* full width footer */}
            <footer class={style.bottomnav}>
                <SpeedToggle />
            </footer>
        </div>
    );
}

function DebugColumn() {
    return (
        <aside style={{
            overflow: "scroll",
            width: "100%",
            "max-width": "65ch",
            height: "100svh",
            padding: "1rem",
            "border-left": "2px solid var(--text-color)",
        }}>
            <DebugPanel />
        </aside>
    );
}