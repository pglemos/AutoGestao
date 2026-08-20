// Auto-extracted from src/pages/MXPerformanceLanding.tsx — visual baseline of UX-001 piloto.
// Do NOT alter visual rules without updating Playwright snapshots (Story 2.1, ADR-0050).

export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

export const LANDING_CSS = `
:root{
  --bg:#070A08; --bg-1:#0B100C; --bg-2:#0F1612;
  --line:#172019; --line-2:#243227;
  --ink:#E8F0EA; --ink-2:#9BA89F; --ink-3:#748178; --ink-4:#37423B;
  --mx:#1FCB6E; --mx-2:#0FB060; --mx-deep:#0A2A1A; --mx-glow:#22ff88;
  --warn:#FFB547; --crit:#FF6B5B;
--serif:'Inter', system-ui, sans-serif;
  --instrument:Inter, system-ui, sans-serif;
  --sans:'Inter', system-ui, sans-serif;
--mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --maxw:1320px;
}
body.mxp-active{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:"ss01","cv11";overflow-x:hidden}
body.mxp-active *{box-sizing:border-box}
body.mxp-active{scroll-behavior:smooth}
.mxp-root a{color:inherit;text-decoration:none}
.mxp-root img{max-width:100%;display:block}
.mxp-root ::selection{background:var(--mx);color:#031}
.mxp-root button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}

.mxp-root .wrap{max-width:var(--maxw);margin:0 auto;padding:0 32px;position:relative}
.mxp-root .mono{font-family:var(--mono);letter-spacing:.02em}
.mxp-root .mono-up{font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;font-size:11px;color:var(--ink-3)}
.mxp-root .mono-up b{font-weight:500;color:var(--mx)}
.mxp-root .display{font-family:var(--serif);letter-spacing:-0.025em;line-height:0.95;font-weight:600}
.mxp-root .it{font-family:var(--instrument);font-style:italic;font-weight:400;letter-spacing:-0.005em}

body.mxp-active::before{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:1;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity:.6;mix-blend-mode:overlay;
}

.mxp-cursor{position:fixed;top:0;left:0;width:8px;height:8px;border-radius:99px;background:var(--mx);pointer-events:none;z-index:1000;transform:translate(-50%,-50%);transition:transform .25s, background .25s;mix-blend-mode:difference;display:none}
.mxp-cursor.on{display:block}
.mxp-cursor.lg{width:54px;height:54px;background:var(--mx);mix-blend-mode:normal;opacity:.18}

.mxp-root [data-reveal]{opacity:0;transform:translateY(30px);transition:opacity .9s cubic-bezier(.22,.61,.36,1),transform .9s cubic-bezier(.22,.61,.36,1)}
.mxp-root [data-reveal].in{opacity:1;transform:none}
.mxp-root [data-reveal-delay="1"]{transition-delay:.08s}
.mxp-root [data-reveal-delay="2"]{transition-delay:.16s}
.mxp-root [data-reveal-delay="3"]{transition-delay:.24s}
.mxp-root [data-reveal-delay="4"]{transition-delay:.32s}
.mxp-root [data-reveal-delay="5"]{transition-delay:.40s}

.mxp-root .mask{display:block;overflow:hidden;padding-bottom:.05em}
.mxp-root .mask > span{display:block;transform:translateY(120%);transition:transform 1s cubic-bezier(.2,.7,.2,1)}
.mxp-root .in .mask > span, .mxp-root [data-reveal].in .mask > span{transform:none}
.mxp-root .mask.vapour-line{overflow:visible}
.mxp-root .mask.vapour-line > span{transform:none}
.mxp-root .mask:nth-child(2) > span{transition-delay:.1s}
.mxp-root .mask:nth-child(3) > span{transition-delay:.2s}
.mxp-root .mask:nth-child(4) > span{transition-delay:.3s}

.mxp-root .topbar{position:fixed;top:0;left:0;right:0;z-index:80;background:rgba(7,10,8,.6);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);border-bottom:1px solid transparent;transition:border-color .4s, background .4s}
.mxp-root .topbar.scrolled{border-bottom-color:var(--line);background:rgba(7,10,8,.85)}
.mxp-root .topbar-inner{display:flex;align-items:center;justify-content:space-between;height:68px;padding:0 32px;max-width:none}
.mxp-root .brand{display:flex;align-items:center;gap:12px}
.mxp-root .brand-mark{width:32px;height:32px;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%, #0E3A24, #050C08);border:1px solid var(--line-2);border-radius:7px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 0 24px rgba(31,203,110,.15)}
.mxp-root .brand-mark img{width:22px;height:22px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(31,203,110,.4))}
.mxp-root .brand-name{font-family:var(--serif);font-weight:600;font-size:15px;letter-spacing:.04em}
.mxp-root .brand-name span{color:var(--mx)}
.mxp-root .brand-tag{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:var(--ink-3);padding-left:14px;margin-left:14px;border-left:1px solid var(--line-2)}
.mxp-root .nav{display:flex;gap:30px;font-size:13px;color:var(--ink-2)}
.mxp-root .nav a{position:relative;padding:6px 0}
.mxp-root .nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--mx);transform:scaleX(0);transform-origin:left;transition:transform .35s}
.mxp-root .nav a:hover{color:var(--ink)}
.mxp-root .nav a:hover::after{transform:scaleX(1)}
.mxp-root .top-cta{display:flex;align-items:center;gap:14px}
.mxp-root .pill-status{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--mx);padding:7px 12px;border:1px solid rgba(31,203,110,.25);border-radius:999px;background:rgba(31,203,110,.05)}
.mxp-root .dot{width:6px;height:6px;border-radius:999px;background:var(--mx);box-shadow:0 0 0 0 rgba(31,203,110,.6);animation:mxp-pulse 2.2s infinite}
@keyframes mxp-pulse{0%{box-shadow:0 0 0 0 rgba(31,203,110,.55)}70%{box-shadow:0 0 0 10px rgba(31,203,110,0)}100%{box-shadow:0 0 0 0 rgba(31,203,110,0)}}

.mxp-root .btn{position:relative;display:inline-flex;align-items:center;gap:10px;padding:13px 20px;border-radius:8px;font-size:13.5px;font-weight:500;font-family:var(--sans);letter-spacing:.005em;cursor:pointer;border:1px solid transparent;overflow:hidden;isolation:isolate;transition:transform .2s ease, color .25s}
.mxp-root .btn .arrow{display:inline-block;transition:transform .35s cubic-bezier(.2,.7,.2,1)}
.mxp-root .btn:hover .arrow{transform:translateX(4px)}
.mxp-root .btn-primary{background:var(--mx);color:#062012;font-weight:600}
.mxp-root .btn-primary::before{content:"";position:absolute;inset:0;background:var(--mx-glow);transform:translateY(101%);transition:transform .4s cubic-bezier(.2,.7,.2,1);z-index:-1}
.mxp-root .btn-primary:hover::before{transform:translateY(0)}
.mxp-root .btn-primary:hover{transform:translateY(-1px)}
.mxp-root .btn-ghost{border-color:var(--line-2);color:var(--ink);background:rgba(255,255,255,.01)}
.mxp-root .btn-ghost::before{content:"";position:absolute;inset:0;background:var(--mx);transform:translateY(101%);transition:transform .4s cubic-bezier(.2,.7,.2,1);z-index:-1}
.mxp-root .btn-ghost:hover{color:#062012;border-color:var(--mx)}
.mxp-root .btn-ghost:hover::before{transform:translateY(0)}

.mxp-scroll-progress{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--mx),var(--mx-glow));transform:scaleX(0);transform-origin:left;z-index:90;transition:transform .15s linear;box-shadow:0 0 12px var(--mx)}

.mxp-root .hero{position:relative;min-height:100vh;padding:140px 0 80px;overflow:hidden;display:flex;align-items:center}
.mxp-root .hero-bg{position:absolute;inset:0;pointer-events:none;z-index:0}
.mxp-root .hero-bg .grad{position:absolute;inset:0;background:
  radial-gradient(1200px 700px at 90% 10%, rgba(31,203,110,.13), transparent 55%),
  radial-gradient(900px 600px at 0% 90%, rgba(31,203,110,.07), transparent 55%);}
.mxp-root .hero-bg .grid{position:absolute;inset:0;background-image:radial-gradient(circle at 50% 40%, rgba(31,203,110,.06), transparent 70%);opacity:.8}
.mxp-root .hero-bg .glow{position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle, rgba(31,203,110,.18), transparent 65%);filter:blur(40px);top:-150px;right:-200px;animation:mxp-floatglow 18s ease-in-out infinite}
@keyframes mxp-floatglow{0%,100%{transform:translate(0,0)}50%{transform:translate(-80px,80px)}}
.mxp-root .hero-bg .scanline{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(31,203,110,.7),transparent);top:0;animation:mxp-scanline 8s linear infinite;opacity:.5}
@keyframes mxp-scanline{0%{transform:translateY(0)}100%{transform:translateY(100vh)}}

.mxp-root .hero-grid{position:relative;z-index:2;display:grid;grid-template-columns:1.15fr 1fr;gap:60px;align-items:end;width:100%}
.mxp-root .hero-meta{display:flex;align-items:center;gap:14px;margin-bottom:28px;font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-2)}
.mxp-root .hero-meta .dotline{flex:0 0 32px;height:1px;background:var(--mx)}
.mxp-root .hero-meta b{color:var(--mx);font-weight:500}

.mxp-root h1.hero-title{font-family:var(--serif);font-weight:600;font-size:clamp(56px, 8.6vw, 130px);line-height:.88;letter-spacing:-0.04em;margin:0 0 32px}
.mxp-root h1.hero-title .it{font-family:var(--instrument);font-style:italic;font-weight:400;color:var(--mx);letter-spacing:-0.01em}
.mxp-root h1.hero-title .it::after{content:"";display:inline-block;width:.45em;height:.08em;background:var(--mx);vertical-align:.3em;margin-left:.1em;animation:mxp-caret 1s steps(2) infinite}

.mxp-root .vapour-line{display:block}
.mxp-root .vapour-host{display:block;font-family:var(--instrument);font-style:italic;font-weight:400;color:var(--mx);letter-spacing:-0.01em;line-height:.95;min-height:1.05em;position:relative}
.mxp-root .vapour-static{display:block;position:relative;z-index:0}
.mxp-root .vapour-canvas-layer{position:absolute;inset:0;z-index:1;display:block;pointer-events:none}
.mxp-root .vapour-canvas-layer canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.mxp-root .vapour-enhanced .vapour-static{opacity:0}
@keyframes mxp-caret{50%{opacity:0}}

.mxp-root .hero-sub{font-size:18.5px;line-height:1.55;color:var(--ink-2);max-width:560px;margin:0 0 38px}
.mxp-root .hero-sub b{color:var(--ink);font-weight:500}
.mxp-root .hero-ctas{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:54px}
.mxp-root .hero-ctas .btn{padding:15px 24px;font-size:14px}

.mxp-root .hero-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--line);padding-top:26px}
.mxp-root .strip-cell{padding:0 18px}
.mxp-root .strip-cell:first-child{padding-left:0}
.mxp-root .strip-cell + .strip-cell{border-left:1px solid var(--line)}
.mxp-root .strip-num{font-family:var(--serif);font-size:34px;font-weight:600;letter-spacing:-0.03em;color:var(--ink);line-height:1}
.mxp-root .strip-num span{color:var(--mx);font-size:13.5px;vertical-align:super;font-weight:500;margin-left:2px}
.mxp-root .strip-lab{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.18em;color:var(--ink-3);margin-top:10px}

.mxp-root .console{position:relative;background:linear-gradient(180deg,#0B130E,#070A08);border:1px solid var(--line-2);border-radius:16px;padding:0;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.55), 0 0 0 1px rgba(31,203,110,.04) inset;transform-style:preserve-3d}
.mxp-root .console::before{content:"";position:absolute;top:-1px;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--mx),transparent);opacity:.5}
.mxp-root .console-bar{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--line);background:#070C09}
.mxp-root .console-bar .dots{display:flex;gap:6px}
.mxp-root .console-bar .dots i{width:10px;height:10px;border-radius:999px;background:#222C25;display:block;transition:background .25s}
.mxp-root .console-bar .dots i:nth-child(1){background:#3A2A2A}
.mxp-root .console-bar .dots i:nth-child(2){background:#3A352A}
.mxp-root .console-bar .dots i:nth-child(3){background:#1F3A2A}
.mxp-root .console-bar .title{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase}
.mxp-root .console-bar .title b{color:var(--ink);font-weight:500}
.mxp-root .console-bar .live{display:inline-flex;gap:7px;align-items:center;font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mx)}
.mxp-root .console-body{padding:18px 18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mxp-root .kpi{background:#0A100C;border:1px solid var(--line);border-radius:10px;padding:14px;position:relative;overflow:hidden}
.mxp-root .kpi::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,var(--mx),transparent);opacity:0;transition:opacity .4s}
.mxp-root .kpi:hover::after{opacity:1}
.mxp-root .kpi-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.mxp-root .kpi-h .l{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:var(--ink-3)}
.mxp-root .kpi-h .t{font-family:var(--mono);font-size:10px;color:var(--mx)}
.mxp-root .kpi-v{font-family:var(--serif);font-weight:600;font-size:32px;letter-spacing:-0.02em;line-height:1}
.mxp-root .kpi-v small{font-size:14px;color:var(--ink-3);font-weight:400;margin-left:4px}
.mxp-root .kpi-bar{height:4px;background:#101813;border-radius:99px;margin-top:14px;overflow:hidden;position:relative}
.mxp-root .kpi-bar > i{display:block;height:100%;background:linear-gradient(90deg,var(--mx-2),var(--mx));border-radius:99px;transform:scaleX(0);transform-origin:left;transition:transform 1.6s cubic-bezier(.2,.7,.2,1)}
.mxp-root .console.in .kpi-bar > i{transform:scaleX(1)}
.mxp-root .kpi-foot{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--ink-3);margin-top:8px;text-transform:uppercase;letter-spacing:.14em}
.mxp-root .kpi.full{grid-column:1/-1}

.mxp-root .funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
.mxp-root .step{background:#0A0F0B;border:1px solid var(--line);border-radius:8px;padding:10px;position:relative;overflow:hidden}
.mxp-root .step::after{content:"→";position:absolute;right:-7px;top:50%;transform:translateY(-50%);font-family:var(--mono);color:var(--mx);font-size:14px;background:#0A100C;padding:0 2px;z-index:2}
.mxp-root .step:last-child::after{display:none}
.mxp-root .step .l{font-family:var(--mono);font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.14em}
.mxp-root .step .v{font-family:var(--serif);font-weight:600;font-size:22px;margin-top:4px}
.mxp-root .step .conv{font-family:var(--mono);font-size:10px;color:var(--mx);margin-top:6px}
.mxp-root .step.warn .conv{color:var(--warn)}
.mxp-root .step.warn{box-shadow:inset 0 0 0 1px rgba(255,181,71,.2)}
.mxp-root .step.crit .conv{color:var(--crit)}

.mxp-root .ticker{border-top:1px solid var(--line);background:#070A08;font-family:var(--mono);font-size:11px;display:flex;align-items:center;gap:0;padding:0;color:var(--ink-3);height:auto;min-height:42px;position:relative}
.mxp-root .ticker-track{display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;padding:16px 32px}
.mxp-root .ticker-track span{display:flex;align-items:center;gap:6px;white-space:nowrap}
.mxp-root .ticker-track b{color:var(--mx);font-weight:500}
.mxp-root .ticker-track span::before{content:"●";color:var(--mx);font-size:7px;margin-right:5px;opacity:.6}

.mxp-root .scroll-hint{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.2em;color:var(--ink-3);z-index:3}
.mxp-root .scroll-hint .line{width:1px;height:34px;background:linear-gradient(to bottom,transparent,var(--mx));position:relative;overflow:hidden}
.mxp-root .scroll-hint .line::after{content:"";position:absolute;top:-100%;left:0;width:100%;height:50%;background:var(--mx);animation:mxp-scrollline 2s ease-in-out infinite}
@keyframes mxp-scrollline{0%{top:-100%}100%{top:120%}}

.mxp-root .feature-grid-wrapper{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#060807;padding:32px 0}
.mxp-root .feature-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:24px;max-width:var(--maxw);margin:0 auto;padding:0 32px}
.mxp-root .feature-card{display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 20px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:8px;font-family:var(--serif);font-size:clamp(18px, 2.4vw, 28px);font-weight:600;letter-spacing:-0.02em;color:var(--ink);transition:background .3s, border-color .3s, transform .3s}
.mxp-root .feature-card:hover{background:rgba(31,203,110,.06);border-color:var(--mx);transform:translateY(-2px)}
.mxp-root .feature-card .it{color:var(--mx);font-family:var(--instrument);font-style:italic;font-weight:400}
.mxp-root .feature-card .star{color:var(--mx);font-size:1.2em;opacity:.7}

.mxp-root section{position:relative;z-index:2}
.mxp-root .sec-pad{padding:140px 0}
.mxp-root .sec-head{display:block;margin-bottom:80px;border-top:1px solid var(--line);padding-top:48px}
.mxp-root .sec-head .left{max-width:1040px}
.mxp-root .sec-title{font-family:var(--serif);font-weight:600;font-size:clamp(42px,5.6vw,84px);line-height:.95;letter-spacing:-0.035em;margin:0;padding-right:.12em}
.mxp-root .sec-title .it{font-family:var(--instrument);font-style:italic;font-weight:400;color:var(--mx)}
.mxp-root .sec-sub{color:var(--ink-2);font-size:17px;line-height:1.55;margin-top:24px;max-width:680px}

.mxp-root .proof-wrap{padding:36px 0 0}
.mxp-root .proof-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mxp-root .proof-cell{padding:30px 24px;border-right:1px solid var(--line);position:relative;cursor:default;overflow:hidden;transition:background .35s}
.mxp-root .proof-cell::before{content:"";position:absolute;left:0;top:0;width:100%;height:1px;background:var(--mx);transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.mxp-root .proof-cell:hover::before{transform:scaleX(1)}
.mxp-root .proof-cell:hover{background:rgba(31,203,110,.025)}
.mxp-root .proof-cell:last-child{border-right:none}
.mxp-root .proof-cell .v{font-family:var(--serif);font-size:36px;font-weight:600;letter-spacing:-0.025em;line-height:1}
.mxp-root .proof-cell .v span{color:var(--mx);font-size:18px;vertical-align:super;margin-left:2px;font-weight:500}
.mxp-root .proof-cell .l{font-family:var(--mono);font-size:10px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.16em;margin-top:10px}

.mxp-root .problem{background:linear-gradient(180deg, transparent, #060807 80%)}
.mxp-root .problem-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:80px;align-items:start}
.mxp-root .problem-list{margin:0;padding:0;list-style:none;border-top:1px solid var(--line)}
.mxp-root .problem-list li{display:grid;grid-template-columns:54px 1fr auto;gap:18px;align-items:center;padding:22px 0;border-bottom:1px solid var(--line);position:relative;cursor:default;transition:transform .4s}
.mxp-root .problem-list li::before{content:"";position:absolute;left:-20px;top:50%;width:8px;height:1px;background:var(--mx);transform:scaleX(0);transform-origin:right;transition:transform .4s}
.mxp-root .problem-list li:hover{transform:translateX(8px)}
.mxp-root .problem-list li:hover::before{transform:scaleX(1)}
.mxp-root .problem-list .num{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.14em}
.mxp-root .problem-list .body{font-family:var(--serif);font-weight:500;font-size:21px;color:var(--ink);letter-spacing:-0.01em;line-height:1.2}
.mxp-root .problem-list .body s{text-decoration:none;color:var(--ink-3);font-weight:400;display:block;font-family:var(--sans);font-size:13.5px;margin-top:6px;letter-spacing:0;line-height:1.5}
.mxp-root .problem-list .tag{font-family:var(--mono);font-size:10px;color:var(--crit);text-transform:uppercase;letter-spacing:.16em;background:rgba(255,107,91,.06);border:1px solid rgba(255,107,91,.25);padding:6px 10px;border-radius:99px;white-space:nowrap}
.mxp-root .problem-list .tag.warn{color:var(--warn);background:rgba(255,181,71,.06);border-color:rgba(255,181,71,.25)}
.mxp-root .problem-list .tag.blind{color:var(--ink-3);background:rgba(255,255,255,.02);border-color:var(--line-2)}

.mxp-root .verdict{position:sticky;top:120px;border:1px solid var(--line-2);background:linear-gradient(180deg,#0B120E,#070A08);border-radius:16px;padding:38px;overflow:hidden}
.mxp-root .verdict::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--mx),transparent)}
.mxp-root .verdict::after{content:"";position:absolute;inset:auto -50% -50% auto;width:300px;height:300px;background:radial-gradient(circle, rgba(31,203,110,.12), transparent 60%);filter:blur(20px)}
.mxp-root .verdict-head{font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:22px;display:flex;justify-content:space-between}
.mxp-root .verdict-head b{color:var(--mx);font-weight:500}
.mxp-root .verdict h3{font-family:var(--serif);font-size:30px;margin:0 0 16px;letter-spacing:-0.02em;font-weight:600;line-height:1.05}
.mxp-root .verdict h3 .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .verdict p{color:var(--ink-2);line-height:1.6;margin:0 0 16px;font-size:15px}
.mxp-root .verdict p.lead{color:var(--ink);font-size:15px}
.mxp-root .verdict .stamp{display:flex;align-items:center;gap:12px;font-family:var(--mono);text-transform:uppercase;font-size:11px;letter-spacing:.18em;color:var(--mx);padding-top:22px;margin-top:22px;border-top:1px solid var(--line);justify-content:space-between}
.mxp-root .verdict .seal{width:54px;height:54px;border:1px dashed var(--mx);border-radius:99px;display:grid;place-items:center;color:var(--mx);font-family:var(--mono);font-size:9px;line-height:1;text-align:center;animation:mxp-rotate 30s linear infinite}
@keyframes mxp-rotate{to{transform:rotate(360deg)}}

.mxp-root .modules-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.mxp-root .mod{background:var(--bg-1);padding:32px;position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:300px;overflow:hidden;transition:background .4s}
.mxp-root .mod::before{content:"";position:absolute;inset:0;background:radial-gradient(400px 200px at var(--mx-x,80%) var(--mx-y,0%), rgba(31,203,110,.07), transparent 60%);opacity:0;transition:opacity .5s;pointer-events:none}
.mxp-root .mod:hover::before{opacity:1}
.mxp-root .mod[data-span="6"]{grid-column:span 6}
.mxp-root .mod[data-span="4"]{grid-column:span 4}
.mxp-root .mod[data-span="8"]{grid-column:span 8}
.mxp-root .mod[data-span="12"]{grid-column:span 12}
.mxp-root .mod-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;position:relative;z-index:1}
.mxp-root .mod-id{font-family:var(--mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.18em;text-transform:uppercase}
.mxp-root .mod-id b{color:var(--mx);font-weight:500;margin-right:4px}
.mxp-root .mod-icon{width:42px;height:42px;border:1px solid var(--line-2);background:radial-gradient(circle at 30% 30%, #0E2A1A, #060A07);border-radius:9px;display:grid;place-items:center;color:var(--mx);transition:transform .35s, border-color .35s, background .35s}
.mxp-root .mod:hover .mod-icon{transform:rotate(-3deg) scale(1.06);border-color:var(--mx)}
.mxp-root .mod-icon svg{width:19px;height:19px;stroke-width:1.6}
.mxp-root .mod h4{font-family:var(--serif);font-size:28px;font-weight:600;letter-spacing:-0.02em;line-height:1.05;margin:0 0 14px;position:relative;z-index:1}
.mxp-root .mod h4 .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .mod p{color:var(--ink-2);font-size:14px;line-height:1.6;margin:0;position:relative;z-index:1}
.mxp-root .mod p .hl{font-family:var(--mono);color:var(--mx);font-size:13px;letter-spacing:.02em}
.mxp-root .mod-foot{margin-top:24px;display:flex;align-items:center;gap:18px;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--ink-3);position:relative;z-index:1;flex-wrap:wrap}
.mxp-root .mod-foot span{display:inline-flex;align-items:center;gap:6px}
.mxp-root .mod-foot span::before{content:"";width:5px;height:5px;background:var(--mx);border-radius:99px}

.mxp-root .mod-terminal{padding:0;overflow:hidden;background:linear-gradient(180deg,#0A100C,#070A08)}
.mxp-root .mod-terminal .inner-pad{padding:32px}
.mxp-root .terminal-mock{margin-top:0;border-top:1px solid var(--line);background:#06090A;font-family:var(--mono);font-size:12px;color:var(--ink-2);padding:18px 24px;line-height:1.85;position:relative}
.mxp-root .terminal-mock::before{content:"";position:absolute;top:0;left:0;right:0;height:30px;background:linear-gradient(to bottom, #06090A, transparent);pointer-events:none;z-index:1}
.mxp-root .terminal-mock .row{display:grid;grid-template-columns:80px 1fr auto;gap:10px;align-items:center}
.mxp-root .terminal-mock .ts{color:var(--ink-4)}
.mxp-root .terminal-mock .lbl{color:var(--ink)}
.mxp-root .terminal-mock .val{color:var(--mx);font-weight:500}
.mxp-root .terminal-mock .val.warn{color:var(--warn)}
.mxp-root .terminal-mock .row::before{content:"›";color:var(--mx);margin-right:6px;opacity:.7}
.mxp-root .terminal-mock .input-line{margin-top:14px;color:var(--mx);border-top:1px dashed var(--line);padding-top:14px;display:flex;gap:8px;align-items:center}
.mxp-root .blink{display:inline-block;width:7px;height:14px;background:var(--mx);animation:mxp-blink 1.05s steps(2,start) infinite;vertical-align:middle}
@keyframes mxp-blink{to{opacity:0}}

.mxp-root .rank{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
.mxp-root .rank-row{display:grid;grid-template-columns:30px 1fr auto auto;gap:14px;padding:11px 0;align-items:center;font-size:13.5px;border-bottom:1px dashed var(--line);transition:transform .3s}
.mxp-root .rank-row:hover{transform:translateX(6px)}
.mxp-root .rank-row .pos{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.05em}
.mxp-root .rank-row.top .pos{color:var(--mx);font-weight:600}
.mxp-root .rank-row.top .name::before{content:"★";color:var(--mx);margin-right:6px;font-size:11px}
.mxp-root .rank-row .name{color:var(--ink);display:flex;align-items:center}
.mxp-root .rank-row .meta{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em}
.mxp-root .rank-row .v{font-family:var(--serif);font-weight:600;color:var(--ink);font-size:15px}
.mxp-root .rank-row.you{background:rgba(31,203,110,.04);margin:0 -14px;padding-left:14px;padding-right:14px;border-radius:6px;border-bottom-style:solid;border-bottom-color:rgba(31,203,110,.25)}
.mxp-root .rank-row.you .name::after{content:"você";font-family:var(--mono);font-size:9px;background:var(--mx);color:#031;padding:2.5px 6px;border-radius:99px;margin-left:8px;letter-spacing:.12em;font-weight:600;text-transform:uppercase}
.mxp-root .rank-row.you .v{color:var(--mx)}

.mxp-root .dev-mock{margin-top:18px;background:#070A08;border:1px solid var(--line);border-radius:10px;padding:16px;position:relative;overflow:hidden}
.mxp-root .dev-mock::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--mx)}
.mxp-root .dev-mock .head{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.16em}
.mxp-root .dev-mock .head b{color:var(--mx);font-weight:500}
.mxp-root .dev-mock .body{margin-top:12px;font-size:13.5px;color:var(--ink);line-height:1.5}
.mxp-root .dev-mock .body b{color:var(--mx)}
.mxp-root .dev-mock .tags{display:flex;gap:6px;margin-top:14px;flex-wrap:wrap}
.mxp-root .chip{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.14em;padding:5px 10px;border-radius:99px;border:1px solid var(--line-2);color:var(--ink-2);transition:transform .25s, color .25s, border-color .25s}
.mxp-root .chip:hover{transform:translateY(-1px)}
.mxp-root .chip.good{color:var(--mx);border-color:rgba(31,203,110,.3);background:rgba(31,203,110,.05)}
.mxp-root .chip.warn{color:var(--warn);border-color:rgba(255,181,71,.3)}

.mxp-root .pdi-steps{margin-top:20px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;border-top:1px solid var(--line);padding-top:18px}
.mxp-root .pdi-step{text-align:center;padding:12px 6px;background:#070A08;border-radius:7px;position:relative;border:1px solid transparent;transition:border-color .3s, transform .3s}
.mxp-root .pdi-step .l{font-family:var(--mono);font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.14em}
.mxp-root .pdi-step .ic{margin-top:6px;color:var(--ink-3);font-size:14px}
.mxp-root .pdi-step.done .l, .mxp-root .pdi-step.done .ic{color:var(--mx)}
.mxp-root .pdi-step.active{border-color:var(--mx);background:rgba(31,203,110,.06)}
.mxp-root .pdi-step.active .l, .mxp-root .pdi-step.active .ic{color:var(--mx)}
.mxp-root .pdi-step.active::after{content:"";position:absolute;inset:-1px;border:1px solid var(--mx);border-radius:7px;animation:mxp-halo 2s ease-in-out infinite}
@keyframes mxp-halo{0%,100%{box-shadow:0 0 0 0 rgba(31,203,110,.4)}50%{box-shadow:0 0 0 6px rgba(31,203,110,0)}}

.mxp-root .tlist{margin-top:20px;border-top:1px solid var(--line);padding-top:16px;display:flex;flex-direction:column;gap:4px}
.mxp-root .tlist-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:10px 0;font-size:13.5px}
.mxp-root .tlist-row .name{color:var(--ink)}
.mxp-root .tlist-row .name.dim{color:var(--ink-2)}
.mxp-root .tlist-row .st{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase}
.mxp-root .tlist-row .st.done{color:var(--mx)}
.mxp-root .tlist-row .st.prog{color:var(--warn)}
.mxp-root .tlist-row .st.todo{color:var(--ink-3)}
.mxp-root .tprog{height:3px;background:#10171A;border-radius:99px;overflow:hidden;grid-column:1/-1;margin-top:-2px}
.mxp-root .tprog i{display:block;height:100%;background:var(--warn);border-radius:99px}

.mxp-root .micro-grid-wrapper{padding:48px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,#070A08,#080B09)}
.mxp-root .micro-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;max-width:var(--maxw);margin:0 auto;padding:0 32px}
.mxp-root .micro-card{display:flex;align-items:center;justify-content:center;gap:16px;padding:20px 24px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:8px;font-family:var(--serif);font-size:clamp(20px, 2.8vw, 36px);line-height:1.1;font-weight:600;letter-spacing:-0.03em;color:var(--ink);transition:background .3s, border-color .3s}
.mxp-root .micro-card:hover{background:rgba(31,203,110,.06);border-color:var(--mx)}
.mxp-root .micro-card .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .micro-card .star{color:var(--mx);font-size:1.1em;opacity:.6}

@media (max-width: 768px){
  .mxp-root .feature-grid{grid-template-columns:repeat(2, 1fr);gap:16px;padding:0 22px}
  .mxp-root .feature-card{font-size:16px;padding:12px 16px}
  .mxp-root .micro-grid{grid-template-columns:1fr;gap:12px;padding:0 22px}
  .mxp-root .micro-card{font-size:20px;padding:16px 20px}
}

.mxp-root .personas{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:50px}
.mxp-root .pcard{background:linear-gradient(180deg,#0A100C, #070A08);border:1px solid var(--line);border-radius:16px;padding:36px;position:relative;overflow:hidden;transition:transform .5s cubic-bezier(.2,.7,.2,1), border-color .35s}
.mxp-root .pcard:hover{transform:translateY(-6px);border-color:var(--mx)}
.mxp-root .pcard::before{content:"";position:absolute;top:0;left:0;width:100%;height:1px;background:var(--mx);transform:scaleX(0);transform-origin:left;transition:transform .6s}
.mxp-root .pcard:hover::before{transform:scaleX(1)}
.mxp-root .pcard::after{content:"";position:absolute;inset:auto -50% -50% auto;width:300px;height:300px;background:radial-gradient(circle, rgba(31,203,110,.1), transparent 60%);filter:blur(30px);opacity:0;transition:opacity .5s}
.mxp-root .pcard:hover::after{opacity:1}
.mxp-root .pcard-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}
.mxp-root .pcard .role{font-family:var(--mono);font-size:11px;color:var(--mx);letter-spacing:.2em;text-transform:uppercase}
.mxp-root .pcard .role::before{content:"// "}
.mxp-root .pcard .pcard-num{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.14em}
.mxp-root .pcard h4{font-family:var(--serif);font-size:36px;font-weight:600;letter-spacing:-0.025em;margin:0 0 18px;line-height:.95}
.mxp-root .pcard h4 .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .pcard p{color:var(--ink-2);font-size:14.5px;line-height:1.6;margin:0 0 28px}
.mxp-root .pcard .uses{margin:0;padding:0;list-style:none;border-top:1px solid var(--line);padding-top:18px}
.mxp-root .pcard .uses li{display:flex;align-items:center;gap:12px;padding:8px 0;font-size:13.5px;color:var(--ink-2);transition:color .25s, transform .3s;cursor:default}
.mxp-root .pcard .uses li:hover{color:var(--ink);transform:translateX(2px)}
.mxp-root .pcard .uses li::before{content:"+";font-family:var(--mono);font-size:13px;color:var(--mx);font-weight:500}

.mxp-root .journey{background:linear-gradient(180deg,#070A08, #0A120D 50%, #070A08)}
.mxp-root .flow{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-top:50px}
.mxp-root .step-card{background:var(--bg-1);padding:32px;display:flex;flex-direction:column;justify-content:space-between;min-height:280px;position:relative;overflow:hidden;transition:background .4s}
.mxp-root .step-card:hover{background:#0C140F}
.mxp-root .step-card .num{font-family:var(--serif);font-size:88px;font-weight:600;color:var(--mx);letter-spacing:-0.06em;line-height:.8;opacity:.18;transition:opacity .4s, transform .4s}
.mxp-root .step-card:hover .num{opacity:.32;transform:translateX(-4px)}
.mxp-root .step-card .who{font-family:var(--mono);font-size:11px;color:var(--mx);text-transform:uppercase;letter-spacing:.18em;margin-top:18px}
.mxp-root .step-card .who::before{content:"// "}
.mxp-root .step-card h5{font-family:var(--serif);font-size:22px;font-weight:600;margin:10px 0 12px;line-height:1.05;letter-spacing:-0.015em}
.mxp-root .step-card p{font-size:13.5px;color:var(--ink-2);margin:0;line-height:1.55}
.mxp-root .step-card .arrow{position:absolute;top:32px;right:32px;color:var(--ink-3);font-family:var(--mono);font-size:14px;transition:color .3s, transform .3s}
.mxp-root .step-card:hover .arrow{color:var(--mx);transform:translateX(4px)}

.mxp-root .modlist{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-top:30px}
.mxp-root .mli{background:var(--bg-1);padding:28px 26px;display:flex;gap:18px;align-items:flex-start;min-height:160px;transition:background .35s;position:relative}
.mxp-root .mli:hover{background:#0C140F}
.mxp-root .mli::before{content:"";position:absolute;left:0;top:0;width:1px;height:100%;background:var(--mx);transform:scaleY(0);transform-origin:top;transition:transform .4s}
.mxp-root .mli:hover::before{transform:scaleY(1)}
.mxp-root .mli .ic{width:34px;height:34px;border:1px solid var(--line-2);border-radius:7px;display:grid;place-items:center;color:var(--mx);flex-shrink:0;margin-top:2px;background:#070A08;transition:border-color .35s, transform .35s}
.mxp-root .mli:hover .ic{border-color:var(--mx);transform:rotate(-4deg)}
.mxp-root .mli .ic svg{width:15px;height:15px;stroke-width:1.6}
.mxp-root .mli h6{font-family:var(--serif);font-size:17px;font-weight:600;margin:0 0 6px;letter-spacing:-0.01em}
.mxp-root .mli p{font-size:13px;color:var(--ink-2);margin:0;line-height:1.55}

.mxp-root .quote-section{padding:120px 0;border-top:1px solid var(--line);background:linear-gradient(180deg,#070A08, #0A140D);position:relative;overflow:hidden}
.mxp-root .quote-section::before{content:"";position:absolute;left:50%;top:0;width:1px;height:100%;background:linear-gradient(to bottom, transparent, var(--mx) 50%, transparent);opacity:.08}
.mxp-root .quote-wrap{max-width:920px;margin:0 auto;text-align:center;padding:0 32px;position:relative}
.mxp-root .quote-mark{font-family:var(--instrument);font-style:italic;font-size:160px;color:var(--mx);line-height:.5;height:60px;opacity:.45}
.mxp-root .quote-body{font-family:var(--serif);font-size:clamp(28px,3.4vw,46px);line-height:1.2;letter-spacing:-0.02em;font-weight:500;margin:36px 0 40px}
.mxp-root .quote-body .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .quote-attr{display:inline-flex;align-items:center;gap:14px;font-family:var(--mono);font-size:11.5px;letter-spacing:.16em;color:var(--ink-2);text-transform:uppercase}
.mxp-root .quote-attr .av{width:34px;height:34px;border-radius:99px;background:linear-gradient(135deg,#0E3A24,#1FCB6E);border:1px solid var(--line-2);display:grid;place-items:center;color:#031;font-weight:600;font-size:13px;letter-spacing:0}
.mxp-root .quote-attr b{color:var(--ink);font-weight:500}

.mxp-root .particle-band{position:relative;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#050807;overflow:hidden}
.mxp-root .particle-band::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%, rgba(31,203,110,.08), transparent 70%);pointer-events:none}
.mxp-root .particle-band-grid{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:32px;padding:60px 56px;max-width:1480px;margin:0 auto;position:relative}
.mxp-root .particle-band-meta{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.22em;color:var(--ink-3);writing-mode:vertical-rl;transform:rotate(180deg);align-self:stretch;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--line);padding:0 0 0 14px}
.mxp-root .particle-band-meta b{color:var(--mx);font-weight:500}
.mxp-root .particle-stage{position:relative;height:280px;width:100%}
.mxp-root .particle-caption{font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);text-align:right;max-width:200px}
.mxp-root .particle-caption b{color:var(--ink);font-weight:500;display:block;margin-bottom:6px}

.mxp-root .faq{display:grid;grid-template-columns:1fr 1.4fr;gap:60px;align-items:start;margin-top:50px}
.mxp-root .faq-list{border-top:1px solid var(--line)}
.mxp-root .faq-item{border-bottom:1px solid var(--line)}
.mxp-root .faq-q{display:flex;align-items:center;justify-content:space-between;padding:22px 0;cursor:pointer;font-family:var(--serif);font-size:19px;font-weight:500;letter-spacing:-0.01em;color:var(--ink);transition:color .25s;gap:20px;width:100%;text-align:left}
.mxp-root .faq-q:hover{color:var(--mx)}
.mxp-root .faq-q .ix{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.14em;flex-shrink:0;width:30px}
.mxp-root .faq-q .plus{position:relative;width:18px;height:18px;flex-shrink:0;transition:transform .35s}
.mxp-root .faq-q .plus::before, .mxp-root .faq-q .plus::after{content:"";position:absolute;top:50%;left:0;right:0;height:1px;background:currentColor;transform:translateY(-50%)}
.mxp-root .faq-q .plus::after{transform:translateY(-50%) rotate(90deg);transition:transform .35s}
.mxp-root .faq-item.open .faq-q .plus::after{transform:translateY(-50%) rotate(0)}
.mxp-root .faq-item.open .faq-q{color:var(--mx)}
.mxp-root .faq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s cubic-bezier(.2,.7,.2,1);overflow:hidden}
.mxp-root .faq-a-inner{min-height:0;padding:0 30px 22px 30px;color:var(--ink-2);font-size:14.5px;line-height:1.7;max-width:600px}
.mxp-root .faq-item.open .faq-a{grid-template-rows:1fr}

.mxp-root .cta-mega{position:relative;border:1px solid var(--line-2);border-radius:20px;padding:90px 64px;background:radial-gradient(800px 400px at 80% 0%, rgba(31,203,110,0.16), transparent 60%), linear-gradient(180deg,#0A140D,#070A08);overflow:hidden}
.mxp-root .cta-mega::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 70% 40%, rgba(31,203,110,.08), transparent 70%);opacity:.8}
.mxp-root .cta-mega::after{content:"";position:absolute;width:500px;height:500px;border-radius:99px;background:radial-gradient(circle, rgba(31,203,110,.18), transparent 65%);right:-200px;top:-200px;filter:blur(40px)}
.mxp-root .cta-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:60px;align-items:center;position:relative;z-index:2}
.mxp-root .cta-grid h2{font-family:var(--serif);font-size:clamp(46px,5.8vw,82px);font-weight:600;letter-spacing:-0.035em;line-height:.95;margin:0 0 24px}
.mxp-root .cta-grid h2 .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400}
.mxp-root .cta-grid p{color:var(--ink-2);font-size:16.5px;line-height:1.55;margin:0 0 32px;max-width:560px}
.mxp-root .cta-list{margin:0;padding:0;list-style:none;border-top:1px solid var(--line)}
.mxp-root .cta-list li{padding:16px 0;border-bottom:1px solid var(--line);font-size:14.5px;display:flex;justify-content:space-between;align-items:center;color:var(--ink-2);cursor:pointer;transition:color .25s, transform .35s;font-family:var(--serif);font-weight:500;letter-spacing:-0.005em}
.mxp-root .cta-list li:hover{color:var(--mx);transform:translateX(8px)}
.mxp-root .cta-list li .arr{color:var(--mx);font-family:var(--mono);transition:transform .35s}
.mxp-root .cta-list li:hover .arr{transform:translateX(4px)}

.mxp-root footer.mxp-footer{background:#050706;border-top:1px solid var(--line);padding:80px 0 36px;margin-top:80px;position:relative;overflow:hidden}
.mxp-root footer.mxp-footer::before{content:"";position:absolute;top:0;left:50%;width:1px;height:100%;background:linear-gradient(to bottom, var(--mx), transparent);opacity:.05;transform:translateX(-50%)}
.mxp-root .foot-mega{font-family:var(--serif);font-size:clamp(80px,16vw,260px);font-weight:600;letter-spacing:-0.05em;line-height:.85;color:var(--ink-3);margin:0 0 60px;text-align:center}
.mxp-root .foot-mega .it{font-family:var(--instrument);font-style:italic;color:var(--mx);font-weight:400;opacity:.65}
.mxp-root .foot-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:50px;margin-bottom:60px}
.mxp-root .foot-grid h6{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:var(--ink-3);margin:0 0 18px}
.mxp-root .foot-grid a{display:block;font-size:13.5px;color:var(--ink-2);padding:5px 0;transition:color .25s, transform .3s}
.mxp-root .foot-grid a:hover{color:var(--mx);transform:translateX(4px)}
.mxp-root .foot-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:30px;border-top:1px solid var(--line);font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--ink-3);gap:30px;flex-wrap:wrap}
.mxp-root .foot-bottom .right{display:flex;gap:24px;align-items:center}
.mxp-root .foot-bottom .right a:hover{color:var(--mx)}

.mxp-root .consultoria-sec{isolation:isolate;position:relative;overflow:hidden;background:linear-gradient(180deg,#080B09,#0A140D 70%,#070A08)}
.mxp-root .consultoria-sec::before{content:"";position:absolute;inset:-6% -4% auto -4%;height:min(820px,72vw);background-image:url("/landing/team-mx.png");background-size:cover;background-position:center 34%;opacity:.18;filter:saturate(.92) contrast(1.08);mix-blend-mode:screen;mask-image:linear-gradient(to bottom,#000 0%,rgba(0,0,0,.74) 48%,transparent 100%);pointer-events:none;z-index:0}
.mxp-root .consultoria-sec::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,10,8,.82),rgba(10,20,13,.66) 42%,rgba(7,10,8,.95) 78%),radial-gradient(900px 520px at 76% 18%,rgba(31,203,110,.16),transparent 62%);pointer-events:none;z-index:1}
.mxp-root .consultoria-sec .wrap{position:relative;z-index:2}
.mxp-root .consultoria-showcase{max-width:720px;margin:0 0 78px;border-top:1px solid var(--line);padding-top:54px}
.mxp-root .consultoria-showcase .sec-head{border-top:0;margin:0;padding:0}
.mxp-root .consultoria-showcase .sec-title{font-size:clamp(34px,4.8vw,72px)}
.mxp-root .consultoria-points{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:34px;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.mxp-root .consultoria-points span{display:flex;flex-direction:column;gap:10px;min-height:112px;padding:18px;background:rgba(7,10,8,.72);font-family:var(--mono);font-size:10px;line-height:1.45;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.mxp-root .consultoria-points b{font-family:var(--serif);font-size:26px;line-height:1;letter-spacing:-.02em;color:var(--mx)}

@media (max-width: 1024px){
  .mxp-root .modules-grid,.mxp-root .flow,.mxp-root .modlist{grid-template-columns:repeat(2,1fr) !important}
  .mxp-root .mod[data-span]{grid-column:span 2 !important}
  .mxp-root .consultoria-showcase{margin-bottom:56px}
}
@media (max-width: 900px){
  .mxp-root .particle-band-grid{grid-template-columns:1fr;padding:40px 22px;gap:18px}
  .mxp-root .particle-band-meta{writing-mode:horizontal-tb;transform:none;border-left:none;border-top:1px solid var(--line);padding:14px 0 0;justify-self:start}
  .mxp-root .particle-stage{height:200px}
  .mxp-root .particle-caption{text-align:left;max-width:none}
}
@media (max-width: 768px){
  .mxp-root .wrap{padding:0 22px}
  .mxp-root .topbar-inner{padding:0 22px}
  .mxp-root .hero-grid,.mxp-root .problem-grid,.mxp-root .cta-grid,.mxp-root .faq{grid-template-columns:1fr;gap:50px}
  .mxp-root .modules-grid,.mxp-root .flow,.mxp-root .modlist,.mxp-root .personas{grid-template-columns:1fr !important}
  .mxp-root .mod[data-span]{grid-column:span 1 !important}
  .mxp-root .nav,.mxp-root .brand-tag{display:none}
  .mxp-root .proof-bar{grid-template-columns:1fr 1fr 1fr}
  .mxp-root .proof-cell{border-bottom:1px solid var(--line)}
  .mxp-root .proof-cell:nth-child(3n){border-right:none}
  .mxp-root .foot-grid{grid-template-columns:1fr 1fr;gap:30px}
  .mxp-root .cta-mega{padding:50px 28px}
  .mxp-root .sec-pad{padding:90px 0}
  .mxp-root .hero{padding:120px 0 80px;min-height:auto}
  .mxp-root .hero-bg .glow{width:100vw;height:100vw;right:0;top:-25vw}
  .mxp-root .hero-strip{grid-template-columns:1fr 1fr;gap:0}
  .mxp-root .strip-cell{padding:14px 0;border-left:none !important}
  .mxp-root .strip-cell:nth-child(2n){padding-left:18px;border-left:1px solid var(--line) !important}
  .mxp-root .strip-cell:nth-child(n+3){border-top:1px solid var(--line)}
  .mxp-root .consultoria-sec::before{height:620px;opacity:.14;background-size:auto 100%;background-repeat:no-repeat}
  .mxp-root .consultoria-showcase{padding-top:38px}
  .mxp-root .consultoria-points{grid-template-columns:1fr}
  .mxp-root .consultoria-points span{min-height:auto}
  .mxp-root .scroll-hint{display:none}
  .mxp-root .sec-head{padding-top:36px;margin-bottom:50px}
  .mxp-root .top-cta .btn{padding:9px 14px;font-size:12.5px}
  .mxp-root .pill-status{display:none}
  .mxp-root .verdict{position:static}
  .mxp-root .verdict::after{inset:auto 0 0 auto;width:200px;height:200px}
  .mxp-root .quote-mark{font-size:90px}
  .mxp-root .foot-mega{font-size:clamp(46px,15vw,80px)}
  .mxp-root .foot-bottom{flex-direction:column;align-items:flex-start;gap:14px}
}

@media (max-width: 520px){
  .mxp-root .console-body,.mxp-root .funnel,.mxp-root .pdi-steps,.mxp-root .proof-bar{grid-template-columns:1fr !important}
  .mxp-root .console-body .kpi.full{grid-column:auto}
  .mxp-root .proof-cell{border-right:none !important}
  .mxp-root .proof-cell:nth-child(n){border-bottom:1px solid var(--line)}
  .mxp-root .pdi-steps>div{border-bottom:1px solid var(--line);padding-bottom:12px}
  .mxp-root .pdi-steps>div:last-child{border-bottom:none;padding-bottom:0}
}

@media (prefers-reduced-motion: reduce){
  .mxp-root *{animation-duration:.001ms !important;transition-duration:.01ms !important}
  .mxp-root [data-reveal]{opacity:1;transform:none}
}
`
