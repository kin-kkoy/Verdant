import Link from "next/link";
import FallingLeaves from "./FallingLeaves";

// The hero cabin scene, ported verbatim from premium-mockup.html.
// Garden + stable groups and signposts link to their pages. Decorative only.
export default function CabinScene() {
  return (
    <div className="scene-wrap">
      <div className="scene">
        <svg
          viewBox="0 0 1120 400"
          preserveAspectRatio="xMidYMid slice"
          aria-label="A cozy autumn cabin with a garden and a stable"
        >
          <rect className="sky" width="1120" height="400" />
          {/* sun / moon */}
          <circle className="sun" cx="930" cy="82" r="40" fill="#f6cf86" />
          <g className="moon">
            <circle cx="930" cy="80" r="34" fill="#e9e2cf" />
            <circle cx="916" cy="72" r="8" fill="#d8d0bb" />
            <circle cx="940" cy="92" r="6" fill="#d8d0bb" />
          </g>
          <g className="stars" fill="#f0e8d0">
            <circle cx="120" cy="60" r="2" />
            <circle cx="300" cy="40" r="1.6" />
            <circle cx="500" cy="70" r="2" />
            <circle cx="760" cy="48" r="1.6" />
            <circle cx="1040" cy="90" r="2" />
            <circle cx="640" cy="34" r="1.4" />
          </g>
          <path className="hillA" d="M0 262 Q220 214 440 252 T880 246 T1120 262 V400 H0Z" />
          <path className="hillB" d="M0 292 Q280 250 580 284 T1120 288 V400 H0Z" />
          <rect className="grnd" y="306" width="1120" height="94" />
          <rect className="grndHi" y="306" width="1120" height="7" />
          <path d="M524 400 L548 312 H576 L604 400Z" fill="var(--ground-hi)" opacity=".7" />

          {/* left trees */}
          <g className="sway">
            <rect x="120" y="214" width="12" height="96" fill="#6b4628" />
            <circle cx="126" cy="196" r="44" fill="#c8642f" />
            <circle cx="96" cy="214" r="30" fill="#b3472c" />
            <circle cx="156" cy="216" r="30" fill="#d4953a" />
          </g>

          {/* GARDEN (hotspot → /garden) */}
          <Link href="/garden">
            <g className="hot">
              <rect x="296" y="312" width="156" height="40" fill="#7a5230" />
              <rect x="296" y="312" width="156" height="6" fill="#8c6038" />
              <rect x="308" y="326" width="132" height="3" fill="#5e3d22" />
              <rect x="308" y="338" width="132" height="3" fill="#5e3d22" />
              <g className="sway" style={{ animationDuration: "5s" }}>
                <rect x="322" y="296" width="4" height="20" fill="var(--olive)" />
                <circle cx="324" cy="294" r="7" fill="#d27ba0" />
              </g>
              <g className="sway" style={{ animationDuration: "5.6s", animationDelay: "-1s" }}>
                <rect x="356" y="292" width="4" height="24" fill="var(--olive)" />
                <circle cx="358" cy="289" r="8" fill="var(--gold)" />
              </g>
              <g className="sway" style={{ animationDuration: "6.2s", animationDelay: "-2s" }}>
                <rect x="392" y="298" width="4" height="18" fill="var(--olive)" />
                <circle cx="394" cy="296" r="6" fill="#c8642f" />
              </g>
              <g className="sway" style={{ animationDuration: "5.3s" }}>
                <rect x="424" y="294" width="4" height="22" fill="var(--olive)" />
                <circle cx="426" cy="291" r="7" fill="#d27ba0" />
              </g>
              <ellipse cx="298" cy="360" rx="13" ry="10" fill="#c8642f" />
              <ellipse cx="320" cy="362" rx="9" ry="7" fill="var(--gold)" />
            </g>
          </Link>

          {/* CABIN (decorative) */}
          <g>
            <rect x="600" y="158" width="22" height="40" className="cwall" />
            <circle className="puff" cx="611" cy="154" r="7" fill="#efe6d8" />
            <circle className="puff p2" cx="615" cy="154" r="6" fill="#efe6d8" />
            <circle className="puff p3" cx="607" cy="154" r="6" fill="#efe6d8" />
            <path className="croof" d="M486 204 L560 146 L634 204Z" />
            <rect x="492" y="200" width="136" height="10" fill="#6b4428" />
            <rect x="502" y="208" width="116" height="100" className="cwall" stroke="#6b4428" strokeWidth="2" />
            <g stroke="#74492a" strokeWidth="2">
              <line x1="502" y1="230" x2="618" y2="230" />
              <line x1="502" y1="254" x2="618" y2="254" />
              <line x1="502" y1="278" x2="618" y2="278" />
            </g>
            <rect x="544" y="256" width="32" height="52" className="croof" />
            <circle cx="569" cy="284" r="2.5" fill="var(--gold)" />
            <rect x="512" y="232" width="24" height="24" className="cwin" />
            <rect x="512" y="232" width="24" height="24" fill="none" stroke="#5c3a22" strokeWidth="3" />
            <line x1="524" y1="232" x2="524" y2="256" stroke="#5c3a22" strokeWidth="2" />
            <line x1="512" y1="244" x2="536" y2="244" stroke="#5c3a22" strokeWidth="2" />
            <rect x="584" y="232" width="24" height="24" className="cwin" />
            <rect x="584" y="232" width="24" height="24" fill="none" stroke="#5c3a22" strokeWidth="3" />
            <line x1="596" y1="232" x2="596" y2="256" stroke="#5c3a22" strokeWidth="2" />
            <line x1="584" y1="244" x2="608" y2="244" stroke="#5c3a22" strokeWidth="2" />
          </g>

          {/* STABLE (hotspot → /stable) */}
          <Link href="/stable">
            <g className="hot">
              <path className="barnD" d="M724 232 L792 188 L860 232Z" />
              <rect x="730" y="228" width="124" height="80" className="barnW" stroke="#7d2f20" strokeWidth="2" />
              <rect x="760" y="256" width="64" height="52" className="barnD" />
              <g stroke="#f3e7cf" strokeWidth="3" fill="none">
                <line x1="760" y1="256" x2="824" y2="308" />
                <line x1="824" y1="256" x2="760" y2="308" />
                <rect x="760" y="256" width="64" height="52" />
              </g>
              <rect x="784" y="240" width="16" height="12" fill="#f3e7cf" />
              <g className="sway" style={{ animationDuration: "7s" }}>
                <rect x="700" y="270" width="26" height="34" rx="4" fill="#8a5a34" />
                <rect x="696" y="260" width="16" height="20" rx="5" fill="#8a5a34" />
                <rect x="694" y="256" width="6" height="8" fill="#5c3a22" />
                <rect x="704" y="254" width="6" height="9" fill="#5c3a22" />
                <circle cx="700" cy="270" r="2" fill="#2a1c10" />
                <rect x="708" y="258" width="6" height="16" fill="#3a2410" />
              </g>
            </g>
          </Link>
          <g className="sway" style={{ animationDelay: "-3s" }}>
            <rect x="980" y="214" width="12" height="96" fill="#6b4628" />
            <circle cx="986" cy="196" r="42" fill="#b3472c" />
            <circle cx="1014" cy="214" r="28" fill="#c8642f" />
            <circle cx="958" cy="216" r="26" fill="var(--gold)" />
          </g>
        </svg>

        <div className="signpost s-cabin">
          <span className="dot" style={{ background: "var(--accent)" }} />
          The cabin · home
        </div>
        <Link className="signpost s-garden" href="/garden">
          <span className="dot" style={{ background: "var(--olive)" }} />
          Visit the garden <span className="ar">→</span>
        </Link>
        <Link className="signpost s-stable" href="/stable">
          <span className="dot" style={{ background: "var(--rust)" }} />
          Visit the stable <span className="ar">→</span>
        </Link>
        <FallingLeaves />
      </div>
    </div>
  );
}
