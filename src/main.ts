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

import { fromEvent, interval, merge, of, mergeMap, delay, Observable } from "rxjs";
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
}>;

const initialState: State = {
    gameEnd: false,
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
    const tick$ = interval(Constants.TICK_RATE_MS);

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

    const source$ = tick$
        .pipe(scan((s: State) => ({ gameEnd: false }), initialState))
        .subscribe((s: State) => {
            render(s);

            if (s.gameEnd) {
                show(gameover);
            } else {
                hide(gameover);
            }
        });
    
    // Parse CSV and get observables
    parseCsvToObservables(csvContents).subscribe(notes => {
        playNotes(notes, samples);
    });
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
    user_played: boolean;
    instrument_name: string;
    velocity: number;
    pitch: number;
    start: number;
    end: number;
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
                user_played: Boolean(row[0]),
                instrument_name: row[1],
                velocity: Number(row[2]),
                pitch: Number(row[3]),
                start: Number(row[4]),
                end: Number(row[5]),
            };
        });

        observer.next(notes);
        observer.complete();
    });
};


/**
 * Plays notes based on the parsed CSV data.
 *
 * @param notes Array of note data objects
 * @param samples Object mapping instrument names to Tone.Sampler instances
 */
const playNotes = (notes: NoteData[], samples: { [key: string]: Tone.Sampler }) => {
    notes.forEach(note => {
        if (note.user_played) {
            const sampler = samples[note.instrument_name];
            if (sampler) {
                // Schedule note playback
                Tone.Transport.schedule(time => {
                    sampler.triggerAttackRelease(Tone.Frequency(note.pitch, "midi").toNote(), '8n', time, note.velocity / 127);
                }, note.start);
            }
        }
    });

    // Start the Tone.js Transport to play scheduled notes
    Tone.Transport.start();
};

const noteToSvgMap: Map<NoteData, SVGGraphicsElement> = new Map();


/**
 * ノートデータに基づいてSVG要素を作成し、キャンバスに追加します。
 *
 * @param notes ノートデータの配列
 * @param svg SVGキャンバス要素
 */
const renderCircles = (notes: NoteData[], svg: SVGGraphicsElement) => {
    // 既存のノートを削除
    noteToSvgMap.forEach(circle => circle.remove());
    noteToSvgMap.clear();

    notes.forEach(note => {
        if (note.user_played) {
            // ノートに基づいてSVG要素を作成
            const color = getNoteColor(note.pitch);
            const circle = createSvgElement(svg.namespaceURI, "circle", {
                r: `${Note.RADIUS}`,
                cx: `${20 + (note.pitch % 10) * 10}%`, // サンプルの位置（カスタマイズする必要があります）
                cy: "0", // 初期位置（画面外）
                style: `fill: ${color}`,
                class: "note",
            }) as SVGGraphicsElement;

            svg.appendChild(circle);
            noteToSvgMap.set(note, circle); // ノートとSVG要素をマップに追加

            // ノートのアニメーションを開始
            animateCircle(circle, note.start, note.end);
        }
    });
};

/**
 * SVG要素のアニメーションを開始します。
 *
 * @param circle SVG要素
 * @param start ノートの開始時間
 * @param end ノートの終了時間
 */
const animateCircle = (circle: SVGGraphicsElement, start: number, end: number) => {
    const canvasHeight = Viewport.CANVAS_HEIGHT;
    const duration = end - start;

    // アニメーションの初期位置を設定
    circle.setAttribute("cy", "0");

    // Tone.Transportを使用してアニメーションのタイミングを同期
    Tone.Transport.schedule(time => {
        const animation = circle.animate(
            [
                { transform: `translateY(0)` },
                { transform: `translateY(${canvasHeight}px)` }
            ],
            {
                duration: duration * 1000, // 秒からミリ秒に変換
                fill: "forwards",
                easing: "linear",
            }
        );
        
        animation.onfinish = () => {
            circle.remove(); // アニメーション終了後に要素を削除
            noteToSvgMap.delete(Array.from(noteToSvgMap.keys()).find(note => noteToSvgMap.get(note) === circle)!); // ノートと要素のマッピングを削除
        };
    }, start);
};

/**
 * Maps pitch values to colors for circle visualization.
 *
 * @param pitch The pitch value
 * @returns The color for the circle
 */
const getNoteColor = (pitch: number): { color: string; cx: string } => {
    // Define colors based on pitch (customize as needed)
    switch (pitch) {
        case 67: return { color: 'green', cx: '20%' };
        case 59: return { color: 'red', cx: '40%' };
        case 62: return { color: 'blue', cx: '60%' };
        case 35: return { color: 'yellow', cx: '80%' };
        default: return { color: 'grey', cx: '0%' };
    }
};

//second commit
