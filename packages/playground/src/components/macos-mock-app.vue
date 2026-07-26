<script setup lang="ts">
type MacosMockAppId
  = | 'files'
    | 'app-store'
    | 'freeform'
    | 'keynote'
    | 'mail'
    | 'messages'
    | 'mindfulness'
    | 'music'
    | 'tv'
    | 'lofi'
    | 'appearance'

defineProps<{
  app: MacosMockAppId
}>()

const appearanceMode = ref<'light' | 'auto' | 'dark'>(isDark.value ? 'dark' : 'light')

function setAppearance(mode: 'light' | 'auto' | 'dark') {
  appearanceMode.value = mode
  isDark.value = mode === 'auto' ? preferredDark.value : mode === 'dark'
}

const finderFolders = [
  { icon: '▰', name: 'Desktop', meta: '8 items', color: '#54a8ff' },
  { icon: '⬇', name: 'Downloads', meta: '24 items', color: '#8c7cf7' },
  { icon: '◆', name: 'Design', meta: '12 items', color: '#ff9f45' },
  { icon: '♫', name: 'Music', meta: '16 items', color: '#ef5e77' },
  { icon: '▣', name: 'Pictures', meta: '84 items', color: '#55c59a' },
  { icon: '⌁', name: 'Shared', meta: '3 people', color: '#5b88ee' },
]

const storeApps = [
  { icon: 'Aa', name: 'Craft', category: 'Productivity', color: '#121212' },
  { icon: '◉', name: 'Flighty', category: 'Travel', color: '#715dff' },
  { icon: '✦', name: 'Pixelmator Pro', category: 'Graphics & Design', color: '#ef3d79' },
]

const emails = [
  { from: 'Design Team', subject: 'Dock motion review', time: '10:42', unread: true },
  { from: 'Mina', subject: 'Weekend photo walk', time: '9:18', unread: true },
  { from: 'Raycast', subject: 'Your weekly highlights', time: 'Yesterday', unread: false },
  { from: 'Apple', subject: 'Your receipt from Apple', time: 'Sat', unread: false },
]

const conversations = [
  { name: 'Nora', message: 'The animation looks so smooth!', color: '#f08b7c' },
  { name: 'Studio', message: 'Kai sent a photo', color: '#7a8fee' },
  { name: 'Family', message: 'Dinner at 7?', color: '#63b886' },
  { name: 'Alex', message: 'See you tomorrow', color: '#d194da' },
]

const tracks = [
  { title: 'Blue Hour', artist: 'Noa Vale', time: '3:42' },
  { title: 'Soft Focus', artist: 'Paper Satellites', time: '4:11' },
  { title: 'Last Train Home', artist: 'Night Tourist', time: '3:26' },
  { title: 'Warm Static', artist: 'Noa Vale', time: '2:58' },
]

const tvShows = [
  { title: 'Severance', tone: 'linear-gradient(145deg, #44556b, #111821)' },
  { title: 'Silo', tone: 'linear-gradient(145deg, #917152, #22201d)' },
  { title: 'Foundation', tone: 'linear-gradient(145deg, #7664ac, #161327)' },
  { title: 'Shrinking', tone: 'linear-gradient(145deg, #e3a86c, #354860)' },
]
</script>

<template>
  <div class="mock-app" :class="`${app}-app`">
    <template v-if="app === 'files'">
      <aside class="files-sidebar mock-sidebar">
        <div class="sidebar-label">
          Favorites
        </div>
        <div class="sidebar-row selected">
          <span class="sidebar-icon">▧</span> Recents
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">▰</span> Desktop
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⬇</span> Downloads
        </div>
        <div class="sidebar-label">
          iCloud
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">☁</span> iCloud Drive
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⌁</span> Shared
        </div>
      </aside>
      <section class="files-main">
        <div class="mock-toolbar">
          <span class="toolbar-nav">‹</span>
          <span class="toolbar-nav muted">›</span>
          <strong>Recents</strong>
          <span class="toolbar-fill" />
          <span class="toolbar-chip">▦</span>
          <span class="toolbar-chip">⋯</span>
        </div>
        <div class="folder-grid">
          <div v-for="folder in finderFolders" :key="folder.name" class="folder-card">
            <div class="folder-icon" :style="{ '--folder-color': folder.color }">
              <span>{{ folder.icon }}</span>
            </div>
            <strong>{{ folder.name }}</strong>
            <small>{{ folder.meta }}</small>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'app-store'">
      <aside class="store-sidebar mock-sidebar">
        <div class="search-pill">
          ⌕ Search
        </div>
        <div class="sidebar-row selected">
          <span class="sidebar-icon">✦</span> Discover
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⌘</span> Arcade
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">▦</span> Create
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">↻</span> Updates
        </div>
      </aside>
      <section class="store-main">
        <div class="section-eyebrow">
          MAC APP OF THE DAY
        </div>
        <div class="store-hero">
          <div>
            <h2>Make space for<br>your best ideas.</h2>
            <p>A beautiful home for notes, sketches, and everything between.</p>
            <span class="get-button">GET</span>
          </div>
          <div class="hero-orbit">
            <span>✦</span>
          </div>
        </div>
        <h3 class="section-title">
          Apps We Love
        </h3>
        <div class="store-list">
          <div v-for="storeApp in storeApps" :key="storeApp.name" class="store-row">
            <div class="store-icon" :style="{ background: storeApp.color }">
              {{ storeApp.icon }}
            </div>
            <div>
              <strong>{{ storeApp.name }}</strong>
              <small>{{ storeApp.category }}</small>
            </div>
            <span class="get-button">GET</span>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'freeform'">
      <aside class="freeform-sidebar mock-sidebar">
        <div class="board-create">
          +
        </div>
        <div class="sidebar-label">
          Boards
        </div>
        <div class="sidebar-row selected">
          <span class="sidebar-icon">▦</span> All Boards
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⌁</span> Shared
        </div>
        <div class="mini-board">
          <span />
          <strong>Launch ideas</strong>
        </div>
      </aside>
      <section class="freeform-canvas">
        <div class="canvas-tools">
          <span>✎</span><span>□</span><span>T</span><span>▧</span>
        </div>
        <div class="sticky-yellow sticky">
          <strong>Dock ideas</strong>
          <span>• window snapshots</span>
          <span>• genie animation ✨</span>
        </div>
        <div class="sticky-pink sticky">
          <strong>Polish</strong>
          <span>Make it feel native</span>
        </div>
        <div class="photo-note">
          <div class="mountains">
            ◒
          </div>
          <small>moodboard.jpg</small>
        </div>
        <div class="connector connector-a" />
        <div class="connector connector-b" />
        <div class="scribble">
          delight!
        </div>
      </section>
    </template>

    <template v-else-if="app === 'keynote'">
      <aside class="slides-sidebar">
        <div v-for="slide in 4" :key="slide" class="slide-thumb" :class="{ selected: slide === 2 }">
          <span>{{ slide }}</span>
          <div class="slide-preview">
            <i />
            <b v-if="slide === 2">A tiny<br>bit magical.</b>
          </div>
        </div>
      </aside>
      <section class="keynote-stage">
        <div class="keynote-toolbar">
          <span>▣ View</span><span>▥ Zoom</span><span class="toolbar-fill" /><span>▶ Play</span>
        </div>
        <div class="presentation-slide">
          <div class="slide-glow" />
          <p>INTRODUCING</p>
          <h2>A tiny bit<br><em>magical.</em></h2>
          <div class="slide-dock">
            <i v-for="dot in 6" :key="dot" :style="{ '--delay': dot }" />
          </div>
        </div>
      </section>
      <aside class="format-panel">
        <strong>Format</strong>
        <div class="format-segment">
          Style&nbsp;&nbsp; Image&nbsp;&nbsp; Arrange
        </div>
        <label>Fill</label>
        <div class="format-field">
          Color Fill <span>▾</span>
        </div>
        <label>Opacity</label>
        <div class="format-slider">
          <i />
        </div>
      </aside>
    </template>

    <template v-else-if="app === 'mail'">
      <aside class="mail-sidebar mock-sidebar">
        <div class="sidebar-label">
          Favorites
        </div>
        <div class="sidebar-row selected">
          <span class="sidebar-icon">▣</span> Inbox <b>12</b>
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">☆</span> VIPs
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⌁</span> Sent
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">▤</span> Drafts <b>2</b>
        </div>
        <div class="sidebar-label">
          Smart Mailboxes
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">⚑</span> Flagged
        </div>
      </aside>
      <section class="mail-list">
        <div class="mail-list-title">
          Inbox <span>12 messages</span>
        </div>
        <div
          v-for="(email, index) in emails"
          :key="email.subject"
          class="mail-row"
          :class="{ selected: index === 0 }"
        >
          <i v-if="email.unread" />
          <div>
            <strong>{{ email.from }}</strong>
            <span>{{ email.subject }}</span>
            <small>Here is a quick update with everything we discussed...</small>
          </div>
          <time>{{ email.time }}</time>
        </div>
      </section>
      <article class="mail-message">
        <div class="message-actions">
          <span>↩</span><span>↪</span><span>⌫</span>
        </div>
        <h2>Dock motion review</h2>
        <div class="sender">
          <span class="avatar blue-avatar">DT</span>
          <div><strong>Design Team</strong><small>to me</small></div>
          <time>Today, 10:42</time>
        </div>
        <p>Hey! The latest motion pass is ready.</p>
        <p>The window now folds right into the Dock, and the reverse animation lands exactly where it started.</p>
        <div class="mail-attachment">
          <span>▧</span>
          <div><strong>motion-preview.mov</strong><small>18.4 MB</small></div>
        </div>
      </article>
    </template>

    <template v-else-if="app === 'messages'">
      <aside class="messages-list">
        <div class="search-pill">
          ⌕ Search
        </div>
        <div
          v-for="(conversation, index) in conversations"
          :key="conversation.name"
          class="conversation"
          :class="{ selected: index === 0 }"
        >
          <span class="avatar" :style="{ background: conversation.color }">{{ conversation.name[0] }}</span>
          <div><strong>{{ conversation.name }}</strong><small>{{ conversation.message }}</small></div>
          <time>{{ index ? 'Sat' : 'Now' }}</time>
        </div>
      </aside>
      <section class="chat-panel">
        <div class="chat-person">
          <span class="avatar coral-avatar">N</span>
          <strong>Nora</strong>
          <small>⌄</small>
        </div>
        <div class="chat-history">
          <time>Today 10:31 AM</time>
          <div class="bubble received">
            Did you finish the Dock animation?
          </div>
          <div class="bubble sent">
            Just did — watch this ✨
          </div>
          <div class="chat-preview">
            <div class="mini-window">
              <i /><i /><i />
              <span>Genie!</span>
            </div>
          </div>
          <div class="bubble received">
            The animation looks so smooth!
          </div>
        </div>
        <div class="message-composer">
          <span>＋</span>
          <div>iMessage</div>
          <span>◉</span>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'mindfulness'">
      <section class="mindfulness-main">
        <div class="mindfulness-nav">
          <strong>Mindfulness</strong>
          <span class="toolbar-fill" />
          <span>History</span>
          <span>Settings</span>
        </div>
        <div class="breathing-area">
          <div class="breathing-orb">
            <i v-for="petal in 8" :key="petal" :style="{ '--petal': petal }" />
            <div class="orb-center">
              <strong>Breathe in</strong>
              <span>4:32</span>
            </div>
          </div>
          <div class="session-copy">
            <span class="section-eyebrow">DAILY CALM</span>
            <h2>Take a moment<br>for yourself.</h2>
            <p>Follow the rhythm and let the rest of the day soften around you.</p>
            <button type="button">
              Begin 5 minutes
            </button>
          </div>
        </div>
        <div class="mindful-cards">
          <div><span>◌</span><strong>Focus</strong><small>8 min</small></div>
          <div><span>☾</span><strong>Unwind</strong><small>10 min</small></div>
          <div><span>♬</span><strong>Ambient</strong><small>Open-ended</small></div>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'music'">
      <aside class="music-sidebar mock-sidebar">
        <div class="search-pill">
          ⌕ Search
        </div>
        <div class="sidebar-label">
          Apple Music
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">▶</span> Listen Now
        </div>
        <div class="sidebar-row selected">
          <span class="sidebar-icon">▦</span> Browse
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">◉</span> Radio
        </div>
        <div class="sidebar-label">
          Library
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">♫</span> Songs
        </div>
        <div class="sidebar-row">
          <span class="sidebar-icon">▤</span> Albums
        </div>
      </aside>
      <section class="music-main">
        <div class="album-hero">
          <div class="album-art">
            <div class="album-sun" />
            <span>BLUE<br>HOUR</span>
          </div>
          <div class="album-copy">
            <span class="section-eyebrow">FEATURED ALBUM</span>
            <h2>Blue Hour</h2>
            <strong>Noa Vale · 2026</strong>
            <p>A quiet collection for late afternoons and long windows.</p>
            <div>
              <button type="button">
                ▶ Play
              </button><button type="button">
                ＋
              </button>
            </div>
          </div>
        </div>
        <div class="track-list">
          <div v-for="(track, index) in tracks" :key="track.title" class="track-row">
            <span>{{ index + 1 }}</span>
            <div><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></div>
            <time>{{ track.time }}</time>
            <b>•••</b>
          </div>
        </div>
        <div class="now-playing">
          <span>Ⅱ</span>
          <div class="playing-art" />
          <div><strong>Blue Hour</strong><small>Noa Vale</small></div>
          <span class="playing-progress"><i /></span>
          <span>♩</span>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'tv'">
      <section class="tv-main">
        <nav class="tv-nav">
          <strong>tv</strong>
          <span>Watch Now</span>
          <span>Apple TV+</span>
          <span>Store</span>
          <span>Library</span>
          <i class="toolbar-fill" />
          <span>⌕</span>
        </nav>
        <div class="tv-hero">
          <div class="tv-haze" />
          <div class="tv-copy">
            <span>tv+ ORIGINAL</span>
            <h2>ORBITAL</h2>
            <p>There is always another side to the story.</p>
            <button type="button">
              ▶ Play Episode
            </button>
            <button type="button" class="round-button">
              +
            </button>
          </div>
          <div class="planet">
            <i />
          </div>
        </div>
        <h3>Up Next</h3>
        <div class="show-row">
          <div v-for="show in tvShows" :key="show.title" class="show-card" :style="{ background: show.tone }">
            <span>tv+</span>
            <strong>{{ show.title }}</strong>
            <i />
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="app === 'lofi'">
      <section class="lofi-main">
        <div class="lofi-scene">
          <img src="/lofi/lofi-bg@0.5x.webp" alt="">
          <div class="lofi-vignette" />
          <div class="lofi-clock">
            22:14
          </div>
          <div class="lofi-copy">
            <span>NOW PLAYING</span>
            <h2>rainy room</h2>
            <p>lofi beats · focus radio</p>
          </div>
        </div>
        <aside class="lofi-player">
          <div class="record">
            <img src="/lofi/lofi-cd@0.5x.webp" alt="">
            <i />
          </div>
          <div class="waveform">
            <i v-for="bar in 32" :key="bar" :style="{ height: `${8 + (bar * 13) % 29}px` }" />
          </div>
          <div class="lofi-controls">
            <span>↶</span><span>◀</span><button type="button">
              Ⅱ
            </button><span>▶</span><span>↷</span>
          </div>
          <div class="lofi-timer">
            <span>25:00 focus</span>
            <i><b /></i>
            <span>12:38 left</span>
          </div>
        </aside>
      </section>
    </template>

    <template v-else>
      <aside class="settings-sidebar mock-sidebar">
        <div class="settings-user">
          <span class="avatar blue-avatar">CJ</span>
          <div><strong>CatsJuice</strong><small>Apple Account</small></div>
        </div>
        <div class="search-pill">
          ⌕ Search
        </div>
        <div class="sidebar-row selected">
          <span class="settings-icon appearance-icon">◐</span> Appearance
        </div>
        <div class="sidebar-row">
          <span class="settings-icon display-icon">▣</span> Displays
        </div>
        <div class="sidebar-row">
          <span class="settings-icon wallpaper-icon">▧</span> Wallpaper
        </div>
        <div class="sidebar-row">
          <span class="settings-icon control-icon">⌘</span> Control Center
        </div>
        <div class="sidebar-row">
          <span class="settings-icon privacy-icon">⌾</span> Privacy & Security
        </div>
      </aside>
      <section class="appearance-main">
        <h2>Appearance</h2>
        <div class="settings-group">
          <div class="setting-line theme-line">
            <span>Appearance</span>
            <div class="theme-options">
              <button
                class="theme-option"
                :class="{ selected: appearanceMode === 'light' }"
                type="button"
                data-appearance-mode="light"
                :aria-pressed="appearanceMode === 'light'"
                @click="setAppearance('light')"
              >
                <div class="theme-preview light-theme">
                  <i /><b />
                </div>
                <small>Light</small>
              </button>
              <button
                class="theme-option"
                :class="{ selected: appearanceMode === 'auto' }"
                type="button"
                data-appearance-mode="auto"
                :aria-pressed="appearanceMode === 'auto'"
                @click="setAppearance('auto')"
              >
                <div class="theme-preview auto-theme">
                  <i /><b />
                </div>
                <small>Auto</small>
              </button>
              <button
                class="theme-option"
                :class="{ selected: appearanceMode === 'dark' }"
                type="button"
                data-appearance-mode="dark"
                :aria-pressed="appearanceMode === 'dark'"
                @click="setAppearance('dark')"
              >
                <div class="theme-preview dark-theme">
                  <i /><b />
                </div>
                <small>Dark</small>
              </button>
            </div>
          </div>
          <div class="setting-line">
            <span>Accent color</span>
            <div class="accent-colors">
              <i v-for="color in ['#e8473f', '#f39c2f', '#f7d13d', '#4dbd64', '#4287e9', '#8b67dc', '#e967b3']" :key="color" :style="{ background: color }" />
            </div>
          </div>
          <div class="setting-line">
            <span>Highlight color</span>
            <div class="select-field">
              Accent Color <b>⌄</b>
            </div>
          </div>
          <div class="setting-line">
            <span>Sidebar icon size</span>
            <div class="segmented-control">
              <b>Small</b><b class="selected">Medium</b><b>Large</b>
            </div>
          </div>
          <div class="setting-line">
            <span>Allow wallpaper tinting in windows</span>
            <i class="mock-switch active"><b /></i>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.mock-app,
.mock-app *,
.mock-app *::before,
.mock-app *::after {
  box-sizing: border-box;
}

.mock-app {
  --panel: #f5f5f7;
  --panel-raised: #fff;
  --sidebar: rgba(225, 225, 229, 0.82);
  --line: rgba(31, 35, 43, 0.11);
  --secondary: #70727a;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #25262b;
  background: var(--panel);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "DM Sans", sans-serif;
  font-size: 12px;
}

button {
  font: inherit;
}

.mock-sidebar {
  flex: 0 0 170px;
  padding: 12px 9px;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
}

.sidebar-label {
  margin: 13px 10px 5px;
  color: var(--secondary);
  font-size: 10px;
  font-weight: 650;
}

.sidebar-row {
  display: flex;
  align-items: center;
  min-height: 29px;
  padding: 0 9px;
  gap: 9px;
  border-radius: 6px;
  white-space: nowrap;
}

.sidebar-row.selected {
  color: inherit;
  background: rgba(122, 125, 135, 0.17);
}

.sidebar-row b {
  margin-left: auto;
  color: var(--secondary);
  font-size: 10px;
}

.sidebar-icon {
  width: 15px;
  color: #2382e2;
  font-size: 14px;
  text-align: center;
}

.search-pill {
  height: 27px;
  margin: 0 2px 11px;
  padding: 5px 9px;
  color: var(--secondary);
  background: rgba(127, 127, 132, 0.13);
  border: 1px solid rgba(127, 127, 132, 0.12);
  border-radius: 7px;
}

.mock-toolbar {
  display: flex;
  align-items: center;
  height: 45px;
  padding: 0 14px;
  gap: 13px;
  border-bottom: 1px solid var(--line);
}

.toolbar-nav {
  color: #4b7fae;
  font-size: 23px;
  line-height: 1;
}

.toolbar-nav.muted {
  color: #b8bbc1;
}

.toolbar-fill {
  flex: 1;
}

.toolbar-chip {
  display: grid;
  place-items: center;
  width: 26px;
  height: 24px;
  background: rgba(128, 128, 132, 0.09);
  border-radius: 6px;
}

.section-eyebrow {
  color: #3878cb;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.section-title {
  margin: 17px 0 8px;
  font-size: 17px;
}

.files-main {
  min-width: 0;
  flex: 1;
  background: var(--panel-raised);
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(90px, 1fr));
  padding: 23px;
  gap: 22px 18px;
}

.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.folder-card strong {
  margin-top: 7px;
  font-size: 11px;
}

.folder-card small {
  margin-top: 2px;
  color: var(--secondary);
  font-size: 9px;
}

.folder-icon {
  position: relative;
  width: 70px;
  height: 48px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--folder-color), white 24%), var(--folder-color));
  border-radius: 5px 7px 8px 8px;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.55), 0 3px 5px rgba(0, 0, 0, 0.12);
}

.folder-icon::before {
  content: "";
  position: absolute;
  top: -7px;
  left: 4px;
  width: 30px;
  height: 12px;
  background: color-mix(in srgb, var(--folder-color), white 30%);
  border-radius: 5px 5px 0 0;
}

.folder-icon span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 20px;
}

.store-main {
  min-width: 0;
  flex: 1;
  padding: 20px 25px;
  overflow: hidden;
  background: var(--panel-raised);
}

.store-hero {
  position: relative;
  display: flex;
  height: 185px;
  margin-top: 5px;
  padding: 25px 27px;
  overflow: hidden;
  color: white;
  background: linear-gradient(130deg, #2867e5 0%, #5336ca 48%, #bb47c8 100%);
  border-radius: 13px;
}

.store-hero h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.store-hero p {
  max-width: 270px;
  margin: 10px 0 15px;
  color: rgba(255, 255, 255, 0.77);
  line-height: 1.35;
}

.get-button {
  display: inline-grid;
  place-items: center;
  min-width: 45px;
  height: 23px;
  padding: 0 11px;
  color: #347bd7;
  background: rgba(235, 241, 250, 0.92);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
}

.hero-orbit {
  position: absolute;
  top: -40px;
  right: -5px;
  width: 225px;
  height: 225px;
  background:
    radial-gradient(circle at 45% 45%, #fff 0 4%, transparent 5%),
    radial-gradient(circle at center, transparent 0 33%, rgba(255, 255, 255, 0.4) 34% 35%, transparent 36% 52%, rgba(255, 255, 255, 0.24) 53% 54%, transparent 55%),
    radial-gradient(circle at center, #f672d0, #684fe3 62%, transparent 63%);
  border-radius: 50%;
  transform: rotate(-14deg);
}

.hero-orbit span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 51px;
}

.store-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.store-row {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr);
  align-items: center;
  padding: 8px;
  gap: 8px;
  background: rgba(128, 128, 132, 0.07);
  border-radius: 10px;
}

.store-row > div:nth-child(2) {
  min-width: 0;
}

.store-row strong,
.store-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-row small {
  margin-top: 2px;
  color: var(--secondary);
  font-size: 9px;
}

.store-row .get-button {
  grid-column: 2;
  justify-self: start;
  height: 19px;
}

.store-icon {
  display: grid;
  grid-row: 1 / span 2;
  place-items: center;
  width: 45px;
  height: 45px;
  color: white;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  font-size: 17px;
  font-weight: 700;
}

.board-create {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  margin: 0 8px 10px auto;
  color: white;
  background: #2a84ed;
  border-radius: 50%;
  font-size: 18px;
}

.mini-board {
  display: flex;
  align-items: center;
  margin: 16px 7px;
  gap: 8px;
}

.mini-board span {
  width: 42px;
  height: 30px;
  background:
    linear-gradient(20deg, transparent 47%, #ef8a67 48% 52%, transparent 53%),
    #faf4cc;
  border: 1px solid var(--line);
  border-radius: 4px;
}

.freeform-canvas {
  position: relative;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  background-color: #f7f6f4;
  background-image: radial-gradient(#c9c6c0 0.8px, transparent 0.8px);
  background-size: 16px 16px;
}

.canvas-tools {
  position: absolute;
  top: 12px;
  left: 50%;
  z-index: 3;
  display: flex;
  padding: 5px;
  gap: 3px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--line);
  border-radius: 9px;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.1);
  transform: translateX(-50%);
}

.canvas-tools span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 25px;
  border-radius: 5px;
  font-size: 14px;
}

.canvas-tools span:first-child {
  color: white;
  background: #2a84ed;
}

.sticky {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 155px;
  height: 123px;
  padding: 19px;
  gap: 9px;
  box-shadow: 0 8px 15px rgba(45, 39, 28, 0.12);
  font-family: "Comic Sans MS", cursive;
}

.sticky strong {
  font-size: 16px;
}

.sticky span {
  font-size: 11px;
}

.sticky-yellow {
  top: 89px;
  left: 74px;
  background: #fff3a9;
  transform: rotate(-3deg);
}

.sticky-pink {
  right: 61px;
  bottom: 53px;
  width: 140px;
  height: 105px;
  background: #ffc9db;
  transform: rotate(4deg);
}

.photo-note {
  position: absolute;
  top: 88px;
  right: 70px;
  width: 150px;
  padding: 9px 9px 22px;
  background: white;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
  transform: rotate(5deg);
}

.mountains {
  display: grid;
  place-items: center;
  height: 95px;
  color: rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(145deg, transparent 45%, #285b65 46% 62%, transparent 63%),
    linear-gradient(35deg, #263a4b 0 40%, #d98172 41% 60%, #edc883 61%);
  font-size: 38px;
}

.photo-note small {
  position: absolute;
  bottom: 5px;
  left: 10px;
  color: #555;
  font-family: "Comic Sans MS", cursive;
}

.connector {
  position: absolute;
  height: 3px;
  background: #5e98d2;
  border-radius: 99px;
  transform-origin: left;
}

.connector-a {
  top: 236px;
  left: 219px;
  width: 150px;
  transform: rotate(20deg);
}

.connector-b {
  right: 166px;
  bottom: 110px;
  width: 110px;
  background: #e5799b;
  transform: rotate(-24deg);
}

.scribble {
  position: absolute;
  bottom: 48px;
  left: 115px;
  color: #4c7cc1;
  font-family: "Comic Sans MS", cursive;
  font-size: 23px;
  transform: rotate(-8deg);
}

.slides-sidebar {
  flex: 0 0 135px;
  padding: 10px 8px;
  overflow: hidden;
  background: #dedee1;
  border-right: 1px solid var(--line);
}

.slide-thumb {
  display: grid;
  grid-template-columns: 15px 1fr;
  margin-bottom: 7px;
  padding: 5px 6px;
  gap: 5px;
  border: 2px solid transparent;
  border-radius: 7px;
}

.slide-thumb.selected {
  background: rgba(68, 129, 216, 0.15);
  border-color: #4383d9;
}

.slide-thumb > span {
  color: #696a70;
  font-size: 9px;
}

.slide-preview {
  position: relative;
  display: grid;
  place-items: center;
  height: 58px;
  overflow: hidden;
  color: white;
  background: linear-gradient(145deg, #151b29, #324455);
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.slide-preview i {
  position: absolute;
  width: 45px;
  height: 45px;
  background: #9671da;
  border-radius: 50%;
  filter: blur(15px);
}

.slide-preview b {
  z-index: 1;
  font-size: 8px;
}

.keynote-stage {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  background: #c8c8cb;
}

.keynote-toolbar {
  display: flex;
  align-items: center;
  height: 37px;
  padding: 0 12px;
  gap: 14px;
  background: #ececee;
  border-bottom: 1px solid rgba(0, 0, 0, 0.16);
  color: #65666b;
  font-size: 9px;
}

.presentation-slide {
  position: relative;
  display: flex;
  width: calc(100% - 40px);
  max-width: 515px;
  aspect-ratio: 16 / 9;
  margin: auto;
  padding: 39px;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  color: white;
  background:
    radial-gradient(circle at 73% 42%, rgba(96, 165, 200, 0.33), transparent 28%),
    linear-gradient(135deg, #182337, #243a4b 55%, #151c2b);
  box-shadow: 0 7px 24px rgba(0, 0, 0, 0.22);
}

.presentation-slide p {
  z-index: 2;
  margin: 0 0 8px;
  color: #7dd6e2;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.2em;
}

.presentation-slide h2 {
  z-index: 2;
  margin: 0;
  font-size: clamp(24px, 4vw, 43px);
  letter-spacing: -0.05em;
  line-height: 0.95;
}

.presentation-slide em {
  color: #b997fb;
  font-family: "DM Serif Display", serif;
  font-weight: 400;
}

.slide-glow {
  position: absolute;
  top: 30px;
  right: 30px;
  width: 180px;
  height: 180px;
  background: conic-gradient(from 20deg, #7250b9, #3fb5c7, #e491a8, #7250b9);
  border-radius: 42% 58% 61% 39%;
  filter: blur(2px);
  opacity: 0.7;
  transform: rotate(25deg);
}

.slide-dock {
  position: absolute;
  right: 39px;
  bottom: 28px;
  display: flex;
  padding: 5px;
  gap: 4px;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 7px;
  backdrop-filter: blur(10px);
}

.slide-dock i {
  width: 18px;
  height: 18px;
  background: hsl(calc(var(--delay) * 48deg) 72% 60%);
  border-radius: 4px;
}

.format-panel {
  flex: 0 0 150px;
  padding: 13px;
  background: #ececee;
  border-left: 1px solid var(--line);
}

.format-panel > strong {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  text-align: center;
}

.format-panel label {
  display: block;
  margin: 18px 0 6px;
  color: #63646a;
  font-size: 9px;
}

.format-segment,
.format-field {
  padding: 6px 7px;
  background: #fafafa;
  border: 1px solid #c8c8ca;
  border-radius: 5px;
  font-size: 8px;
  text-align: center;
}

.format-field {
  display: flex;
  justify-content: space-between;
  text-align: left;
}

.format-slider {
  height: 3px;
  margin: 13px 5px;
  background: #b5b5b8;
  border-radius: 99px;
}

.format-slider i {
  display: block;
  width: 10px;
  height: 10px;
  margin-left: 65%;
  background: white;
  border: 1px solid #aaa;
  border-radius: 50%;
  transform: translateY(-4px);
}

.mail-sidebar {
  flex-basis: 145px;
}

.mail-list {
  flex: 0 0 220px;
  overflow: hidden;
  background: #f7f7f8;
  border-right: 1px solid var(--line);
}

.mail-list-title {
  display: flex;
  align-items: baseline;
  height: 39px;
  padding: 13px 12px 8px;
  gap: 7px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  font-weight: 700;
}

.mail-list-title span {
  color: var(--secondary);
  font-size: 9px;
  font-weight: 400;
}

.mail-row {
  position: relative;
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto;
  min-height: 82px;
  padding: 10px 9px;
  gap: 4px;
  border-bottom: 1px solid var(--line);
}

.mail-row.selected {
  color: white;
  background: #3d86d9;
}

.mail-row i {
  width: 6px;
  height: 6px;
  margin-top: 4px;
  background: #2b82e0;
  border-radius: 50%;
}

.mail-row.selected i {
  background: white;
}

.mail-row strong,
.mail-row span,
.mail-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-row span {
  margin-top: 2px;
}

.mail-row small {
  margin-top: 4px;
  color: var(--secondary);
  font-size: 9px;
}

.mail-row.selected small {
  color: rgba(255, 255, 255, 0.72);
}

.mail-row time {
  font-size: 8px;
}

.mail-message {
  min-width: 0;
  flex: 1;
  padding: 0 22px;
  overflow: hidden;
  background: var(--panel-raised);
}

.message-actions {
  display: flex;
  height: 39px;
  margin-inline: -22px;
  padding: 8px 14px;
  justify-content: flex-end;
  gap: 7px;
  border-bottom: 1px solid var(--line);
}

.message-actions span {
  display: grid;
  place-items: center;
  width: 27px;
  background: rgba(128, 128, 132, 0.09);
  border-radius: 5px;
}

.mail-message h2 {
  margin: 21px 0 13px;
  font-size: 19px;
}

.sender {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  margin-bottom: 23px;
  gap: 9px;
}

.sender strong,
.sender small {
  display: block;
}

.sender small,
.sender time {
  color: var(--secondary);
  font-size: 9px;
}

.mail-message p {
  color: #484a51;
  font-size: 11px;
  line-height: 1.55;
}

.mail-attachment {
  display: flex;
  width: 190px;
  margin-top: 18px;
  padding: 10px;
  align-items: center;
  gap: 10px;
  background: rgba(128, 128, 132, 0.07);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.mail-attachment > span {
  color: #4c8bce;
  font-size: 22px;
}

.mail-attachment strong,
.mail-attachment small {
  display: block;
  font-size: 9px;
}

.mail-attachment small {
  margin-top: 2px;
  color: var(--secondary);
}

.avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  color: white;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.blue-avatar {
  background: linear-gradient(145deg, #4fa5ef, #526bd5);
}

.coral-avatar {
  background: linear-gradient(145deg, #ff9b8d, #dc6e8a);
}

.messages-list {
  flex: 0 0 225px;
  padding: 11px 8px;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
}

.conversation {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 61px;
  padding: 6px 8px;
  gap: 7px;
  border-radius: 8px;
}

.conversation.selected {
  color: white;
  background: #3684d8;
}

.conversation strong,
.conversation small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation small {
  margin-top: 3px;
  color: var(--secondary);
  font-size: 9px;
}

.conversation.selected small {
  color: rgba(255, 255, 255, 0.72);
}

.conversation time {
  align-self: start;
  margin-top: 5px;
  color: var(--secondary);
  font-size: 8px;
}

.conversation.selected time {
  color: rgba(255, 255, 255, 0.72);
}

.chat-panel {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  background: var(--panel-raised);
}

.chat-person {
  display: flex;
  height: 53px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-bottom: 1px solid var(--line);
}

.chat-person .avatar {
  width: 29px;
  height: 29px;
  font-size: 11px;
}

.chat-person small {
  color: var(--secondary);
}

.chat-history {
  display: flex;
  min-height: 0;
  padding: 14px 24px;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.chat-history > time {
  align-self: center;
  margin: 1px 0 12px;
  color: var(--secondary);
  font-size: 8px;
}

.bubble {
  max-width: 255px;
  margin-bottom: 7px;
  padding: 7px 10px;
  border-radius: 15px;
  font-size: 11px;
}

.bubble.received {
  align-self: flex-start;
  background: #e9e9eb;
  border-bottom-left-radius: 5px;
}

.bubble.sent {
  align-self: flex-end;
  color: white;
  background: #2788f7;
  border-bottom-right-radius: 5px;
}

.chat-preview {
  align-self: flex-end;
  width: 190px;
  height: 90px;
  margin: 0 0 7px;
  padding: 8px;
  background: #2788f7;
  border-radius: 15px 15px 5px 15px;
}

.mini-window {
  position: relative;
  height: 100%;
  padding: 7px;
  color: #1d2736;
  background: linear-gradient(135deg, #cddbf0, #f6e2cf);
  border-radius: 7px;
}

.mini-window i {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 3px;
  background: #ef665d;
  border-radius: 50%;
}

.mini-window i:nth-child(2) {
  background: #efb642;
}

.mini-window i:nth-child(3) {
  background: #5fc65c;
}

.mini-window span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #46678f;
  font-size: 17px;
  font-weight: 800;
}

.message-composer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  padding: 8px 16px 13px;
  gap: 8px;
  color: #85868c;
}

.message-composer div {
  padding: 7px 10px;
  border: 1px solid #c9c9cc;
  border-radius: 16px;
}

.mindfulness-main {
  display: flex;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  color: #27333d;
  background:
    radial-gradient(circle at 35% 43%, rgba(153, 225, 214, 0.46), transparent 32%),
    linear-gradient(145deg, #e8f1ed, #e3e8f4 58%, #f3e8ed);
}

.mindfulness-nav {
  display: flex;
  height: 48px;
  padding: 0 23px;
  align-items: center;
  gap: 19px;
  color: rgba(39, 51, 61, 0.67);
}

.mindfulness-nav strong {
  color: #27333d;
  font-size: 14px;
}

.breathing-area {
  display: flex;
  min-height: 0;
  padding: 10px 45px 4px;
  flex: 1;
  align-items: center;
  justify-content: space-around;
  gap: 45px;
}

.breathing-orb {
  position: relative;
  flex: 0 0 220px;
  width: 220px;
  height: 220px;
}

.breathing-orb > i {
  --angle: calc(var(--petal) * 45deg);
  position: absolute;
  top: 50%;
  left: 50%;
  width: 85px;
  height: 130px;
  background: linear-gradient(160deg, rgba(127, 215, 202, 0.68), rgba(125, 145, 225, 0.34));
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 58% 42% 58% 42%;
  box-shadow: 0 8px 35px rgba(81, 143, 150, 0.12);
  transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-35px);
  transform-origin: center;
}

.orb-center {
  position: absolute;
  inset: 60px;
  z-index: 3;
  display: grid;
  place-content: center;
  color: white;
  background: rgba(72, 151, 156, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  box-shadow: 0 12px 40px rgba(63, 124, 136, 0.22);
  backdrop-filter: blur(12px);
  text-align: center;
}

.orb-center strong,
.orb-center span {
  display: block;
}

.orb-center span {
  margin-top: 5px;
  font-size: 10px;
  opacity: 0.75;
}

.session-copy {
  max-width: 270px;
}

.session-copy h2 {
  margin: 8px 0 10px;
  font-family: "DM Serif Display", serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.session-copy p {
  color: rgba(39, 51, 61, 0.67);
  line-height: 1.5;
}

.session-copy button,
.album-copy button,
.tv-copy button {
  padding: 7px 15px;
  color: white;
  background: #477d83;
  border: 0;
  border-radius: 999px;
  font-weight: 650;
}

.mindful-cards {
  display: grid;
  margin: 3px 30px 22px;
  grid-template-columns: repeat(3, 1fr);
  gap: 11px;
}

.mindful-cards > div {
  display: grid;
  grid-template-columns: 30px 1fr;
  padding: 11px 13px;
  align-items: center;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 11px;
}

.mindful-cards span {
  grid-row: 1 / span 2;
  color: #5e9596;
  font-size: 22px;
}

.mindful-cards small {
  color: rgba(39, 51, 61, 0.57);
  font-size: 9px;
}

.music-sidebar {
  flex-basis: 155px;
}

.music-sidebar .sidebar-icon {
  color: #ef4f69;
}

.music-main {
  position: relative;
  min-width: 0;
  flex: 1;
  padding-bottom: 57px;
  overflow: hidden;
  background: var(--panel-raised);
}

.album-hero {
  display: flex;
  padding: 24px 28px 18px;
  gap: 23px;
  background: linear-gradient(180deg, rgba(240, 170, 124, 0.32), rgba(255, 255, 255, 0));
}

.album-art {
  position: relative;
  display: flex;
  width: 145px;
  height: 145px;
  flex: 0 0 145px;
  padding: 14px;
  align-items: flex-end;
  overflow: hidden;
  color: white;
  background: linear-gradient(160deg, #33445f, #e89a75);
  border-radius: 6px;
  box-shadow: 0 9px 22px rgba(0, 0, 0, 0.19);
  font-size: 20px;
  font-weight: 800;
  line-height: 0.9;
}

.album-sun {
  position: absolute;
  top: 24px;
  right: -5px;
  width: 92px;
  height: 92px;
  background: linear-gradient(145deg, #ffc596, #ec795f);
  border-radius: 50%;
  box-shadow: -24px 22px 0 rgba(36, 52, 77, 0.53);
}

.album-art span {
  z-index: 1;
}

.album-copy {
  padding-top: 10px;
}

.album-copy h2 {
  margin: 6px 0 2px;
  font-size: 26px;
}

.album-copy > strong {
  color: #e14c62;
}

.album-copy p {
  max-width: 300px;
  color: var(--secondary);
  line-height: 1.45;
}

.album-copy button {
  margin-right: 6px;
  background: #e84662;
}

.album-copy button + button {
  padding-inline: 10px;
}

.track-list {
  padding: 0 22px;
}

.track-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 35px 22px;
  min-height: 40px;
  padding: 5px 7px;
  align-items: center;
  border-top: 1px solid var(--line);
}

.track-row > span,
.track-row time,
.track-row > b {
  color: var(--secondary);
  font-size: 9px;
}

.track-row strong,
.track-row small {
  display: block;
}

.track-row small {
  margin-top: 2px;
  color: var(--secondary);
  font-size: 9px;
}

.now-playing {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: 25px 35px 125px minmax(70px, 1fr) 25px;
  height: 57px;
  padding: 8px 16px;
  align-items: center;
  gap: 8px;
  background: rgba(246, 246, 247, 0.93);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(16px);
}

.playing-art {
  width: 34px;
  height: 34px;
  background: linear-gradient(145deg, #33445f, #e89a75);
  border-radius: 4px;
}

.now-playing strong,
.now-playing small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-playing small {
  color: var(--secondary);
  font-size: 9px;
}

.playing-progress {
  height: 3px;
  background: #d1d1d4;
  border-radius: 99px;
}

.playing-progress i {
  display: block;
  width: 43%;
  height: 100%;
  background: #77787e;
  border-radius: inherit;
}

.tv-main {
  width: 100%;
  overflow: hidden;
  color: white;
  background: #090a0d;
}

.tv-nav {
  display: flex;
  height: 42px;
  padding: 0 19px;
  align-items: center;
  gap: 19px;
  background: rgba(13, 14, 17, 0.95);
  color: rgba(255, 255, 255, 0.65);
  font-size: 10px;
}

.tv-nav strong {
  color: white;
  font-size: 16px;
}

.tv-hero {
  position: relative;
  height: 245px;
  overflow: hidden;
  background:
    radial-gradient(circle at 75% 54%, rgba(106, 129, 171, 0.48), transparent 22%),
    linear-gradient(105deg, #111621, #28354b 56%, #10141b);
}

.tv-haze {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.62), transparent 62%),
    radial-gradient(circle at 75% 50%, transparent 0 17%, rgba(149, 171, 205, 0.13) 18% 19%, transparent 20%);
}

.planet {
  position: absolute;
  top: 16px;
  right: 48px;
  width: 210px;
  height: 210px;
  background:
    repeating-linear-gradient(171deg, transparent 0 10px, rgba(255, 255, 255, 0.08) 11px 12px),
    radial-gradient(circle at 35% 30%, #a6b6d1, #44516b 45%, #151b25 72%);
  border-radius: 50%;
  box-shadow: -25px 8px 60px rgba(102, 129, 173, 0.4);
}

.planet i {
  position: absolute;
  top: 51%;
  left: -45px;
  width: 300px;
  height: 30px;
  border: 5px solid rgba(203, 215, 233, 0.62);
  border-radius: 50%;
  transform: rotate(-12deg);
}

.tv-copy {
  position: relative;
  z-index: 2;
  width: 50%;
  padding: 49px 0 0 43px;
}

.tv-copy > span {
  color: rgba(255, 255, 255, 0.63);
  font-size: 8px;
  letter-spacing: 0.13em;
}

.tv-copy h2 {
  margin: 5px 0;
  font-size: 34px;
  letter-spacing: 0.16em;
}

.tv-copy p {
  color: rgba(255, 255, 255, 0.7);
}

.tv-copy button {
  color: #191a1d;
  background: white;
}

.tv-copy .round-button {
  width: 30px;
  margin-left: 6px;
  padding-inline: 0;
  color: white;
  background: rgba(255, 255, 255, 0.16);
}

.tv-main > h3 {
  margin: 14px 19px 9px;
  font-size: 14px;
}

.show-row {
  display: grid;
  padding: 0 19px;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.show-card {
  position: relative;
  height: 85px;
  padding: 10px;
  overflow: hidden;
  border-radius: 7px;
}

.show-card span {
  display: block;
  font-size: 7px;
  opacity: 0.7;
}

.show-card strong {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1;
  font-size: 13px;
}

.show-card i {
  position: absolute;
  right: -13px;
  bottom: -20px;
  width: 70px;
  height: 70px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.lofi-main {
  display: grid;
  width: 100%;
  color: white;
  background: #12131a;
  grid-template-columns: minmax(0, 1.45fr) minmax(245px, 0.75fr);
}

.lofi-scene {
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.lofi-scene > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lofi-vignette {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(10, 11, 18, 0.88), transparent 58%), linear-gradient(90deg, transparent, rgba(14, 14, 22, 0.32));
}

.lofi-clock {
  position: absolute;
  top: 18px;
  right: 20px;
  padding: 5px 9px;
  background: rgba(9, 10, 16, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  backdrop-filter: blur(10px);
  font-size: 10px;
}

.lofi-copy {
  position: absolute;
  bottom: 25px;
  left: 27px;
}

.lofi-copy span {
  color: #e8a69c;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.15em;
}

.lofi-copy h2 {
  margin: 4px 0;
  font-size: 27px;
}

.lofi-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.lofi-player {
  display: flex;
  min-width: 0;
  padding: 27px 25px;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #292334, #171923);
}

.record {
  position: relative;
  width: 145px;
  height: 145px;
  overflow: hidden;
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  box-shadow: 0 13px 35px rgba(0, 0, 0, 0.4);
}

.record img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record i {
  position: absolute;
  inset: 54px;
  background: #171923;
  border: 5px solid rgba(255, 255, 255, 0.17);
  border-radius: 50%;
}

.waveform {
  display: flex;
  width: 100%;
  height: 42px;
  margin: 20px 0 12px;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.waveform i {
  width: 2px;
  background: #d995bb;
  border-radius: 99px;
}

.waveform i:nth-child(3n) {
  background: #7892be;
}

.lofi-controls {
  display: flex;
  align-items: center;
  gap: 18px;
  color: rgba(255, 255, 255, 0.67);
}

.lofi-controls button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #211c27;
  background: #eee2e7;
  border: 0;
  border-radius: 50%;
  font-size: 16px;
}

.lofi-timer {
  display: grid;
  width: 100%;
  margin-top: auto;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 8px;
}

.lofi-timer > i {
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 99px;
}

.lofi-timer b {
  display: block;
  width: 49%;
  height: 100%;
  background: #dca7c0;
  border-radius: inherit;
}

.settings-sidebar {
  flex-basis: 205px;
}

.settings-user {
  display: flex;
  padding: 3px 8px 13px;
  align-items: center;
  gap: 10px;
}

.settings-user .avatar {
  width: 39px;
  height: 39px;
}

.settings-user strong,
.settings-user small {
  display: block;
}

.settings-user small {
  margin-top: 2px;
  color: var(--secondary);
  font-size: 9px;
}

.settings-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  color: white;
  border-radius: 5px;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.2);
}

.appearance-icon {
  background: linear-gradient(145deg, #547ce3, #7b5cd9);
}

.display-icon {
  background: #357cca;
}

.wallpaper-icon {
  background: #54a486;
}

.control-icon {
  background: #9c66c2;
}

.privacy-icon {
  background: #3a79bd;
}

.appearance-main {
  min-width: 0;
  flex: 1;
  padding: 25px 30px;
  background: var(--panel);
}

.appearance-main h2 {
  margin: 0 0 19px;
  font-size: 22px;
}

.settings-group {
  overflow: hidden;
  background: var(--panel-raised);
  border: 1px solid var(--line);
  border-radius: 11px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.setting-line {
  display: flex;
  min-height: 47px;
  margin-left: 20px;
  padding: 9px 18px 9px 0;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--line);
}

.setting-line:last-child {
  border-bottom: 0;
}

.setting-line > span {
  min-width: 145px;
}

.theme-line {
  align-items: flex-start;
}

.theme-options {
  display: flex;
  flex: 1;
  justify-content: center;
  gap: 15px;
}

.theme-option {
  padding: 0;
  color: inherit;
  background: none;
  border: 0;
  text-align: center;
  cursor: pointer;
}

.theme-preview {
  display: grid;
  width: 86px;
  height: 57px;
  margin-bottom: 5px;
  padding: 6px;
  background: #f1f1f3;
  border: 2px solid transparent;
  border-radius: 6px;
  grid-template-columns: 21px 1fr;
  gap: 4px;
}

.theme-option.selected .theme-preview {
  border-color: #347ee2;
}

.theme-preview i {
  background: #d4d4d8;
  border-radius: 2px;
}

.theme-preview b {
  background: white;
  border-radius: 2px;
}

.dark-theme {
  background: #353538;
}

.dark-theme i {
  background: #48484c;
}

.dark-theme b {
  background: #252527;
}

.auto-theme {
  background: linear-gradient(90deg, #f1f1f3 50%, #353538 50%);
}

.auto-theme i {
  background: linear-gradient(90deg, #d4d4d8 50%, #48484c 50%);
}

.auto-theme b {
  background: linear-gradient(90deg, white 50%, #252527 50%);
}

.theme-option small {
  font-size: 9px;
}

.accent-colors {
  display: flex;
  gap: 5px;
}

.accent-colors i {
  width: 15px;
  height: 15px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 50%;
}

.select-field {
  display: flex;
  min-width: 150px;
  padding: 5px 8px;
  justify-content: space-between;
  background: rgba(128, 128, 132, 0.09);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.segmented-control {
  display: flex;
  padding: 2px;
  background: rgba(128, 128, 132, 0.12);
  border-radius: 6px;
}

.segmented-control b {
  padding: 4px 9px;
  font-size: 9px;
  font-weight: 500;
  border-radius: 4px;
}

.segmented-control b.selected {
  background: var(--panel-raised);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.mock-switch {
  position: relative;
  width: 29px;
  height: 17px;
  margin-left: auto;
  background: #bbbcc1;
  border-radius: 99px;
}

.mock-switch.active {
  background: #3a89e8;
}

.mock-switch b {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 13px;
  height: 13px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.mock-switch.active b {
  left: 14px;
}

:global(.dark) .mock-app {
  --panel: #262629;
  --panel-raised: #202023;
  --sidebar: rgba(48, 48, 51, 0.95);
  --line: rgba(255, 255, 255, 0.09);
  --secondary: #96969c;
  color: #f0f0f2;
}

:global(.dark) .freeform-canvas {
  background-color: #313033;
  background-image: radial-gradient(#56545a 0.8px, transparent 0.8px);
}

:global(.dark) .canvas-tools,
:global(.dark) .format-panel,
:global(.dark) .keynote-toolbar,
:global(.dark) .slides-sidebar {
  background: #37373a;
}

:global(.dark) .keynote-stage {
  background: #1c1c1e;
}

:global(.dark) .mail-list {
  background: #2c2c2f;
}

:global(.dark) .mail-message p {
  color: #c9c9cd;
}

:global(.dark) .bubble.received {
  color: white;
  background: #3a3a3d;
}

:global(.dark) .mindfulness-main {
  color: #e9f2f0;
  background:
    radial-gradient(circle at 35% 43%, rgba(80, 145, 139, 0.42), transparent 32%),
    linear-gradient(145deg, #263b3b, #303644 58%, #403039);
}

:global(.dark) .mindfulness-nav,
:global(.dark) .session-copy p {
  color: rgba(235, 244, 242, 0.66);
}

:global(.dark) .mindfulness-nav strong {
  color: #edf4f2;
}

:global(.dark) .mindful-cards > div {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.11);
}

:global(.dark) .album-hero {
  background: linear-gradient(180deg, rgba(142, 82, 58, 0.32), rgba(32, 32, 35, 0));
}

:global(.dark) .now-playing {
  background: rgba(42, 42, 45, 0.95);
}

@media (max-width: 760px) {
  .format-panel {
    display: none;
  }

  .store-list {
    grid-template-columns: 1fr 1fr;
  }

  .store-row:last-child {
    display: none;
  }

  .mail-sidebar {
    display: none;
  }

  .mindfulness-main .breathing-area {
    padding-inline: 24px;
    gap: 20px;
  }

  .breathing-orb {
    flex-basis: 180px;
    transform: scale(0.82);
  }

  .settings-sidebar {
    flex-basis: 170px;
  }

  .theme-preview {
    width: 68px;
  }
}

@media (max-width: 560px) {
  .mock-sidebar,
  .messages-list,
  .slides-sidebar {
    display: none;
  }

  .folder-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .mail-list {
    flex-basis: 165px;
  }

  .store-hero {
    padding-inline: 18px;
  }

  .hero-orbit {
    right: -90px;
  }

  .mindfulness-main .breathing-area {
    justify-content: center;
  }

  .session-copy {
    display: none;
  }

  .mindful-cards {
    grid-template-columns: 1fr;
  }

  .mindful-cards > div:nth-child(n+2) {
    display: none;
  }

  .lofi-main {
    grid-template-columns: 1fr;
  }

  .lofi-scene {
    display: none;
  }

  .appearance-main {
    padding-inline: 16px;
  }

  .setting-line > span {
    min-width: 105px;
  }
}
</style>
