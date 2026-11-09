export default function TaskIllustration() {
  return (
    <svg
      className="task-illustration"
      viewBox="0 0 360 240"
      role="img"
      aria-labelledby="planner-title"
    >
      <title id="planner-title">
        A task planner with completed tasks and a growing plant
      </title>
      <ellipse cx="180" cy="215" rx="151" ry="12" fill="#efefeb" />
      <rect
        x="63"
        y="25"
        width="210"
        height="183"
        rx="12"
        fill="#fff"
        stroke="#deded7"
        strokeWidth="2"
      />
      <rect x="80" y="44" width="108" height="9" rx="4" fill="#37352f" />
      <rect x="80" y="61" width="152" height="5" rx="2" fill="#e8e8e2" />
      <rect x="80" y="84" width="175" height="31" rx="5" fill="#f2f6f1" />
      <rect x="80" y="124" width="175" height="31" rx="5" fill="#f2f6f1" />
      <rect x="80" y="164" width="175" height="27" rx="5" fill="#f7f7f5" />
      <g
        fill="none"
        stroke="#77957a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m91 99 4 4 8-9" />
        <path d="m91 139 4 4 8-9" />
      </g>
      <g fill="#a6b3a2">
        <rect x="115" y="96" width="114" height="5" rx="2" />
        <rect x="115" y="136" width="95" height="5" rx="2" />
      </g>
      <circle
        cx="97"
        cy="177"
        r="6"
        fill="none"
        stroke="#c7c6be"
        strokeWidth="2"
      />
      <rect x="115" y="175" width="106" height="5" rx="2" fill="#cecdc6" />
      <path d="M288 184v-51" stroke="#77957a" strokeWidth="3" fill="none" />
      <path
        d="M288 161c-28-3-30-25-29-30 20 1 31 10 29 30Zm0-14c1-23 20-31 29-29 0 17-10 28-29 29Z"
        fill="#b7c7ad"
      />
      <path d="m270 180 5 31h27l5-31Z" fill="#ddd5c5" />
      <circle cx="45" cy="75" r="9" fill="#f2ecda" />
      <path d="m303 52 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#dfd6b8" />
    </svg>
  );
}
