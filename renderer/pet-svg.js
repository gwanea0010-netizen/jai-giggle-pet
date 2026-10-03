// Builds the pet SVG. `uid` keeps gradient/filter ids unique when several pets
// are on one page (settings previews).
(function () {
  const BODY = 'M100 62 C142 62 164 92 164 123 C164 154 137 172 100 172 C63 172 36 154 36 123 C36 92 58 62 100 62 Z';

  // Cyborg ERP triangle mark.
  const logo = (cx, cy, s) => `
    <g class="p-logo" transform="translate(${cx} ${cy}) scale(${s})">
      <path d="M0 -7.5 L-7 5" class="lg-a"/>
      <path d="M0 -7.5 L7 5" class="lg-b"/>
      <path d="M-7 5 L7 5" class="lg-c"/>
    </g>`;

  window.PetSVG = function (uid = 'main') {
    const id = (n) => `${n}-${uid}`;
    return `
<svg class="pet s-idle" data-species="cat" data-eyes="open" data-mouth="smile" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <radialGradient id="${id('body')}" cx="38%" cy="30%" r="78%">
      <stop offset="0%" style="stop-color:var(--body-light)"/>
      <stop offset="60%" style="stop-color:var(--body)"/>
      <stop offset="100%" style="stop-color:var(--rim)"/>
    </radialGradient>
    <linearGradient id="${id('shade')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.2"/>
    </linearGradient>
    <radialGradient id="${id('eye')}" cx="45%" cy="38%" r="65%">
      <stop offset="0.6" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d9deea"/>
    </radialGradient>
    <radialGradient id="${id('limb')}" cx="35%" cy="30%" r="80%">
      <stop offset="0%" style="stop-color:var(--limb-light)"/>
      <stop offset="100%" style="stop-color:var(--limb)"/>
    </radialGradient>
    <linearGradient id="${id('visor')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b3a7a"/>
      <stop offset="1" stop-color="#050b1f"/>
    </linearGradient>
    <filter id="${id('soft')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="${id('blur')}" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>

  <!-- sky: time of day + weather (behind the pet) -->
  <g class="p-sky">
    <g class="p-moon"><path d="M38 12 A15 15 0 1 0 38 42 A17 17 0 0 1 38 12 Z"/></g>
    <g class="p-stars">
      <path style="--d:0s" d="M58 12 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z"/>
      <path style="--d:.7s" d="M14 52 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 Z"/>
      <path style="--d:1.4s" d="M176 18 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z"/>
      <path style="--d:2.1s" d="M188 60 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1 Z"/>
    </g>
    <g class="p-sun">
      <g class="p-sun-rays"><path d="M174 6 V0 M174 42 V48 M156 24 H150 M192 24 H198 M161 11 L157 7 M187 37 L191 41 M187 11 L191 7 M161 37 L157 41"/></g>
      <circle cx="174" cy="24" r="11"/>
    </g>
    <g class="p-cloud"><path d="M138 40 a10 10 0 0 1 10 -12 a13 13 0 0 1 24 -2 a9 9 0 0 1 12 10 a7 7 0 0 1 -2 14 h-40 a7 7 0 0 1 -4 -10 Z"/></g>
    <g class="p-rain">
      <line style="--d:0s" x1="18" y1="0" x2="14" y2="12"/><line style="--d:.35s" x1="42" y1="10" x2="38" y2="22"/>
      <line style="--d:.15s" x1="166" y1="4" x2="162" y2="16"/><line style="--d:.5s" x1="188" y1="20" x2="184" y2="32"/>
      <line style="--d:.25s" x1="10" y1="60" x2="6" y2="72"/><line style="--d:.6s" x1="194" y1="70" x2="190" y2="82"/>
      <line style="--d:.45s" x1="26" y1="100" x2="22" y2="112"/><line style="--d:.1s" x1="180" y1="110" x2="176" y2="122"/>
    </g>
    <g class="p-snow">
      <text style="--d:0s" x="16" y="10">❄</text><text style="--d:1.2s" x="44" y="0">❄</text>
      <text style="--d:.6s" x="170" y="6">❄</text><text style="--d:1.8s" x="190" y="30">❄</text>
      <text style="--d:2.4s" x="8" y="60">❄</text>
    </g>
  </g>

  <ellipse class="p-shadow" cx="100" cy="183" rx="50" ry="7" filter="url(#${id('blur')})"/>

  <g class="p-body-group">
    <g class="p-back">
      <g class="acc acc-cape">
        <path class="p-cape" d="M58 100 C40 140 34 172 42 188 C70 178 130 178 158 188 C166 172 160 140 142 100 Z"/>
      </g>
      <g class="sp sp-cat">
        <path class="p-ear" d="M60 86 C52 62 60 46 72 43 C82 50 86 64 84 78 Z"/>
        <path class="p-ear" d="M140 86 C148 62 140 46 128 43 C118 50 114 64 116 78 Z"/>
        <path class="p-ear-in" d="M65 80 C61 64 65 54 72 51 C77 56 79 65 78 74 Z"/>
        <path class="p-ear-in" d="M135 80 C139 64 135 54 128 51 C123 56 121 65 122 74 Z"/>
      </g>
      <g class="sp sp-bunny">
        <g class="p-bunny-l">
          <path class="p-ear" d="M70 80 C60 50 58 14 70 8 C82 4 88 40 86 76 Z"/>
          <path class="p-ear-in" d="M72 72 C66 50 65 24 71 17 C77 15 80 44 79 70 Z"/>
        </g>
        <g class="p-bunny-r">
          <path class="p-ear" d="M130 80 C140 50 142 14 130 8 C118 4 112 40 114 76 Z"/>
          <path class="p-ear-in" d="M128 72 C134 50 135 24 129 17 C123 15 120 44 121 70 Z"/>
        </g>
      </g>
      <g class="sp sp-panda">
        <circle class="p-dark" cx="63" cy="72" r="16"/>
        <circle class="p-dark" cx="137" cy="72" r="16"/>
        <circle class="p-ear-in" cx="63" cy="72" r="7"/>
        <circle class="p-ear-in" cx="137" cy="72" r="7"/>
      </g>
      <g class="sp sp-dino">
        <path class="p-spike" d="M60 86 L61 64 L74 76 Z M74 74 L82 52 L92 68 Z M92 66 L100 44 L108 66 Z M108 68 L118 52 L126 74 Z M126 76 L139 64 L140 86 Z"/>
      </g>
      <g class="sp sp-fox">
        <path class="p-tail" d="M146 162 C190 156 196 104 172 88 C178 118 164 140 138 148 Z"/>
        <path class="p-tail-tip" d="M172 88 C186 98 192 114 188 128 C182 112 176 100 172 88 Z"/>
        <path class="p-ear" d="M58 92 L60 32 L94 70 Z"/>
        <path class="p-ear" d="M142 92 L140 32 L106 70 Z"/>
        <path class="p-ear-in" d="M64 82 L64 46 L84 70 Z"/>
        <path class="p-ear-in" d="M136 82 L136 46 L116 70 Z"/>
      </g>
      <g class="sp sp-koala">
        <circle class="p-ear" cx="54" cy="84" r="25"/>
        <circle class="p-ear" cx="146" cy="84" r="25"/>
        <circle class="p-ear-in" cx="56" cy="86" r="14"/>
        <circle class="p-ear-in" cx="144" cy="86" r="14"/>
      </g>
      <g class="sp sp-cyborgai">
        <line x1="100" y1="64" x2="100" y2="40" class="p-ai-antenna"/>
        <ellipse cx="100" cy="34" rx="15" ry="4.5" class="p-ai-halo"/>
        <circle cx="100" cy="34" r="6" class="p-ai-core"/>
      </g>
      <g class="sp sp-robot">
        <line x1="100" y1="66" x2="100" y2="42" class="p-antenna"/>
        <circle cx="100" cy="36" r="7" class="p-bulb"/>
        <circle cx="97.5" cy="33.5" r="2" fill="#fff" opacity=".7"/>
      </g>
    </g>

    <ellipse class="p-foot p-foot-l" cx="78" cy="171" rx="14" ry="8" fill="url(#${id('limb')})"/>
    <ellipse class="p-foot p-foot-r" cx="122" cy="171" rx="14" ry="8" fill="url(#${id('limb')})"/>

    <path class="p-body" d="${BODY}" fill="url(#${id('body')})"/>
    <path d="${BODY}" fill="url(#${id('shade')})"/>
    <ellipse class="p-hl" cx="76" cy="84" rx="22" ry="11" transform="rotate(-28 76 84)" filter="url(#${id('soft')})"/>
    <ellipse class="p-belly" cx="100" cy="146" rx="36" ry="21"/>

    <g class="sp sp-robot">
      <circle class="p-bolt" cx="37" cy="112" r="9"/><circle class="p-bolt-in" cx="37" cy="112" r="4"/>
      <circle class="p-bolt" cx="163" cy="112" r="9"/><circle class="p-bolt-in" cx="163" cy="112" r="4"/>
      ${logo(100, 148, 1.5)}
    </g>
    <g class="sp sp-cyborgai">
      <!-- ear pods -->
      <rect x="28" y="100" width="16" height="30" rx="8" class="p-ai-pod"/>
      <rect x="156" y="100" width="16" height="30" rx="8" class="p-ai-pod"/>
      <rect x="34" y="106" width="4" height="18" rx="2" class="p-ai-glow"/>
      <rect x="162" y="106" width="4" height="18" rx="2" class="p-ai-glow"/>
      <!-- chest core -->
      <circle cx="100" cy="146" r="12" class="p-ai-chest"/>
      ${logo(100, 147.5, 1.15)}
      <!-- CYBORG ERP banner across the belly -->
      <path d="M50 156 Q100 170 150 156 L148 168 Q100 182 52 168 Z" class="p-ai-banner"/>
      <path d="M50 156 L42 160 L50 163 Z M150 156 L158 160 L150 163 Z" class="p-ai-banner-tail"/>
      <text x="100" y="171" text-anchor="middle" class="p-ai-banner-text">CYBORG ERP</text>
    </g>
    <g class="sp sp-dino">
      <circle class="p-spot" cx="58" cy="100" r="5"/><circle class="p-spot" cx="146" cy="96" r="4"/><circle class="p-spot" cx="140" cy="150" r="5"/>
    </g>

    <!-- outfits (body slot) -->
    <g class="acc acc-tshirt">
      <path class="p-shirt" d="M56 148 C64 141 80 139 91 139 L100 148 L109 139 C120 139 136 141 144 148 L152 157 C144 169 125 175 100 175 C75 175 56 169 48 157 Z"/>
      ${logo(100, 160, 1.15)}
    </g>
    <g class="acc acc-kurta">
      <path class="p-kurta" d="M56 148 C64 141 80 139 91 139 L100 150 L109 139 C120 139 136 141 144 148 L152 157 C144 169 125 175 100 175 C75 175 56 169 48 157 Z"/>
      <path d="M100 150 L100 174" class="p-kurta-line"/>
      <circle cx="100" cy="155" r="1.8" class="p-kurta-btn"/><circle cx="100" cy="162" r="1.8" class="p-kurta-btn"/><circle cx="100" cy="169" r="1.8" class="p-kurta-btn"/>
      <path d="M50 158 C70 166 130 166 150 158" class="p-kurta-hem"/>
    </g>
    <g class="acc acc-holi">
      <circle cx="70" cy="86" r="7" fill="#ff4fa3"/><circle cx="130" cy="94" r="6" fill="#22c55e"/>
      <circle cx="58" cy="142" r="8" fill="#ffd23f"/><circle cx="142" cy="150" r="7" fill="#3b82f6"/>
      <circle cx="112" cy="76" r="5" fill="#a855f7"/><circle cx="84" cy="162" r="6" fill="#ff4fa3"/>
      <circle cx="122" cy="166" r="4.5" fill="#22c55e"/><circle cx="62" cy="108" r="3.5" fill="#3b82f6"/>
    </g>

    <g class="acc acc-bowtie">
      <path d="M100 151 L85 142 L85 160 Z M100 151 L115 142 L115 160 Z" class="p-bow"/>
      <circle cx="100" cy="151" r="4.2" class="p-bow-knot"/>
    </g>
    <g class="acc acc-cape">
      <circle cx="68" cy="138" r="4" class="p-clasp"/><circle cx="132" cy="138" r="4" class="p-clasp"/>
    </g>

    <g class="p-face">
      <g class="sp sp-robot"><rect x="57" y="93" width="86" height="40" rx="19" class="p-visor"/></g>
      <g class="sp sp-cyborgai">
        <rect x="54" y="92" width="92" height="44" rx="22" class="p-ai-visor" fill="url(#${id('visor')})"/>
        <path d="M62 100 Q80 95 98 97" class="p-ai-visor-shine"/>
      </g>
      <g class="sp sp-fox">
        <path class="p-mask" d="M60 118 C68 140 88 147 100 147 C112 147 132 140 140 118 C128 127 113 129 100 127 C87 129 72 127 60 118 Z"/>
      </g>
      <g class="sp sp-panda">
        <ellipse class="p-dark" cx="79" cy="113" rx="16" ry="13" transform="rotate(-25 79 113)"/>
        <ellipse class="p-dark" cx="121" cy="113" rx="16" ry="13" transform="rotate(25 121 113)"/>
      </g>

      <g class="p-eyes-open">
        <g class="p-eye p-eye-l">
          <circle class="p-eye-white" cx="80" cy="112" r="13" fill="url(#${id('eye')})"/>
          <g class="p-pupil">
            <circle class="p-iris" cx="80" cy="112" r="8"/>
            <circle class="p-shine" cx="77" cy="108.5" r="2.8"/>
            <circle class="p-shine" cx="83" cy="115.5" r="1.2"/>
          </g>
        </g>
        <g class="p-eye p-eye-r">
          <circle class="p-eye-white" cx="120" cy="112" r="13" fill="url(#${id('eye')})"/>
          <g class="p-pupil">
            <circle class="p-iris" cx="120" cy="112" r="8"/>
            <circle class="p-shine" cx="117" cy="108.5" r="2.8"/>
            <circle class="p-shine" cx="123" cy="115.5" r="1.2"/>
          </g>
        </g>
      </g>
      <g class="p-eyes-happy p-eyeline">
        <path d="M69 116 Q80 101 91 116"/><path d="M109 116 Q120 101 131 116"/>
      </g>
      <g class="p-eyes-closed p-eyeline">
        <path d="M70 113 Q80 120 90 113"/><path d="M110 113 Q120 120 130 113"/>
      </g>
      <g class="p-eyes-dizzy p-eyeline">
        <path d="M73 105 L87 119 M87 105 L73 119"/><path d="M113 105 L127 119 M127 105 L113 119"/>
      </g>

      <ellipse class="p-blush" cx="64" cy="129" rx="8.5" ry="4.5"/>
      <ellipse class="p-blush" cx="136" cy="129" rx="8.5" ry="4.5"/>

      <g class="sp sp-fox"><ellipse cx="100" cy="123" rx="4" ry="3" class="p-nose"/></g>
      <g class="sp sp-koala"><ellipse cx="100" cy="121" rx="8.5" ry="9.5" class="p-nose"/><ellipse cx="97" cy="117" rx="2.5" ry="2" fill="#fff" opacity=".35"/></g>

      <path class="p-mouth m-smile p-mline" d="M93 128 Q100 135 107 128"/>
      <path class="p-mouth m-flat p-mline" d="M95 131 Q100 129 105 131"/>
      <g class="p-mouth m-grin">
        <path d="M89 126 Q100 144 111 126 Z" class="p-grin"/>
        <path d="M94 135 Q100 131 106 135 Q100 140 94 135 Z" class="p-tongue"/>
      </g>
      <ellipse class="p-mouth m-o p-grin" cx="100" cy="131" rx="4.5" ry="5.5"/>

      <!-- face accessories -->
      <g class="acc acc-nerd p-frames">
        <circle cx="80" cy="112" r="15.5"/><circle cx="120" cy="112" r="15.5"/>
        <path d="M95 110 Q100 105 105 110 M64.5 110 L48 105 M135.5 110 L152 105"/>
      </g>
      <g class="acc acc-shades">
        <path d="M63 103 H97 V113 C97 125 65 125 63 113 Z M103 103 H137 V113 C135 125 103 125 103 113 Z" class="p-lens"/>
        <path d="M97 107 H103 M63 105 L48 102 M137 105 L152 102" class="p-frame-line"/>
        <path d="M69 108 L77 108 M109 108 L117 108" class="p-lens-shine"/>
      </g>
      <g class="acc acc-stars">
        <path d="M80 95 L84.7 105.5 L96.2 106.7 L87.6 114.5 L90 125.8 L80 120 L70 125.8 L72.4 114.5 L63.8 106.7 L75.3 105.5 Z M120 95 L124.7 105.5 L136.2 106.7 L127.6 114.5 L130 125.8 L120 120 L110 125.8 L112.4 114.5 L103.8 106.7 L115.3 105.5 Z" class="p-star-glass"/>
        <path d="M96.2 108 Q100 105 103.8 108" class="p-frame-line"/>
      </g>
      <g class="acc acc-santa">
        <path d="M70 70 C76 42 104 28 134 40 C122 46 118 56 130 70 Z" class="p-santa"/>
        <rect x="66" y="63" width="68" height="13" rx="6.5" class="p-santa-trim"/>
        <circle cx="136" cy="41" r="6.5" class="p-santa-trim"/>
      </g>

      <!-- head accessories -->
      <g class="acc acc-partyhat" transform="rotate(-8 100 68)">
        <path d="M84 68 L100 26 L116 68 Z" class="p-hat"/>
        <path d="M90 54 L110 54 M94 43 L106 43" class="p-hat-stripe"/>
        <path d="M83 68 L117 68" class="p-hat-band"/>
        <circle cx="100" cy="25" r="5.5" class="p-pompom"/>
      </g>
      <g class="acc acc-flower">
        <circle cx="137" cy="70" r="6"/><circle cx="132.2" cy="76.7" r="6"/><circle cx="124.3" cy="74.1" r="6"/>
        <circle cx="124.3" cy="65.9" r="6"/><circle cx="132.2" cy="63.3" r="6"/>
        <circle cx="130" cy="70" r="4.5" class="p-flower-mid"/>
      </g>
      <g class="acc acc-cap">
        <path d="M68 74 C68 42 132 42 132 74 Z" class="p-cap"/>
        <path d="M96 72 C112 64 142 66 150 76 C132 79 110 78 96 74 Z" class="p-cap-brim"/>
        <circle cx="100" cy="46" r="3" class="p-cap-btn"/>
        ${logo(100, 62, 0.9)}
      </g>
      <g class="acc acc-crown">
        <path d="M77 72 L77 50 L88.5 60 L100 43 L111.5 60 L123 50 L123 72 Z" class="p-crown"/>
        <circle cx="100" cy="64" r="3.6" fill="#e5484d"/><circle cx="87" cy="66" r="2.6" fill="#4fb3ef"/><circle cx="113" cy="66" r="2.6" fill="#22a83a"/>
      </g>
    </g>

    <!-- weather wear -->
    <g class="p-scarf">
      <path d="M56 134 Q100 152 144 134 L146 145 Q100 164 54 145 Z" class="p-scarf-band"/>
      <path d="M118 148 L124 174 L136 171 L130 146 Z" class="p-scarf-band"/>
      <path d="M60 138 L66 147 M74 142 L80 151 M88 145 L93 154 M104 146 L108 155 M120 144 L124 152 M134 140 L138 148" class="p-scarf-stripe"/>
    </g>

    <g class="p-phones">
      <path class="p-band" d="M44 110 C42 48 158 48 156 110"/>
      <rect class="p-cup" x="33" y="98" width="19" height="32" rx="9"/>
      <rect class="p-cup-in" x="46" y="103" width="6" height="22" rx="3"/>
      <rect class="p-cup" x="148" y="98" width="19" height="32" rx="9"/>
      <rect class="p-cup-in" x="148" y="103" width="6" height="22" rx="3"/>
      <g class="p-mic">
        <path d="M158 126 C160 142 140 146 122 140" class="p-mic-arm"/>
        <circle cx="120" cy="139.5" r="4.5" class="p-mic-tip"/>
      </g>
    </g>

    <g class="p-laptop">
      <rect x="70" y="134" width="60" height="28" rx="4" class="p-lap-screen"/>
      ${logo(100, 149, 1.05)}
      <rect x="63" y="160" width="74" height="6" rx="3" class="p-lap-base"/>
    </g>

    <g class="p-cookie">
      <circle cx="100" cy="128" r="9" class="p-cookie-dough"/>
      <circle cx="97" cy="125" r="1.6" class="p-chip"/><circle cx="103" cy="129" r="1.6" class="p-chip"/><circle cx="98" cy="132" r="1.3" class="p-chip"/>
    </g>

    <g class="p-arm-l"><ellipse cx="42" cy="133" rx="8.5" ry="14" transform="rotate(18 42 133)" class="p-arm" fill="url(#${id('limb')})"/></g>
    <g class="p-arm-r"><ellipse cx="158" cy="133" rx="8.5" ry="14" transform="rotate(-18 158 133)" class="p-arm" fill="url(#${id('limb')})"/></g>

    <!-- Cyborg AI holds the Cyborg ERP flag -->
    <g class="sp sp-cyborgai">
      <line x1="166" y1="182" x2="166" y2="56" class="p-ai-pole"/>
      <circle cx="166" cy="54" r="3.5" class="p-ai-pole-tip"/>
      <g class="p-ai-flag">
        <path d="M167 58 Q182 54 198 60 L198 86 Q182 80 167 84 Z" class="p-ai-flag-cloth"/>
        ${logo(182, 70, 0.75)}
        <text x="182.5" y="81.5" text-anchor="middle" class="p-ai-flag-text">CYBORG</text>
      </g>
      <ellipse cx="163" cy="146" rx="6" ry="5" class="p-ai-hand" fill="url(#${id('limb')})"/>
    </g>

    <path class="p-sweat" d="M154 84 C158 91 160 95 156 98 C152 100 149 96 151 92 Z"/>

    <!-- umbrella for rain / storms, held in the right hand -->
    <g class="p-umbrella">
      <path d="M128 30 L160 136" class="p-umb-stick"/>
      <path d="M160 136 q4 8 -3 9" class="p-umb-stick"/>
      <g transform="rotate(14 128 30)">
        <path d="M70 36 Q128 -16 186 36 Q176 30 166 36 Q157 29 147 36 Q138 29 128 36 Q119 29 109 36 Q100 29 90 36 Q80 30 70 36 Z" class="p-umb-top"/>
        <path d="M128 36 Q128 10 128 -4 M109 36 Q114 12 128 -4 M147 36 Q142 12 128 -4 M90 36 Q100 14 128 -4 M166 36 Q156 14 128 -4" class="p-umb-ribs"/>
        <circle cx="128" cy="-5" r="2.5" class="p-umb-tip"/>
      </g>
    </g>
  </g>

  <!-- morning chai -->
  <g class="p-chai">
    <path d="M18 158 h20 v14 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 Z" class="p-cup"/>
    <path d="M38 162 a5 5 0 0 1 0 10" class="p-cup-handle"/>
    <rect x="18" y="158" width="20" height="4" rx="1" class="p-chai-top"/>
    <path d="M24 154 q-3 -5 0 -10 q3 -5 0 -10 M32 154 q-3 -5 0 -10 q3 -5 0 -10" class="p-steam"/>
  </g>

  <rect class="p-flash" x="-20" y="-20" width="240" height="240"/>

  <!-- props (stay on the ground) -->
  <g class="acc acc-diya">
    <path d="M136 175 Q152 190 168 175 Z" class="p-diya"/>
    <path d="M136 175 L168 175" class="p-diya-rim"/>
    <ellipse cx="152" cy="165" rx="4.5" ry="8" class="p-flame"/>
    <ellipse cx="152" cy="167" rx="2" ry="4" class="p-flame-core"/>
  </g>
  <g class="acc acc-gift">
    <rect x="142" y="160" width="26" height="22" rx="2" class="p-gift"/>
    <path d="M155 160 V182 M142 170 H168" class="p-ribbon"/>
    <path d="M155 160 C148 150 144 156 155 160 C166 156 162 150 155 160 Z" class="p-ribbon-bow"/>
  </g>
  <g class="acc acc-flag">
    <line x1="34" y1="186" x2="34" y2="126" class="p-pole"/>
    <g class="p-flag">
      <rect x="34" y="126" width="32" height="7" fill="#ff9933"/>
      <rect x="34" y="133" width="32" height="7" fill="#ffffff"/>
      <rect x="34" y="140" width="32" height="7" fill="#138808"/>
      <circle cx="50" cy="136.5" r="2.6" fill="none" stroke="#000080" stroke-width="1.1"/>
    </g>
  </g>

  <g class="p-sparkles">
    <path class="p-spark" style="--d:0s" d="M30 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z"/>
    <path class="p-spark" style="--d:.25s" d="M168 50 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5 Z"/>
    <path class="p-spark" style="--d:.5s" d="M176 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/>
    <path class="p-spark" style="--d:.75s" d="M22 130 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/>
  </g>

  <g class="p-notes">
    <text class="p-note" x="26" y="96" style="--d:0s">♪</text>
    <text class="p-note" x="164" y="84" style="--d:.8s">♫</text>
    <text class="p-note" x="20" y="130" style="--d:1.6s">♫</text>
    <text class="p-note" x="172" y="124" style="--d:1.2s">♪</text>
  </g>

  <g class="p-hearts">
    <path class="p-heart" style="--d:0s" d="M100 58 c-4 -6 -12 -3 -10 3 c1 4 10 9 10 9 s9 -5 10 -9 c2 -6 -6 -9 -10 -3 Z"/>
    <path class="p-heart" style="--d:.2s" d="M64 70 c-3 -4 -9 -2 -7.5 2 c.8 3 7.5 7 7.5 7 s6.7 -4 7.5 -7 c1.5 -4 -4.5 -6 -7.5 -2 Z"/>
    <path class="p-heart" style="--d:.4s" d="M138 66 c-3 -4 -9 -2 -7.5 2 c.8 3 7.5 7 7.5 7 s6.7 -4 7.5 -7 c1.5 -4 -4.5 -6 -7.5 -2 Z"/>
  </g>

  <g class="p-exclaim">
    <circle cx="168" cy="52" r="14" class="p-ex-bg"/>
    <rect x="165.5" y="42" width="5" height="12" rx="2.5" class="p-ex-mark"/>
    <circle cx="168" cy="59" r="2.8" class="p-ex-mark"/>
  </g>

  <g class="p-zzz">
    <text x="146" y="62" style="--d:0s">z</text>
    <text x="156" y="50" style="--d:1s">z</text>
    <text x="166" y="38" style="--d:2s">Z</text>
  </g>

  <path class="p-hit" d="M100 30 C150 30 172 90 172 125 C172 165 140 186 100 186 C60 186 28 165 28 125 C28 90 50 30 100 30 Z"/>
</svg>`;
  };
})();
