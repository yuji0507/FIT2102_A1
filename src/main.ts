/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { fromEvent, interval, merge, of, mergeMap, delay, Observable, from, tap, takeUntil, combineLatest, toArray } from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";

/** Constants */

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
} as const;

const Constants = {
    TICK_RATE_MS: 500,
    SONG_NAME: "RockinRobin",
} as const;

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};

/** User input */

type Key = "KeyH" | "KeyJ" | "KeyK" | "KeyL";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

type State = Readonly<{
    gameEnd: boolean;
    notes: NoteData[];
}>;

const initialState: State = {
    gameEnd: false,
    notes: [],
} as const;

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */

export function main(csvContents: string, samples: { [key: string]: Tone.Sampler }) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
    const preview = document.querySelector(
        "#svgPreview",
    ) as SVGGraphicsElement & HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    // Text fields
    const multiplier = document.querySelector("#multiplierText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector(
        "#highScoreText",
    ) as HTMLElement;

    /** User input */

    const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    const fromKey = (keyCode: Key) =>
        key$.pipe(filter(({ code }) => code === keyCode));

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS * 10);

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    const render = (s: State) => {

        // Add blocks to the main grid canvas
        
        const greenCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "20%",
            cy: "200",
            style: "fill: green",
            class: "shadow",
        });

        const redCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "40%",
            cy: "50",
            style: "fill: red",
            class: "shadow",
        });

        const blueCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "60%",
            cy: "50",
            style: "fill: blue",
            class: "shadow",
        });

        const yellowCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "80%",
            cy: "50",
            style: "fill: yellow",
            class: "shadow",
        });

        svg.appendChild(greenCircle);
        svg.appendChild(redCircle);
        svg.appendChild(blueCircle);
        svg.appendChild(yellowCircle);
    };

    const notes$: Observable<NoteData[]> = parseCsvToObservables(csvContents).pipe(
        mergeMap(noteArrays => from(noteArrays)), // 二次元配列をフラット化
        toArray()  // 一次元配列に変換
    );
    

    
    
    const source$ = combineLatest([tick$, notes$]).pipe(
        scan((state: State, [tick, notes]: [number, NoteData[]]) => {
            const updatedNotes = notes.map(note => ({
                ...note,
                position: (tick * 100)  // ノートの位置を更新
            }));

            const updatedState = {
                ...state,
                notes: updatedNotes
            };
            return updatedState;
        }, initialState)
    );
    

    playNotes(source$, samples, svg, initialState);

}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents, samples);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }

        fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
            .then((response) => response.text())
            .then((text) => startGame(text))
            .catch((error) =>
                console.error("Error fetching the CSV file:", error),
            );
        
    });

}



interface NoteData {
    user_played: string;
    instrument_name: string;
    velocity: number;
    pitch: number;
    start: number;
    end: number;
    position: number; // ノートの位置を管理するプロパティを追加
}

/**
* Parses CSV data and returns an observable for each column.
* @param csvContents The CSV data as a string
* @returns An object where keys are column names and values are observables emitting column values
*/
const parseCsvToObservables = (csvContents: string): Observable<NoteData[]> => {
    return new Observable<NoteData[]>(observer => {
        const rows = csvContents.split('\n').map(row => row.split(','));
        const header = rows[0];
        const dataRows = rows.slice(1);

        const notes: NoteData[] = dataRows.map(row => {
            return {
                user_played: String(row[0]),
                instrument_name: row[1],
                velocity: Number(row[2]),
                pitch: Number(row[3]),
                start: Number(row[4]),
                end: Number(row[5]),
                position: 0,
            };
        });

        observer.next(notes);
        observer.complete();
    });
};

function playNotes(source$: Observable<State>, samples: { [key: string]: Tone.Sampler }, svg: SVGGraphicsElement, s: State) {
    const activeCircles = new Set<SVGGraphicsElement>();  // 現在表示されているノートを管理するSet
    source$.subscribe(console.log)
    source$.subscribe(state => {
        state.notes.forEach(note => {
            const instrument = samples[note.instrument_name];
            const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
            const duration = (note.end - note.start);
            const velocity = note.velocity / 127;
            const { column, color } = assign_column(note.pitch);

            const startTime = Tone.now() + 1;

            if (note.user_played === "True") {
                // Find or create an SVG circle element for the note
                let circle = Array.from(activeCircles).find(c => c.getAttribute("data-note-id") === String(note.pitch));
                if (!circle) {
                    circle = createSvgElement(svg.namespaceURI, "circle", {
                        r: `${Note.RADIUS}`,
                        cx: `${20 + column * 20}%`,
                        cy: `${Note.RADIUS}`,
                        style: `fill: ${color}`,
                        class: "shadow",
                        "data-note-id": String(note.pitch),
                    }) as SVGGraphicsElement;

                    svg.appendChild(circle);
                    activeCircles.add(circle);
                }

                // Update the note position based on the tick
                const newY = Note.RADIUS + note.position;
                circle.setAttribute("cy", String(newY));
                console.log("Current Y Position:", newY);

                // Remove the circle when it reaches the bottom
                if (newY >= Viewport.CANVAS_HEIGHT - Note.RADIUS) {
                    removeNoteFromSVG(circle, activeCircles);
                }
            }

            // Trigger the instrument sound
            instrument.triggerAttackRelease(frequency, duration, startTime, velocity);
        });
    });
}

// ノートをSVGから削除し、管理セットからも削除する関数
function removeNoteFromSVG(noteElement: SVGGraphicsElement, activeCircles: Set<SVGGraphicsElement>) {
    noteElement.remove();  // SVGから要素を削除
    activeCircles.delete(noteElement);  // 管理セットから要素を削除
    console.log(`Removed note from SVG: ${noteElement}`);
}


/**
 * ノートのピッチに基づいて、円の列と色を返します。
 * 
 * @param pitch ノートのピッチ
 * @returns 列と色のオブジェクト
 */
const assign_column = (pitch: number): { column: number; color: string } => {
    const remainder = pitch % 4;
    if (remainder === 0) {
        return { column: 0, color: 'green' };
    } else if (remainder === 1) {
        return { column: 1, color: 'red' };
    } else if (remainder === 2) {
        return { column: 2, color: 'blue' };
    } else { // remainder === 3
        return { column: 3, color: 'yellow' };
    }
};