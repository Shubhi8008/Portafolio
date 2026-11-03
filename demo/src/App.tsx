import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent,
} from "react";
import {
    AsciiReveal,
    AsciiSkeleton,
    type AsciiRevealHandle,
    type MascotName,
    type Origin,
    type PresetName,
    type SkeletonVariant,
} from "ascii-reveal";
import { drawArt, type ArtName } from "./art";
import { AsciiBackdrop } from "./Backdrop";
import { SpookyBackdrop } from "./SpookyBackdrop";

type Theme = "system" | "light" | "dark";
type OriginMode = "center" | "corner" | "cursor";

/* Canvas artwork that redraws on resize and theme change. */
function Art({
    name,
    className,
    theme,
}: {
    name: ArtName;
    className: string;
    theme: Theme;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useLayoutEffect(() => {
        const cv = ref.current!;
        const draw = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const W = Math.round(cv.clientWidth * dpr),
                H = Math.round(cv.clientHeight * dpr);
            if (!W || !H) return;
            if (cv.width !== W || cv.height !== H) {
                cv.width = W;
                cv.height = H;
            }
            const cs = getComputedStyle(document.documentElement);
            const colors = {
                accent: cs.getPropertyValue("--accent").trim(),
                line: cs.getPropertyValue("--line").trim(),
                surface: cs.getPropertyValue("--bg").trim(),
            };
            drawArt(
                name,
                cv.getContext("2d", { willReadFrequently: true })!,
                W,
                H,
                dpr,
                colors,
            );
        };
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(cv);
        const mq = matchMedia("(prefers-color-scheme: dark)");
        mq.addEventListener("change", draw);
        return () => {
            ro.disconnect();
            mq.removeEventListener("change", draw);
        };
    }, [name, theme]);
    return (
        <canvas ref={ref} className={`media ${className}`} aria-hidden="true" />
    );
}

/* A real image from the design. Falls back to generated art if the file is missing. */
function Photo({
    src,
    fallback,
    className,
    theme,
}: {
    src: string;
    fallback: ArtName;
    className: string;
    theme: Theme;
}) {
    const [failed, setFailed] = useState(false);
    if (failed)
        return <Art name={fallback} className={className} theme={theme} />;
    return (
        <img
            src={src}
            alt=""
            className={`media ${className}`}
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

// GitHub repo. Drives the install command and docs links on the page.
const REPO = "quanhoangindex/ascii-reveal";
const INSTALL = `npm i github:${REPO}`;

const STEPS: { title: string; body: string; code: string }[] = [
    {
        title: "Install",
        body: "Add the package from npm, or straight from GitHub. React 17 or newer is all it needs.",
        code: `npm i ascii-reveal\n\n# or straight from GitHub\n${INSTALL}`,
    },
    {
        title: "Wrap your content",
        body: "Everything inside decodes into place when it mounts: text, images, canvases and video.",
        code: `import { AsciiReveal } from 'ascii-reveal';\n\n<AsciiReveal preset="decode">\n  <YourPage />\n</AsciiReveal>`,
    },
    {
        title: "Mark the pieces",
        body: "Optional attributes for cards, buttons, and anything that should stay untouched.",
        code: `<article data-ascii="surface">…</article>\n<button data-ascii="fade">Buy</button>\n<nav data-ascii="skip">…</nav>`,
    },
    {
        title: "Show loading states",
        body: "An ASCII skeleton paints instantly while data loads, then the real content decodes in. Use AsciiSkeleton on its own if you only want the placeholder.",
        code: `import { AsciiReveal, AsciiSkeleton } from 'ascii-reveal';\n\n<AsciiReveal loading={!data}>\n  {data\n    ? <Stats data={data} />\n    : <AsciiSkeleton variant="dither" />}\n</AsciiReveal>`,
    },
];

/* Tiny highlighter for the snippets: shell comments, strings, JSX tags, attributes, keywords. */
const TOKENS =
    /(#[^\n]*)|("[^"\n]*"|'[^'\n]*')|(<\/?)([A-Za-z][\w.]*)|(\/?>)|\b(import|from|npm)\b|([\w-]+)(?==)|(\{[^}\n]*\})|(github:[\w./-]+)/g;
function highlight(code: string) {
    const out: React.ReactNode[] = [];
    let last = 0,
        k = 0,
        m: RegExpExecArray | null;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(code))) {
        if (m.index > last) out.push(code.slice(last, m.index));
        const [all, cm, str, open, tag, close, kw, attr, expr, gh] = m;
        if (cm)
            out.push(
                <span key={k++} className="cm">
                    {cm}
                </span>,
            );
        else if (str)
            out.push(
                <span key={k++} className="str">
                    {str}
                </span>,
            );
        else if (open)
            out.push(
                <span key={k++} className="pn">
                    {open}
                </span>,
                <span key={k++} className="tag">
                    {tag}
                </span>,
            );
        else if (close)
            out.push(
                <span key={k++} className="pn">
                    {close}
                </span>,
            );
        else if (kw)
            out.push(
                <span key={k++} className="kw">
                    {kw}
                </span>,
            );
        else if (attr)
            out.push(
                <span key={k++} className="attr">
                    {attr}
                </span>,
            );
        else if (expr)
            out.push(
                <span key={k++} className="expr">
                    {expr}
                </span>,
            );
        else if (gh)
            out.push(
                <span key={k++} className="str">
                    {gh}
                </span>,
            );
        last = m.index + all.length;
    }
    if (last < code.length) out.push(code.slice(last));
    return out;
}

function CopyButton({ text }: { text: string }) {
    const [label, setLabel] = useState("Copy");
    const copy = () => {
        const done = (ok: boolean) => {
            setLabel(ok ? "Copied" : "Select");
            setTimeout(() => setLabel("Copy"), 1600);
        };
        try {
            navigator.clipboard.writeText(text).then(
                () => done(true),
                () => done(false),
            );
        } catch {
            done(false);
        }
    };
    return (
        <button
            type="button"
            className="copy-btn"
            onClick={copy}
            data-ascii="fade"
            aria-label="Copy code">
            {label}
        </button>
    );
}

const COMMITS = [
    "fix hydration flash",
    "tune glyph ramp",
    "cache font metrics",
    "drop layout thrash",
    "batch canvas draws",
    "respect reduced motion",
];
const REGIONS = [
    "eu-north-1",
    "eu-west-3",
    "us-east-2",
    "ap-northeast-1",
    "sa-east-1",
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
// benchmarks open the page with ?nofallback to measure raw performance
const FALLBACK =
    typeof location === "undefined" || !location.search.includes("nofallback");

/* Work section: one card per case study. Each loads behind an ASCII mascot, then decodes in. */
type CaseStudy = {
    mascot: MascotName;
    num: string;
    title: string;
    kind: string;
    hook: string;
    stat: [string, string];
    result: string;
    tags: string[];
};
const CASES: CaseStudy[] = [
    {
        mascot: "spider",
        num: "01",
        title: "Pull-Up",
        kind: "Design system · Delhi",
        hook: "Meeting people in Delhi is easy. Becoming a regular somewhere is hard.",
        stat: ["64", "interviews"],
        result: "Final design complete. App in development.",
        tags: ["User research", "Service design", "App"],
    },
    {
        mascot: "pumpkin",
        num: "02",
        title: "Jahota",
        kind: "Systems research · Rajasthan",
        hook: "Kids in Jahota learn coding from YouTube. Nobody at school tells them it can be a career.",
        stat: ["5", "parts of village life mapped"],
        result: "System map with four points for change.",
        tags: ["Field research", "Systems mapping"],
    },
    {
        mascot: "bat",
        num: "03",
        title: "Where Is My Train",
        kind: "UX evaluation · Indian Railways app",
        hook: "People trust the data. They don't trust the screen.",
        stat: ["11", "users surveyed"],
        result: "Four findings. Three design changes.",
        tags: ["Heuristic evaluation", "Survey", "Redesign"],
    },
];

function CaseCard({
    c,
    trigger,
    index,
}: {
    c: CaseStudy;
    trigger: number;
    index: number;
}) {
    const [loading, setLoading] = useState(false);
    const load = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => setLoading(false), 2400);
    };
    const first = useRef(trigger);
    // staggered so the cards don't all decode on the same frame
    useEffect(() => {
        if (trigger === first.current) return;
        const id = setTimeout(load, index * 260);
        return () => clearTimeout(id);
    }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <article className="card spooky-card case-card" data-ascii="surface">
            <AsciiReveal
                className="stack"
                loading={loading}
                selector="[data-swap]"
                revealOnMount={false}
                mascot={c.mascot}>
                <div className="case-top">
                    <span className="case-num mono" data-swap>{c.num}</span>
                    <span className="eyebrow" data-swap>{c.kind}</span>
                </div>
                <div className="spooky-body case-body">
                    <h3 className="case-title" data-swap>{c.title}</h3>
                    <p className="case-hook" data-swap>{c.hook}</p>
                </div>
                <div className="card-foot case-foot">
                    <p className="big" data-swap>
                        {c.stat[0]}
                        <span className="big-unit">{c.stat[1]}</span>
                    </p>
                    <p className="small muted" data-swap>{c.result}</p>
                    <ul className="skill-chips" data-swap>
                        {c.tags.map((t) => (
                            <li key={t}>{t}</li>
                        ))}
                    </ul>
                </div>
            </AsciiReveal>
        </article>
    );
}

/* Skeleton vs ascii-reveal: same fake request, same timing, measured time-to-readable */
const PROFILE = {
    name: "Shubham Singh Raghav",
    role: "Digital Experience Designer · New Delhi",
    cover: "images/me/linkedin-banner.webp",
    avatar: "images/me/linkedin-photo.webp",
    stats: [
        ["17", "Months in design roles"],
        ["4", "Design roles"],
        ["3", "Case studies"],
    ] as [string, string][],
};
// warm the cover image so the reveal can sample it the moment data lands
if (typeof Image !== "undefined")
    for (const src of [
        PROFILE.cover,
        PROFILE.avatar,
        "images/album-art.png",
        "images/story-bg.webp",
        "images/pullup/logo.png",
        "images/story-author.png",
    ]) {
        const im = new Image();
        im.src = src;
    }
function useFakeFetch(ms: number) {
    const [data, setData] = useState<typeof PROFILE | null>(null);
    const [took, setTook] = useState<number | null>(null);
    const t0 = useRef(0);
    const load = () => {
        setData(null);
        setTook(null);
        t0.current = performance.now();
        setTimeout(() => setData(PROFILE), ms);
    };
    return { data, took, setTook, t0, load };
}
type DemoKind = "profile" | "player" | "story";
type LoadMode = "reveal" | "only";
const MODES: Record<LoadMode, { tab: string; blurb: string; code: string }> = {
    reveal: {
        tab: "Skeleton + reveal",
        blurb: "The skeleton paints instantly. When data lands, the real content decodes in through the glyph grid.",
        code: `<AsciiReveal loading={!data} preset="PRESET">\n  {data\n    ? <Profile data={data} />\n    : <AsciiSkeleton variant="VARIANT" />}\n</AsciiReveal>`,
    },
    only: {
        tab: "Skeleton only",
        blurb: "Just the placeholder. Plain HTML and CSS, paints before any JavaScript runs, and the content swaps in as usual.",
        code: `{data\n  ? <Profile data={data} />\n  : <AsciiSkeleton variant="VARIANT" />}`,
    },
};

type SkProps = Parameters<typeof AsciiSkeleton>[0];

/** Big card: creator profile with cover art, avatar, stats and a button. */
function DemoProfile({
    data,
    variant,
    seed,
}: {
    data: typeof PROFILE | null;
    variant: SkeletonVariant;
    seed: number;
}) {
    if (data) {
        return (
            <div className="dcard">
                <div className="dc-cover">
                    <img src={data.cover} alt="LinkedIn banner: Shubham Singh Raghav, Interaction and UI/UX designer, New Delhi" decoding="async" />
                </div>
                <div className="dc-body">
                    <div className="dc-head">
                        <img
                            className="dc-avatar"
                            src={data.avatar}
                            alt=""
                            decoding="async"
                        />
                        <a className="dc-btn" data-ascii="fade"
                            href="https://www.linkedin.com/in/shubham-singh-93215421a/"
                            target="_blank" rel="noreferrer">
                            Connect on LinkedIn
                        </a>
                    </div>
                    <div className="dc-id">
                        <p className="dc-name">{data.name}</p>
                        <p className="dc-role">{data.role}</p>
                    </div>
                    <dl className="dc-stats">
                        {data.stats.map(([v, l]) => (
                            <div key={l}>
                                <dt>{l}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        );
    }
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard" aria-hidden="true">
            <div className="dc-cover">
                {sk({ rows: 26, className: "dc-fill", seed: seed + 70 })}
            </div>
            <div className="dc-body">
                <div className="dc-head">
                    <span className="dc-avatar dc-avatar-skel">
                        {sk({
                            rows: 5,
                            width: "100%",
                            height: "100%",
                            circle: true,
                            seed: seed + 40,
                        })}
                    </span>
                    {sk({
                        rows: 2,
                        width: 72,
                        height: 30,
                        className: "dc-btn-sk",
                        seed: seed + 3,
                    })}
                </div>
                <div className="dc-id">
                    {sk({
                        lines: 2,
                        widths: ["55%", "40%"],
                        seed,
                        className: "dc-skel-id",
                    })}
                </div>
                <div className="dc-stats">
                    {[0, 1, 2].map((i) => (
                        <div key={i}>
                            {sk({
                                lines: 2,
                                widths: ["60%", "45%"],
                                seed: seed + 11 * (i + 1),
                                className: "dc-skel-stat",
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Small card 1: a music player. Every visible part has a skeleton, including the progress bar and controls. */
function DemoPlayer({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard np">
            <div className="np-art">
                {ready ? (
                    <img src="images/album-art.png" alt="" decoding="async" />
                ) : (
                    sk({ rows: 9, className: "dc-fill", seed: 21 })
                )}
            </div>
            <div className="np-main">
                <p className="np-label">Now playing</p>
                {ready ? (
                    <div className="np-id">
                        <a className="np-title" href="https://open.spotify.com/track/2yR2sziCF4WEs3klW1F38d"
                            target="_blank" rel="noreferrer">KEEP UP</a>
                        <p className="np-artist">Odetari · on Spotify</p>
                    </div>
                ) : (
                    <div className="np-id">
                        {sk({
                            lines: 2,
                            widths: ["70%", "45%"],
                            seed: 23,
                            className: "np-skel",
                        })}
                    </div>
                )}
                {ready ? (
                    <div className="np-bar">
                        <span />
                    </div>
                ) : (
                    sk({
                        lines: 1,
                        widths: ["100%"],
                        seed: 24,
                        className: "np-bar-sk",
                    })
                )}
                <div className="np-times">
                    {ready ? (
                        <>
                            <span>0:48</span>
                            <span>2:13</span>
                        </>
                    ) : (
                        <>
                            {sk({ lines: 1, widths: ["28px"], seed: 25 })}
                            {sk({ lines: 1, widths: ["28px"], seed: 26 })}
                        </>
                    )}
                </div>
                <div className="np-ctrl" aria-hidden="true">
                    {ready ? (
                        <>
                            <span>⏮</span>
                            <span className="np-play" data-ascii="fade">
                                ❚❚
                            </span>
                            <span>⏭</span>
                        </>
                    ) : (
                        <>
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 27,
                            })}
                            {sk({
                                rows: 3,
                                width: 32,
                                height: 32,
                                circle: true,
                                seed: 28,
                            })}
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 29,
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Small card 2: a customer story. While loading, even the gradient background and the logo are skeletons. */
function DemoStory({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className={`dcard story${ready ? "" : " is-loading"}`}>
            {ready ? (
                <img
                    className="st-bg"
                    src="images/story-bg.webp"
                    alt=""
                    decoding="async"
                />
            ) : (
                sk({ rows: 30, className: "st-bg st-bg-sk", seed: 30 })
            )}
            <div className="st-top">
                {ready ? (
                    <img
                        className="st-logo st-wordmark"
                        src="images/pullup/logo.png"
                        alt="Pull-Up"
                        decoding="async"
                    />
                ) : (
                    sk({
                        rows: 3,
                        width: 32,
                        height: 32,
                        className: "st-logo-sk",
                        seed: 32,
                    })
                )}
                {ready ? (
                    <div>
                        <p className="st-co">Pull-Up research</p>
                        <p className="st-sub">
                            64 interviews about finding community in Delhi.
                        </p>
                    </div>
                ) : (
                    <div className="st-skel-co">
                        {sk({ lines: 2, widths: ["46%", "78%"], seed: 31 })}
                    </div>
                )}
            </div>
            {ready ? (
                <p className="st-quote">
                    "Once you've seen someone a few times in the same place,
                    they become easy to approach."
                </p>
            ) : (
                <div className="st-skel-quote">
                    {sk({ lines: 2, widths: ["100%", "70%"], seed: 33 })}
                </div>
            )}
            <div className="st-foot">
                {ready ? (
                    <>
                        <span className="st-av st-av-id" aria-hidden="true">P42</span>
                        <span className="st-by">
                            Participant 42 · Insight 2
                        </span>
                        <a className="st-link" href="#work">Read the case study →</a>
                    </>
                ) : (
                    <>
                        {sk({
                            rows: 3,
                            width: 28,
                            height: 28,
                            circle: true,
                            seed: 35,
                        })}
                        <div className="st-skel-by">
                            {sk({ lines: 1, widths: ["55%"], seed: 37 })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/** One demo card in the bento: fakes a 1.2 s fetch, then shows the content (decoded or plain, depending on the mode). */
function DemoSlot({
    kind,
    run,
    mode,
    variant,
    preset,
    onReady,
}: {
    kind: DemoKind;
    run: number;
    mode: LoadMode;
    variant: SkeletonVariant;
    preset: PresetName;
    onReady: (kind: DemoKind, ms: number | null) => void;
}) {
    const f = useFakeFetch(1200);
    useEffect(() => {
        if (run > 0) f.load();
    }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        onReady(kind, f.took);
    }, [f.took]); // eslint-disable-line react-hooks/exhaustive-deps
    // without the reveal, content is readable the moment data lands
    useEffect(() => {
        if (mode === "only" && f.data)
            f.setTook(performance.now() - f.t0.current);
    }, [f.data]); // eslint-disable-line react-hooks/exhaustive-deps
    const demo =
        kind === "profile" ? (
            <DemoProfile data={f.data} variant={variant} seed={7} />
        ) : kind === "player" ? (
            <DemoPlayer ready={!!f.data} variant={variant} />
        ) : (
            <DemoStory ready={!!f.data} variant={variant} />
        );
    return (
        <div className={`slot slot-${kind}`}>
            {mode === "reveal" ? (
                <AsciiReveal
                    className="slot-fill"
                    loading={!f.data}
                    revealOnMount={false}
                    preset={preset}
                    fallback={FALLBACK}
                    onRevealComplete={() =>
                        f.setTook(performance.now() - f.t0.current)
                    }>
                    {demo}
                </AsciiReveal>
            ) : (
                demo
            )}
        </div>
    );
}

const SK_VARIANTS: [SkeletonVariant, string][] = [
    ["dither", "Dither"],
    ["scan", "Scan"],
    ["braille", "Braille"],
    ["terminal", "Terminal"],
];
const RV_PRESETS: [PresetName, string][] = [
    ["decode", "Decode"],
    ["dither", "Dither"],
    ["terminal", "Terminal"],
    ["blueprint", "Blueprint"],
];

function CompareSection() {
    const [run, setRun] = useState(0);
    const [mode, setMode] = useState<LoadMode>("reveal");
    const [variant, setVariant] = useState<SkeletonVariant>("dither");
    const [preset, setPreset] = useState<PresetName>("decode");
    const [times, setTimes] = useState<Record<"profile" | "player", number | null>>({
        profile: null,
        player: null,
    });
    const ref = useRef<HTMLElement>(null);
    const reload = () => {
        setTimes({ profile: null, player: null });
        setRun((n) => n + 1);
    };
    // start the first load when the section scrolls into view
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    io.disconnect();
                    setRun((n) => n || 1);
                }
            },
            { threshold: 0.3 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    const onReady = useCallback(
        (k: DemoKind, ms: number | null) =>
            setTimes((t) => (t[k] === ms ? t : { ...t, [k]: ms })),
        [],
    );
    const vals = Object.values(times);
    const done = run > 0 && vals.every((v) => v != null);
    const slowest = done ? Math.max(...(vals as number[])) : 0;
    const m = MODES[mode];
    const cmpCode = m.code
        .replace("VARIANT", variant)
        .replace("PRESET", preset);
    const pick = <T extends string>(
        value: T,
        set: (v: T) => void,
        options: [T, string][],
        label: string,
    ) => (
        <div className="seg" role="group" aria-label={label}>
            {options.map(([v, t]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => {
                        set(v);
                        reload();
                    }}>
                    {t}
                </button>
            ))}
        </div>
    );
    return (
        <section
            className="sec compare"
            id="skeleton"
            aria-label="Loading states"
            ref={ref}>
            <header className="cmp-head">
                <p className="eyebrow">Loading states</p>
                <h2>
                    <span className="aura">+1000 aura</span>
                    <br />
                    per loading state.
                </h2>
            </header>

            <div className="cmp-tabs" role="tablist" aria-label="Loading mode">
                {(Object.keys(MODES) as LoadMode[]).map((k) => (
                    <button
                        key={k}
                        role="tab"
                        type="button"
                        aria-selected={mode === k}
                        className="cmp-tab"
                        onClick={() => {
                            setMode(k);
                            reload();
                        }}>
                        {MODES[k].tab}
                    </button>
                ))}
            </div>

            <div className="cmp-bar" role="group" aria-label="Demo controls">
                <div className="group">
                    <span className="glabel">Skeleton</span>
                    {pick(variant, setVariant, SK_VARIANTS, "Skeleton style")}
                </div>
                {mode === "reveal" && (
                    <div className="group">
                        <span className="glabel">Reveal</span>
                        {pick(preset, setPreset, RV_PRESETS, "Reveal preset")}
                    </div>
                )}
                <div className="cmp-status">
                    <span className="tier-time" aria-live="polite">
                        {!run ? (
                            "waiting"
                        ) : done ? (
                            <>
                                all ready in{" "}
                                <b>{(slowest / 1000).toFixed(2)} s</b>
                            </>
                        ) : (
                            "loading…"
                        )}
                    </span>
                    <button className="cta" type="button" onClick={reload}>
                        ↻ Reload
                    </button>
                </div>
            </div>

            <div className="bento" role="tabpanel">
                {(["profile", "player"] as DemoKind[]).map((k) => (
                    <DemoSlot
                        key={`${k}-${mode}`}
                        kind={k}
                        run={run}
                        mode={mode}
                        variant={variant}
                        preset={preset}
                        onReady={onReady}
                    />
                ))}
            </div>

            <div className="snippet cmp-snippet">
                <pre className="code cmp-code">
                    <code>
                        {cmpCode.split("\n").map((l, i) => (
                            <span key={i}>
                                {highlight(l)}
                                {"\n"}
                            </span>
                        ))}
                    </code>
                </pre>
                <CopyButton text={cmpCode} />
            </div>
        </section>
    );
}

function DeployCard({
    onReplay,
}: {
    onReplay: (e: MouseEvent<HTMLElement>) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [d, setD] = useState({
        commit: "a3f9c21 · fix hydration flash",
        region: "eu-north-1",
        latency: "84 ms",
        cache: "97.3%",
    });
    const redeploy = () => {
        setLoading(true);
        setTimeout(() => {
            setD({
                commit:
                    Math.floor(Math.random() * 0xfffffff)
                        .toString(16)
                        .padStart(7, "0") +
                    " · " +
                    pick(COMMITS),
                region: pick(REGIONS),
                latency: 58 + Math.floor(Math.random() * 60) + " ms",
                cache: (94 + Math.random() * 5.8).toFixed(1) + "%",
            });
            setLoading(false);
        }, 1500);
    };
    return (
        <article
            className="card card-3part deploy-card"
            data-ascii="surface"
            tabIndex={0}
            aria-label="Deploy status card"
            onClick={onReplay}>
            <AsciiReveal
                className="stack"
                loading={loading}
                selector="[data-swap]"
                revealOnMount={false}
                mascot="spider"
                fallback={FALLBACK}>
                <div className="row between">
                    <p className="eyebrow">Production deploy</p>
                    <span className="chip" data-ascii="fade">
                        <span data-swap>● Ready</span>
                    </span>
                </div>
                <dl className="rows">
                    <dt>Commit</dt>
                    <dd className="mono" data-swap>
                        {d.commit}
                    </dd>
                    <dt>Region</dt>
                    <dd className="mono" data-swap>
                        {d.region}
                    </dd>
                    <dt>p95</dt>
                    <dd className="mono" data-swap>
                        {d.latency}
                    </dd>
                    <dt>Cache hit</dt>
                    <dd className="mono" data-swap>
                        {d.cache}
                    </dd>
                </dl>
                <div className="card-foot">
                    <button
                    className="btn primary full"
                    type="button"
                    data-ascii="fade"
                                        disabled={loading}
                    onClick={redeploy}>
                    Redeploy
                </button>
                </div>
            </AsciiReveal>
        </article>
    );
}



const XP = [
    { org: "Howwl Design", role: "Visual design intern", from: 5, to: 8, ux: false },
    { org: "Saksham NGO", role: "Art facilitator", from: 13, to: 15, ux: false },
    { org: "Cuvette", role: "UX and product design intern", from: 36, to: 40, ux: true },
    { org: "Bug Aeterium", role: "UX design intern", from: 41, to: 45, ux: true },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mlabel = (m: number) => `${MONTHS[m % 12]} ${2022 + Math.floor(m / 12)}`;

function XpTimeline() {
    const W = 300, row = 36, top = 4, H = top + XP.length * row + 22;
    const x = (m: number) => (m / 48) * W;
    return (
        <figure className="xp-chart">
            <svg viewBox={`0 0 ${W} ${H}`} role="img"
                aria-label="Timeline of design roles from 2022 to 2025: Howwl Design 2022, Saksham NGO 2023, Cuvette and Bug Aeterium 2025.">
                {[0, 12, 24, 36, 48].map((m) => (
                    <line key={m} x1={x(m)} x2={x(m)} y1={top} y2={H - 18} className="xp-grid" />
                ))}
                {XP.map((r, i) => {
                    const y = top + i * row;
                    const right = x(r.to + 1) > W - 120;
                    return (
                        <g key={r.org}>
                            <title>{`${r.org}, ${r.role}, ${mlabel(r.from)} to ${mlabel(r.to)}`}</title>
                            <rect x={x(r.from)} y={y + 8} width={x(r.to + 1) - x(r.from)} height={16} rx={4}
                                className={r.ux ? "xp-bar ux" : "xp-bar"} />
                            <text x={right ? x(r.from) - 6 : x(r.to + 1) + 6} y={y + 17}
                                textAnchor={right ? "end" : "start"} className="xp-label" dy={4}>{r.org}</text>
                        </g>
                    );
                })}
                {[2022, 2023, 2024, 2025].map((yr, i) => (
                    <text key={yr} x={x(i * 12) + 2} y={H - 4} className="xp-axis">{yr}</text>
                ))}
            </svg>
            <figcaption className="xp-key">
                <span><i className="ux" /> UX roles</span>
                <span><i /> Visual and teaching roles</span>
            </figcaption>
        </figure>
    );
}

function MeClip() {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const v = ref.current;
        if (!v) return;
        const mq = matchMedia("(prefers-reduced-motion: reduce)");
        const apply = () => {
            if (mq.matches) v.pause();
            else v.play().catch(() => {});
        };
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);
    return (
        <video
            ref={ref}
            className="me-photo"
            width={360}
            height={360}
            poster="images/me/me-poster.webp"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label="Short looping clip of Shubham Singh Raghav">
            <source src="images/me/me-loop.webm" type="video/webm" />
            <source src="images/me/me-loop.mp4" type="video/mp4" />
        </video>
    );
}


/** Edge glow for sideways-scrolling bars: sets --fade-l / --fade-r (0 to 1) from the scroll position. */
function useScrollEdges(selector: string) {
    useEffect(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
        const update = (el: HTMLElement) => {
            const max = el.scrollWidth - el.clientWidth;
            const l = max > 1 ? Math.min(1, el.scrollLeft / 160) : 0;
            const r = max > 1 ? Math.min(1, (max - el.scrollLeft) / 160) : 0;
            el.style.setProperty("--fade-l", l.toFixed(2));
            el.style.setProperty("--fade-r", r.toFixed(2));
        };
        const offs = els.map((el) => {
            const fn = () => update(el);
            fn();
            el.addEventListener("scroll", fn, { passive: true });
            window.addEventListener("resize", fn);
            return () => {
                el.removeEventListener("scroll", fn);
                window.removeEventListener("resize", fn);
            };
        });
        return () => offs.forEach((off) => off());
    }, [selector]);
}

export default function App() {
    useScrollEdges(".toolbar");
    const page = useRef<AsciiRevealHandle>(null);
    const [preset, setPreset] = useState<PresetName>("decode");
    const [originMode, setOriginMode] = useState<OriginMode>("center");
    const [speed, setSpeed] = useState(1);
    const [theme, setTheme] = useState<Theme>("system");
    const [copied, setCopied] = useState("Copy");
    const [spookyRun, setSpookyRun] = useState(0);

    const grid = useRef<HTMLElement>(null);
    const spooky = useRef<HTMLElement>(null);
    // Replay only re-runs the demo cards, with the wave measured from the card grid
    const origin = (): Origin => {
        const r = grid.current?.getBoundingClientRect();
        if (!r) return "center";
        if (originMode === "corner") return { x: r.left, y: r.top };
        if (originMode === "cursor") return "pointer";
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const replay = () => {
        if (grid.current)
            page.current?.reveal({
                within: grid.current,
                origin: origin(),
                preset,
                speed,
            });
    };
    const showCards = () => {
        grid.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(replay, 550);
    };

    // mascots show themselves: run when the section comes into view, then every few seconds while it stays visible
    useEffect(() => {
        const el = spooky.current;
        if (!el) return;
        let timer = 0;
        const canHover = matchMedia("(hover: hover)").matches;
        const run = () => setSpookyRun((n) => n + 1);
        const tick = () => {
            // touch screens keep :hover after a tap, so only real pointers pause it
            if (!(canHover && el.matches(":hover"))) run();
        }; // repeats pause while you hover
        const io = new IntersectionObserver(
            ([e]) => {
                clearInterval(timer);
                clearTimeout(timer);
                if (e.isIntersecting) {
                    timer = window.setTimeout(() => {
                        run();
                        timer = window.setInterval(tick, 7000);
                    }, 700);
                }
            },
            { threshold: 0.2 },
        );
        io.observe(el);
        return () => {
            io.disconnect();
            clearInterval(timer);
            clearTimeout(timer);
        };
    }, []);

    // replay only when the preset or origin actually changes (not on mount, and not on React's dev double-run)
    const prev = useRef({ preset, originMode });
    useEffect(() => {
        if (
            prev.current.preset === preset &&
            prev.current.originMode === originMode
        )
            return;
        prev.current = { preset, originMode };
        replay();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset, originMode]);

    useEffect(() => {
        if (theme === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                (e.key === "r" || e.key === "R") &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !/INPUT|TEXTAREA|SELECT/.test(
                    (document.activeElement as HTMLElement)?.tagName,
                )
            )
                replay();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    });

    const replayCard = (e: MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        page.current?.reveal({
            within: e.currentTarget,
            origin: { x: e.clientX, y: e.clientY },
            preset,
            speed,
        });
    };
    const replayKey = (e: React.KeyboardEvent<HTMLElement>) => {
        if (
            e.target !== e.currentTarget ||
            (e.key !== "Enter" && e.key !== " ")
        )
            return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        page.current?.reveal({
            within: e.currentTarget,
            origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
            preset,
            speed,
        });
    };
    const copy = () => {
        const done = (ok: boolean) => {
            setCopied(ok ? "Copied" : "Select");
            setTimeout(() => setCopied("Copy"), 1600);
        };
        try {
            navigator.clipboard.writeText("npm i ascii-reveal").then(
                () => done(true),
                () => done(false),
            );
        } catch {
            done(false);
        }
    };

    const seg = <T extends string>(
        value: T,
        set: (v: T) => void,
        options: [T, React.ReactNode][],
        label: string,
    ) => (
        <div className="seg" role="group" aria-label={label}>
            {options.map(([v, text]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => set(v)}>
                    {text}
                </button>
            ))}
        </div>
    );

    return (
        <>
            
            <div className="page">
                <AsciiReveal
                    ref={page}
                    className="frame"
                    preset={preset}
                    speed={speed}
                    duration="cinematic"
                    fallback={FALLBACK}
                    origin={{
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                    }}>
                    <nav className="sec nav" aria-label="Main">
                        <a className="brand" href="#top">Shubham Singh Raghav</a>
                        <div className="nav-links">
                            <a href="#work">Work</a>
                            <a href="#contact">Contact</a>
                        </div>
                    </nav>

                    <section className="sec hero" id="top" aria-label="About Shubham">
                        <article className="card me-card" data-ascii="surface" aria-label="Profile card">
                            <div className="me-top">
                                <MeClip />
                                <span className="chip">Open to work</span>
                            </div>
                            <dl className="me-rows">
                                <dt>Name</dt><dd>Shubham Singh Raghav</dd>
                                <dt>Role</dt><dd>Interaction designer</dd>
                                <dt>Based in</dt><dd>New Delhi</dd>
                                <dt>Studied</dt><dd>M.Des Interaction Design, JKLU<br />BFA Animation, Amity</dd>
                                <dt>Looking for</dt><dd>Junior or associate product design roles</dd>
                            </dl>
                        </article>
                        <div className="hero-copy">
                            <h1>Interaction designer</h1>
                            <p className="lede">I make complex things simple to use.</p>
                            <p className="hero-status">
                                I start with people. My M.Des project, Pull-Up, began with 64 interviews.
                            </p>
                            <div className="actions">
                                <a className="cta" href="#work" data-ascii="fade">See my work</a>
                                <a className="btn-outline" href="mailto:shubham.raghav205@gmail.com" data-ascii="fade">
                                    shubham.raghav205@gmail.com
                                </a>
                            </div>
                        </div>
                    </section>

                    <div className="card-zone">
                        <div
                            className="sec toolbar"
                            role="group"
                            aria-label="Animation controls"
                            data-ascii="skip">
                            <div className="group">
                                <span className="glabel">Preset</span>
                                {seg(
                                    preset,
                                    setPreset,
                                    [
                                        ["decode", "Decode"],
                                        ["dither", "Dither"],
                                        ["terminal", "Terminal"],
                                        ["blueprint", "Blueprint"],
                                    ],
                                    "Preset",
                                )}
                            </div>
                            <div className="group">
                                <span className="glabel">Wave from</span>
                                {seg(
                                    originMode,
                                    setOriginMode,
                                    [
                                        ["center", "Center"],
                                        ["corner", "Corner"],
                                        [
                                            "cursor",
                                            <>
                                                <span className="on-pointer">Cursor</span>
                                                <span className="on-touch">Tap</span>
                                            </>,
                                        ],
                                    ],
                                    "Wave origin",
                                )}
                            </div>
                            <div className="group">
                                <label className="glabel" htmlFor="speed">
                                    Speed
                                </label>
                                <input
                                    type="range"
                                    id="speed"
                                    min={0.4}
                                    max={2}
                                    step={0.1}
                                    value={speed}
                                    onChange={(e) => setSpeed(+e.target.value)}
                                    onPointerUp={replay}
                                    onKeyUp={replay}
                                />
                                <span className="speedval">
                                    {speed.toFixed(1)}×
                                </span>
                            </div>
                            <button
                                type="button"
                                className="cta"
                                onClick={replay}>
                                Replay <kbd>R</kbd>
                            </button>
                        </div>

                        <section className="sec demo" id="about" aria-label="About me">
                            <div className="demo-head">
                                <p>
                                    <span className="on-pointer">Click</span>
                                    <span className="on-touch">Tap</span> a card
                                    to replay it from that point
                                </p>
                                <p>Redeploy runs the loading → loaded cycle</p>
                            </div>

                            <main className="grid" ref={grid}>
                                <article className="card card-3part" data-ascii="surface" tabIndex={0}
                                    aria-label="About card" onClick={replayCard} onKeyDown={replayKey}>
                                    <div className="row">
                                        <img className="avatar media" src="images/me/me-poster.webp" width="56" height="56"
                                            alt="Shubham Singh Raghav" />
                                        <div className="grow">
                                            <p className="title">Shubham Singh Raghav</p>
                                            <p className="small muted">Interaction designer, New Delhi</p>
                                        </div>
                                    </div>
                                    <div className="card-mid">
                                        <p className="body">
                                            I studied animation first, so I think about how things move.
                                            My M.Des taught me to think about how systems fit together.
                                        </p>
                                        <ul className="skill-chips" aria-label="Skills">
                                            <li>User research</li>
                                            <li>Systems mapping</li>
                                            <li>Interaction design</li>
                                            <li>Prototyping</li>
                                            <li>Design systems</li>
                                        </ul>
                                    </div>
                                    <div className="card-foot">
                                        <div className="row between">
                                            <span className="tiny mono muted">BFA 2023 · M.Des 2026</span>
                                            <span className="chip" data-ascii="fade">Open to work</span>
                                        </div>
                                        <div className="row">
                                            <a className="btn primary grow" href="mailto:shubham.raghav205@gmail.com" data-ascii="fade">Say hello</a>
                                            <a className="btn grow" href="https://www.linkedin.com/in/shubham-singh-93215421a" target="_blank" rel="noreferrer" data-ascii="fade">LinkedIn</a>
                                        </div>
                                    </div>
                                </article>

                                <article className="card card-3part" data-ascii="surface" tabIndex={0}
                                    aria-label="Poster folio card" onClick={replayCard} onKeyDown={replayKey}>
                                    <img className="photo media" src="images/posters/vultures.webp" width="720" height="720"
                                        alt="Concept album cover in red and black: hooded figures under a jagged metal-style title" />
                                    <div className="row between" style={{ alignItems: "baseline" }}>
                                        <p className="title">Poster folio</p>
                                        <p className="title mono">06</p>
                                    </div>
                                    <p className="small muted" style={{ marginTop: -8 }}>
                                        Type and layout studies · concept posters, not commissions
                                    </p>
                                    <button className="btn primary full" type="button" data-ascii="fade">View posters</button>
                                </article>

                                <article className="card card-3part" data-ascii="surface" tabIndex={0}
                                    aria-label="Experience card" onClick={replayCard} onKeyDown={replayKey}>
                                    <div className="row between">
                                        <p className="eyebrow">Experience</p>
                                        <span className="chip" data-ascii="fade">4 roles</span>
                                    </div>
                                    <div className="xp-head"><p className="big">17<span className="big-unit">months</span></p>
                                    <p className="small muted" style={{ marginTop: -8 }}>
                                        in design roles since 2022 · 10 of them in UX
                                    </p>
                                    </div>
                                    <XpTimeline />
                                </article>

                                <article className="card card-3part" data-ascii="surface" tabIndex={0}
                                    aria-label="Field notes card" onClick={replayCard} onKeyDown={replayKey}>
                                    <p className="eyebrow">Field notes</p>
                                    <div className="card-mid">
                                        <h2 className="headline">I do my research where people are</h2>
                                        <p className="body">
                                            I interviewed young adults about finding community in Delhi. I sat with
                                            students, parents and teachers in a Rajasthan village. I met wheelchair
                                            users at NGOs in Bangalore. I tested a train app with the people who use it.
                                        </p>
                                        <dl className="field-stats">
                                            <div><dt>64</dt><dd>interviews<br />Pull-Up</dd></div>
                                            <div><dt>5</dt><dd>sectors mapped<br />Jahota</dd></div>
                                            <div><dt>11</dt><dd>users surveyed<br />WIMT</dd></div>
                                        </dl>
                                    </div>
                                    <div className="card-foot">
                                        <div className="row between">
                                            <span className="tiny mono muted">Field first, screens second</span>
                                            <a className="tiny mono" href="#work">Read →</a>
                                        </div>
                                    </div>
                                </article>

                                <article
                                    className="card card-3part"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Code card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <div className="row between">
                                        <p className="eyebrow">Usage</p>
                                        <span className="tiny mono muted">
                                            App.tsx
                                        </span>
                                    </div>
                                    <div className="card-mid">
                                    <div className="code">
                                        <span className="ln">
                                            <span className="kw">import</span>{" "}
                                            {"{ AsciiReveal }"}{" "}
                                            <span className="kw">from</span>{" "}
                                            <span className="str">
                                                "ascii-reveal"
                                            </span>
                                            ;
                                        </span>
                                        <span className="ln"> </span>
                                        <span className="ln">
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                AsciiReveal
                                            </span>{" "}
                                            <span className="attr">preset</span>
                                            =
                                            <span className="str">
                                                "decode"
                                            </span>
                                            <span className="pn">&gt;</span>
                                        </span>
                                        <span className="ln">
                                            {"  "}
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                ProfileCard
                                            </span>{" "}
                                            <span className="pn">/&gt;</span>
                                        </span>
                                        <span className="ln">
                                            {"  "}
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                Gallery
                                            </span>{" "}
                                            <span className="attr">items</span>=
                                            {"{prints}"}{" "}
                                            <span className="pn">/&gt;</span>
                                        </span>
                                        <span className="ln">
                                            <span className="pn">&lt;/</span>
                                            <span className="tag">
                                                AsciiReveal
                                            </span>
                                            <span className="pn">&gt;</span>
                                        </span>
                                    </div>
                                    <p className="small muted">
                                        Wrap any subtree. Text, images and
                                        canvases inside it reveal in one wave.
                                    </p>
                                    <div className="install">
                                        <span className="install-label">Install</span>
                                        <code>npm i ascii-reveal</code>
                                    </div>
                                    </div>
                                    <div className="card-foot">
                                        <div className="row between">
                                            <span className="tiny mono muted">No dependencies · ~15 KB</span>
                                            <a className="tiny mono" href="https://github.com/quanhoangindex/ascii-reveal#readme" target="_blank" rel="noreferrer">Docs →</a>
                                        </div>
                                    </div></article>

                                <DeployCard onReplay={replayCard} />
                            </main>
                        </section>
                    </div>

                    <CompareSection />

                    <section
                        className="sec spooky work"
                        id="work"
                        aria-label="Case studies"
                        ref={spooky}>
                        <SpookyBackdrop />
                        <div className="spooky-head">
                            <div className="spooky-intro">
                                <p className="eyebrow">Selected work · 3 case studies</p>
                                <h2>People first. Screens second.</h2>
                                <p className="body">
                                    Three problems I studied in the field. Each
                                    one starts with the people who live it.
                                </p>
                            </div>
                            <div className="spooky-actions">
                                <button
                                    className="cta"
                                    type="button"
                                    onClick={() => setSpookyRun((n) => n + 1)}>
                                    Replay
                                </button>
                            </div>
                        </div>
                        <div className="spooky-grid case-grid">
                            {CASES.map((c, i) => (
                                <CaseCard
                                    key={c.title}
                                    c={c}
                                    index={i}
                                    trigger={spookyRun}
                                />
                            ))}
                        </div>
                    </section>

                    <section
                        className="sec usage"
                        id="get-started"
                        aria-label="Get started">
                        <div className="usage-intro">
                            <p className="eyebrow">Get started</p>
                            <h2>Use it in your project</h2>
                            <p className="body">
                                Four steps from install to loading states. The
                                README covers every prop, theming, and use
                                without React.
                            </p>
                            <a
                                className="text-link"
                                href={`https://github.com/${REPO}#readme`}
                                target="_blank"
                                rel="noreferrer">
                                Read the docs on GitHub →
                            </a>
                        </div>
                        <ol className="steps">
                            {STEPS.map((st, i) => (
                                <li key={st.title} className="step">
                                    <span className="step-n">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div className="step-body">
                                        <h3>{st.title}</h3>
                                        <p className="small muted">{st.body}</p>
                                        <div className="snippet">
                                            <pre className="code">
                                                <code>
                                                    {highlight(st.code)}
                                                </code>
                                            </pre>
                                            <CopyButton text={st.code} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <footer className="foot" data-ascii="skip">
                        <span className="credit">
                            Made by{" "}
                            <a
                                href="https://www.linkedin.com/in/shubham-singh-93215421a/"
                                target="_blank"
                                rel="noreferrer">
                                Shubham Singh Raghav
                            </a>
                            , M.Des
                        </span>
                        {seg(
                            theme,
                            setTheme,
                            [
                                ["system", "System"],
                                ["light", "Light"],
                                ["dark", "Dark"],
                            ],
                            "Theme",
                        )}
                    </footer>
                </AsciiReveal>
            </div>
        </>
    );
}
