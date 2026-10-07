import { animate } from "animejs";

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let DPR = 1;

const pointer = {
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    speed: 0,
    down: false
};

const marks = [];
const splats = [];
const dust = [];
const shockwaves = [];

let active = null;
let lastTime = performance.now();

const MAX_MARKS = 14000;
const MAX_SPLATS = 1400;
const MAX_DUST = 2200;

function resize() {
    DPR = Math.min(
        window.devicePixelRatio || 1,
        1.5
    );

    W = innerWidth;
    H = innerHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;

    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.setTransform(
        DPR,
        0,
        0,
        DPR,
        0,
        0
    );
}

resize();

addEventListener("resize", resize);

function pos(e) {
    const r = canvas.getBoundingClientRect();

    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

canvas.addEventListener("pointerdown", e => {
    const p = pos(e);

    pointer.x = p.x;
    pointer.y = p.y;
    pointer.px = p.x;
    pointer.py = p.y;

    pointer.speed = 0;
    pointer.down = true;

    active = [];

    addMark(
        pointer.x,
        pointer.y,
        7,
        true
    );

    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", e => {
    const p = pos(e);

    const dx = p.x - pointer.x;
    const dy = p.y - pointer.y;

    const distance = Math.hypot(dx, dy);

    pointer.px = pointer.x;
    pointer.py = pointer.y;

    pointer.x = p.x;
    pointer.y = p.y;

    pointer.speed =
        pointer.speed * 0.65 +
        distance * 0.35;

    if (!pointer.down || distance < 0.15) {
        return;
    }

    paint(
        pointer.px,
        pointer.py,
        pointer.x,
        pointer.y,
        distance
    );
});

canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

function release(e) {
    if (!pointer.down) {
        return;
    }

    pointer.down = false;

    if (active && active.length > 3) {
        rupture();
    } else {
        bloom(
            pointer.x,
            pointer.y,
            1
        );
    }

    active = null;

    try {
        canvas.releasePointerCapture(
            e.pointerId
        );
    } catch {}
}

function paint(x1, y1, x2, y2, distance) {
    const steps = Math.max(
        1,
        Math.ceil(distance / 2.2)
    );

    const angle = Math.atan2(
        y2 - y1,
        x2 - x1
    );

    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const speedFactor = Math.min(
        pointer.speed,
        35
    );

    const width =
        10 -
        speedFactor * 0.16 +
        Math.random() * 3;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;

        const x =
            x1 +
            (x2 - x1) * t;

        const y =
            y1 +
            (y2 - y1) * t;

        /*
         * Instead of drawing a line,
         * stamp many imperfect pieces
         * of ink around the trajectory.
         */

        const density =
            pointer.speed > 22
                ? 0.48
                : 0.82;

        if (Math.random() < density) {
            addMark(
                x,
                y,
                width,
                false
            );
        }

        /*
         * Darker ink pools.
         */
        if (Math.random() < 0.14) {
            addMark(
                x +
                    nx *
                    (
                        Math.random() -
                        0.5
                    ) *
                    width,

                y +
                    ny *
                    (
                        Math.random() -
                        0.5
                    ) *
                    width,

                width *
                    (
                        1.2 +
                        Math.random() * .9
                    ),

                false
            );
        }

        /*
         * Dry-brush fragments.
         */
        if (
            pointer.speed > 8 &&
            Math.random() < 0.12
        ) {
            const side =
                (
                    Math.random() -
                    0.5
                ) *
                width *
                2.5;

            addMark(
                x + nx * side,
                y + ny * side,
                width *
                    (
                        .25 +
                        Math.random() * .55
                    ),
                false
            );
        }
    }

    /*
     * Tiny flecks around fast strokes.
     */
    if (
        pointer.speed > 10 &&
        Math.random() < .55
    ) {
        const side =
            Math.random() > .5
                ? 1
                : -1;

        splats.push({
            x:
                x2 +
                nx *
                side *
                (
                    Math.random() *
                    width *
                    2
                ),

            y:
                y2 +
                ny *
                side *
                (
                    Math.random() *
                    width *
                    2
                ),

            r:
                .4 +
                Math.random() * 2.2,

            life: .7 +
                Math.random() * .3,

            vx:
                (
                    Math.random() -
                    .5
                ) * .6,

            vy:
                (
                    Math.random() -
                    .5
                ) * .6
        });
    }

    trim();
}

function addMark(x, y, size, first) {
    if (!active) {
        return;
    }

    const irregular =
        .65 +
        Math.random() * .7;

    const mark = {
        x:
            x +
            (
                Math.random() -
                .5
            ) *
            size *
            .65,

        y:
            y +
            (
                Math.random() -
                .5
            ) *
            size *
            .65,

        rx:
            size *
            irregular,

        ry:
            size *
            (
                .35 +
                Math.random() *
                .8
            ),

        rotation:
            Math.random() *
            Math.PI,

        alpha:
            first
                ? .85
                : .25 +
                  Math.random() *
                  .6,

        life: 1,

        vx: 0,
        vy: 0,

        spin:
            (
                Math.random() -
                .5
            ) *
            .04,

        burst: false,

        seed:
            Math.random() *
            1000
    };

    active.push(mark);
    marks.push(mark);
}

function bloom(x, y, power) {
    shockwaves.push({
        x,
        y,

        radius: 0,

        max:
            80 +
            Math.random() * 100,

        life: 1,

        power
    });

    for (
        let i = 0;
        i < 90 * power;
        i++
    ) {
        const a =
            Math.random() *
            Math.PI *
            2;

        const force =
            Math.pow(
                Math.random(),
                1.8
            ) *
            9 *
            power;

        splats.push({
            x,
            y,

            r:
                .5 +
                Math.random() * 3.5,

            life:
                .7 +
                Math.random() * .3,

            vx:
                Math.cos(a) *
                force,

            vy:
                Math.sin(a) *
                force
        });
    }
}

function rupture() {
    const ox = pointer.x;
    const oy = pointer.y;

    bloom(
        ox,
        oy,
        2
    );

    /*
     * Tear every mark away from
     * the release point.
     */
    for (const mark of active) {
        const dx = mark.x - ox;
        const dy = mark.y - oy;

        const d = Math.max(
            20,
            Math.hypot(dx, dy)
        );

        const nx = dx / d;
        const ny = dy / d;

        const force =
            2 +
            Math.min(
                12,
                650 / d
            ) +
            Math.random() * 4;

        mark.vx =
            nx * force +
            (
                Math.random() -
                .5
            ) * 2;

        mark.vy =
            ny * force +
            (
                Math.random() -
                .5
            ) * 2;

        mark.burst = true;
        mark.life =
            .7 +
            Math.random() * .5;

        mark.spin *= 5;
    }

    /*
     * Rip fragments directly from
     * the existing stroke.
     */
    for (
        let i = 0;
        i < Math.min(
            700,
            active.length
        );
        i++
    ) {
        const source =
            active[
                Math.floor(
                    Math.random() *
                    active.length
                )
            ];

        const a =
            Math.random() *
            Math.PI *
            2;

        const force =
            2 +
            Math.random() * 16;

        dust.push({
            x: source.x,
            y: source.y,

            vx:
                Math.cos(a) *
                force,

            vy:
                Math.sin(a) *
                force,

            r:
                .3 +
                Math.random() * 2.8,

            rotation:
                Math.random() *
                Math.PI,

            spin:
                (
                    Math.random() -
                    .5
                ) * .3,

            life:
                .7 +
                Math.random() * .4
        });
    }

    /*
     * A few large pieces give the
     * release some visual weight.
     */
    for (
        let i = 0;
        i < 25;
        i++
    ) {
        const source =
            active[
                Math.floor(
                    Math.random() *
                    active.length
                )
            ];

        const a =
            Math.random() *
            Math.PI *
            2;

        const force =
            5 +
            Math.random() * 12;

        dust.push({
            x: source.x,
            y: source.y,

            vx:
                Math.cos(a) *
                force,

            vy:
                Math.sin(a) *
                force,

            r:
                3 +
                Math.random() * 8,

            rotation:
                Math.random() *
                Math.PI,

            spin:
                (
                    Math.random() -
                    .5
                ) * .15,

            life:
                .6 +
                Math.random() * .4
        });
    }

    if (
        dust.length >
        MAX_DUST
    ) {
        dust.splice(
            0,
            dust.length -
            MAX_DUST
        );
    }

    setTimeout(() => {
        const index =
            marks.findIndex(
                mark =>
                    mark === active?.[0]
            );

        /*
         * Marks are already dead visually;
         * remove burst pieces later.
         */
        for (
            let i = marks.length - 1;
            i >= 0;
            i--
        ) {
            if (marks[i].burst) {
                marks.splice(i, 1);
            }
        }
    }, 1300);
}

function trim() {
    while (
        marks.length >
        MAX_MARKS
    ) {
        marks.shift();
    }

    while (
        splats.length >
        MAX_SPLATS
    ) {
        splats.shift();
    }
}

function update(dt) {
    for (const mark of marks) {
        if (!mark.burst) {
            continue;
        }

        mark.x += mark.vx * dt;
        mark.y += mark.vy * dt;

        mark.vx *= Math.pow(
            .985,
            dt
        );

        mark.vy *= Math.pow(
            .985,
            dt
        );

        mark.vy +=
            .035 * dt;

        mark.rotation +=
            mark.spin * dt;

        mark.life -=
            .012 * dt;
    }

    for (
        let i = splats.length - 1;
        i >= 0;
        i--
    ) {
        const s = splats[i];

        s.x += s.vx * dt;
        s.y += s.vy * dt;

        s.vx *= Math.pow(
            .98,
            dt
        );

        s.vy *= Math.pow(
            .98,
            dt
        );

        s.vy +=
            .025 * dt;

        s.life -=
            .018 * dt;

        if (s.life <= 0) {
            splats.splice(i, 1);
        }
    }

    for (
        let i = dust.length - 1;
        i >= 0;
        i--
    ) {
        const p = dust[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= Math.pow(
            .97,
            dt
        );

        p.vy *= Math.pow(
            .97,
            dt
        );

        p.vy +=
            .035 * dt;

        p.rotation +=
            p.spin * dt;

        p.life -=
            .017 * dt;

        if (p.life <= 0) {
            dust.splice(i, 1);
        }
    }

    for (
        let i = shockwaves.length - 1;
        i >= 0;
        i--
    ) {
        const wave =
            shockwaves[i];

        wave.radius +=
            (
                wave.max -
                wave.radius
            ) *
            .09 *
            dt;

        wave.life -=
            .025 * dt;

        if (wave.life <= 0) {
            shockwaves.splice(i, 1);
        }
    }
}

function drawMark(mark) {
    ctx.save();

    ctx.translate(
        mark.x,
        mark.y
    );

    ctx.rotate(
        mark.rotation
    );

    /*
     * Irregular ellipse.
     * This is what makes it look
     * like deposited ink rather
     * than a clean vector stroke.
     */
    ctx.beginPath();

    const rx = mark.rx;
    const ry = mark.ry;

    const points = 12;

    for (
        let i = 0;
        i <= points;
        i++
    ) {
        const a =
            (
                i /
                points
            ) *
            Math.PI *
            2;

        const noise =
            0.78 +
            Math.sin(
                mark.seed +
                i * 3.7
            ) *
            .14;

        const x =
            Math.cos(a) *
            rx *
            noise;

        const y =
            Math.sin(a) *
            ry *
            noise;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();

    ctx.fillStyle =
        `rgba(5,5,5,${
            Math.max(
                0,
                mark.alpha *
                mark.life
            )
        })`;

    ctx.fill();

    ctx.restore();
}

function drawStrokes() {
    /*
     * Draw stamps individually.
     * Their overlap creates natural
     * continuous ink while retaining
     * broken edges.
     */
    for (const mark of marks) {
        drawMark(mark);
    }
}

function drawSplats() {
    for (const s of splats) {
        ctx.beginPath();

        ctx.fillStyle =
            `rgba(5,5,5,${
                s.life * .75
            })`;

        ctx.arc(
            s.x,
            s.y,
            s.r,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

function drawDust() {
    for (const p of dust) {
        ctx.save();

        ctx.translate(
            p.x,
            p.y
        );

        ctx.rotate(
            p.rotation
        );

        ctx.fillStyle =
            `rgba(5,5,5,${
                p.life * .85
            })`;

        ctx.beginPath();

        ctx.ellipse(
            0,
            0,
            p.r * 1.8,
            p.r * .65,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

function drawShockwaves() {
    for (const wave of shockwaves) {
        ctx.beginPath();

        ctx.arc(
            wave.x,
            wave.y,
            wave.radius,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            `rgba(5,5,5,${
                wave.life * .28
            })`;

        ctx.lineWidth =
            1 +
            wave.life * 2;

        ctx.stroke();
    }
}

function render(now) {
    const dt = Math.min(
        2,
        (now - lastTime) /
            16.666
    );

    lastTime = now;

    ctx.fillStyle =
        "#e9e5da";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    update(dt);

    drawStrokes();
    drawSplats();
    drawDust();
    drawShockwaves();

    requestAnimationFrame(
        render
    );
}

requestAnimationFrame(
    render
);

animate(
    ".brand",
    {
        opacity: [
            {
                to: 0,
                duration: 0
            },
            {
                to: 1,
                duration: 1500,
                ease: "out(3)"
            }
        ],

        translateY: [
            {
                to: 12,
                duration: 0
            },
            {
                to: 0,
                duration: 1500,
                ease: "out(3)"
            }
        ]
    }
);

animate(
    ".instruction",
    {
        opacity: [
            {
                to: 0,
                duration: 0
            },
            {
                to: .28,
                duration: 1800,
                ease: "out(3)"
            }
        ]
    }
);